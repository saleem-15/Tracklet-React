# Tracklet Architecture & Clean Code Refactor Log

## Executive Summary
Tracklet started as an ambitious, personal job application tracker. As the product matured into a potential commercial SaaS product, technical debt accumulated inside the root UI orchestrator ([`src/App.tsx`](../src/App.tsx)), which grew to over 1,850 lines ("The God Component" anti-pattern).

This document tracks the phased refactoring to transition Tracklet into a **modular, clean, business-grade architecture** without over-engineering or introducing unnecessary dependencies.

---

## Architectural Principles & Mental Model

### Comparison to Flutter Clean Architecture
For developers with a background in Flutter (Clean Architecture, BLoC/Cubit, GetX, Dio, Isar):

| Flutter Clean Architecture Concept | React / Tracklet Equivalent | Responsibility in Tracklet |
| :--- | :--- | :--- |
| **`Bloc` / `Cubit` / `GetxController`** | **Domain Custom Hooks** (`useApplications`, `useContacts`) | Encapsulates state, optimistic mutations, undo callbacks, and repository calls. Pure business logic; no UI rendering. |
| **`BlocProvider` / `Get.find()`** | **Context Providers** (`ApplicationContext`, `ToastContext`) | Eliminates prop-drilling; allows nested widgets to trigger actions and consume state directly. |
| **`RemoteDataSource` / `LocalDataSource`** | **`ApplicationRepository` / `ContactRepository`** | Persistence layer handling Firestore SDK and `localStorage` fallback. |
| **`GoRouter` / `RouteInformationParser`** | **`useUrlNavigation` Hook** | Synchronizes active tabs, query params (`?status=Active`), modal dialog visibility (`?new=1`), and browser history popstate. |

---

## Target Project Architecture

```
src/
├── app/                        # Shell & Orchestrator
│   ├── App.tsx                 # Lean layout coordinator (< 150 lines)
│   └── providers/              # Combined Context Providers (Toast, Auth, App, Contact)
│
├── core/                       # Shared Foundation
│   ├── components/             # Canonical UI primitives (Dropdown, Modal, Toast, Badge)
│   ├── hooks/                  # Global utility hooks (useEscapeKey, useToast)
│   ├── lib/                    # Pure utilities (constants, dateUtils, filterUtils)
│   └── types/                  # Global domain types
│
├── features/                   # Self-Contained Domain Features
│   ├── applications/           # Job Applications
│   │   ├── hooks/              # useApplications
│   │   ├── components/         # Table, PipelineBoard, DetailPanel, AddModal
│   │   └── services/           # ApplicationRepository, dedupUtils, exportCsv, importCsv
│   ├── contacts/               # Networking & Contacts Hub
│   │   ├── hooks/              # useContacts
│   │   ├── components/         # ContactsView, ContactDetailPanel, ContactCardGrid
│   │   └── services/           # ContactRepository, contactMigration
│   ├── navigation/             # Routing & Browser History
│   │   └── hooks/              # useUrlNavigation
│   ├── extension-sync/         # Chrome Extension Sync
│   │   └── hooks/              # useExtensionSync
│   ├── analytics/              # Stats & Visual KPI cards
│   └── settings/               # Account & Expiry configuration
```

---

## Phase 1 Execution Log: Domain Hook Extraction

### Step 1.1: Extract `useToast`
- **Objective**: Decouple the toast notification queue and ID generation from `App.tsx`.
- **Files Created**:
  - [`src/hooks/useToast.ts`](../src/hooks/useToast.ts): Custom hook providing `toasts`, `addToast`, `dismissToast`.
  - [`tests/unit/useToast.test.tsx`](../tests/unit/useToast.test.tsx): 4 automated tests covering queue FIFO capping, ID generation, and dismissal.
- **Files Modified**:
  - [`src/App.tsx`](../src/App.tsx): Replaced 18 lines of local state and callbacks with `useToast()`.
- **Blast Radius**: Zero. Child component prop contracts remained identical.
- **Verification**: `npx tsc --noEmit` passed; all 314 Vitest tests passed; `npm run build` succeeded.

---

### Step 1.2: Extract `useUrlNavigation`
- **Objective**: Decouple URL routing, query parameter persistence, and browser `popstate` history from `App.tsx`.
- **Files Created**:
  - [`src/hooks/useUrlNavigation.ts`](../src/hooks/useUrlNavigation.ts): Custom hook providing `activeTab`, `setActiveTab`, `filter`, `setFilter`, `resetFilters`, `selectedAppId`, `setSelectedAppId`, `isAddModalOpen`, `setIsAddModalOpen`.
  - [`tests/unit/useUrlNavigation.test.tsx`](../tests/unit/useUrlNavigation.test.tsx): 6 automated tests validating URL parameter generation, tab routing, and back/forward browser popstate synchronization.
