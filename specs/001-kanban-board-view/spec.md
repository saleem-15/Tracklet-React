# Feature Specification: Kanban Board View

**Feature Branch**: `001-kanban-board-view`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Add a Kanban board view for managing job applications"

## Clarifications

### Session 2026-08-03

- Q: Should the specification treat the Kanban board as a fresh feature, removing references to pre-existing codebase components? → A: Yes, treat as clean requirements. The prototype ActivePipelineBoard is a reference for UI/UX patterns to replicate and improve, not a dependency.
- Q: Should the undo toast auto-dismiss after a timeout, and how does undo affect stage duration? → A: Auto-dismiss after 5–8 seconds with an Undo button. On undo, restore both the original status AND the original `stageUpdatedAt` timestamp so the days-in-stage count is preserved without resetting.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Applications as a Kanban Board (Priority: P1)

As a job seeker, I want to see all my active applications organized in a Kanban board with columns representing each pipeline stage, so I can instantly understand where every application stands at a glance.

**Why this priority**: The board view is the core value proposition of this feature — without it, nothing else makes sense. Users need to visually scan their pipeline the way they think about it: stage by stage.

**Independent Test**: Can be fully tested by loading the board view with sample applications and verifying each column displays the correct applications grouped by status. Delivers immediate visual clarity of the pipeline.

**Acceptance Scenarios**:

1. **Given** the user has applications in various statuses, **When** they navigate to the Kanban board view, **Then** they see columns for each active pipeline stage (Wishlist, Applied, Screening, Interview, Offer) with applications sorted into the correct column.
2. **Given** the user has no applications, **When** they navigate to the Kanban board view, **Then** they see a helpful empty state prompting them to add their first application.
3. **Given** the user has applications in terminal statuses (Rejected, Archived), **When** they view the Kanban board, **Then** terminal-status applications are excluded from the main columns, keeping the board focused on active work.

---

### User Story 2 - Move Applications Between Stages via Drag-and-Drop (Priority: P1)

As a job seeker, I want to drag an application card from one column to another to update its status, so I can quickly reflect progress without opening a form or modal.

**Why this priority**: Drag-and-drop is the defining interaction of a Kanban board. Without it, the board is just a read-only grid — the tactile movement is what makes status updates feel instant and natural.

**Independent Test**: Can be tested by dragging an application card from the "Applied" column to the "Screening" column and verifying the application's status updates and the card moves to the target column.

**Acceptance Scenarios**:

1. **Given** an application card is in the "Applied" column, **When** the user drags it to the "Interview" column and drops it, **Then** the application's status updates to "Interview", the card appears in the new column, and an undo toast appears.
2. **Given** the user begins dragging a card, **When** they hover over a valid target column, **Then** that column provides a visual drop indicator (highlight, border change, dashed placeholder) to confirm it's a valid drop zone.
3. **Given** the user drops a card onto its current column, **When** the drop completes, **Then** no status change occurs and no error is shown.
4. **Given** a user triggers "Undo" on a recent status move, **When** the undo completes, **Then** the application returns to its previous status and its original `stageUpdatedAt` date is restored, preserving its exact days-in-stage duration.

---

### User Story 3 - View Application Details from the Board (Priority: P2)

As a job seeker, I want to click on an application card in the Kanban board to see its full details (company, role, notes, contacts, tasks), so I can review and act on specific applications without leaving the board context.

**Why this priority**: The board provides an overview, but users still need to drill into individual applications. This bridges the bird's-eye view with actionable detail.

**Independent Test**: Can be tested by clicking a card on the board and verifying the application detail panel opens with correct information for that application.

**Acceptance Scenarios**:

1. **Given** the user is viewing the Kanban board, **When** they click on an application card, **Then** the application detail panel opens showing the selected application's full information.
2. **Given** the detail panel is open for an application, **When** the user clicks a different card on the board, **Then** the detail panel updates to show the newly selected application.

---

### User Story 4 - See At-a-Glance Card Information (Priority: P2)

As a job seeker, I want each Kanban card to show the most important information without having to click into it, so I can scan the board efficiently.

**Why this priority**: Cards with too little information force unnecessary clicks; cards with too much create visual noise. The right summary makes the board scannable and actionable.

