---
target: src/components/ActivePipelineBoard.tsx
total_score: 36
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
p2_count: 2
p3_count: 1
timestamp: 2026-07-28T23-04-00Z
slug: src-components-activepipelineboard-tsx
---

## Design Health Score

| # | Heuristic | Score | Key Observation / Issue |
|---|-----------|-------|--------------------------|
| 1 | Visibility of System Status | 4 | Real-time column counts, drag-over highlights, bottom drop-zone pulse animations, and instant toast feedback on stage transitions. |
| 2 | Match System / Real World | 4 | Stages mimic real recruiting pipelines (Wishlist → Applied → Screening → Interview → Offer); stage-aware staleness badges (e.g. >14d red). |
| 3 | User Control and Freedom | 4 | Dual stage controls: drag-and-drop cards OR click stage dropdown menu; quick drop zones for Archiving & Rejection; toast alert allows rapid status verification. |
| 4 | Consistency and Standards | 4 | Strict adherence to `DESIGN.md` Slate background hierarchy (`#f8fafc` canvas, white card surfaces, `border-slate-200` boundaries). |
| 5 | Error Prevention | 3 | Drag-over drop targets clearly bounded; separate bottom quick-drop zones prevent accidental drops into wrong stages, though confirmation on bulk drag is absent (by design for speed). |
| 6 | Recognition Rather Than Recall | 3 | Company logos, platform badges, task completion chips (`2/3 tasks`), and stage duration (`12d`) rendered directly on card face without needing side panel inspection. |
| 7 | Flexibility and Efficiency of Use | 3 | Drag-and-drop + inline stage selector; missing keyboard arrow navigation between board cards for full keyboard-only power users. |
| 8 | Aesthetic and Minimalist Design | 4 | Pristine information density with 38px table header alignment, crisp borders (`border-slate-200/80`), and micro-shadows (`shadow-2xs` on hover). |
| 9 | Error Recovery | 3 | Last moved notice toast alerts user immediately to accidental drops and shows exact destination stage. |
| 10 | Help and Documentation | 4 | Header tip banner explains drag affordance explicitly; stage urgency duration has hover tooltips detailing stage context. |
| **Total** | | **36/40** | **Excellent** |

## Design System & Heuristic Verdict

The **Active Pipeline Board** (`ActivePipelineBoard.tsx`) is in an exceptionally strong state, scoring **36/40** (Band: *Excellent*). It successfully executes the project's Creative North Star (*"The Executive Command Center"*):

- **Information Density**: 5 stages rendered side-by-side in a responsive grid (`grid-cols-5 min-w-[900px]`), displaying company logo, role, note snippet, task counter, platform badge, staleness counter, and stage dropdown without feeling cluttered.
- **Stage-Aware Urgency**: Staleness indicators transition dynamically (`<7d` neutral slate, `>7d` amber warning, `>14d` rose urgency), prioritizing attention for applications stuck in active interview loops.
- **Dual Interaction Paradigms**: Users can advance stages via drag-and-drop OR via the inline `StageSelectorDropdown` embedded in every card footer, satisfying both mouse-heavy and quick-click workflows.

---

## Technical & Ergonomic Deep Dive

### 1. Dual-Register Typography Application
- **Current Pattern**: Column titles currently render with standard `font-sans` (`Plus Jakarta Sans`).
- **Design System Guideline**: `DESIGN.md` defines the **Dual Register Rule**: geometric display face `Outfit` (`font-display`) for authoritative headings, paired with `JetBrains Mono` (`font-mono`) for tabular data.
- **Recommendation**: Apply `font-display` to column header titles (`col.title`) and card company headings (`app.company`) to elevate typographic hierarchy and align 100% with `design.json`.

### 2. Drag & Drop Affordance & Visual Feedback
- **What Works**: The top tip bar (`Tip: Drag and drop application cards...`) resolves previous discoverability concerns. Bottom quick-drop zones (`Archive` & `Mark Rejected`) pulse smoothly (`animate-pulse`) when a card drag commences.
- **Opportunity**: While column hover target highlights (`bg-blue-50/30 ring-2 ring-inset ring-blue-400/30`) indicate valid drop columns, adding an insertion shadow/placeholder line within column card lists during `dragOver` would provide exact visual positioning feedback.

### 3. Keyboard Accessibility for Card Board Navigation
- **Current State**: Cards have `draggable` and `onClick`, but lack `tabIndex={0}` and keyboard event handlers (`onKeyDown` for `Enter` / `Space` / `Arrow` keys).
- **Why It Matters**: Power users relying on keyboard navigation can open the search bar (`Cmd+K`) and add applications (`N`), but cannot move focus between pipeline cards using arrow keys.
- **Pattern Recommendation**: Implement standard roving `tabIndex` or grid keydown handler so pressing `ArrowDown`/`ArrowUp` moves focus through cards, and `Enter` opens `ApplicationDetailPanel`.

---

## Actionable Opportunities & Priority Matrix

| Priority | Issue / Enhancement | Impact | Effort |
| font-mono | | | |
| **P1** | Add `font-display` (Outfit) class to column header titles and card company headers | High visual polish; completes Dual Register Rule | Low |
| **P2** | Add keyboard focusability (`tabIndex={0}`, `onKeyDown`) to pipeline cards | Accessibility & keyboard-first navigation completeness | Medium |
| **P2** | Add drop position ghost placeholder when dragging cards over non-empty columns | Drag & drop precision and feedback quality | Medium |
| **P3** | Refine hover background contrast on card email links to match `gray-on-color` detector floor | Clean automated detector metric | Low |

---

## Architectural Pitfalls to Avoid

1. **DOM Mutation during Drag**: Avoid updating state synchronously inside `onDragOver` handlers. Keep drag state light (`draggedAppId` and `dragOverColumn`) to prevent frame drops during high-frequency drag events across 5 columns.
2. **State Desynchronization on Drop**: Ensure stage updates compute `stageUpdatedAt: new Date().toISOString()` atomically when a card drops, maintaining accurate stage duration metrics (`calculateDaysInStage`).
