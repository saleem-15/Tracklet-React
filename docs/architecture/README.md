# Tracklet Architecture & Clean Code Roadmap

Welcome to the architectural specifications and phased migration logs for **Tracklet** (React 19, TypeScript, Vite, TailwindCSS v4, Firebase).

---

## 1. Architectural Philosophy & Mental Model

Tracklet is structured around **Clean Architecture** principles. For developers familiar with Flutter (BLoC/Cubit, GetX, Clean Architecture, Dio, Isar):

| Clean Architecture / Flutter Concept | React 19 / Tracklet Implementation | Architectural Responsibility |
| :--- | :--- | :--- |
| **`Bloc` / `Cubit` / `GetxController`** | **Domain Custom Hooks** ([`useApplications`](file:///d:/Programming/Tracklet/src/hooks/useApplications.ts), [`useContacts`](file:///d:/Programming/Tracklet/src/hooks/useContacts.ts)) | State encapsulation, optimistic mutations, undo callbacks, and repository delegation. Pure business logic; zero UI rendering. |
| **`RemoteDataSource` / `LocalDataSource`** | **Repositories** ([`ApplicationRepository`](file:///d:/Programming/Tracklet/src/lib/applicationRepository.ts), [`ContactRepository`](file:///d:/Programming/Tracklet/src/lib/contactRepository.ts)) | Offline-first persistence, Firestore batching, sanitization, and fallback caching. |
| **`GoRouter` / `RouteParser`** | [`useUrlNavigation`](file:///d:/Programming/Tracklet/src/hooks/useUrlNavigation.ts) | Bi-directional synchronization between browser URL, query parameters (`?app=...`, `?q=...`), and state restoration on `popstate`. |
| **`EventChannel` / `MethodChannel`** | [`useExtensionSync`](file:///d:/Programming/Tracklet/src/hooks/useExtensionSync.ts) | Cross-process communication bridge (`BroadcastChannel` & `postMessage`) with ingestion buffering. |

---

## 2. Refactoring Phases Overview

```
Phase 1: Domain Hook Extraction [COMPLETED]
└── Decoupled all business logic from App.tsx into 7 focused domain hooks.
    App.tsx reduced from 1,850+ lines to 589 lines (-68%). 340/340 tests green.

Phase 2: Presentation & Layout Modularization [COMPLETED]
└── Decomposed App.tsx (589 → 225 lines, -62%) into:
    useDataLoader, AuthGate, WorkspaceContent, AppSlideOvers, AppModals.
    0 TS errors, 340/340 tests, clean production build.

Phase 3: Context Providers & Feature Boundaries [UPCOMING]
└── Group hooks and state into Feature Providers to eliminate prop-drilling.
```

---

## 3. Phase Documentation Links

- **Phase 1 Log**: [PHASE_1_DOMAIN_HOOKS.md](file:///d:/Programming/Tracklet/docs/architecture/PHASE_1_DOMAIN_HOOKS.md)  
  *Detailed extraction of 7 domain hooks, reference stabilization, concurrency optimization, and test suites.*
- **Phase 2 Blueprint**: [PHASE_2_PRESENTATION_LAYOUT.md](file:///d:/Programming/Tracklet/docs/architecture/PHASE_2_PRESENTATION_LAYOUT.md)  
  *Execution blueprint for decomposing App.tsx presentation into modular layout containers.*
