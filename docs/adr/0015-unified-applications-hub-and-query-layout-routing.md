# ADR 0015: Unified `/applications` Hub and Query-State Layout Routing

## Status
Accepted

## Context
Previously, Tracklet maintained two distinct top-level application views:
- `/all-applications`: A dense tabular grid designed for bulk triage, search, column sorting, and CSV exports.
- `/pipeline`: A visual Kanban board designed for stage-by-stage hiring pipeline progression and drag-and-drop transitions.

This routing topology caused significant architectural, state-management, and user-experience issues:
1. **State & Filter Fragmentation**: Switching from table to board view wiped out active filters (e.g. searching for a company or filtering by "Remote" was lost when navigating between `/all-applications` and `/pipeline`).
2. **Duplicate Query Pipelines**: Both views maintained redundant application filtering, sorting, and URL sync logic, leading to subtle behavioral discrepancies.
3. **Route Proliferation**: Persistent sidebar navigation dedicated two top-level slots to the same underlying dataset (`Application[]`), violating the Calm Command Center design philosophy (ADR 0010).
4. **Link Sharing Limitations**: Users could not share a direct link that opened the pipeline board with a specific filter or selected job details drawer without complex route orchestration.

---

## Decision

We unify `/all-applications` and `/pipeline` into a single **Unified Applications Hub** located at `/applications`:

### 1. Canonical Route with Layout Query State
- The single source of truth for viewing job applications is `/applications`.
- Layout is governed by the URL search parameter: `?layout=table` (default) or `?layout=board`.
- Layout switches mutate the URL search parameter in-place without triggering full page unmounts or resetting active search/filter criteria.
- Ephemeral user preference is persisted in `localStorage` under `tracklet_applications_layout_pref` so returning users resume their preferred view mode automatically.

### 2. Backward Compatibility & Redirect Aliases
- Direct navigation to `/all-applications` is permanently redirected via client-side routing to `/applications?layout=table`.
- Direct navigation to `/pipeline` is permanently redirected to `/applications?layout=board`.
- All internal navigation links, Chrome Extension links, and telemetry events are updated to the canonical `/applications` path.

### 3. Unified Filter & Selection Pipeline
- Both Table and Board layouts consume identical filtered datasets from `ApplicationsFilterBar` and `FilterToolbar`.
- Applying a filter in Table view persists cleanly when switching to Board view, and vice versa.
- Selection state (`?selected=<id>`) operates identically across both layouts, opening the unified `ApplicationDetailPanel`.

---

## Consequences

### Positive
- **Zero State Loss**: Users toggle freely between Table and Board views while retaining search queries, status filters, and active pagination/selections.
- **Single Component Tree**: Consolidated layout orchestration inside `UnifiedApplicationsHub.tsx` eliminates duplicate data pipelines and simplifies maintenance.
- **Cleaner Navigation**: Reduces sidebar footprint to a single "Applications" tab, aligning with ADR 0010.
- **Deep-Linking**: Direct URLs such as `/applications?layout=board&loc=Remote` reliably reproduce the exact view across sessions.

### Negative / Trade-offs
- Components within Table and Board must remain decoupled from routing primitives and receive layout props cleanly from `UnifiedApplicationsHub.tsx`.
- Legacy bookmarks to `/pipeline` incur a 0ms redirect to `/applications?layout=board`. This redirect is transparent to end users.
