# Widget Contracts: Kanban Board View (Flutter)

## 1. `KanbanBoardPage` — Root Page Widget

`ConsumerWidget` that orchestrates the full Kanban board layout.

**Location**: `lib/features/kanban/presentation/pages/kanban_board_page.dart`

```dart
class KanbanBoardPage extends ConsumerWidget {
  // No constructor parameters — all data comes from Riverpod providers.
}
```

### Layout Contract
- `Scaffold` with `AppBar` (title: "Pipeline Kanban Board", back arrow to `/applications`).
- Below AppBar: `AttentionBanner` (conditionally rendered if stale count > 0 and not dismissed).
- Main body: `SingleChildScrollView(scrollDirection: Axis.horizontal)` containing a `Row` of `KanbanColumn` widgets for each `activeKanbanStage`.
- Bottom: `Row` of two `QuickDropZone` widgets (Archive, Rejected).
- On successful drag-drop: shows undo `SnackBar` via `ScaffoldMessenger` with 6-second auto-dismiss.

### Provider Dependencies
- `kanbanColumnsProvider` — `Map<ApplicationStatus, List<Application>>`
- `kanbanDragStateProvider` — `String?` (currently dragged app ID)
- `lastMovedNoticeProvider` — `LastMovedNotice?` (for undo)
- `currentUserProvider` — auth user for repository calls
- `applicationRepositoryProvider` — for `changeStatus()` and `updateApplication()`

---

## 2. `AttentionBanner` — Stale Applications Alert

Stateless widget that shows a dismissible amber banner when stale applications exist.

**Location**: `lib/features/kanban/presentation/widgets/attention_banner.dart`

```dart
class AttentionBanner extends StatelessWidget {
  final int staleCount;
  final VoidCallback onDismiss;

  const AttentionBanner({
    super.key,
    required this.staleCount,
    required this.onDismiss,
  });
}
```

### Visual Contract
- Amber-tinted container with a pulsing dot, bold "Attention Needed:" label, stale count, and a close (`X`) `IconButton`.
- Hidden when `staleCount == 0`.

---

## 3. `KanbanColumn` — Droppable Stage Lane

`ConsumerWidget` wrapping a `DragTarget<String>` that accepts application ID drops.

**Location**: `lib/features/kanban/presentation/widgets/kanban_column.dart`

```dart
class KanbanColumn extends ConsumerWidget {
  final ApplicationStatus status;
  final List<Application> applications;

  const KanbanColumn({
    super.key,
    required this.status,
    required this.applications,
  });
}
```

### Layout Contract
- Fixed width (280dp) `Container` with rounded corners and neutral border.
- **Header**: Status dot (color from `status.color`) + display name + count badge (background from `status.backgroundColor`).
- **Body**: Wrapped in `DragTarget<String>`:
  - `onWillAcceptWithDetails`: Returns `true` if dragged app ID exists and status differs. Highlights column with blue border.
  - `onAcceptWithDetails`: Triggers status change via `KanbanBoardPage`'s handler (passed via callback or provider).
  - Empty state: dashed-border container with "Empty stage" text (changes to "Drop here" when drag-hovering).
  - Non-empty: `ListView.builder` of `KanbanCard` widgets.

---

## 4. `KanbanCard` — Draggable Application Card

`ConsumerWidget` wrapped in `LongPressDraggable<String>` for cross-column drag-and-drop.

**Location**: `lib/features/kanban/presentation/widgets/kanban_card.dart`

```dart
class KanbanCard extends ConsumerWidget {
  final Application application;
  final VoidCallback onTap;

  const KanbanCard({
    super.key,
    required this.application,
    required this.onTap,
  });
}
```

### Drag Contract
- `LongPressDraggable<String>(data: application.id, ...)`:
  - `feedback`: Semi-transparent elevated copy of the card at constrained width.
  - `childWhenDragging`: Same card at `opacity: 0.3`.
  - `onDragStarted`: Sets `kanbanDragStateProvider` to `application.id`.
  - `onDragEnd`: Clears `kanbanDragStateProvider` to `null`.

### Visual Contract
- **Top row**: Company name (bold, truncated) + `PopupMenuButton` for tap-to-advance status change.
- **Role row**: Role title (body text, truncated).
- **Footer row**: Platform badge (monospace chip) + days-in-stage recency badge.
- **Staleness borders**:
  - Normal: Standard `AppColors.neutralBorder`.
  - Warning (>7d): Left border accent in amber (`AppColors.statusScreening`).
  - Critical (>14d): Left border accent in rose (`AppColors.statusRejected`).
- **Notes snippet** (if `application.notes` is non-null): Truncated to 2 lines in a subtle container below role.

### Accessibility Contract
- Card wrapped in `InkWell` with `onTap` callback.
- `Semantics(label: '${application.company}, ${application.role}, in ${application.status.displayName}')`.

---

## 5. `QuickDropZone` — Terminal Status Drop Target

Stateless widget wrapping a `DragTarget<String>` for Archive or Rejected.

**Location**: `lib/features/kanban/presentation/widgets/quick_drop_zone.dart`

```dart
class QuickDropZone extends StatelessWidget {
  final ApplicationStatus targetStatus; // ApplicationStatus.archived or .rejected
  final bool isDragActive;              // true when any card is being dragged
  final ValueChanged<String> onDrop;    // callback with dropped app ID

  const QuickDropZone({
    super.key,
    required this.targetStatus,
    required this.isDragActive,
    required this.onDrop,
  });
}
```

### Visual Contract
- Dashed-border rounded container.
- **Idle** (no drag active): Subtle neutral styling with icon (Archive or XCircle) + label text.
- **Drag active** (card is being dragged somewhere): Pulsing border in amber (Archive) or rose (Rejected) to signal availability.
- **Drag hovering** (card is over this zone): Solid colored background + "Release to Archive" / "Release to Mark Rejected" label.

### Drag Contract
- `DragTarget<String>(onAcceptWithDetails: (details) => onDrop(details.data))`.
