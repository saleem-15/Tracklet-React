# Phase 3 Blueprint: Context Providers & Feature Boundaries

- **Status**: 📋 IN PROGRESS
- **Branch**: [`refactor/modular-clean-architecture`](https://github.com/saleem-15/Tracklet-React/tree/refactor/modular-clean-architecture)
- **Target Components**: 
  - [`src/App.tsx`](../../src/App.tsx) (225 lines → **target < 100 lines**)
  - [`src/components/layout/WorkspaceContent.tsx`](../../src/components/layout/WorkspaceContent.tsx) (29 props → **0 props**)
  - [`src/components/layout/AppSlideOvers.tsx`](../../src/components/layout/AppSlideOvers.tsx) (19 props → **0 props**)
  - [`src/components/layout/AppModals.tsx`](../../src/components/layout/AppModals.tsx) (12 props → **0 props**)
  - [`src/components/TopBar.tsx`](../../src/components/TopBar.tsx) (7 props → **0 props**)
  - [`src/components/Sidebar.tsx`](../../src/components/Sidebar.tsx) (11 props → **0 props**)
- **Target Metrics**: 34/34 test suites passing (340/340 unit tests), TypeScript 0 errors, production build clean.

---

## 1. Executive Summary & Problem Statement

In **Phase 1**, we extracted 7 domain hooks (`useApplications`, `useContacts`, `useUrlNavigation`, `useExpirySettings`, `useExtensionSync`, `useGuestMigration`, `useToast`), reducing `App.tsx` from 1,850+ lines to 589 lines.  
In **Phase 2**, we extracted presentation containers (`AuthGate`, `WorkspaceContent`, `AppSlideOvers`, `AppModals`, `useDataLoader`), reducing `App.tsx` further from 589 lines to 225 lines.

However, `App.tsx` remains burdened by **heavy prop drilling** and **coordination wiring**:
- Over **78 total prop bindings** pass through `App.tsx` to child layout components.
- `WorkspaceContent` takes 29 separate props (applications, contacts, filters, sorting, bulk actions, modal triggers, toast handlers).
- `AppSlideOvers` takes 19 props.
- `AppModals` takes 12 props.
- Cross-entity navigation (`handleSwitchToApp`, `handleSwitchToContact`, `handleCreateAndLinkContact`, `handleContactFollowUp`) is manually plumbed in `App.tsx`.

Phase 3 introduces **Scoped Feature Context Providers** to eliminate this prop drilling, turning layout containers into clean, self-sufficient presentation modules while collapsing `App.tsx` into an ultra-clean root coordinator under **100 lines**.

---

## 2. Flutter Deep Dive: Architectural Mental Models & Trade-offs

To understand why we structure Tracklet this way, let's explore how Flutter architectures solve the exact same scaling problems — and where common patterns succeed or fail.

### A. The Anti-Pattern: Constructor Parameter Drilling ("Widget Hell")
In early Flutter projects, developers often pass callbacks and domain state down 4–6 layers:
```dart
// Flutter Anti-Pattern: Constructor Drilling
HomeScreen(
  user: user,
  applications: applications,
  contacts: contacts,
  onAddApplication: _handleAddApp,
  onUpdateApplication: _handleUpdateApp,
  onDeleteApplication: _handleDeleteApp,
  onSelectApplication: _handleSelectApp,
  onLinkContact: _handleLinkContact,
  // ... 20 more parameters
  child: WorkspaceView(
    applications: applications,
    onAddApplication: onAddApplication,
    // forwarded down again...
  ),
)
```
**Why this fails in production**:
1. **Refactoring Friction**: Adding one new field or callback requires modifying every widget signature in the hierarchy.
2. **Coupling**: Intermediate components become tightly coupled to data they don't even use, merely acting as pass-through "dumb couriers".
3. **Boilerplate**: Massive constructor parameter lists distract from UI layout logic.

---

### B. The False Shortcut: Global God Controller (The Naive GetX Trap)
When developers want to escape constructor drilling, they often turn to GetX's global locator:
```dart
// GetX Anti-Pattern: Unbounded Global Access
class GlobalAppController extends GetxController {
  var applications = <Application>[].obs;
  var contacts = <Contact>[].obs;
  var filter = FilterState().obs;
  // Everything shoved into one giant mutable container
}

// In deep child widget:
class JobCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final controller = Get.find<GlobalAppController>(); // Hidden dependency!
    return Text(controller.applications.first.company);
  }
}
```
**Why naive GetX causes severe production bugs**:
1. **Hidden Dependency Graph**: Looking at `JobCard`'s constructor gives zero indication of what it depends on. If rendered in an isolated widget test or storybook, it crashes at runtime with `Instance not found`.
2. **Zombie State & Leaks**: Because controllers registered globally with `Get.put()` persist across routes unless manually wiped, switching accounts or logging out often leaves stale data in memory.
3. **No Unidirectional Data Flow**: Any widget can mutate any field on the controller from anywhere, making debugging race conditions a nightmare.

---

### C. The Gold Standard: Clean Architecture with Scoped BLoCs / Providers
In production Flutter with Clean Architecture, we use **Scoped BLoCs / Cubits** assembled via `MultiBlocProvider`:
```dart
MultiBlocProvider(
  providers: [
    BlocProvider(create: (_) => AuthBloc()),
    BlocProvider(create: (_) => ToastCubit()),
    BlocProvider(create: (_) => SettingsCubit()),
    BlocProvider(create: (ctx) => NavigationCubit()),
    BlocProvider(
      create: (ctx) => ApplicationsBloc(
        auth: ctx.read<AuthBloc>(),
        nav: ctx.read<NavigationCubit>(),
      ),
    ),
    BlocProvider(
      create: (ctx) => ContactsBloc(
        auth: ctx.read<AuthBloc>(),
        apps: ctx.read<ApplicationsBloc>(),
      ),
    ),
  ],
  child: TrackletAppShell(),
)
```
**Why this pattern is superior**:
1. **Explicit Tree Scope**: State is bound to the widget tree lifecycle. When the subtree unmounts, state is automatically cleared.
2. **Predictable Data Flow**: Events go in, states come out. Dependencies between domains (`Contacts` depends on `Applications`) are cleanly injected at creation time.
3. **Testability**: Any widget can be tested in isolation by simply wrapping it with a mock `BlocProvider`.

---

### D. React Context vs. Flutter `InheritedWidget` / `context.select`
While React Context is conceptually identical to Flutter's `InheritedWidget`, React has one critical performance difference:

| Concept | Flutter (`InheritedModel` / `context.select`) | React 19 (`useContext`) |
| :--- | :--- | :--- |
| **Granular Subscription** | `context.select((ApplicationsBloc b) => b.state.totalCount)` rebuilds **only** when `totalCount` changes. | `useContext(ApplicationsContext)` triggers re-render whenever the context object reference changes. |
| **Re-render Danger** | Low (fine-grained element rebuilds). | **High** if a single context mixes volatile state (e.g. search query keystrokes) with heavy state (all applications list). |
| **Mitigation in React** | N/A | **Domain separation** (keep Navigation/Filter, Applications, Contacts, and Toast separate), **`useMemo`** on context values, and **`useCallback`** on actions. |

---

## 3. Proposed Feature Context Boundaries & Topology

Instead of a single monolithic "God Context", Tracklet will be organized into **5 focused, single-responsibility feature contexts**, composed in a strict topological order matching their dependency flow:

```
AppProviders (Composite Wrapper)
│
├── AuthProvider (Existing - src/context/AuthContext.tsx)
│   └── user, authUser, loading, signIn, signOut, deleteAccount
│
├── ToastProvider (src/context/ToastContext.tsx)
│   └── toasts, addToast, dismissToast
│
├── SettingsProvider (src/context/SettingsContext.tsx)
│   └── expirySettings, updateExpirySettings, expiryThresholdHours
│
├── NavigationProvider (src/context/NavigationContext.tsx)
│   └── activeTab, filter, selectedAppId, modals, mobileSidebar
│
├── ApplicationsProvider (src/context/ApplicationsContext.tsx)
│   └── applications, filteredApplications, sort, CRUD, bulk actions, merge duplicates
│
└── ContactsProvider (src/context/ContactsContext.tsx)
    └── contacts, selectedContact, selectedContactId, CRUD, link/unlink, follow-up
    └── cross-entity switchers: handleSwitchToApp, handleSwitchToContact
```

---

### Specification 3.1: `ToastContext` (`src/context/ToastContext.tsx`)
- **Responsibility**: System-wide notifications, snackbar queue, auto-capping, undo callback invocation.
- **Dependencies**: None.
- **Eliminates**: `onShowToast={addToast}`, `toasts={toasts}`, `onDismissToast={dismissToast}` across `AuthGate`, `WorkspaceContent`, `AppSlideOvers`, `AppModals`.
- **API Surface**:
  ```ts
  export interface ToastContextType {
    toasts: ToastMessage[];
    addToast: AddToastFn;
    dismissToast: (id: string) => void;
  }
  export const useToastContext = (): ToastContextType => ...
  ```

---

### Specification 3.2: `SettingsContext` (`src/context/SettingsContext.tsx`)
- **Responsibility**: Expiry threshold hours, notification preferences, persistence to localStorage.
- **Dependencies**: None.
- **Eliminates**: `expirySettings`, `onUpdateExpirySettings`, `expiryThresholdHours` props drilled into `Sidebar`, `WorkspaceContent`, `SettingsView`, `ContactsView`.
- **API Surface**:
  ```ts
  export interface SettingsContextType {
    expirySettings: ExpiryNotificationSettings;
    updateExpirySettings: (settings: ExpiryNotificationSettings) => void;
    expiryThresholdHours: number;
  }
  export const useSettings = (): SettingsContextType => ...
  ```

---

### Specification 3.3: `NavigationContext` (`src/context/NavigationContext.tsx`)
- **Responsibility**: URL-synchronized navigation (`activeTab`), query search filters (`filter`, `setFilter`, `resetFilters`), drawer selection state (`selectedAppId`), modal visibility (`isAddModalOpen`), and mobile sidebar drawer (`isMobileSidebarOpen`).
- **Dependencies**: None (reads `window.location`).
- **Eliminates**: ~14 props drilled to `TopBar`, `Sidebar`, `WorkspaceContent`, `AppSlideOvers`, `AppModals`.
- **API Surface**:
  ```ts
  export interface NavigationContextType {
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    filter: FilterState;
    setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
    resetFilters: () => void;
    selectedAppId: string | null;
    setSelectedAppId: (id: string | null) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    isMobileSidebarOpen: boolean;
    setIsMobileSidebarOpen: (open: boolean) => void;
    openAddModal: () => void;
    closeAddModal: () => void;
    openMobileSidebar: () => void;
    closeMobileSidebar: () => void;
  }
  export const useNavigation = (): NavigationContextType => ...
  ```

---

### Specification 3.4: `ApplicationsContext` (`src/context/ApplicationsContext.tsx`)
- **Responsibility**: Job application pipeline state, optimistic mutations, sorting, filtering, deduplication merging, bulk operations, CSV import/export, sample data seeding.
- **Dependencies**: `useAuth` (user), `useNavigation` (filter, selectedAppId, setSelectedAppId), `useToastContext` (addToast).
- **Eliminates**: ~20 props drilled into `WorkspaceContent`, `TopBar`, `AppSlideOvers`, `AppModals`.
- **API Surface**:
  ```ts
  export interface ApplicationsContextType {
    applications: Application[];
    filteredApplications: Application[];
    totalAppCount: number;
    selectedApp: Application | null;
    sort: SortState;
    handleSortChange: (field: SortField) => void;
    duplicateCount: number;
    isDuplicateBannerDismissed: boolean;
    dismissDuplicateBanner: () => void;
    setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
    applicationsRef: React.MutableRefObject<Application[]>;
    handleAddApplication: (data: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>) => Promise<void>;
    handleUpdateApplication: (id: string, updates: Partial<Application>) => Promise<void>;
    handleDeleteApplication: (id: string) => Promise<void>;
    handleBulkUpdateStatus: (ids: string[], newStatus: ApplicationStatus) => Promise<void>;
    handleBulkDelete: (ids: string[]) => Promise<void>;
    handleMergeAllDuplicates: () => Promise<void>;
    handleUpdatePipelineStatus: (id: string, newStatus: string) => void;
    handleExportCSV: () => void;
    handleBatchImportApplications: (newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]) => Promise<void>;
    handleSeedDemoData: () => Promise<void>;
    handleAccountDeleted: () => void;
  }
  export const useApplicationsContext = (): ApplicationsContextType => ...
  ```

---

### Specification 3.5: `ContactsContext` (`src/context/ContactsContext.tsx`)
- **Responsibility**: Networking directory state, optimistic contact mutations, application associations (`linkContact`, `unlinkContact`, `createAndLinkContact`), follow-up action trigger.
- **Dependencies**: `useAuth` (user), `useApplicationsContext` (applications, setApplications), `useNavigation` (setSelectedAppId, selectedContactId, setSelectedContactId), `useToastContext` (addToast).
- **Eliminates**: ~12 props drilled into `WorkspaceContent`, `AppSlideOvers`, `AppModals`, `Sidebar`.
- **API Surface**:
  ```ts
  export interface ContactsContextType {
    contacts: Contact[];
    selectedContact: Contact | null;
    selectedContactId: string | null;
    setSelectedContactId: (id: string | null) => void;
    setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
    handleAddContact: (data: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
    handleUpdateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
    handleDeleteContact: (id: string) => Promise<void>;
    handleLinkContact: (contactId: string, appId: string) => Promise<void>;
    handleUnlinkContact: (contactId: string, appId: string) => Promise<void>;
    handleCreateAndLinkContact: (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, appId: string) => Promise<void>;
    handleSwitchToContact: (contactId: string) => void;
    handleSwitchToApp: (appId: string) => void;
    handleContactFollowUp: (contact: Contact) => void;
  }
  export const useContactsContext = (): ContactsContextType => ...
  ```

---

### Specification 3.6: `AppProviders` (`src/context/AppProviders.tsx`)
Composite wrapper component analogous to Flutter's `MultiBlocProvider`. Enforces correct context initialization order:
```tsx
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <SettingsProvider>
          <NavigationProvider>
            <ApplicationsProvider>
              <ContactsProvider>
                {children}
              </ContactsProvider>
            </ApplicationsProvider>
          </NavigationProvider>
        </SettingsProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
```

---

## 4. Impact Analysis: Before vs. After Prop Comparison

| Component | Before (Phase 2) Props | After (Phase 3) Props | Reduction |
| :--- | :--- | :--- | :--- |
| **`WorkspaceContent.tsx`** | **29 props** (`activeTab`, `applications`, `filteredApplications`, `contacts`, `selectedAppId`, `onSelectApp`, `sort`, `onSortChange`, `onBulkUpdateStatus`, `onBulkDelete`, `onUpdatePipelineStatus`, `onAddContact`, `onUpdateContact`, `onDeleteContact`, `onSelectContact`, `expiryThresholdHours`, `expirySettings`, `onUpdateExpirySettings`, `onExportCSV`, `onImportApplications`, `onAccountDeleted`, `duplicateCount`, `isDuplicateBannerDismissed`, `onDismissDuplicateBanner`, `onMergeAllDuplicates`, `onOpenAddModal`, `onResetFilters`, `onSeedDemoData`, `onOpenMobileSidebar`) | **1 prop** (`isLoading?: boolean`) | **-97%** |
| **`AppSlideOvers.tsx`** | **19 props** (`selectedApp`, `contacts`, `currentUserEmail`, `onCloseAppPanel`, `onUpdateApp`, `onDeleteApp`, `onLinkContact`, `onUnlinkContact`, `onCreateAndLinkContact`, `onUpdateContact`, `onSelectContact`, `onEditContact`, `onShowToast`, `selectedContact`, `applications`, `onCloseContactPanel`, `onDeleteContact`, `onSelectApplication`, `onFollowUp`) | **0 props** (all consumed directly from `useApplicationsContext`, `useContactsContext`, `useNavigation`) | **-100%** |
| **`AppModals.tsx`** | **12 props** (`isAddModalOpen`, `onCloseAddModal`, `contacts`, `onAddApplication`, `onCreateContact`, `onShowToast`, `isMigrationModalOpen`, `migrationApps`, `migrationContacts`, `onImportGuestApps`, `onDiscardGuestApps`, `onCloseMigrationModal`) | **0 props** (or `useGuestMigration` hook consumed directly) | **-100%** |
| **`TopBar.tsx`** | **7 props** (`filter`, `setFilter`, `onOpenAddModal`, `totalFilteredCount`, `onExportCSV`, `activeTab`, `onOpenMobileSidebar`) | **0 props** (consumes `useNavigation`, `useApplicationsContext`) | **-100%** |
| **`Sidebar.tsx`** | **11 props** (`activeTab`, `setActiveTab`, `applications`, `contacts`, `expirySettings`, `user`, `onSignIn`, `onSignOut`, `onSeedDemoData`, `isMobileOpen`, `onCloseMobile`) | **0 props** (consumes `useNavigation`, `useApplicationsContext`, `useContactsContext`, `useSettings`, `useAuth`) | **-100%** |
| **`App.tsx`** | **225 lines** with massive callback wiring | **~60-75 lines** pure declarative layout shell | **-70%** |

---

## 5. What `src/App.tsx` Will Look Like in Phase 3

```tsx
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProviders } from './context/AppProviders';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AuthGate } from './components/layout/AuthGate';
import { WorkspaceContent } from './components/layout/WorkspaceContent';
import { AppSlideOvers } from './components/layout/AppSlideOvers';
import { AppModals } from './components/layout/AppModals';
import { ToastContainer } from './components/Toast';
import { useToastContext } from './context/ToastContext';
import { useNavigation } from './context/NavigationContext';
import { useApplicationsContext } from './context/ApplicationsContext';
import { useContactsContext } from './context/ContactsContext';
import { useGuestMigration } from './hooks/useGuestMigration';
import { useDataLoader } from './hooks/useDataLoader';
import { useExtensionSync } from './hooks/useExtensionSync';
import { getPathForTab, isAuthPath } from './lib/routeUtils';

function TrackletAppContent() {
  const { user, loading: authLoading } = useAuth();
  const { activeTab, setSelectedAppId } = useNavigation();
  const { toasts, dismissToast, addToast } = useToastContext();
  const { applications, setApplications, applicationsRef } = useApplicationsContext();
  const { contacts, setContacts, handleAddContact } = useContactsContext();

  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try { return localStorage.getItem('tracklet_guest_mode') === 'true'; } catch { return false; }
  });

  const {
    migrationApps, migrationContacts, isMigrationModalOpen, setIsMigrationModalOpen,
    checkAndPromptGuestMigration, handleImportGuestApps, handleDiscardGuestApps,
  } = useGuestMigration({ user, setApplications, setContacts, addToast });

  const { dataLoading, loadData } = useDataLoader({
    user, authLoading, setApplications, setContacts, addToast, checkAndPromptGuestMigration,
  });

  useExtensionSync({
    user, applications, setApplications, applicationsRef,
    contacts, dataLoading, handleAddContact, setSelectedAppId, addToast,
  });

  // Auth URL sync
  useEffect(() => {
    if (authLoading) return;
    const path = window.location.pathname;
    if (!user && !isGuestMode) {
      if (!isAuthPath(path)) window.history.replaceState(null, '', '/login');
    } else if (user) {
      if (!user.emailVerified) {
        if (path !== '/verify-email') window.history.replaceState(null, '', '/verify-email');
      } else if (isAuthPath(path) || path === '/verify-email') {
        window.history.replaceState(null, '', getPathForTab(activeTab));
      }
    }
  }, [user, user?.emailVerified, authLoading, isGuestMode, activeTab]);

  return (
    <AuthGate
      onReloadData={loadData}
      isGuestMode={isGuestMode}
      onContinueAsGuest={() => setIsGuestMode(true)}
    >
      <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden antialiased select-none">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {(activeTab === 'all' || activeTab === 'pipeline') && <TopBar />}
          <WorkspaceContent isLoading={authLoading || dataLoading} />
        </div>
        <AppSlideOvers />
        <AppModals
          migration={{
            isOpen: isMigrationModalOpen,
            apps: migrationApps,
            contacts: migrationContacts,
            onImport: handleImportGuestApps,
            onDiscard: handleDiscardGuestApps,
            onClose: () => setIsMigrationModalOpen(false),
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AuthGate>
  );
}

export default function App() {
  return (
    <AppProviders>
      <TrackletAppContent />
    </AppProviders>
  );
}
```

---

## 6. Implementation & Verification Plan

### Step 3.1: Leaf Providers (`ToastContext` & `SettingsContext`)
1. Create [`src/context/ToastContext.tsx`](../../src/context/ToastContext.tsx) wrapping `useToast`.
2. Create [`src/context/SettingsContext.tsx`](../../src/context/SettingsContext.tsx) wrapping `useExpirySettings`.

### Step 3.2: Routing & UI Provider (`NavigationContext`)
1. Create [`src/context/NavigationContext.tsx`](../../src/context/NavigationContext.tsx) wrapping `useUrlNavigation` and incorporating drawer/modal visibility and cross-entity switchers (`switchToApp`, `switchToContact`).

### Step 3.3: Domain Feature Providers (`ApplicationsContext` & `ContactsContext`)
1. Create [`src/context/ApplicationsContext.tsx`](../../src/context/ApplicationsContext.tsx) wrapping `useApplications`, memoizing filtered/sorted results and actions.
2. Create [`src/context/ContactsContext.tsx`](../../src/context/ContactsContext.tsx) wrapping `useContacts`, memoizing contact actions and relations.

### Step 3.4: Composite Provider (`AppProviders`)
1. Create [`src/context/AppProviders.tsx`](../../src/context/AppProviders.tsx) combining all providers in strict dependency order.

### Step 3.5: Layout Container Refactoring
1. Update `WorkspaceContent.tsx`: replace 29 props with context hooks (`useNavigation`, `useApplicationsContext`, `useContactsContext`, `useSettings`).
2. Update `AppSlideOvers.tsx`: replace 19 props with direct context hooks.
3. Update `AppModals.tsx`: consume add/create callbacks and contacts from context.
4. Update `TopBar.tsx`: consume filter and application count from context.
5. Update `Sidebar.tsx`: consume navigation and badge metrics from context.

### Step 3.6: Slim down `App.tsx`
1. Re-wire `App.tsx` with `<AppProviders>`.
2. Verify total line count is strictly **`< 100 lines`**.

### Step 3.7: Quality Assurance & Build Checks
1. `npm test` — all 34 suites (340 tests) must pass.
2. `npx tsc --noEmit` — 0 TypeScript errors.
3. `npm run build` — production build succeeds cleanly.
