import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Application, 
  ActiveTab, 
  FilterState, 
  SortState, 
  ApplicationStatus, 
  SortField,
  ExpiryNotificationSettings
} from './types';
import { ApplicationRepository } from './lib/applicationRepository';
import { exportApplicationsToCSV } from './lib/exportCsv';
import { calculateDaysInStage } from './lib/sampleData';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AllApplicationsTable } from './components/AllApplicationsTable';
import { ActivePipelineBoard } from './components/ActivePipelineBoard';
import { ApplicationDetailPanel } from './components/ApplicationDetailPanel';
import { AddApplicationModal } from './components/AddApplicationModal';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { AuthScreen } from './components/AuthScreen';
import { AuthModal } from './components/AuthModal';
import { EmailVerificationGate } from './components/EmailVerificationGate';
import { GuestMigrationModal } from './components/GuestMigrationModal';
import { loadExpirySettings, saveExpirySettings } from './lib/expiryUtils';
import { setupExtensionSync } from './lib/extensionSync';
import { LOCAL_STORAGE_KEYS } from './lib/constants';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer, ToastMessage } from './components/Toast';

import {
  getTabFromPath,
  getPathForTab,
  readUrlState,
  syncFiltersToUrl,
  syncAppSelectionToUrl,
  syncAddModalToUrl,
  isAuthPath,
  DEFAULT_FILTER,
} from './lib/routeUtils';