**Independent Test**: Can be tested by verifying each card displays company name, role, days in stage, company logo, platform badge, and contextual metadata chips in a compact format.

**Acceptance Scenarios**:

1. **Given** an application exists with a company logo, **When** displayed on the Kanban board, **Then** the card shows the company logo, company name, role title, the number of days in the current stage, and a platform badge.
2. **Given** an application has been in its current stage for more than 14 days, **When** displayed on the board, **Then** the card visually indicates staleness (e.g., a colored left border and tinted recency badge) so the user knows attention is needed.
3. **Given** an application has tasks assigned, **When** displayed on the board, **Then** the card shows a task completion chip (e.g., "2/3 tasks") with color indicating whether all tasks are complete.
4. **Given** an application has contacts, **When** displayed on the board, **Then** the card shows a contacts count chip.
5. **Given** an application has a contact email, **When** displayed on the board, **Then** the card shows a clickable email chip that opens the user's mail client without navigating away from the board.
6. **Given** an application has notes, **When** displayed on the board, **Then** the card shows a truncated notes snippet (max 2 lines) in a subtle container.

---

### User Story 5 - Column Counts and Pipeline Summary (Priority: P3)

As a job seeker, I want each column header to show the count of applications in that stage, so I can understand the shape of my pipeline without counting cards manually.

**Why this priority**: Lightweight but high-signal — column counts let users spot imbalances (e.g., 15 in Applied, 0 in Interview) at a glance without any interaction.

**Independent Test**: Can be tested by verifying each column header displays an accurate count that updates when applications are added, removed, or moved between columns.

**Acceptance Scenarios**:

1. **Given** the Kanban board is displayed, **When** the user looks at column headers, **Then** each header shows a colored status dot, the column title, and the number of applications in that stage.
2. **Given** the user moves an application from "Screening" to "Interview", **When** the move completes, **Then** the "Screening" count decreases by one and the "Interview" count increases by one, both updating immediately.

---

### Edge Cases

- What happens when a column has a very large number of applications (e.g., 50+)? The column should scroll vertically without breaking the board layout.
- How does the board behave on narrow screens or small browser windows? The board should scroll horizontally with a minimum board width, maintaining column width and readability.
- What happens if two users (e.g., on different devices) update the same application simultaneously? The most recent write wins; the board reflects the latest persisted state on next load.
- What happens if a drag-and-drop is interrupted (e.g., user presses Escape mid-drag)? The drag cancels, the card returns to its original column, and no status update occurs.
- What happens when the user's network is unavailable during a drag-and-drop status change? The UI should optimistically show the move, then revert with an error message if the persistence fails.
- What happens when a column is empty? The column shows a dashed-border placeholder with a message like "No applications in [stage]". When a card is dragged over the empty column, the placeholder text changes to "Drop application here".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a Kanban board with columns for each active pipeline status (Wishlist, Applied, Screening, Interview, Offer).
- **FR-002**: System MUST group application cards into the correct column based on their current status.
- **FR-003**: System MUST support drag-and-drop to move application cards between columns, updating the application's status upon drop.
- **FR-004**: System MUST display each application card with: company logo (or initial avatar fallback), company name, role title, days-in-stage recency badge, and platform badge.
- **FR-005**: System MUST visually indicate stale applications using a tiered system: warning level (>7 days, amber indicator) and critical level (>14 days, rose/red indicator), applied via colored left border and tinted recency badge.
- **FR-006**: System MUST show the count of applications in each column header alongside a colored status dot and column title.
- **FR-007**: System MUST update column counts immediately when applications are moved between columns.
- **FR-008**: System MUST allow users to click an application card to open the application detail panel.
- **FR-009**: System MUST persist status changes made via drag-and-drop through the existing persistence layer (Firestore for authenticated users, localStorage for guests).
- **FR-010**: System MUST record status transitions in the application's status history when a drag-and-drop move occurs.
- **FR-011**: System MUST exclude terminal-status applications (Rejected, Archived) from the main Kanban columns.
- **FR-012**: System MUST provide a helpful empty state when no applications exist or all applications are in terminal statuses.
- **FR-013**: System MUST support horizontal scrolling on narrow viewports to keep all columns accessible.
- **FR-014**: System MUST support vertical scrolling within individual columns when they contain many application cards.
- **FR-015**: System MUST cancel a drag operation gracefully if the user aborts (e.g., presses Escape), returning the card to its original position.
- **FR-016**: System MUST provide visual feedback during drag operations — highlighting the target column and showing a dashed-border drop placeholder when a card is dragged over it.
- **FR-017**: System MUST display contextual metadata chips on cards when available: task completion count (with color-coded completion state), contacts count, and clickable contact email link.
- **FR-018**: System MUST display a truncated notes snippet (max 2 lines) on cards when notes exist.
- **FR-019**: System MUST sort cards within each column by staleness (most days in stage first), so the most urgent items appear at the top.
- **FR-020**: System MUST provide quick-drop zones at the bottom of the board for "Archive" and "Mark Rejected" actions, allowing users to drag a card to terminal status without using a form.
- **FR-021**: Quick-drop zones MUST animate/highlight when a drag is in progress to signal they are available targets, and MUST change appearance when a card is hovered over them.
- **FR-022**: System MUST display an undo toast notification after a drag-and-drop status change (auto-dismissing after 5–8 seconds). The toast MUST include an "Undo" button that reverts the application to its previous status AND restores its original `stageUpdatedAt` timestamp so its days-in-stage duration is preserved.
- **FR-023**: System MUST display a "Needs Attention" banner at the top of the board when one or more applications have been in an active stage for over 14 days, showing the count of stale applications. The banner MUST be dismissible.
- **FR-024**: System MUST support keyboard accessibility: cards must be focusable via Tab and activatable via Enter/Space to open the detail panel.
- **FR-025**: Each card MUST have an accessible label describing the company, role, and current stage for screen readers.
- **FR-026**: The column header row MUST remain sticky (fixed at top) while scrolling within the board.

