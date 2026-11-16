# DDR 0001: Canvas Ambient Calm and Notification Severity Hierarchy

## Status
Accepted

## Context
In early iterations of the Active Pipeline Kanban board (`ActivePipelineBoard.tsx`), a full-width yellow warning banner was rendered across the top edge of the board whenever applications remained in active stages for over 14 days:
```tsx
<div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2.5 flex items-center justify-between text-xs text-amber-900 ...">
  <strong>Attention Needed:</strong> {staleApps.length} applications have been in active hiring stages for over 14 days without updates.
</div>
```

While well-intentioned, this visual affordance introduced severe UX, cognitive, and design-system regressions:

1. **Severity Inflation (False Alarm Syndrome)**:
   In high-craft operational tools (Linear, GitHub, Stripe, Raycast), full-width ambient warning banners across a primary canvas are strictly reserved for **catastrophic, account-wide, or blocking system states** (e.g., failed subscription billing, unverified email address, degraded offline network connectivity).
   Applying this high-severity affordance to routine hiring delays—where companies routinely take two to three weeks to coordinate interview loops—causes cognitive alarm and trains users to reflexively dismiss notices ("banner blindness").

2. **Fractured 3-Tier Canvas Contrast**:
   Tracklet enforces a strict 3-tier elevation system:
   - Level 0 (`bg-slate-50/60`): Calm, distraction-free foundation canvas.
   - Level 1 (`bg-slate-100/90`): Structural column tracks with integrated lane headers.
   - Level 2 (`bg-white`): Crisp, elevated draggable cards with 1px border.
   A bright amber horizontal strip permanently bisects this contrast hierarchy, visually decapitating column headers and cluttering the viewport.

3. **Zero Actionable Coupling**:
   The banner notified candidates of stale items but provided no 1-click query coupling. It could not filter the board to isolate stale cards, nor could it highlight the affected items. It functioned purely as decorative ambient noise with a dismiss button.

4. **In-Context Redundancy**:
   Each `PipelineCard` already computes days in stage (`calculateDaysInStage(app.stageUpdatedAt)`) and displays an in-context calm indicator (`18d stale`) in the card footer alongside company logos and job titles. An ambient banner needlessly duplicated this data away from the point of interaction.

---

## Decision

We eliminate all full-width ambient warning banners from primary operational canvases and formalize the **Tracklet 3-Tier Notification & Alert Hierarchy**:

```
┌────────────────────────────────────────────────────────────────────────┐
│               TRACKLET 3-TIER NOTIFICATION HIERARCHY                   │
├─────────┬──────────────────────────┬───────────────────────────────────┤
│ Tier    │ Mechanism                │ Purpose & Scope                   │
├─────────┼──────────────────────────┼───────────────────────────────────┤
│ Tier 1  │ Blocking Modal Dialog    │ Irreversible destructive actions  │
│         │                          │ (Delete account, reset workspace) │
├─────────┼──────────────────────────┼───────────────────────────────────┤
│ Tier 2  │ Ephemeral Toast /        │ Immediate action receipts (3-6s)  │
│         │ Snackbar (`addToast`)    │ with reversible Undo callbacks    │
├─────────┼──────────────────────────┼───────────────────────────────────┤
│ Tier 3  │ In-Context Entity Badges │ Calm, localized data signaling    │
│         │ (Card pills, row status) │ at the exact point of interaction │
└─────────┴──────────────────────────┴───────────────────────────────────┘
```

### 1. Ban on Ambient Canvases Banners
Full-width alert or announcement banners are strictly prohibited inside primary operational views (`ActivePipelineBoard`, `AllApplicationsTable`, `Contacts`). Canvases must remain peaceful and focused on user data.

### 2. Staleness is Surfaced at the Point of Interaction (Tier 3)
Candidate staleness is displayed directly where action occurs:
- **Kanban Board**: Displayed within `PipelineCard` via the calm, non-pulsing `<span>{daysInStage}d stale</span>` pill in the card footer with full tooltip context.
- **Table View**: Displayed in the `Stage History` column and sortable by recency.
- **Filter Bar**: Stale or aging applications can be isolated using the date filters in `FilterToolbar`.

### 3. Account-Level Warnings Reserved for App Shell
Only true account-level system blockers (e.g. quota enforcement limits or email verification) may render inline banners, and they must appear at the top-level application shell (`App.tsx`), never inside nested workspace views.

---

## Consequences

### Positive
- **Executive Command Center Calm**: Canvases maintain calm visual rhythm and uncompromised 3-tier elevation contrast.
- **Elimination of False Urgency**: Users are not pressured by persistent yellow alarm strips during normal recruiting turnaround times.
- **Direct Point-of-Action Visibility**: Staleness information is positioned directly on the draggable card or table row where candidates take action.
- **Single Source of Truth**: Removes duplicate calculation loops and dismiss state management in board components.

### Negative / Trade-offs
- Users cannot see a single aggregate tally of stale applications across all columns at a glance without reviewing the cards or applying a filter. This trade-off is intentionally accepted in favor of focus and serenity.

---

## Decision Record Governance
- **Immutability Contract**: This DDR is an immutable historical record of the design paradigm adopted on this date.
- **Evolution**: If future user research or product requirements justify changes to notification presentation, this document must NOT be edited to rewrite history. A new record (`DDR-0002`) must be authored, marking this document as `Status: Superseded by DDR-0002`.
