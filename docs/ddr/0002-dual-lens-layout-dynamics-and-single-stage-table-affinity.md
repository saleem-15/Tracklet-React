# DDR 0002: Dual-Lens Layout Dynamics and Single-Stage Table Affinity

## Status
Accepted

## Context
Following the consolidation of Tracklet's application views into the Unified Applications Hub (`/applications?layout=table|board`, ADR 0015), users switch between two distinct analytical lenses over the same underlying job application dataset:
1. **The Board Lens (`layout=board`)**: A spatial, stage-by-stage Kanban pipeline designed for active multi-stage progression and drag-and-drop workflow.
2. **The Table Lens (`layout=table`)**: A dense, tabular ledger designed for multi-dimensional sorting, bulk scanning, and stage-isolated audit triage.

Early iterations exposed three UX and interaction design failure modes:

### 1. The "Ghost Town" Kanban Fallacy
In a Kanban board, the horizontal spatial columns *are* the lifecycle stages (`Saved`, `Applied`, `Screening`, `Interview`, `Offer`). When a user applies a status filter isolating a single stage (e.g., `status=Interview` or `status=Archived`), a traditional board renders one populated column flanked by four completely empty columns displaying redundant "No applications in this stage" empty states.
This visually breaks the operational canvas, creates false impressions of missing data, and wastes over 80% of horizontal screen real estate. Single-stage filtering expresses an audit, evaluation, or triage intent—tasks best served by a tabular ledger, not a multi-stage pipeline.

### 2. The Board Return Lockout Trap
When a user finishes triaging an isolated stage in Table view and clicks the "Board" switcher to return to their visual pipeline, leaving the active filter set to that single stage (e.g., `status=Rejected`) causes the Board to mount in a broken "ghost town" state. Users were forced to manually locate and clear the filter chip to restore their pipeline.

### 3. The "Expanding Island" Button Morph Gimmick
In early filter toolbar prototypes, clicking the filter trigger caused the button itself to expand and morph into the dropdown panel (analogous to mobile Dynamic Island animations). In desktop productivity software:
- Morphing swallowed the user's spatial anchor point (the button vanished into the panel).
- Corner radius and shadow transitions produced noticeable visual bleed and double-border artifacts.
- It signaled an experimental "AI tech-demo" gimmick rather than a serious, grounded executive command center.

---

## Decision

We establish the **Dual-Lens Layout & Filter Invariants**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   DUAL-LENS INTERACTION INVARIANTS                     │
├────────────────────────────────┬───────────────────────────────────────┤
│ User Action                    │ System Response & Invariant           │
├────────────────────────────────┼───────────────────────────────────────┤
│ Filter by any single stage     │ Auto-switch `layout` to `'table'`.    │
│ (`Saved`, `Applied`, etc.)     │ Display subtle `Table` hint badge.    │
├────────────────────────────────┼───────────────────────────────────────┤
│ Click "Board" layout switcher  │ If status is single stage, auto-reset │
│ from single-stage filter       │ status to `'Active'` (5 stages).      │
├────────────────────────────────┼───────────────────────────────────────┤
│ Click Filter trigger button    │ Button stays solid white anchor;      │
│                                │ Popover mounts cleanly underneath.    │
├────────────────────────────────┼───────────────────────────────────────┤
│ Switch Board <-> Table layout  │ Spatial layering (`absolute inset-0`) │
│                                │ with fast 100ms crossfade.            │
└────────────────────────────────┴───────────────────────────────────────┘
```

### 1. Single-Stage $\rightarrow$ Table Affinity
- Selecting *any* individual stage (`Saved`, `Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, `Archived`) in `ApplicationsFilterBar.tsx` automatically switches the active layout to `'table'`.
- Filter options for individual stages display an explicit typographic hint (`hint: 'Table'`) within the 2-step drilldown menu, setting clear expectations before selection.
- Multi-stage umbrella filters (`Active` and `All`) remain fully compatible with both Board and Table views.

### 2. Board Return Active Reset
- When switching from Table to Board view (via the segmented switcher or URL navigation), if the current filter is locked to an isolated stage (`filter.status !== 'All' && filter.status !== 'Active'`), the status filter is automatically reset to `'Active'`.
- This guarantees that the Board view *always* mounts with all 5 active columns populated.

### 3. Anchored Popover Surface (Spatial Grounding)
- The filter button remains a stable, grounded anchor styled with `UI_TOKENS.btnOutline` (`bg-white`, `border-slate-200`, `shadow-2xs`).
- The popover panel mounts directly below the trigger at `top: calc(100% + 6px)` via `AnimatePresence`.
- Tactile craft is focused *inside* the menu: preserving the 2-step in-place drilldown (Field $\rightarrow$ Value) and the magnetic sliding hover container (`styles.highlight`) that glides between items without flickering.

### 4. Spatial View Transitions (`absolute inset-0`)
- Dual-lens view transitions in `WorkspaceContent.tsx` use absolute spatial layering (`className="absolute inset-0 flex flex-col min-h-0"`) wrapped in `<AnimatePresence initial={false}>` with a 100ms crossfade.
- Banned: `mode="wait"` is forbidden for view switches as it introduces layout-collapse flashes and unmount delays that break synchronous component testing.

---

## Consequences

### Positive
- **Zero "Ghost Town" Boards**: Eliminates empty-column waste and preserves the semantic integrity of Kanban columns as progression stages.
- **Intent-Driven Layout Routing**: Users are automatically routed to the optimal lens for their task (auditing a single stage $\rightarrow$ Table; managing progression $\rightarrow$ Board).
- **Spatial Calm & Grounding**: Anchoring popovers below tactile buttons preserves muscle memory and avoids disorienting UI morphs.
- **Instant Crossfade Without CLS**: Spatial layering eliminates layout jumps between view modes while maintaining 100% Vitest test determinism.

### Negative / Trade-offs
- Users intentionally wishing to view a 1-column Kanban board cannot do so; they must use the Table view for single-stage inspections. User research and product invariants confirm this aligns with candidate workflows.
