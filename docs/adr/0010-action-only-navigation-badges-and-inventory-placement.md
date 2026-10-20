# ADR 0010: Action-Only Navigation Badges and Contextual Inventory Placement

## Status
Accepted

## Context
Persistent sidebar navigation in web applications serves as a primary orientation anchor and task-switching control. In early iterations of Tracklet, raw collection inventory numbers were rendered on primary navigation tabs:
- **All Applications**: Displayed `{totalCount}` (e.g. `25`), and a blue dot when collapsed.
- **Active Pipeline**: Displayed `{activePipelineCount}` (e.g. `21`), and a blue dot when collapsed.
- **Contacts & Mentors**: Displayed `{contacts.length}` (e.g. `12`) alongside pending follow-ups (`followUpDueCount`).

This pattern produced serious usability, cognitive, and state-synchronization issues:
1. **Semantic Inversion (Inventory vs. Urgency)**: In modern product design (Linear, GitHub, Raycast, Slack), badges on persistent navigation universally signify **"Action Required / Attention Needed"** (e.g., 3 unread messages, 2 reviews requested, 1 expiring assignment). Static inventory counts induce false urgency and cognitive clutter, training users to ignore badges altogether ("badge blindness").
2. **Context & Filter Desynchronization**: When a user applies a status or platform filter (e.g., Status: "Offer" -> 2 items shown), the table displays 2 items and the toolbar counter reports `2 items`, yet the persistent sidebar badge declared `25`. This disparity led to constant user friction and bug reports (such as Issue #54).
3. **Board Redundancy**: In Kanban views, every stage column already has a dedicated counter (`Applied: 12`, `Screening: 4`, `Interview: 3`, `Offer: 2`). A duplicate `21` in the sidebar provided zero actionable insight.
4. **Phantom Collapsed Notifications**: Collapsing the sidebar to an icon rail caused any non-zero entity count to render an alarming blue notification dot (`bg-blue-600`), falsely notifying candidates of unread events.

---

## Decision

We adopt the **Calm Command Center & Action-Only Navigation Badge Philosophy**:

### 1. Navigation is an Orientation Anchor, Not a Database Tally
Persistent navigation tabs must remain calm, scannable, and clutter-free. Raw entity tallies are strictly prohibited on primary navigation items (`All Applications`, `Active Pipeline`, `Analytics`, etc.).

### 2. The Action-Only Badge Rule
Badges on navigation tabs are strictly reserved for **time-sensitive, actionable events** requiring candidate attention:
- **Contacts & Mentors**: Displays an amber warning badge (`followUpDueCount`) **only** when there are follow-ups due within the configured threshold (`followUpDueCount > 0`). When all relationships are up to date, the tab renders completely clean (no static badge).
- **Settings**: Displays an amber alert indicator **only** when tasks or applications are nearing expiration.
- **Zero-State / Up-to-Date State**: No badge is rendered when no urgent action is pending (`no badge = peace of mind`).

### 3. Contextual Inventory Placement
Entity inventory counts belong strictly within the active workspace where the candidate is actively viewing and manipulating those records:
- **Table Toolbar**: Render dynamic item counts alongside active filters (`25 items`, or `3 of 25 items` when filtered) directly above the data grid.
- **Kanban Column Headers**: Render stage tallies above each respective swimlane (`Interview · 3`).
- **Analytics & Stats**: Metrics and pipeline volumes belong in contextual KPI cards and conversion funnels, where numbers have analytical meaning.

---

## Consequences

### Positive
- **Zero Desynchronization Bugs**: Permanent elimination of filter-versus-sidebar count mismatches (eliminates edge cases like Issue #54).
- **Reduced Candidate Cognitive Load**: Eliminates false urgency and subconscious anxiety caused by constant tallies.
- **High-Signal Alerts**: When an amber pulse badge appears on the sidebar, the user immediately knows an actual deadline or follow-up requires action.
- **Consistent Collapsed Rail**: Collapsed icon navigation only displays alert pings for real tasks/follow-ups, never for existing database records.

### Negative / Trade-offs
- Users cannot see their total application count at a glance from unrelated tabs (e.g., while in Settings or Contacts) without glancing at the TopBar or Analytics view. This trade-off is accepted in favor of a focused, distraction-free interface.
