# Tasks: Kanban Board View

**Input**: Design documents from `specs/001-kanban-board-view/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/widget-contracts.md`, `quickstart.md`)

**Target Codebase**: Flutter app located at `lib/`

## Format: `- [ ] [ID] [P?] [Story] Description with file path`

- **[P]**: Parallelizable (different files, independent logic)
- **[Story]**: User Story association ([US1], [US2], [US3], [US4], [US5])

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify and prepare project dependencies and Riverpod providers for Kanban enhancement.

- [x] T001 Verify Flutter project dependencies and static analysis via `flutter analyze` in `lib/`
- [x] T002 [P] Create staleness helper getters and extensions in `lib/features/applications/domain/entities/application.dart`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: State management providers and data structures required across all user stories.

**⚠️ CRITICAL**: Must be completed before User Story UI enhancements begin.

- [x] T003 [P] Implement `kanbanDragStateProvider` and `lastMovedNoticeProvider` in `lib/features/kanban/presentation/providers/kanban_provider.dart`
- [x] T004 Enhance `kanbanColumnsProvider` in `lib/features/kanban/presentation/providers/kanban_provider.dart` to sort column lists by days-in-stage staleness descending

**Checkpoint**: Foundation ready — Riverpod providers and staleness models prepared.

---

## Phase 3: User Story 1 - View Applications as a Kanban Board (Priority: P1) 🎯 MVP

**Goal**: Render active job applications in 5 distinct status columns (Saved, Applied, Screening, Interview, Offer) with horizontal scrolling and accurate item counts.

**Independent Test**: Load `KanbanBoardPage` with test applications and verify each active column displays its matching applications with header counts.

- [x] T005 [P] [US1] Update column header UI in `lib/features/kanban/presentation/widgets/kanban_column.dart` with status dot, title, and count badge
- [x] T006 [US1] Ensure horizontal scroll layout and column sizing in `lib/features/kanban/presentation/pages/kanban_board_page.dart`
- [x] T007 [P] [US1] Implement empty column placeholder state in `lib/features/kanban/presentation/widgets/kanban_column.dart`

**Checkpoint**: User Story 1 complete — basic read-only 5-column Kanban board displays correctly.

---

## Phase 4: User Story 2 - Move Applications Between Stages via Drag-and-Drop (Priority: P1)

**Goal**: Drag application cards between stage columns and drop onto Archive/Rejected drop zones, with 6-second auto-dismiss undo SnackBar restoring original `updatedAt` timestamps.

**Independent Test**: Long-press a card, drag to a new column or quick-drop zone, release, verify status update and SnackBar undo restoring original days-in-stage duration.

- [x] T008 [P] [US2] Wrap card in `LongPressDraggable<String>` with feedback ghost and original position opacity in `lib/features/kanban/presentation/widgets/kanban_card.dart`
- [x] T009 [US2] Wrap column body in `DragTarget<String>` with drop highlight indicator in `lib/features/kanban/presentation/widgets/kanban_column.dart`
- [x] T010 [P] [US2] Create `QuickDropZone` widget for Archive and Rejected drop targets in `lib/features/kanban/presentation/widgets/quick_drop_zone.dart`
- [x] T011 [US2] Implement status change handler and undo `SnackBar` with `updatedAt` timestamp restoration in `lib/features/kanban/presentation/pages/kanban_board_page.dart`

**Checkpoint**: User Story 2 complete — full drag-and-drop workflow with quick-drop zones and timestamp-restoring undo functional.

---

## Phase 5: User Story 3 - View Application Details from the Board (Priority: P2)

**Goal**: Tap any Kanban card to open the application detail page without disrupting board state.

**Independent Test**: Tap a card on the board and confirm navigation to `/applications/:id`.

- [x] T012 [US3] Wire card tap gesture to GoRouter `/applications/:id` navigation in `lib/features/kanban/presentation/widgets/kanban_card.dart`

**Checkpoint**: User Story 3 complete — card selection navigates to detail view.

---

## Phase 6: User Story 4 - See At-a-Glance Card Information (Priority: P2)

**Goal**: Display rich card metadata (company, role, platform badge, recency badge, notes snippet, tiered staleness borders).

**Independent Test**: Render cards with warning (>7d) and critical (>14d) ages, verifying left border accents, recency badges, platform chips, and truncated notes snippets.

- [x] T013 [P] [US4] Add tiered staleness left border accents (amber >7d, rose >14d) in `lib/features/kanban/presentation/widgets/kanban_card.dart`
- [x] T014 [US4] Add platform badge, recency badge, and truncated notes snippet layout in `lib/features/kanban/presentation/widgets/kanban_card.dart`

**Checkpoint**: User Story 4 complete — rich scannable cards with visual staleness indicators.

---

## Phase 7: User Story 5 - Column Counts and Pipeline Summary (Priority: P3)

**Goal**: Show a dismissible "Needs Attention" banner for critical stale applications (>14d) at the top of the board.

**Independent Test**: Load board with an application >14 days old, verify amber alert banner displays correct count and hides on dismiss button tap.

- [x] T015 [P] [US5] Create dismissible `AttentionBanner` widget in `lib/features/kanban/presentation/widgets/attention_banner.dart`
- [x] T016 [US5] Integrate `AttentionBanner` at the top of `lib/features/kanban/presentation/pages/kanban_board_page.dart`

**Checkpoint**: All user stories complete.

---

## Phase 8: Polish & Verification

**Purpose**: Validation, formatting, static analysis, and testing.

- [x] T017 [P] Run static analysis check via `flutter analyze` across `lib/features/kanban/`
- [x] T018 Execute all 7 manual verification scenarios from `specs/001-kanban-board-view/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    └── Phase 2: Foundational (Provider & model setup - BLOCKS US1-US5)
            ├── Phase 3: User Story 1 (MVP Board view)
            │       └── Phase 4: User Story 2 (Drag & drop + Undo)
            │               └── Phase 5: User Story 3 (Detail navigation)
            │                       └── Phase 6: User Story 4 (Rich card info)
            │                               └── Phase 7: User Story 5 (Attention banner)
            └── Phase 8: Polish & Verification
```

### Parallel Opportunities

- **Setup & Foundation**: `T002` (Application extensions) and `T003` (Riverpod drag providers) can run in parallel.
- **US1 & US2 UI**: `T005` (Column header), `T008` (Draggable card), and `T010` (QuickDropZone) can be built in parallel.
- **US4**: `T013` (Staleness borders) and `T015` (AttentionBanner) can be built in parallel.

---

## Implementation Strategy

### MVP Scope (User Stories 1 & 2)
1. Complete Phase 1 & 2 (Setup & Providers).
2. Complete Phase 3 (US1: Read-only 5-column layout).
3. Complete Phase 4 (US2: Drag & drop + Quick-drop + Undo SnackBar).
4. **Validate MVP**: Drag cards between columns and test undo.