- **Files Modified**:
  - [`src/App.tsx`](../src/App.tsx): Removed scattered `useState`, `useRef`, and `useEffect` blocks; consolidated under `useUrlNavigation()`.
- **Blast Radius**: Contained entirely to `App.tsx`. Downstream components receive identical variable names and contracts.
- **Verification**: `npx tsc --noEmit` passed; all 319 Vitest tests passed; `npm run build` succeeded.

---

### Step 1.3: Extract `useExpirySettings`
- **Objective**: Extract expiry notification preference loading and saving from `App.tsx`.
- **Reasoning**: In Flutter Clean Architecture / BLoC, simple preference or feature toggles reside in their own Cubit or local persistence repository service rather than cluttering the top-level app widget. Decoupling expiry state simplifies `App.tsx` and provides an isolated test harness for settings persistence.
- **Files Created**:
  - [`src/hooks/useExpirySettings.ts`](../src/hooks/useExpirySettings.ts): Custom hook managing `expirySettings` state and `updateExpirySettings` persistence callback.
  - [`tests/unit/useExpirySettings.test.tsx`](../tests/unit/useExpirySettings.test.tsx): 3 unit tests verifying defaults, localStorage persistence loading, and state updates.
- **Files Modified**:
  - [`src/App.tsx`](../src/App.tsx): Replaced local `useState` and `saveExpirySettings` wrapper with `useExpirySettings()`.
- **Blast Radius**: Zero. Downstream components (`SettingsView`, `ContactsView`) receive identical props and function contracts.
- **Verification**: `npx tsc --noEmit` clean; `useExpirySettings.test.tsx` 3/3 passed.

---

### Step 1.4: Extract `useContacts`
- **Objective**: Decouple Contacts Hub state management, optimistic additions, deletions, updates, and cross-application link synchronization from `App.tsx`.
- **Reasoning**: Similar to a dedicated `ContactsCubit` or `ContactsGetxController` in Flutter, all contact business logic (optimistic state mutations, temporary IDs, cloud rollback, and cascading link updates on applications) belongs in a cohesive domain hook rather than sprawling across the root orchestrator.
- **Files Created**:
  - [`src/hooks/useContacts.ts`](../src/hooks/useContacts.ts): Custom domain hook encapsulating `contacts`, `selectedContactId`, `selectedContact`, `handleAddContact`, `handleUpdateContact`, `handleDeleteContact`, `handleBatchDeleteContacts`, `handleLinkContact`, `handleUnlinkContact`.
  - [`tests/unit/useContacts.test.tsx`](../tests/unit/useContacts.test.tsx): 4 comprehensive tests validating initial states, optimistic additions with app links, contact updates, and deletions with selection clearing and Undo snackbar triggers.
- **Files Modified**:
  - [`src/App.tsx`](../src/App.tsx): Replaced ~400 lines of contact CRUD handlers and redundant `selectedContact` memo with `useContacts()`. Reduced `App.tsx` length from 1,778 to 1,402 lines.
- **Blast Radius**: Zero. All downstream components (`ContactsView`, `ContactDetailPanel`, `AddApplicationModal`, `ApplicationDetailPanel`) consume the exact same prop names and function contracts.
- **Verification**: `npx tsc --noEmit` clean; all 31 Vitest test suites (326 tests) passed; `npm run build` completed with 0 errors.

---

### Step 1.5: Extract `useApplications`
- **Objective**: Decouple the core job applications collection, optimistic CRUD operations, stage status updates with timeline history logging, undo snackbar behaviors, sorting, filtering, deduplication merging, and CSV export from `App.tsx`.
- **Reasoning**: In Flutter Clean Architecture / BLoC, the core entity pipeline logic represents the primary domain `Bloc` (or `ApplicationsGetxController`). Keeping data sorting, filtering calculations, deduplication reconciliations, and optimistic cloud syncs out of the presentation shell keeps `App.tsx` clean and testable.
- **Files Created**:
  - [`src/hooks/useApplications.ts`](../src/hooks/useApplications.ts): Custom domain hook encapsulating `applications`, `applicationsRef`, `selectedApp`, `sort`, `handleSortChange`, `filteredAndSortedApplications`, `duplicateGroups`, `duplicateCount`, `handleAddApplication`, `handleBatchImportApplications`, `handleUpdateApplication`, `handleDeleteApplication`, `handleBulkUpdateStatus`, `handleBulkDelete`, `handleMergeAllDuplicates`, and `handleExportCSV`.
  - [`tests/unit/useApplications.test.tsx`](../tests/unit/useApplications.test.tsx): 4 automated tests verifying initial states, optimistic additions, stage status updates with timeline history logging, and deletion with Undo restore callbacks.
