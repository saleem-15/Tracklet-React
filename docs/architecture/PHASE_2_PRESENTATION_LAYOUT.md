# Phase 2 Blueprint: Presentation & Layout Modularization

- **Status**: ✅ COMPLETED
- **Target Component**: [`src/App.tsx`](file:///d:/Programming/Tracklet/src/App.tsx)
- **Goal**: Bring all components under the project standard of **`< 300 lines`** (Target for `App.tsx`: **`< 150 lines`**).
- **Result**: `App.tsx` reduced from **589 → 225 lines** (62% reduction). All 6 files under 225 lines. 0 TS errors, 340/340 tests, clean build.

---

## 1. Problem Statement

Even after extracting all domain business logic into custom hooks in Phase 1, [`src/App.tsx`](file:///d:/Programming/Tracklet/src/App.tsx) still stands at **589 lines**. It currently mixes:
1. Layout orchestration (`Sidebar`, `TopBar`, main layout containers).
2. Tab-level screen switching (`AllApplicationsTable`, `ActivePipelineBoard`, `ContactsView`, `StatsView`, `SettingsView`).
3. Slide-over drawer panels (`ApplicationDetailPanel`, `ContactDetailPanel`).
4. Modal dialog orchestration (`AddApplicationModal`, `AuthModal`, `GuestMigrationModal`).
5. Auth screen routing (`EmailVerificationGate`, `AuthScreen`, auth loading spinner).

---

## 2. Target Component Hierarchy

```
App.tsx (< 150 lines)
│
├── AppModals.tsx (< 100 lines)
│   ├── AddApplicationModal
│   ├── AuthModal
│   └── GuestMigrationModal
│
├── AppSlideOvers.tsx (< 120 lines)
│   ├── ApplicationDetailPanel
│   └── ContactDetailPanel
│
├── WorkspaceContent.tsx (< 200 lines)
│   ├── DuplicateNoticeBanner
│   └── Screen Router (AllTable | PipelineBoard | ContactsView | StatsView | SettingsView)
│
└── AppLayout.tsx (< 150 lines)
    ├── Sidebar
    ├── TopBar
    └── WorkspaceContent
```

---

## 3. Step-by-Step Implementation Plan

### Step 2.1: Extract `src/components/layout/AppModals.tsx`
- **Responsibility**: Houses `AddApplicationModal`, `AuthModal`, and `GuestMigrationModal`.
- **Props**: Receives visibility states and callbacks (`isOpen`, `onClose`, `onAdd`, `onImport`, `onDiscard`).
- **Target Size**: ~80 lines.

### Step 2.2: Extract `src/components/layout/AppSlideOvers.tsx`
- **Responsibility**: Houses `ApplicationDetailPanel` and `ContactDetailPanel`.
- **Props**: `selectedApp`, `selectedContact`, `applications`, `contacts`, link/unlink handlers, close handlers.
- **Target Size**: ~90 lines.

### Step 2.3: Extract `src/components/layout/WorkspaceContent.tsx`
- **Responsibility**: Renders active tab view (`all`, `pipeline`, `contacts`, `stats`, `settings`) and the duplicate applications warning banner.
- **Target Size**: ~180 lines.

### Step 2.4: Slim down `src/App.tsx`
- **Responsibility**: Wire the domain hooks (`useApplications`, `useContacts`, `useUrlNavigation`, etc.) to `AppLayout`, `AppSlideOvers`, and `AppModals`.
- **Target Size**: `< 150 lines`.

---

## 4. Verification Checklist
- [ ] `npx tsc --noEmit` passes with 0 errors.
- [ ] `npm test` passes 340/340 tests.
- [ ] `npm run build` succeeds cleanly.
- [ ] Browser manual verification: navigation, detail drawers, modals, and hotkeys.