function TrackletAppContent() {
  const { user, loading: authLoading, openAuthModal, signOut } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => getTabFromPath(window.location.pathname));
  const [dataLoading, setDataLoading] = useState(true);

  // Guest Mode State (when unauthenticated visitor explicitly chooses to explore as guest from sign-up)
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tracklet_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Guest Migration Modal State
  const [migrationApps, setMigrationApps] = useState<Application[]>([]);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // ── Initialise all query-param–driven state from the URL on first render ──
  const _initialUrlState = readUrlState();
  const [selectedAppId, setSelectedAppIdState] = useState<string | null>(
    () => _initialUrlState.selectedAppId
  );
  const [isAddModalOpen, setIsAddModalOpenState] = useState<boolean>(
    () => _initialUrlState.isAddModalOpen
  );

  // ── URL-aware tab setter ──
  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    const targetPath = getPathForTab(tab);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // ── URL-aware filter setter ──
  const filterRef = React.useRef<FilterState>(_initialUrlState.filter);
  const selectedAppIdRef = React.useRef<string | null>(_initialUrlState.selectedAppId);
  const isAddModalOpenRef = React.useRef<boolean>(_initialUrlState.isAddModalOpen);

  const setFilter: React.Dispatch<React.SetStateAction<FilterState>> = (action) => {
    setFilterState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      filterRef.current = next;
      syncFiltersToUrl(next, selectedAppIdRef.current, isAddModalOpenRef.current);
      return next;
    });
  };

  const setSelectedAppId = (appId: string | null) => {
    selectedAppIdRef.current = appId;
    setSelectedAppIdState(appId);
    syncAppSelectionToUrl(appId, filterRef.current, isAddModalOpenRef.current);
  };

  const setIsAddModalOpen = (open: boolean) => {
    isAddModalOpenRef.current = open;
    setIsAddModalOpenState(open);
    syncAddModalToUrl(open, filterRef.current, selectedAppIdRef.current);
  };

  // ── Restore URL state on Back / Forward ──
  useEffect(() => {
    const handlePopState = () => {
      const { filter: uFilter, selectedAppId: uSelectedAppId, isAddModalOpen: uIsAddModalOpen } = readUrlState();
      setActiveTabState(getTabFromPath(window.location.pathname));
      filterRef.current = uFilter;
      selectedAppIdRef.current = uSelectedAppId;
      isAddModalOpenRef.current = uIsAddModalOpen;
      setFilterState(uFilter);
      setSelectedAppIdState(uSelectedAppId);
      setIsAddModalOpenState(uIsAddModalOpen);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    description?: string,
    action?: { label: string; onClick: () => void }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, description, action }]);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Expiry notification settings
  const [expirySettings, setExpirySettings] = useState<ExpiryNotificationSettings>(() => loadExpirySettings());

  const handleUpdateExpirySettings = (newSettings: ExpiryNotificationSettings) => {
    setExpirySettings(newSettings);
    saveExpirySettings(newSettings);
  };

  // Filter and Sort State
  const [filter, setFilterState] = useState<FilterState>(() => _initialUrlState.filter);
  const [sort, setSort] = useState<SortState>({
    field: 'dateApplied',
    order: 'desc',
  });

  // Load applications whenever user changes or email is verified
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      if (user && user.emailVerified) {
        const cloudApps = await ApplicationRepository.loadApplications(user.uid);
        setApplications(cloudApps);

        // Check for guest data migration
        try {
          const rawGuest = localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_APPS);
          if (rawGuest) {
            const parsedGuest: Application[] = JSON.parse(rawGuest);
            if (Array.isArray(parsedGuest) && parsedGuest.length > 0) {
              setMigrationApps(parsedGuest);
              setIsMigrationModalOpen(true);
            }
          }
        } catch {
          // Ignore parse errors
        }
      } else if (!user) {
        const guestApps = ApplicationRepository.loadGuestApplications();
        setApplications(guestApps);
      }
    } catch (err) {
      console.error('Error loading applications:', err);
      addToast('error', 'Load Error', 'Could not load applications from repository.');
    } finally {
      setDataLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, user?.uid, user?.emailVerified, loadData]);

  // Browser Extension Sync Listener
  useEffect(() => {
    const cleanup = setupExtensionSync({
      onApplicationReceived: async (clippedApp) => {
        if (user && user.emailVerified) {
          const created = await ApplicationRepository.addApplication(clippedApp, user.uid);
          setApplications((prev) => [created, ...prev]);
        } else if (!user) {
          const created = await ApplicationRepository.addApplication(clippedApp);
          setApplications((prev) => [created, ...prev]);
        }

        addToast(
          'success',
          'Clipped via Tracklet Extension',
          `Saved "${clippedApp.role}" at ${clippedApp.company}`
        );
      },
    });

    return () => cleanup();
  }, [user, addToast]);

  // Synchronize URL on auth transitions
  useEffect(() => {
    if (authLoading) return;
    const path = window.location.pathname;

    if (!user && !isGuestMode) {
      if (!isAuthPath(path)) {
        window.history.replaceState(null, '', '/login');
      }
    } else if (user) {
      if (!user.emailVerified) {
        if (path !== '/verify-email') {
          window.history.replaceState(null, '', '/verify-email');
        }
      } else {
        if (isAuthPath(path) || path === '/verify-email') {
          window.history.replaceState(null, '', getPathForTab(activeTab));
        }
      }
    }
  }, [user, user?.emailVerified, authLoading, isGuestMode, activeTab]);

  // Guest Migration Handlers
  const handleImportGuestApps = async () => {
    if (!user || migrationApps.length === 0) return;
    try {
      const imported = await ApplicationRepository.batchImport(migrationApps, user.uid);
      setApplications((prev) => [...imported, ...prev]);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_APPS);
      setIsMigrationModalOpen(false);
      setMigrationApps([]);
      addToast('success', 'Migration Complete', `Imported ${imported.length} applications to your cloud account.`);
    } catch (err) {
      console.error('Migration failed:', err);
      addToast('error', 'Migration Failed', 'Could not import guest applications.');
    }
  };

  const handleDiscardGuestApps = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_APPS);
    setIsMigrationModalOpen(false);
    setMigrationApps([]);
    addToast('info', 'Guest Data Discarded', 'Starting with clean cloud account workspace.');
  };

  // Sign In / Sign Out
  const handleSignIn = () => {
    openAuthModal('signin');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      try {
        localStorage.removeItem('tracklet_guest_mode');
      } catch {
        // Ignore
      }
      setIsGuestMode(false);
      setSelectedAppId(null);
      window.history.pushState(null, '', '/login');
      addToast('info', 'Signed Out', 'Returned to authentication screen.');
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  // Reset / Load Demo Data
  const handleSeedDemoData = async () => {
    try {
      const freshDocs = await ApplicationRepository.seedDemoData(user?.emailVerified ? user.uid : undefined);
      setApplications(freshDocs);
      setSelectedAppId(null);
      addToast('info', 'Workspace Reset', 'Sample job application dataset loaded.');
    } catch (err) {
      console.error('Failed to seed demo data:', err);
      addToast('error', 'Error', 'Could not load demo dataset.');
    }
  };

  // Add Application
  const handleAddApplication = async (
    newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>
  ) => {
    try {
      const created = await ApplicationRepository.addApplication(
        newApp,
        user?.emailVerified ? user.uid : undefined
      );
      setApplications((prev) => [created, ...prev]);
      addToast('success', 'Application Added', `Logged ${newApp.company} (${newApp.role})`);
    } catch (err) {
      console.error('Failed to add application:', err);
      addToast('error', 'Error', 'Failed to save application.');
    }
  };

  // Batch Import Applications (CSV)
  const handleBatchImportApplications = async (
    newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => {
    try {
      const imported = await ApplicationRepository.batchImport(
        newApps,
        user?.emailVerified ? user.uid : undefined
      );
      setApplications((prev) => [...imported, ...prev]);
      addToast('success', 'Batch Import Complete', `Successfully imported ${newApps.length} applications.`);
    } catch (err) {
      console.error('Batch import failed:', err);
      addToast('error', 'Import Failed', 'Could not import applications.');
    }
  };

  // Update Application
  const handleUpdateApplication = async (id: string, updates: Partial<Application>) => {
    const currentApp = applications.find((a) => a.id === id);
    const isStatusChanged = updates.status && currentApp && updates.status !== currentApp.status;

    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a))
    );

    try {
      await ApplicationRepository.updateApplication(
        id,
        updates,
        user?.emailVerified ? user.uid : undefined
      );

      if (isStatusChanged && updates.status && currentApp) {
        addToast('info', 'Status Updated', `${currentApp.company} moved to ${updates.status}`);
      }
    } catch (err) {
      console.error('Failed to update application:', err);
    }
  };

  // Delete Application
  const handleDeleteApplication = async (id: string) => {
    const targetApp = applications.find((a) => a.id === id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
    if (selectedAppId === id) setSelectedAppId(null);

    try {
      await ApplicationRepository.deleteApplication(id, user?.emailVerified ? user.uid : undefined);
      if (targetApp) {
        addToast('info', 'Application Removed', `Deleted ${targetApp.company} record.`);
      }
    } catch (err) {
      console.error('Failed to delete application:', err);
    }
  };

  // Bulk Status Update
  const handleBulkUpdateStatus = async (ids: string[], newStatus: ApplicationStatus) => {
    const now = new Date().toISOString();
    const previousSnapshot = applications.filter((a) => ids.includes(a.id));
    const previousStatusMap = new Map<string, { status: ApplicationStatus; stageUpdatedAt: string }>(
      previousSnapshot.map((a) => [a.id, { status: a.status, stageUpdatedAt: a.stageUpdatedAt }])
    );

    setApplications((prev) =>
      prev.map((a) =>
        ids.includes(a.id) ? { ...a, status: newStatus, stageUpdatedAt: now, updatedAt: now } : a
      )
    );

    try {
      await ApplicationRepository.batchUpdateStatus(
        ids,
        newStatus,
        user?.emailVerified ? user.uid : undefined
      );

      addToast(
        'success',
        'Bulk Status Updated',
        `Moved ${ids.length} application${ids.length === 1 ? '' : 's'} to ${newStatus}`,
        {
          label: 'Undo',
          onClick: async () => {
            setApplications((prev) =>
              prev.map((a) => {
                const old = previousStatusMap.get(a.id);
                return old ? { ...a, status: old.status, stageUpdatedAt: old.stageUpdatedAt } : a;
              })
            );
            if (user?.emailVerified) {
              for (const [appId, oldData] of previousStatusMap.entries()) {
                await ApplicationRepository.updateApplication(appId, { status: oldData.status }, user.uid);
              }
            }
            addToast('info', 'Status Reverted', `Restored ${ids.length} application status${ids.length === 1 ? '' : 'es'}.`);
          },
        }
      );
    } catch (err) {
      console.error('Bulk update failed:', err);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async (ids: string[]) => {
    const deletedApps = applications.filter((a) => ids.includes(a.id));
    const count = ids.length;

    setApplications((prev) => prev.filter((a) => !ids.includes(a.id)));
    if (selectedAppId && ids.includes(selectedAppId)) setSelectedAppId(null);

    try {
      await ApplicationRepository.batchDelete(ids, user?.emailVerified ? user.uid : undefined);

      addToast(
        'info',
        'Applications Removed',
        `Deleted ${count} application${count === 1 ? '' : 's'}.`,
        {
          label: 'Undo',
          onClick: async () => {
            setApplications((prev) => [...deletedApps, ...prev]);
            if (user?.emailVerified) {
              await ApplicationRepository.batchImport(deletedApps, user.uid);
            }
            addToast('success', 'Restored', `Recovered ${count} application${count === 1 ? '' : 's'}.`);
          },
        }
      );
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  };

  // Sorting
  const handleSortChange = (field: SortField) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Filtered and Sorted Applications
  const filteredAndSortedApplications = useMemo(() => {
    return applications
      .filter((app) => {
        if (filter.search.trim()) {
          const q = filter.search.toLowerCase();
          const matchCompany = app.company.toLowerCase().includes(q);
          const matchRole = app.role.toLowerCase().includes(q);
          const matchNotes = app.notes ? app.notes.toLowerCase().includes(q) : false;
          if (!matchCompany && !matchRole && !matchNotes) return false;
        }

        if (filter.platform !== 'All' && app.platform !== filter.platform) {
          return false;
        }

        if (filter.status === 'Active') {
          if (app.status === 'Rejected' || app.status === 'Archived') return false;
        } else if (filter.status !== 'All' && app.status !== filter.status) {
          return false;
        }

        if (filter.dateRange !== 'all') {
          const appDate = new Date(app.dateApplied);
          const now = new Date();
          const daysAgo = (now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24);

          if (filter.dateRange === '7days' && daysAgo > 7) return false;
          if (filter.dateRange === '30days' && daysAgo > 30) return false;
          if (filter.dateRange === '60days' && daysAgo > 60) return false;

          if (filter.dateRange === 'this_week') {
            const startOfWeek = new Date(now);
            const day = now.getDay();
            const diffToMon = day === 0 ? -6 : 1 - day;
            startOfWeek.setDate(now.getDate() + diffToMon);
            startOfWeek.setHours(0, 0, 0, 0);
            if (appDate < startOfWeek) return false;
          }

          if (filter.dateRange === 'last_week') {
            const startOfThisWeek = new Date(now);
            const day = now.getDay();
            const diffToMon = day === 0 ? -6 : 1 - day;
            startOfThisWeek.setDate(now.getDate() + diffToMon);
            startOfThisWeek.setHours(0, 0, 0, 0);

            const startOfLastWeek = new Date(startOfThisWeek);
            startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

            if (appDate < startOfLastWeek || appDate >= startOfThisWeek) return false;
          }

          if (filter.dateRange === 'this_month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            if (appDate < startOfMonth) return false;
          }

          if (filter.dateRange === 'last_month') {
            const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            if (appDate < startOfLastMonth || appDate >= startOfThisMonth) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sort.field as keyof Application] || '';
        let valB: any = b[sort.field as keyof Application] || '';

        if (sort.field === 'daysInStage') {
          valA = calculateDaysInStage(a.stageUpdatedAt);
          valB = calculateDaysInStage(b.stageUpdatedAt);
        }

        if (typeof valA === 'string') {
          const comp = valA.localeCompare(valB);
          return sort.order === 'asc' ? comp : -comp;
        }

        if (valA < valB) return sort.order === 'asc' ? -1 : 1;
        if (valA > valB) return sort.order === 'asc' ? 1 : -1;
        return 0;
      });
  }, [applications, filter, sort]);

  const selectedApp = useMemo(() => {
    return applications.find((a) => a.id === selectedAppId) || null;
  }, [applications, selectedAppId]);

  // If authentication state is still loading
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 font-sans text-xs text-slate-500 select-none">
        <div className="flex flex-col items-center gap-3 p-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs animate-in fade-in duration-200">
          <img src="/logo.svg" alt="Tracklet Logo" className="w-10 h-10 animate-pulse" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-heading font-bold text-slate-900 text-sm tracking-tight">Tracklet</span>
            <span className="font-mono text-[11px] text-slate-500">Loading workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated with email but unverified, render Strict Email Verification Screen
  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 font-sans">
        <EmailVerificationGate
          onVerified={loadData}
          onShowToast={addToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // If user is not authenticated and has not chosen guest mode (Authentication Wall)
  if (!user && !isGuestMode) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 font-sans">
        <AuthScreen
          onShowToast={addToast}
          onContinueAsGuest={() => {
            try {
              localStorage.setItem('tracklet_guest_mode', 'true');
            } catch {
              // Ignore
            }
            setIsGuestMode(true);
            const targetPath = getPathForTab(activeTab);
            window.history.pushState(null, '', targetPath);
            addToast('info', 'Guest Session Started', 'Applications will be saved to this browser.');
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden antialiased select-none">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        applications={applications}
        expirySettings={expirySettings}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onSeedDemoData={handleSeedDemoData}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        {(activeTab === 'all' || activeTab === 'pipeline') && (
          <TopBar
            filter={filter}
            setFilter={setFilter}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            totalFilteredCount={filteredAndSortedApplications.length}
            onExportCSV={() => exportApplicationsToCSV(filteredAndSortedApplications)}
            activeTab={activeTab}
          />
        )}

        {/* Dynamic Screen View */}
        {authLoading || dataLoading ? (
          <div className="flex-1 flex items-center justify-center font-mono text-xs text-slate-400">
            Loading Tracklet workspace...
          </div>
        ) : (
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            {activeTab === 'all' && (
              <AllApplicationsTable
                applications={filteredAndSortedApplications}
                totalAppCount={applications.length}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onResetFilters={() => setFilter(DEFAULT_FILTER)}
                onSeedDemoData={handleSeedDemoData}
                selectedAppId={selectedAppId}
                onSelectApp={(app) => setSelectedAppId(app.id)}
                sort={sort}
                onSortChange={handleSortChange}
                onBulkUpdateStatus={handleBulkUpdateStatus}
                onBulkDelete={handleBulkDelete}
              />
            )}

            {activeTab === 'pipeline' && (
              <ActivePipelineBoard
                applications={filteredAndSortedApplications}
                totalAppCount={applications.length}
                onOpenAddModal={() => setIsAddModalOpen(true)}
                onResetFilters={() => setFilter(DEFAULT_FILTER)}
                onSeedDemoData={handleSeedDemoData}
                selectedAppId={selectedAppId}
                onSelectApp={(app) => setSelectedAppId(app.id)}
                onUpdateStatus={(id, newStatus) =>
                  handleUpdateApplication(id, {
                    status: newStatus,
                    stageUpdatedAt: new Date().toISOString(),
                  })
                }
              />
            )}

            {activeTab === 'stats' && (
              <StatsView
                applications={applications}
                onSelectApplication={(id) => setSelectedAppId(id)}
              />
            )}

            {activeTab === 'settings' && (
              <div className="flex-1 overflow-y-auto p-6">
                <SettingsView
                  settings={expirySettings}
                  onUpdateSettings={handleUpdateExpirySettings}
                  applications={applications}
                  onSelectApplication={(id) => setSelectedAppId(id)}
                  onExportCSV={() => exportApplicationsToCSV(filteredAndSortedApplications)}
                  onImportCSV={handleBatchImportApplications}
                  onSeedDemoData={handleSeedDemoData}
                  onShowToast={addToast}
                  onAccountDeleted={() => {
                    setApplications([]);
                    setSelectedAppId(null);
                  }}
                />
              </div>
            )}
          </main>
        )}
      </div>

      {/* Right Slide-over Detail Panel */}
      <ApplicationDetailPanel
        app={selectedApp}
        onClose={() => setSelectedAppId(null)}
        onUpdateApp={handleUpdateApplication}
        onDeleteApp={handleDeleteApplication}
      />

      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddApplication}
      />

      {/* Multi-Provider Auth Modal */}
      <AuthModal onShowToast={addToast} />

      {/* Guest-to-Account Data Migration Modal */}
      <GuestMigrationModal
        isOpen={isMigrationModalOpen}
        guestApplications={migrationApps}
        onImport={handleImportGuestApps}
        onDiscard={handleDiscardGuestApps}
        onClose={() => setIsMigrationModalOpen(false)}
      />

      {/* Global Toast Feedback Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TrackletAppContent />
    </AuthProvider>
  );
}
