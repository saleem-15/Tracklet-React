# Tracklet Universal UI Component Lifecycle Workflow
> **Target Runtimes**: Antigravity, OpenCode, OpenAI Codex, Claude Code, Cursor.
> **Scope**: Mandatory for creating new UI components or refactoring existing views across Tracklet Web (`src/`) and Extension (`extension/`).

---

## Overview: The 4-Phase Architecture

Building UI in Tracklet follows a strict, non-negotiable 4-phase lifecycle. Never jump straight to writing JSX before Phase 1 is settled.

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: PRODUCT SHAPING & JOURNEY DISCOVERY (Pre-Code)                │
│ → Entry point, user state of mind, info hierarchy, 4 states & edge cases│
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: CANONICAL SCAFFOLDING (Architecture)                          │
│ → Enforce the 8 Shared Components, container depth <= 1, 3-tier fonts  │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: OPTICAL MATH & MICRO-MOTION (Craft)                           │
│ → Concentricity (R = r + p), in-place morphs, MOTION_TOKENS, 44px hit  │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: MULTI-ANGLE QUALITY VERIFICATION (Pre-Flight Gate)            │
│ → Static AST lint, responsive test (375px/1280px), zero regressions    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Product Shaping & Journey Discovery (Pre-Code)

Before writing any component code, declare the **Product Shaping Contract**:

### 1. User Entry Point & Journey Context
- **Where did the user arrive from?**
  - *From Active Pipeline Kanban (`ActivePipelineBoard.tsx`)*: User is in **fast triage mode**. Prioritize immediate next action, interview date, and recruiter contact.
  - *From All Applications Table (`AllApplicationsTable.tsx`)*: User is in **audit & comparison mode**. Prioritize structured data: salary, stage history timeline, and notes diff.
  - *From Chrome Extension Popup (`extension/popup.html`)*: User is in **1-click capture mode**. Minimum fields, pre-filled ATS data, instant save.
- **Cognitive Load Budget**: What is the single primary task? Keep it prominent; tuck secondary operations into dropdown menus or tabs.

### 2. Mandatory 4 States & Edge Case Modeling
Every component or data surface MUST explicitly model and implement all 4 states:

1. **Loading State**:
   - **Predictable Layout (Tables, Cards, Drawers)**: Use a **Skeleton** placeholder matching the exact line-height and row pitch of final content. Never allow height jump on data arrival (Zero Cumulative Layout Shift).
   - **In-Place Actions (Button Save, Copy, Archive)**: Use an **Inline Spinner** inside the mounted button while the label crossfades. Never show a full-page modal spinner for routine actions.
2. **Empty State**:
   - Never render a blank screen, an empty gray box, or raw text like *"No items found"*.
   - Use canonical `EmptyState` (`src/components/EmptyState.tsx`) with:
     - Clear, human explanation of *why* it is empty.
     - A single primary 1-click recovery button (e.g. *"Capture First Job"*, *"Clear Active Filters"*).
3. **Error & Recovery State**:
   - Non-blocking inline banner or toast receipt (never native browser `window.alert`).
   - Human-friendly diagnostic message (no raw network stack traces).
   - A direct **Retry / Undo** action.
   - **Form State Preservation**: Never clear or wipe user input fields if submission fails.
4. **Extreme Data Ranges & Boundary Cases**:
   - **Long Text Strings**: 60+ character job titles, long URLs, or multi-paragraph notes must truncate gracefully (`truncate`) with an accessible `Tooltip`.
   - **Extreme Metric Values**: Handle `$0` vs `$450,000`, 0 applications vs 1,000 applications.
   - **Missing / Partial Data**: Always handle `null` salary, missing contact name, or unrecorded application dates with calm fallback tokens (`"—"` or `"Not specified"`).
   - **Network Latency / Offline**: Optimistic UI updates local state immediately; background sync retries automatically.

---

## Phase 2: Canonical Scaffolding (Architecture)

Every component must adhere to Tracklet's architectural guardrails:

