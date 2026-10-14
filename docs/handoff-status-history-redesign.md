# Engineering & Product Handoff: Status History Timeline Redesign

> **Branch**: `fix/status-history-timeline-centering`  
> **Worktree**: `D:\Programming\Tracklet-status-history`  
> **Status**: Ready for Code Review & Merge to `main`  
> **Author**: Antigravity Pair Programming Session  
> **Date**: October 13, 2026  

---

## 1. Context & Objectives

The `fix/status-history-timeline-centering` branch was originally created to resolve vertical alignment and centering bugs on the status history spine in `ApplicationDetailPanel`. However, an architectural and UX audit revealed deeper product limitations with the legacy implementation:

1. **Visual Clutter & Cognitive Noise**: Every entry rendered dual `[From Stage] → [To Stage]` chips, creating visual noise without aiding rapid glancing.
2. **No Error Recovery**: Candidates who accidentally changed status (e.g. accidentally clicking *Rejected* instead of *Interviewing*) had no way to revert or fix timestamps/notes without database tampering.
3. **Modal-on-Modal Stacking**: Proposed dialogs for editing/deleting fought with `ApplicationDetailPanel` for z-index, overlay backdrops, and `Escape` key handling.
4. **Ragged Typographic Alignment**: Boxed chips for stage duration (`[1d]` vs `[12d]`) caused uneven right alignment and visual jitter across rows.
5. **Pulsing Dot Distortions**: Oversized active dots with continuous `animate-ping` animations violated WCAG 2.2.2 motion guidelines and distorted the 1px vertical spine.

### Objective
Redesign the Status History feature from the ground up using **Design A (Milestone Spine)** with 100% inline editing/deleting, automatic status rollback on deletion, clean typography with `tabular-nums`, and quiet notes. Additionally, establish a reusable design exploration skill and document the Unified Application Journey for future roadmap execution.

---

## 2. Key Architecture & UI/UX Decisions

### A. Design A (Milestone Spine)
* **Single Stage Headline**: Each timeline node represents a clean milestone headline (e.g. **Interview**, **Offer**, **Screening**) rather than redundant dual chips.
* **Uniform Spine Geometry**: All stage dots share identical 10px dimensions (`w-2.5 h-2.5 rounded-full ring-2 ring-white`). Current stage is indicated via a static subtle ring (`ring-offset-1 ring-slate-300`) with zero `animate-ping` motion fatigue.
* **Pure Typographic Metadata**: Replaced boxed duration pills with clean inline typography (`📅 Date · ⏱️ X days in stage`). Monospace `tabular-nums` and middle dot (`·`) separators ensure single-digit and double-digit day counts align consistently without layout shifts.
* **Quiet Notes**: Notes only render when present, displaying as subtle, clean italic quotes (`“Takeaway...”`). No clumsy "Show reason" buttons.
* **100% Inline Editing**: Clicking edit swaps the row into an inline form (`MilestoneInlineEditRow.tsx`) with stage dropdown, datetime picker, note input, and Save/Cancel buttons.
* **100% Inline Deletion & Auto-Rollback**:
  * Deleting a historical entry prompts an inline confirmation strip.
  * Deleting the **most recent** checkpoint alerts the user that the application status will automatically revert to the preceding stage (e.g., reverting accidental *Rejected* back to *Interview*).
  * The deletion action triggers an `Undo` snackbar toast allowing 1-click restoration.
* **Modular Code Structure (< 300 Lines)**: Extracted `MilestoneInlineEditRow.tsx` and `MilestoneInlineDeleteRow.tsx`, bringing the core `MilestoneSpineTimeline.tsx` down to 248 lines.

### B. Sandbox Prototyping Lab & Variants Sunset
* An interactive Variants Lab and 5 real-world presets were built during prototyping to rigorously test 4 competing archetypes (Milestone Spine, Interactive Journal, Horizontal Stepper, and Unified Activity Stream).
* With **Design A (Milestone Spine)** selected as the canonical production experience, all experimental lab modals, prototype variants (B, C, D), and temporary triggers have been completely decommissioned from the codebase to keep the production footprint lightweight and maintainable.
* Variant D (Unified Activity Stream) has been preserved with its full working implementation in `docs/features/unified-application-journey.md` for future roadmap adoption.

### C. Reusable Project Skill
* Formalized the multi-agent UI prototyping process in `.agents/skills/design-variants-lab/SKILL.md`.
* Defines rules for parallel subagent invocation, realistic fake data harnesses, and a 5-axis UX evaluation rubric (Cognitive Load, Typographic Discipline, Error Recovery, Context Preservation, and Accessibility).