### Key Entities

- **Application Card**: A visual representation of an Application on the board. Displays summary data (company logo, company name, role, days in stage, platform, task/contact chips, notes snippet). Maps 1:1 to an Application entity.
- **Pipeline Column**: A vertical lane on the board representing one active ApplicationStatus. Contains zero or more Application Cards sorted by staleness. Ordered by the pipeline stage sequence.
- **Board View**: The top-level container that arranges Pipeline Columns horizontally and manages drag-and-drop interactions across them.
- **Quick-Drop Zone**: A special drop target at the bottom of the board for terminal statuses (Archive, Rejected). Visible as dashed-border areas that activate during drag operations.
- **Attention Banner**: A dismissible notification bar at the top of the board that highlights applications needing follow-up.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can visually identify the status of any active application within 3 seconds of opening the Kanban board.
- **SC-002**: Users can update an application's status via drag-and-drop in under 2 seconds (drag + drop + visual confirmation).
- **SC-003**: Column counts update within 500 milliseconds of a status change.
- **SC-004**: 100% of drag-and-drop status changes are persisted correctly and reflected in the application's status history.
- **SC-005**: The board remains usable (no horizontal overflow without scrolling, no broken layouts) on viewports as narrow as 768px.
- **SC-006**: Stale applications are visually distinguishable from non-stale applications without requiring any user interaction, using a two-tier warning system (amber >7 days, rose >14 days).
- **SC-007**: Users can undo a drag-and-drop status change within the 5–8 second toast window, restoring exact status and original days-in-stage timestamp.

## Assumptions

- The Kanban board uses five active pipeline stages in fixed order: Wishlist, Applied, Screening, Interview, Offer.
- Terminal statuses (Rejected, Archived) are intentionally excluded from columns but accessible via quick-drop zones at the bottom of the board.
- The stale application threshold uses two tiers: >7 days (warning/amber) and >14 days (critical/rose).
- The board view is accessed via the "Pipeline" tab in the application navigation.
- The application detail panel is used when a card is clicked — no new detail view is needed.
- Mobile/touch drag-and-drop is out of scope for v1; the board targets desktop/pointer-based interactions.
- A UI prototype exists as a reference for visual patterns and interactions (column layout, card design, drag feedback, quick-drop zones, attention banner, undo toast). The implementation should replicate and refine these patterns.