1. **The 8 Mandatory Canonical Shared Primitives** (from `docs/COMPONENT_REGISTRY.md`):
   - Notes & Markdown: `RichTextEditor` (`src/components/editor/RichTextEditor.tsx`). Raw `<textarea>` for notes is strictly forbidden.
   - Selects & Dropdowns: `CustomSelectDropdown` (`src/components/CustomSelectDropdown.tsx`) or `StageSelectorDropdown`. Raw HTML `<select>` is strictly forbidden.
   - Icon Buttons: `IconButton`, `DeleteIconButton`, `CloseIconButton`, `CopyIconButton` (`src/components/IconButton.tsx`).
   - Status & Domain Badges: `StatusBadge` (`src/components/StatusBadge.tsx`) and `JobTypeBadges`.
   - Navigation: `SegmentedTabs` (`src/components/SegmentedTabs.tsx`).
   - Company Logos: `CompanyLogo` (`src/components/CompanyLogo.tsx`) with frame-0 session cache.
   - Outbound Links: `LinkifiedText` (`src/components/LinkifiedText.tsx`) or external anchors with `target="_blank" rel="noopener noreferrer"`.
   - Feedback & Empty States: `EmptyState` (`src/components/EmptyState.tsx`) and `Tooltip` (`src/components/Tooltip.tsx`).
2. **Structural Container Flatness (Max Depth = 1)**:
   - Never nest a bordered card inside another bordered card.
   - Group sub-sections using whitespace (`space-y-4`) or subtle 1px dividers (`border-b border-slate-100`).
3. **3-Tier Typography Lock**:
   - Display & Headings: `font-heading` (**Outfit**). Zero subtitles under primary page headers.
   - Body & Controls: `font-sans` (**Plus Jakarta Sans**).
   - Data, Dates, Monies: `font-mono` (**JetBrains Mono**).

---

## Phase 3: Optical Math & Micro-Motion (Craft)

Apply the proven micro-craft principles distilled from Stageshow and Apple HIG:

1. **Concentric Radii Formula ($R = r + p$)**:
   - Outer container radius MUST equal inner child radius plus padding.
   - *Example*: If an inner badge is `rounded-[8px]` with `p-2` (`8px`), the outer card MUST be `rounded-[16px]` (`rounded-2xl`). Never mix random radii.
2. **In-Place State Mutation ("Change Only What Changed")**:
   - A button transitioning between states (`Save` → `Saving` → `Saved`) MUST morph on itself. Never unmount and pop in a separate DOM element.
   - Crossfade label, ease container width, and keep neighboring controls steady.
3. **The "No Near-Tangents" Rule**:
   - Gaps of 1px to 3px look like accidental rendering defects.
   - Either snap borders completely flush ($0$px) or separate them by at least $8$px (`gap-2`).
4. **Anchored Numbers & Hanging Units**:
   - When metrics update (e.g. Total Applications `24` → `25`), hang currency/percent signs outside the digit box so digits remain centered; animate only the single changing digit.
5. **Visible Ink Alignment**:
   - Center icons and capital labels by cap-height rather than font line-box height (`text-box: trim-both cap alphabetic`).
6. **Kinematic Motion Tokens (`src/theme/motion.ts`)**:
   - Durations: `100ms` (presses), `150ms` (dropdowns/tabs), `200ms` (drawer slide-over). Maximum allowed duration: `250ms`.
   - Physics: Critically damped springs only (`stiffness: 400, damping: 35`). Zero rubber-banding, zero oscillation.
   - Zero `transition-all`. Use `MOTION_TOKENS.classes.interactive` or `transition-colors duration-150`.
   - **Accessibility Guarantee**: Respect `prefers-reduced-motion` with instant 0ms fallback.
7. **44px Ergonomic Hit Targets**:
   - Every clickable icon button must have a minimum 44x44px hit-target using padding or `min-h-[44px] min-w-[44px]` (or `after:absolute after:-inset-2`) to prevent mis-clicks.

---

## Phase 4: Multi-Angle Quality Verification (Pre-Flight Gate)

Before marking any component task complete or opening a PR:

1. **Static AST Analysis**:
   - Run `npx eslint . --max-warnings 0`
   - Confirm zero raw `<select>`, zero raw `<textarea>`, zero arbitrary hex `[#...]`, and zero `transition-all`.
2. **Type Safety**:
   - Run `npx tsc --noEmit` and confirm 0 errors.
3. **Viewport Resiliency**:
   - Inspect layout at **`375px`** (Mobile Safari / Chrome Extension popup) and **`1280px+`** (Desktop).
   - Confirm zero horizontal scrollbar overflow.
4. **Contrast & Lighthouse**:
   - Verify WCAG AA compliance (minimum `text-slate-500` on light backgrounds; zero `text-slate-400`).
