# Research: Kanban Board View (Flutter)

## 1. Drag & Drop Implementation Strategy

### Decision
Use Flutter's built-in `LongPressDraggable<String>` + `DragTarget<String>` widgets. The draggable payload is the application ID (`String`).

### Rationale
- **Zero dependency**: `LongPressDraggable` and `DragTarget` are part of the Flutter framework itself — no third-party packages needed.
- **Cross-platform**: Works on both pointer devices (web/desktop) and touch screens (mobile) with identical APIs. `LongPressDraggable` is preferred over `Draggable` because on mobile, a plain `Draggable` intercepts the scroll gesture — `LongPressDraggable` requires a long-press to initiate dragging, letting scrolling work normally.
- **Built-in feedback widget**: `LongPressDraggable.feedback` renders a "ghost" card that follows the pointer during drag, giving clear visual feedback.
- **Lightweight integration with Riverpod**: `DragTarget.onAcceptWithDetails` triggers a Riverpod provider/usecase call to persist the status change.

### Alternatives Considered
- `super_drag_and_drop` package: Feature-rich but adds dependency complexity for a use case that Flutter's built-in widgets handle cleanly.
- `ReorderableListView`: Designed for single-list reordering, not cross-list column-to-column moves.
- Manual `GestureDetector` + `Overlay`: Maximum control but significantly more code for standard drag-and-drop behavior.

### Key Implementation Notes
- Wrap each `KanbanCard` in `LongPressDraggable<String>(data: application.id, ...)`.
- Wrap each `KanbanColumn` body and each `QuickDropZone` in `DragTarget<String>(onAcceptWithDetails: ...)`.
- During drag: use `DragTarget.onWillAcceptWithDetails` to toggle a highlight state on the column (e.g., add a blue border).
- The `feedback` widget should be a semi-transparent version of the card with elevation, constrained to the card's width.
- The `childWhenDragging` should show the original card at reduced opacity (0.3) to indicate its origin position.

---

## 2. State Management Strategy

### Decision
Extend existing Riverpod providers in `kanban_provider.dart`:
- `kanbanColumnsProvider` (existing): Groups applications by `ApplicationStatus`, filtered to `isInKanban == true`. **Enhancement**: sort each column's list by staleness (most-stale first).
- `kanbanDragStateProvider` (new `StateProvider`): Tracks the currently dragged application ID for visual feedback on other widgets (quick-drop zone activation).

The undo mechanism uses a `StateProvider<LastMovedNotice?>` that stores the pre-move snapshot. The `UndoSnackBar` reads this provider and, on "Undo" tap, calls `changeStatus()` with the old status AND calls `updateApplication()` to restore the original `updatedAt`/`stageUpdatedAt` timestamp.

### Rationale
- Riverpod is already the state management solution in this project (`flutter_riverpod`).
- `kanbanColumnsProvider` is already a derived provider from `rawApplicationsStreamProvider` — we only need to add sorting logic.
- A `StateProvider<String?>` for drag state is the simplest possible ephemeral state — it doesn't need to survive navigation or persist.

---

## 3. Undo State & Timestamp Preservation Pattern

### Decision
Store a transient `LastMovedNotice` in a Riverpod `StateProvider`:
```dart
class LastMovedNotice {
  final String appId;
  final String company;
  final ApplicationStatus fromStatus;
  final ApplicationStatus toStatus;
  final DateTime previousUpdatedAt; // The updatedAt timestamp BEFORE the move
}
```

When a drag-drop move occurs:
1. Capture the application's current `updatedAt` into `previousUpdatedAt`.
2. Call `repository.changeStatus(uid, appId, newStatus)` which sets the new status and `updatedAt = DateTime.now()`.
3. Show a `SnackBar` for 6 seconds with "Moved [Company] to [Status]" and an "Undo" action.
4. If "Undo" is tapped within the 6-second window:
   - Call `repository.changeStatus(uid, appId, fromStatus)` to revert the status.
   - Call `repository.updateApplication(uid, app.copyWith(updatedAt: previousUpdatedAt))` to restore the original timestamp so days-in-stage is not reset.
   - Clear the `lastMovedNoticeProvider`.

### Rationale
- Fulfills the user's requirement: undo must restore the exact days-in-stage duration.
- The existing `Application` entity does not have a dedicated `stageUpdatedAt` field — it uses `updatedAt` as a proxy. The undo mechanism restores `updatedAt` to its previous value.
- `SnackBar` is Flutter's built-in transient notification widget with native auto-dismiss and action button support — no custom toast widget needed.

### Open question for implementation
The existing `Application` entity uses `updatedAt` as a general field. If a dedicated `stageUpdatedAt` field is added (per the React prototype's data model), the undo logic should restore that field instead. This can be addressed during implementation if the data model is extended.

---

## 4. Staleness Calculation

### Decision
Use the existing `Application.isStale` getter as a baseline, but extend staleness to be a **tiered system** calculated from `dateApplied ?? createdAt`:

```dart
int get daysInCurrentStage {
  final lastDate = dateApplied ?? createdAt;
  return DateTime.now().difference(lastDate).inDays;
}

StalenessLevel get stalenessLevel {
  final days = daysInCurrentStage;
  if (days > 14) return StalenessLevel.critical;
  if (days > 7) return StalenessLevel.warning;
  return StalenessLevel.normal;
}
```

- **Normal** (≤7 days): Standard card styling.
- **Warning** (>7 days): Amber left border accent + amber recency badge.
- **Critical** (>14 days): Rose left border accent + rose recency badge + counted in "Needs Attention" banner.

### Rationale
- The existing `isStale` getter only checks `applied` status and uses `reminderOverrideDays ?? 7`. The spec requires all active statuses to show tiered staleness.
- Extension methods or getters on `Application` keep the logic pure and testable.

---

## 5. Component Decomposition

### Decision
Split the kanban board into modular widgets under `features/kanban/presentation/widgets/`:

| Widget | Responsibility | Approximate Lines |
|--------|---------------|-------------------|
| `KanbanBoardPage` | Scaffold, AppBar, layout orchestrator | ~80 |
| `AttentionBanner` | Stale apps count + dismissible bar | ~60 |
| `KanbanColumn` | Column header + DragTarget + card list | ~120 |
| `KanbanCard` | LongPressDraggable + card content + staleness styling | ~140 |
| `QuickDropZone` | DragTarget for Archive/Rejected with animated borders | ~70 |

### Rationale
- All widgets stay well under 300 lines.
- Each widget has a single visual/interaction responsibility.
- The undo mechanism uses Flutter's built-in `ScaffoldMessenger.showSnackBar()` — no custom widget file needed.
