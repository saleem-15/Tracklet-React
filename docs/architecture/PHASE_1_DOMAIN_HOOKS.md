# Phase 1 Log: Domain Hook Extraction & Business Logic Decoupling

- **Status**: Completed & Verified
- **Branch**: [`refactor/modular-clean-architecture`](https://github.com/saleem-15/Tracklet-React/tree/refactor/modular-clean-architecture)
- **PR**: [#24](https://github.com/saleem-15/Tracklet-React/pull/24)
- **Impact on [`src/App.tsx`](file:///d:/Programming/Tracklet/src/App.tsx)**: **1,850+ lines -> 589 lines (-68% reduction)**
- **Verification**: **34/34 test suites (340 tests passed), TypeScript 0 errors, Vite production build clean**

---

## 1. Objectives & Achievements

In Phase 1, all core business logic, persistence sync, optimistic mutation queues, URL query-param routing, and cross-window extension bridges were decoupled from the root orchestrator ([`src/App.tsx`](file:///d:/Programming/Tracklet/src/App.tsx)) into 7 dedicated domain hooks:

| Hook | Responsibility | Lines | Vitest Suite |
| :--- | :--- | :--- | :--- |
| [`useToast.ts`](file:///d:/Programming/Tracklet/src/hooks/useToast.ts) | Notification queue, auto-capping, unique ID generation | 43 | `useToast.test.tsx` (4 tests) |
| [`useUrlNavigation.ts`](file:///d:/Programming/Tracklet/src/hooks/useUrlNavigation.ts) | Pathname tabs, query params (`?app=`, `?q=`, `?new=1`), popstate history | 118 | `useUrlNavigation.test.tsx` (6 tests) |
| [`useExpirySettings.ts`](file:///d:/Programming/Tracklet/src/hooks/useExpirySettings.ts) | Stale threshold preferences, `localStorage` persistence | 30 | `useExpirySettings.test.tsx` (3 tests) |
| [`useContacts.ts`](file:///d:/Programming/Tracklet/src/hooks/useContacts.ts) | Contacts Hub state, optimistic link/unlink sync, single/bulk deletes, undo callbacks | 502 | `useContacts.test.tsx` (4 tests) |
| [`useApplications.ts`](file:///d:/Programming/Tracklet/src/hooks/useApplications.ts) | Application pipeline CRUD, stage timeline logging, dedup merging, sort/filter, undo | 614 | `useApplications.test.tsx` (4 tests) |
| [`useExtensionSync.ts`](file:///d:/Programming/Tracklet/src/hooks/useExtensionSync.ts) | Chrome extension `BroadcastChannel`, token broadcasting, ingestion buffer | 310 | `useExtensionSync.test.tsx` (1 test) |
| [`useGuestMigration.ts`](file:///d:/Programming/Tracklet/src/hooks/useGuestMigration.ts) | Guest dataset signature detection, modal prompt, cloud transfer & remapping | 277 | `useGuestMigration.test.tsx` (3 tests) |

---

## 2. Key Architectural Invariants & Hardening

1. **Callback Reference Stability**:
   - Maintained stable `.current` references (`applicationsRef`, `selectedAppIdRef`) inside `useApplications` and `useContacts`.
   - Prevented table and drawer callbacks from changing references on incidental state updates (like row selection), avoiding cascading re-renders across `AllApplicationsTable` and `ActivePipelineBoard`.

2. **Parallel Undo Network I/O**:
   - Replaced sequential `for`-loop awaits in `handleBulkUpdateStatus` and `handleDeleteContact` undo handlers with `Promise.allSettled`.
   - Concurrently commits multi-document Firestore writes in parallel instead of creating network waterfalls.

3. **Deterministic Guest Migration Idempotency**:
   - Replaced fragile boolean flags with deterministic dataset signatures: `computeGuestSignature(apps, contacts)`.
   - Prevents re-prompting previously migrated datasets while ensuring newly added guest records are always caught.

4. **Firestore Document Verification & Chunking**:
   - In `ContactRepository.batchDelete`, verified document existence with `getDoc` before issuing `batch.update` on linked applications to eliminate `NOT_FOUND` exceptions.
   - Enforced 450-document chunks in `ApplicationRepository.batchRestoreApplications` with committed-chunk tracking for partial failure reconciliation.

5. **Type Safety & Zero-`any` Guarantees**:
   - Refactored dynamic application sorting to strictly differentiate numeric `daysInStage` from string properties with zero `any` assertions.
