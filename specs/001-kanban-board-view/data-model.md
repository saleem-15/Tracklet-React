# Data Model: Kanban Board View (Flutter)

## 1. Existing Domain Entities (Consumed)

### `Application` (`lib/features/applications/domain/entities/application.dart`)
The primary entity displayed as cards on the Kanban board.

```dart
class Application {
  final String id;
  final String company;
  final String role;
  final String platform;          // e.g., 'LinkedIn', 'Indeed', 'Referral'
  final ApplicationStatus status; // Enum: saved, applied, screening, interview, offer, rejected, archived
  final DateTime? dateApplied;    // Null for saved/wishlist items
  final String? jobLink;
  final String? notes;
  final int? reminderOverrideDays;
  final DateTime createdAt;
  final DateTime updatedAt;       // Updated on any change, including status transitions
}
```

**Notable**: The entity does NOT currently have a dedicated `stageUpdatedAt` field. Staleness is calculated from `dateApplied ?? createdAt`. If a `stageUpdatedAt` field is added in future, staleness calculations and undo logic should use it instead.

### `ApplicationStatus` (`lib/features/applications/domain/entities/application_status.dart`)
Enum with rich behavior properties used to drive Kanban column layout.

```dart
enum ApplicationStatus {
  saved, applied, screening, interview, offer, rejected, archived;

  String get displayName;       // 'Saved', 'Applied', etc.
  int? get displayOrder;        // 1–5 for active, null for terminal
  bool get isInKanban;          // true for active stages (saved–offer)
  bool get isTerminal;          // true for rejected, archived
  Color get color;              // Status dot/accent color from AppColors
  Color get backgroundColor;   // Light tinted background from AppColors
}
```

Active Kanban columns (fixed order per `displayOrder`):
1. `saved` ("Saved") — `displayOrder: 1`
2. `applied` ("Applied") — `displayOrder: 2`
3. `screening` ("Screening") — `displayOrder: 3`
4. `interview` ("Interview") — `displayOrder: 4`
5. `offer` ("Offer") — `displayOrder: 5`

Terminal statuses (excluded from columns, targetable via Quick-Drop Zones):
- `rejected` — `isTerminal: true`, `isInKanban: false`
- `archived` — `isTerminal: true`, `isInKanban: false`

### `StatusHistoryEntry` (`lib/features/applications/domain/entities/status_history_entry.dart`)
Recorded when status changes occur (including drag-and-drop moves).

```dart
class StatusHistoryEntry {
  final String id;
  final ApplicationStatus? fromStatus;
  final ApplicationStatus toStatus;
  final DateTime timestamp;
}
```

---

## 2. Existing Repository Contract (Consumed)

### `ApplicationRepository` (`lib/features/applications/domain/repositories/application_repository.dart`)

```dart
abstract class ApplicationRepository {
  Stream<List<Application>> watchApplications(String uid);
  Stream<List<StatusHistoryEntry>> watchStatusHistory(String uid, String appId);
  Future<Either<Failure, Application>> addApplication(String uid, Application application);
  Future<Either<Failure, void>> updateApplication(String uid, Application application);
  Future<Either<Failure, void>> changeStatus(String uid, String appId, ApplicationStatus newStatus);
  Future<Either<Failure, void>> deleteApplication(String uid, String appId);
  Future<Either<Failure, void>> bulkArchive(String uid, List<String> appIds);
  Future<Either<Failure, void>> bulkDelete(String uid, List<String> appIds);
}
```

**Key methods for Kanban:**
- `changeStatus()` — called on drag-and-drop (including undo).
- `updateApplication()` — called during undo to restore original `updatedAt` timestamp.
- `watchApplications()` — the `kanbanColumnsProvider` consumes this stream.

---

## 3. Feature Presentation State (New / Modified)

### `kanbanColumnsProvider` (MODIFY — `lib/features/kanban/presentation/providers/kanban_provider.dart`)
Existing provider that groups applications by status. Must be enhanced to:
- Sort each column's application list by staleness (most days-in-stage first).

### `activeKanbanStages` (Existing constant)
```dart
const activeKanbanStages = [
  ApplicationStatus.saved,
  ApplicationStatus.applied,
  ApplicationStatus.screening,
  ApplicationStatus.interview,
  ApplicationStatus.offer,
];
```

### `kanbanDragStateProvider` (NEW)
Tracks the ID of the currently dragged application for cross-widget visual feedback (e.g., activating quick-drop zone pulsing).

```dart
final kanbanDragStateProvider = StateProvider<String?>((ref) => null);
```

### `LastMovedNotice` (NEW — ephemeral state for undo)
Transient data captured when a drag-and-drop move completes. Used by the undo SnackBar.

```dart
class LastMovedNotice {
  final String appId;
  final String company;
  final ApplicationStatus fromStatus;
  final ApplicationStatus toStatus;
  final DateTime previousUpdatedAt; // Restored on undo to preserve days-in-stage
}

final lastMovedNoticeProvider = StateProvider<LastMovedNotice?>((ref) => null);
```

---

## 4. Business Rules & Derived Data

### Staleness Calculation
Derived from `Application.dateApplied ?? Application.createdAt`:

```dart
extension ApplicationStaleness on Application {
  int get daysInCurrentStage {
    final lastDate = dateApplied ?? createdAt;
    return DateTime.now().difference(lastDate).inDays;
  }

  StalenessLevel get stalenessLevel {
    if (status.isTerminal) return StalenessLevel.normal;
    final days = daysInCurrentStage;
    if (days > 14) return StalenessLevel.critical;
    if (days > 7) return StalenessLevel.warning;
    return StalenessLevel.normal;
  }
}

enum StalenessLevel { normal, warning, critical }
```

- **Normal** (≤7 days): Standard card styling.
- **Warning** (>7 days): Amber left border accent + amber recency badge.
- **Critical** (>14 days): Rose left border accent + rose recency badge + counted in "Needs Attention" banner.

### Column Sorting
Applications within each column sorted by staleness descending (most urgent at top):
```dart
columnApps.sort((a, b) => b.daysInCurrentStage.compareTo(a.daysInCurrentStage));
```
