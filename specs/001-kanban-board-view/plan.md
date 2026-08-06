# Implementation Plan: Kanban Board View

**Branch**: `001-kanban-board-view` | **Date**: 2026-08-03 | **Spec**: [spec.md](file:///d:/Programming/Tracklet/specs/001-kanban-board-view/spec.md)

**Input**: Feature specification from `specs/001-kanban-board-view/spec.md`

**Target Project**: Flutter app at `d:\Programming\Flutter projects\tracklet\`

## Summary

Enhance the existing Kanban Board View in the Tracklet Flutter app to match the full prototype UI/UX: drag-and-drop via Flutter `LongPressDraggable`/`DragTarget`, quick-drop zones for terminal statuses (Archive/Rejected), a "Needs Attention" stale-apps banner, rich application cards with metadata chips (platform, days-in-stage, notes, staleness borders), an undo SnackBar that restores original `stageUpdatedAt` timestamps, and column-level sorting by staleness.

## Technical Context

**Language/Version**: Dart 3.11+ / Flutter SDK

**Primary Dependencies**: `flutter_riverpod` (state management), `go_router` (navigation), `dartz` (functional error handling `Either`), `intl` (date formatting), `google_fonts` (typography)

**Storage**: Cloud Firestore (authenticated users) via `ApplicationRepository` + Dartz `Either<Failure, T>` pattern

**Testing**: `flutter test`, `flutter analyze`, `mocktail`, `fake_cloud_firestore`

**Target Platform**: Flutter Web (primary), Android/iOS (secondary) — desktop pointer & mobile touch drag-and-drop

**Project Type**: Flutter cross-platform mobile/web application using Clean Architecture (data → domain → presentation layers per feature)

**Performance Goals**: 60fps during drag-and-drop animations; instantaneous local state updates via Riverpod providers; background Firestore writes < 500ms

**Constraints**: Follow existing Clean Architecture layering (`domain/entities`, `domain/repositories`, `domain/usecases`, `data/`, `presentation/pages`, `presentation/widgets`, `presentation/providers`). Use existing theme system (`AppColors`, `AppTypography`). State management via Riverpod `Provider` / `StateNotifierProvider`.

**Scale/Scope**: Up to 100+ active applications per user across 5 pipeline columns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file is a template with no project-specific principles filled in. No violations possible. Proceeding.

## Project Structure

### Documentation (this feature)

```text
specs/001-kanban-board-view/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── widget-contracts.md  # Phase 1 output
└── checklists/
    └── requirements.md      # Quality checklist
```

### Source Code Layout (Flutter project)

```text
lib/
├── core/
│   ├── constants/
│   │   └── app_constants.dart          # Existing — default reminder threshold, platforms
│   ├── error/
│   │   └── failures.dart               # Existing sealed Failure classes
│   ├── theme/
│   │   ├── app_colors.dart             # Existing — status colors, backgrounds
│   │   └── app_typography.dart         # Existing — text styles
│   ├── routing/                        # Existing — GoRouter config
│   └── widgets/
│       └── error_toast.dart            # Existing — reusable error toast
│
├── features/
│   ├── applications/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── application.dart         # Existing — Application entity (needs stageUpdatedAt)
│   │   │   │   ├── application_status.dart  # Existing — enum with isInKanban, isTerminal, color
│   │   │   │   └── status_history_entry.dart # Existing — StatusHistoryEntry
│   │   │   ├── repositories/
│   │   │   │   └── application_repository.dart  # Existing — abstract repo with changeStatus()
│   │   │   └── usecases/
│   │   │       └── change_application_status.dart # Existing — usecase wrapping repo.changeStatus()
│   │   ├── data/                       # Existing — Firestore implementations
│   │   └── presentation/
│   │       └── providers/
│   │           └── applications_provider.dart  # Existing — rawApplicationsStreamProvider
│   │
│   └── kanban/
│       └── presentation/
│           ├── pages/
│           │   └── kanban_board_page.dart    # MODIFY — add drag-drop, banner, quick-drop zones, undo
│           ├── providers/
│           │   └── kanban_provider.dart      # MODIFY — add staleness sorting, drag state
│           └── widgets/
│               ├── kanban_column.dart        # MODIFY — add DragTarget, drop placeholder, empty state
│               ├── kanban_card.dart          # MODIFY — add LongPressDraggable, staleness borders, chips
│               ├── attention_banner.dart     # NEW — stale apps notification bar
│               ├── quick_drop_zone.dart      # NEW — Archive/Rejected terminal drop targets
│               └── undo_snackbar.dart        # NEW — helper to show undo SnackBar with timestamp restore
```

**Structure Decision**: Extend the existing `features/kanban/presentation/` Clean Architecture structure. No new domain/data layers needed — the kanban feature reuses the `applications` domain layer directly via Riverpod providers.

## Complexity Tracking

> No constitution violations detected. Standard architecture applied.
