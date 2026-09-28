# Phase 2 Blueprint: Presentation & Layout Modularization

- **Status**: ✅ COMPLETED (with adjusted App.tsx target)
- **Target Component**: [`src/App.tsx`](../../src/App.tsx)
- **Goal**: Bring all components under the project standard of **`< 300 lines`** (Original target for `App.tsx`: `< 150 lines`; adjusted to `< 250 lines` as remaining lines are pure wire coordination callbacks, satisfying the `< 300 lines` repository limit).
- **Result**: `App.tsx` reduced from **589 → 225 lines** (62% reduction). All layout components and hooks are under 225 lines. 0 TS errors, 340/340 tests, clean production build.
- **Target Note**: The strict `< 150 lines` sub-target for `App.tsx` was deferred to Phase 3 (Context Providers & Feature Boundaries), where context providers will eliminate the remaining top-level prop drilling and callback wiring.

---

## 1. Problem Statement

Even after extracting all domain business logic into custom hooks in Phase 1, [`src/App.tsx`](../../src/App.tsx) still stood at **589 lines**. It mixed:
1. Layout orchestration (`Sidebar`, `TopBar`, main layout containers).
2. Tab-level screen switching (`AllApplicationsTable`, `ActivePipelineBoard`, `ContactsView`, `StatsView`, `SettingsView`).
3. Slide-over drawer panels (`ApplicationDetailPanel`, `ContactDetailPanel`).
4. Modal dialog orchestration (`AddApplicationModal`, `AuthModal`, `GuestMigrationModal`).
5. Auth screen routing (`EmailVerificationGate`, `AuthScreen`, auth loading spinner).
6. Data hydration lifecycle (`loadData` orchestration).

---

## 2. Actual Component Hierarchy

```
TrackletAppContent (src/App.tsx - 225 lines)
│
├── AuthGate.tsx (83 lines)
│   ├── LoadingScreen
│   ├── AuthScreen
│   └── EmailVerificationGate
│
├── Sidebar (25 lines in App.tsx)
├── TopBar (20 lines in App.tsx)
│
├── WorkspaceContent.tsx (213 lines)
│   ├── DuplicateNoticeBanner
│   └── Screen Router (AllTable | PipelineBoard | ContactsView | StatsView | SettingsView)
│
├── AppSlideOvers.tsx (93 lines)
│   ├── ApplicationDetailPanel
│   └── ContactDetailPanel
│
├── AppModals.tsx (69 lines)
│   ├── AddApplicationModal
│   ├── AuthModal
│   └── GuestMigrationModal
│
└── useDataLoader.ts (112 lines)
    └── Data hydration & legacy contact migration orchestration
```

*(Note: `AppLayout.tsx` was dropped during execution to avoid redundant intermediate prop forwarding; `TrackletAppContent` directly coordinates `AuthGate`, `Sidebar`, `TopBar`, `WorkspaceContent`, `AppSlideOvers`, and `AppModals`.)*

---

## 3. Step-by-Step Implementation & Layout Breakdown

### Step 2.1: Extract `src/components/layout/AppModals.tsx`
- **Responsibility**: Houses `AddApplicationModal`, `AuthModal`, and `GuestMigrationModal`.
- **Props**: Receives visibility states and callbacks (`isOpen`, `onClose`, `onAdd`, `onImport`, `onDiscard`).
- **Actual Size**: 69 lines.

### Step 2.2: Extract `src/components/layout/AppSlideOvers.tsx`
- **Responsibility**: Houses `ApplicationDetailPanel` and `ContactDetailPanel`.
- **Props**: `selectedApp`, `selectedContact`, `applications`, `contacts`, link/unlink handlers, close handlers.
- **Actual Size**: 93 lines.

### Step 2.3: Extract `src/components/layout/WorkspaceContent.tsx`
- **Responsibility**: Renders active tab view (`all`, `pipeline`, `contacts`, `stats`, `settings`) and the duplicate applications warning banner.
- **Actual Size**: 213 lines.

### Step 2.4: Slim down `src/App.tsx`
- **Responsibility**: Act as a top-level wire coordinator connecting domain hooks (`useApplications`, `useContacts`, `useUrlNavigation`, `useDataLoader`, `useExpirySettings`, `useExtensionSync`, `useGuestMigration`, `useToast`) directly to `AuthGate`, `Sidebar`, `TopBar`, `WorkspaceContent`, `AppSlideOvers`, and `AppModals`.
- **Actual Size**: 225 lines (< 300 lines limit).

---

## 4. Verification Checklist
- [x] `npx tsc --noEmit` passes with 0 errors.
- [x] `npm test` passes 340/340 tests.
- [x] `npm run build` succeeds cleanly.
- [x] Layout and presentation components separated and under 300 lines limit.