- **Files Modified**:
  - [`src/App.tsx`](../src/App.tsx): Replaced ~500 lines of application filtering, sorting, CRUD, deduplication, and export handlers with `useApplications()`. Reduced `App.tsx` length from 1,402 down to 947 lines.
- **Blast Radius**: Zero. Downstream components (`AllApplicationsTable`, `ActivePipelineBoard`, `ApplicationDetailPanel`, `AddApplicationModal`, `SettingsView`, `StatsView`) receive identical variable names and callback signatures.
- **Verification**: `npx tsc --noEmit` passed with 0 errors; all 32 Vitest test suites (330 tests) passed; `npm run build` completed successfully.

---

### Step 1.6: Extract `useExtensionSync`
- **Objective**: Decouple Chrome extension bi-directional communication, event listeners, session token broadcasting, background application/email ingestion buffer, and auto-contact linking from `App.tsx`.
- **Reasoning**: In Flutter, background sync channels (like `MethodChannel` / event streams) are isolated into dedicated platform service delegates or background event controllers. Grouping the `BroadcastChannel` listeners, multi-account isolation guards, and buffer drains into `useExtensionSync` keeps platform transport mechanics strictly separated from UI layout.
- **Files Created**:
  - [`src/hooks/useExtensionSync.ts`](../src/hooks/useExtensionSync.ts): Custom domain hook managing extension auth session sync, application index broadcasting, incoming email ingestion, and clipped application buffer draining.
  - [`tests/unit/useExtensionSync.test.tsx`](../tests/unit/useExtensionSync.test.tsx): Unit test validating clean mount lifecycle and event subscription without side-effect memory leaks.
- **Files Modified**:
  - [`src/App.tsx`](../src/App.tsx): Replaced ~270 lines of extension event buffers, interval session refreshes, and content script message dispatchers with `useExtensionSync()`. Reduced `App.tsx` length from 947 down to 684 lines.
- **Blast Radius**: Zero. Operates as an orchestrating side-effect hook; no UI props or render outputs altered.
- **Verification**: `npx tsc --noEmit` clean; all 33 Vitest test suites (331 tests) passed; `npm run build` completed in 8.1s with 0 errors.

---

### Step 1.7: Extract `useGuestMigration`
- **Objective**: Decouple guest local storage detection, migration modal visibility state, and cloud account data import/discard workflows from `App.tsx`.
- **Reasoning**: In Flutter Clean Architecture / BLoC, onboarding and migration routines that reconcile offline/unauthenticated cache into an authenticated backend belong in an isolated onboarding or migration controller. This avoids polluting core UI containers with complex ID remapping and multi-entity batch import logic.
- **Files Created**:
  - [`src/hooks/useGuestMigration.ts`](../src/hooks/useGuestMigration.ts): Custom domain hook encapsulating `migrationApps`, `migrationContacts`, `isMigrationModalOpen`, `checkAndPromptGuestMigration`, `handleImportGuestApps`, and `handleDiscardGuestApps`.
  - [`tests/unit/useGuestMigration.test.tsx`](../tests/unit/useGuestMigration.test.tsx): 3 unit tests verifying initial modal state, detection of guest items from localStorage, and clean discard handling.
- **Files Modified**:
  - [`src/App.tsx`](../src/App.tsx): Replaced inline guest migration modal states, localStorage detection logic in `loadData`, and batch migration/discard handlers with `useGuestMigration()`. Pruned unused imports. Reduced `App.tsx` length from 684 down to 589 lines.
- **Blast Radius**: Zero. Downstream modal (`GuestMigrationModal`) consumes exact same props and handler contracts.
- **Verification**: `npx tsc --noEmit` clean; all 34 Vitest test suites (334 tests) passed; `npm run build` completed successfully.

---

## Phase 2: Presentation & Layout Modularization (Next Steps)
With Phase 1 complete, all business logic and domain controllers are cleanly extracted into testable custom hooks (`useApplications`, `useContacts`, `useUrlNavigation`, `useExpirySettings`, `useExtensionSync`, `useGuestMigration`, `useToast`).

`App.tsx` has been reduced from **1,850+ lines to 589 lines**!

To reach the project's standard of `< 300 lines` per component (as outlined in `.agents/AGENTS.md`), Phase 2 will decompose the remaining presentation concerns into dedicated layout components:
1. **`AppModals` / `ModalOrchestrator`**: Consolidate `AddApplicationModal`, `AuthModal`, and `GuestMigrationModal` orchestration.
2. **`WorkspaceContent` / `MainContentRouter`**: Extract tab routing (`AllApplicationsTable`, `ActivePipelineBoard`, `ContactsView`, `StatsView`, `SettingsView`, and the duplicate detection banner) out of `App.tsx`.
3. **`AppLayout`**: Provide a clean presentation shell holding `Sidebar`, `TopBar`, and `WorkspaceContent`.
