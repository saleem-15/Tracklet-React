# UI Progress: Tracklet Unified Applications Hub

## Status: IN PROGRESS (Round 6 Review)
- **Design System**: [`design-system.md`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/design-system.md)
- **Approved Final Screen (Updated)**: [`designs/final/unified-applications-hub.html`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/designs/final/unified-applications-hub.html)

---

## Round 1 · Directions (Hero Screen: Unified Applications Hub)

| Direction | Artifact File | Core Concept & Signature | Status |
|---|---|---|---|
| **Direction A** | [`designs/round-1/a-linear-fluid-command.html`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/designs/round-1/a-linear-fluid-command.html) | Single-row Linear-style command toolbar with inline search (`⌘K`), compact filter pills, canonical `SegmentedTabs` with animated spring pill, and adjacent `+ Add Job`. | **Picked** (Winner of Round 1) |
| **Direction B** | [`designs/round-1/b-executive-ledger.html`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/designs/round-1/b-executive-ledger.html) | Two-tier surface with "Pipeline Pulse" ribbon. | Hybridized (metrics concept evaluated) |
| **Direction C** | [`designs/round-1/c-floating-dock.html`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/designs/round-1/c-floating-dock.html) | Floating bottom island dock switcher. | Rejected by user |

---

## Round 2 · Filter Architecture Prototypes

| Approach | Artifact File | Architectural Model & Behavior | Status |
|---|---|---|---|
| **Approach 1** | [`designs/round-2/a1-with-all-filters.html`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/designs/round-2/a1-with-all-filters.html) | Responsive Priority: All 5 filters side-by-side on wide screens with adaptive folding on smaller viewports. | Evaluated |
| **Approach 2** | [`designs/round-2/filter-approach-2-progressive-chips.html`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/designs/round-2/filter-approach-2-progressive-chips.html) | **Progressive Filter Chips (Linear style)**: Only Search + Status visible by default; `[+ Filter ▾]` adds clean, removable chips (`Platform: LinkedIn ✕`, `Work: Remote ✕`). | **Picked** (Winner of Round 2) |
| **Approach 3** | [`designs/round-2/filter-approach-3-two-tier-deck.html`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/designs/round-2/filter-approach-3-two-tier-deck.html) | Two-Tier Clean Deck: 40px top bar + 36px dedicated filter sub-bar. | Evaluated |

---

## Round 3 · Critique & Fixes Applied

1. **Accessible Chip Dismissal**: Expanded `✕` hit target to 28px with `aria-label` and rose-tinted hover (`hover:bg-rose-100 hover:text-rose-700`).
2. **Empty Column Drop Zone**: Added dashed placeholder (`border-dashed border-slate-200`) in Kanban columns when 0 jobs match current filters.
3. **Popover Escape Handling**: Wired `useEscapeKey` and backdrop click dismissal to the `+ Filter` menu.
4. **Keyboard Discoverability**: Added `⌘K` badge inside Search input and `Press N` tooltip on `+ Add Job`.
5. **Concentric Radii ($R = r + p$)**: Locked `SegmentedTabs` container to `rounded-[10px]` with `p-1` (`4px`) and inner sliding tab pill to `rounded-[6px]`.

---

## Round 4 · Design System Locked
- Saved as [`design-system.md`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/design-system.md), formalizing the **Progressive Filter Bar** and **Concentric SegmentedTabs** tokens.

---

## Round 5 · Approved Screen Baseline
- Saved as [`designs/final/unified-applications-hub.html`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/designs/final/unified-applications-hub.html), providing the interactive foundation.

---

## Round 6 · Fine UX/UI Polish & Interaction Audit

Based on real workflow testing and user feedback:

1. **Drag Counter Timing Invariant**:
   - Column badge counts strictly reflect **committed state**, never **in-flight preview state**.
   - During card drag, source and target column counters remain fixed until `drop` occurs. Target column displays an optical dashed insertion slot (`border-2 border-dashed border-blue-400 bg-blue-50/50`).
2. **3-Tier Surface Contrast (No White-on-White)**:
   - **Canvas**: Subtle foundation (`bg-slate-50/60`).
   - **Column Tracks**: Distinct lane structure (`bg-slate-100/80 border border-slate-200/80 rounded-xl p-3`).
   - **Column Headers**: Integrated into the top of each lane container with stage dot, column title, and count badge (`bg-white/90 border border-slate-200/70 rounded-lg px-3 py-2 shadow-2xs`).
   - **Cards**: Physical crisp white cards (`bg-white border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs rounded-xl`) with tangible contrast against the slate track.
3. **Card Context Menu (`···` / Three Horizontal Dots)**:
   - Subtle `MoreHorizontal` button on each card (hover-revealed on desktop, always accessible on touch).
   - Curated options:
     - `Move to Stage ▾` (nested submenu with stages + color dots).
     - `View Job Posting` (opens original listing in new tab).
     - `Archive Application` (moves to archive with 4s undo toast).
     - `Delete Application` (destructive rose action with confirmation/undo).
   - *Omitted*: "Open Application Details" (redundant; clicking the card body already opens details).
4. **Elimination of Sliding Drag Footer**:
   - The disruptive 96px sticky footer (`Quick Drop: Archive` / `Reject`) is removed entirely, preserving screen real estate and preventing layout shift. Actions are handled directly via the card menu.
5. **The 6 Card Pillars Applied**:
   - Compact salary notation: `$185k–$210k` with en-dash and `font-mono tabular-nums`.
   - Single-line truncated task badge (`Architecture deck · Thu`).
   - Clear stale state: `• 18d stale` in muted amber/slate, eliminating alarming pink borders.
   - Standardized `w-6 h-6` logo container.
   - Zero `transition-all`.

---

## Decision Log

| Round | Picked | Reason |
|---|---|---|
| Round 1: Directions | Direction A | Streamlined single-row command toolbar with canonical `SegmentedTabs`. |
| Round 2: Filter Architecture | Approach 2 (Progressive Chips) | Eliminates toolbar overflow across laptop widths; keeps top bar calm and focused while allowing all 5 filters on demand. |
| Round 3: Critique | All 5 Fixes Approved | Enhanced touch target ergonomics, keyboard navigation, concentric optical math, and empty drop zones. |
| Round 4: Lock System | Tracklet Tokens + Progressive Bar | Formalized in `design-system.md`. |
| Round 5: Final Screen | Unified Applications Hub | Fully approved baseline. |
| Round 6: Fine UI/UX Polish | Surface Contrast, Card Menu, Fixed Drag Counters | Solves white-on-white contrast, adds Simplify-style card menu, fixes drag counter timing, removes disruptive footer. |

