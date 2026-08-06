# Quickstart & Verification Guide: Kanban Board View (Flutter)

## Verification Environment & Setup

### Prerequisites
- Flutter SDK (Dart 3.11+)
- Emulator/device or `flutter run -d chrome` for web

### Commands

```bash
# 1. Static analysis
flutter analyze

# 2. Run tests
flutter test

# 3. Build check (web)
flutter build web --no-tree-shake-icons

# 4. Development run
flutter run -d chrome
```

---

## Validation Scenarios

### Scenario 1: Board Layout & Column Grouping
1. Launch app (`flutter run -d chrome`).
2. Navigate to the Pipeline / Kanban Board page.
3. **Verify**:
   - 5 columns visible: Saved, Applied, Screening, Interview, Offer.
   - Column headers show colored status dot, stage title, and correct item count badge.
   - Cards are placed in matching status columns.
   - Column items are ordered with the most stale items (highest days-in-stage) at the top.
   - Horizontal scroll works when the viewport is narrower than the total column width.

### Scenario 2: Drag and Drop Status Update
1. Long-press an application card in the "Applied" column until it lifts (feedback ghost appears).
2. Drag the card over to the "Interview" column.
3. **Verify**:
   - Target column highlights (blue border / background tint) while hovering.
   - Drop the card.
   - Card moves to "Interview" column.
   - "Applied" count badge decreases by 1; "Interview" count badge increases by 1.
   - A `SnackBar` appears at the bottom: "Moved [Company] to Interview" with an "Undo" button.
   - The original card position shows at reduced opacity during drag.

### Scenario 3: Undo Action & Days-in-Stage Duration Restoration
1. Perform Scenario 2 (move an application that has been in its stage for 10 days).
2. Tap "Undo" on the SnackBar within 6 seconds.
3. **Verify**:
   - Card moves back to "Applied" column.
   - Column count badges revert.
   - The days-in-stage display still shows the original duration (not reset to 0).

### Scenario 4: Quick-Drop Zones for Terminal Statuses
1. Long-press and begin dragging a card from any column.
2. **Verify**:
   - "Archive" and "Mark Rejected" quick-drop zones at the bottom of the board begin pulsing with colored dashed borders.
3. Drag the card over the "Mark Rejected" drop zone and release.
4. **Verify**:
   - Card is removed from the active columns.
   - SnackBar shows status changed to Rejected.

### Scenario 5: Stale Applications Banner ("Needs Attention")
1. Ensure at least one active application has `daysInCurrentStage > 14`.
2. **Verify**:
   - Amber banner appears at top of board: "Attention Needed: X application(s) have been in active stages for over 14 days."
3. Tap the dismiss "X" icon button.
4. **Verify**:
   - Banner disappears.

### Scenario 6: Card Staleness Visual Indicators
1. Create or have applications with varying ages:
   - One at 3 days in stage (normal).
   - One at 10 days in stage (warning).
   - One at 18 days in stage (critical).
2. **Verify**:
   - Normal card: Standard neutral border.
   - Warning card: Amber left border accent.
   - Critical card: Rose left border accent + rose-tinted recency badge.

### Scenario 7: Tap-to-Advance Status (Existing Feature)
1. Tap the overflow menu (`⋮`) on a card.
2. Select "Move to Screening" from the popup menu.
3. **Verify**:
   - Card moves to the Screening column.
   - Column counts update.