### D. Future Feature Specification: Unified Application Journey
* Documented the Unified Application Journey in `docs/features/unified-application-journey.md`.
* Outlines user stories, event normalization schema (`UnifiedEvent`), and embeds the complete, working source code of `UnifiedActivityTimeline.tsx` for immediate future adoption.

---

## 3. Inventory of Changes

### Production Components & Logic

| Path | Purpose |
| :--- | :--- |
| `src/lib/statusHistoryUtils.ts` | Pure utilities for stage dwell calculations, chronological sorting, relative timestamps, and deletion rollback calculations. |
| `src/components/detail/timeline/MilestoneSpineTimeline.tsx` | Canonical Design A milestone timeline component (248 lines). |
| `src/components/detail/timeline/MilestoneInlineEditRow.tsx` | Modular inline edit form (82 lines). |
| `src/components/detail/timeline/MilestoneInlineDeleteRow.tsx` | Modular inline delete confirmation strip (58 lines). |
| `src/components/detail/timeline/timelineUtils.ts` | Dwell time math and localized timestamp formatters (74 lines). |
| `src/components/detail/timeline/index.ts` | Clean exports for milestone spine components and timeline utils. |
| `src/components/detail/StatusHistoryTimeline.tsx` | Canonical production wrapper delegating to `MilestoneSpineTimeline`. |

### Tests & Documentation

| Path | Purpose |
| :--- | :--- |
| `tests/unit/milestoneSpineTimeline.test.tsx` | Unit tests for Design A rendering, inline editing, and deletion rollback. |
| `tests/unit/statusHistoryUtils.test.ts` | Unit tests for dwell calculations, rollback logic, and entry mutations. |
| `tests/unit/statusHistoryTestFixtures.ts` | Clean unit test fixtures representing realistic application workflows. |
| `.agents/skills/design-variants-lab/SKILL.md` | Reusable engineering skill for future multi-agent UX exploration. |
| `docs/features/unified-application-journey.md` | Feature spec and archived code for Unified Journey. |

### Modified Files

| Path | Description of Changes |
| :--- | :--- |
| `src/App.tsx` | Preserved caller-supplied `history` in `handleUpdateApplication` to prevent re-appending rolled-back stages upon deletion. |
| `src/components/ApplicationDetailPanel.tsx` | Connected `handleUpdateStatusHistoryEntry`, `handleDeleteStatusHistoryEntry` (with atomic auto-rollback and Undo toast). |
| `src/components/detail/StatusHistoryTimeline.tsx` | Canonical production wrapper delegating to `MilestoneSpineTimeline`. |
| `tests/unit/applicationDetailPanel.test.tsx` | Added automated regression test for milestone deletion with stage rollback. |

---

## 4. Verification & Quality Assurance

All quality gates have been executed and verified in `D:\Programming\Tracklet-status-history`:

1. **TypeScript Verification**:
   ```bash
   npx tsc --noEmit
   # Exit Code 0: Zero TypeScript compiler errors
   ```
2. **Unit Test Suite**:
   ```bash
   npm test
   # Result: 29 test files passed, 327 tests passed (100% passing)
   ```
3. **Production Build**:
   ```bash
   npm run build
   # Result: Vite production build succeeded cleanly in 7.63s
   ```
4. **Git Workspace Isolation**:
   - `D:\Programming\Tracklet` (branch `feat/contact-email-log` used by parallel chat) has **zero modifications** from this work.
   - All changes are strictly confined to the `fix/status-history-timeline-centering` worktree.

---

## 5. Localhost Testing Guide

The local dev server is currently running on **`http://localhost:5174/`**:

1. **Verify Timeline View**:
   - Open any existing job application from the table or Kanban board.
   - Notice the Status History section: clean stage title, pure metadata subline (`📅 Date · ⏱️ X days in stage`), and uniform 10px dots.
2. **Test Inline Editing**:
   - Hover over any milestone and click the pencil icon (`Edit3`).
   - Modify the stage, date/time, or note, then click **Save Changes**.
   - Notice immediate optimistic update and success snackbar.
3. **Test Accidental Misclick Recovery & Rollback**:
   - Change an application's stage (e.g. from *Interview* to *Rejected*).
   - In the Status History section, click the trash icon on the new *Rejected* checkpoint.
   - The inline banner confirms: *"Application status will automatically revert to Interview"*.
   - Click **Confirm & Revert**. The application status reverts to *Interview*, and an **Undo** button appears in the snackbar.

---

## 6. Recommended Commit & Merge Path

When ready to commit and merge, follow this sequence:

```bash
# Inside D:\Programming\Tracklet-status-history:
git add .
git commit -m "feat(timeline): redesign status history with milestone spine, inline recovery, and variants lab"
git push origin fix/status-history-timeline-centering
```

Then create a Pull Request into `main` using **Squash and Merge**.
