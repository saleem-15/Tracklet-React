import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut, 
  onAuthStateChanged,
  User 
} from './lib/firebase';
import { 
  Application, 
  ActiveTab, 
  FilterState, 
  SortState, 
  ApplicationStatus, 
  SortField,
  ExpiryNotificationSettings
} from './types';
import { exportApplicationsToCSV } from './lib/exportCsv';
import { ApplicationRepository } from './lib/applicationRepository';
import { filterAndSortApplications } from './lib/filterUtils';
import { loadExpirySettings, saveExpirySettings } from './lib/expiryUtils';
import { setupExtensionSync } from './lib/extensionSync';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AllApplicationsTable } from './components/AllApplicationsTable';
import { ActivePipelineBoard } from './components/ActivePipelineBoard';
import { ApplicationDetailPanel } from './components/ApplicationDetailPanel';
import { AddApplicationModal } from './components/AddApplicationModal';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

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
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    platform: 'All',
    status: 'All',
    dateRange: 'all',
  });

  const [sort, setSort] = useState<SortState>({
    field: 'dateApplied',
    order: 'desc',
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      try {
        const loadedApps = await ApplicationRepository.loadApplications(currentUser?.uid);
        setApplications(loadedApps);
      } catch (err) {
        console.error('Error loading applications:', err);
        addToast('error', 'Sync Failure', 'Could not load applications data.');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Extension Sync Listener
  useEffect(() => {
    const cleanup = setupExtensionSync({
      onApplicationReceived: async (clippedApp) => {
        let updatedList: Application[] = [];

        setApplications((prev) => {
          const existsIndex = prev.findIndex(
            (a) => a.id === clippedApp.id || (a.jobLink && clippedApp.jobLink && a.jobLink === clippedApp.jobLink)
          );

          if (existsIndex >= 0) {
            updatedList = [...prev];
            updatedList[existsIndex] = { ...updatedList[existsIndex], ...clippedApp };
          } else {
            updatedList = [clippedApp, ...prev];
          }

          if (!user) {
            ApplicationRepository.saveGuestApplications(updatedList);
          }
          return updatedList;
        });

        if (user) {
          try {
            await ApplicationRepository.addApplication(clippedApp, user.uid);
          } catch (e) {
            console.warn('Failed to sync extension application to Firestore:', e);
          }
        }

        addToast(
          'success',
          'Clipped via Tracklet Extension',
          `Saved "${clippedApp.role}" at ${clippedApp.company}`
        );
      },
    });

    return () => cleanup();
  }, [user]);

  // Auth Action Handlers
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
      setSelectedAppId(null);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  // Reset Demo Data
  const handleSeedDemoData = async () => {
    const freshApps = await ApplicationRepository.seedDemoData(user?.uid);
    setApplications(freshApps);
    setSelectedAppId(null);
    addToast('info', 'Workspace Reset', 'Sample job application dataset loaded.');
  };

  // Add Application
  const handleAddApplication = async (
    newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>
  ) => {
    const createdApp = await ApplicationRepository.addApplication(newApp, user?.uid);
    
    setApplications((prev) => {
      const updated = [createdApp, ...prev];
      if (!user) {
        ApplicationRepository.saveGuestApplications(updated);
      }
      return updated;
    });

    addToast('success', 'Application Added', `Logged ${newApp.company} (${newApp.role})`);
  };

  // Batch Import
  const handleBatchImportApplications = async (
    newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => {
    const createdList = await ApplicationRepository.batchImport(newApps, user?.uid);
    
    setApplications((prev) => {
      const updated = [...createdList, ...prev];
      if (!user) {
        ApplicationRepository.saveGuestApplications(updated);
      }
      return updated;
    });

    addToast('success', 'Batch Import Complete', `Successfully imported ${newApps.length} job applications.`);
  };

  // Update Application
  const handleUpdateApplication = async (id: string, updates: Partial<Application>) => {
    const currentApp = applications.find((a) => a.id === id);
    const isStatusChanged = updates.status && currentApp && updates.status !== currentApp.status;

    const updatedFields = await ApplicationRepository.updateApplication(id, updates, user?.uid);

    setApplications((prev) => {
      const updatedList = prev.map((a) => (a.id === id ? { ...a, ...updatedFields } : a));
      if (!user) {
        ApplicationRepository.saveGuestApplications(updatedList);
      }
      return updatedList;
    });

    if (isStatusChanged && updates.status && currentApp) {
      addToast('info', 'Status Updated', `${currentApp.company} moved to ${updates.status}`);
    }
  };

  // Delete Application
  const handleDeleteApplication = async (id: string) => {
    const targetApp = applications.find((a) => a.id === id);
    await ApplicationRepository.deleteApplication(id, user?.uid);

    setApplications((prev) => {
      const updatedList = prev.filter((a) => a.id !== id);
      if (!user) {
        ApplicationRepository.saveGuestApplications(updatedList);
      }
      return updatedList;
    });

    if (selectedAppId === id) setSelectedAppId(null);
    if (targetApp) {
      addToast('info', 'Application Removed', `Deleted ${targetApp.company} record.`);
    }
  };

  // Bulk Status Update
  const handleBulkUpdateStatus = async (ids: string[], newStatus: ApplicationStatus) => {
    const now = new Date().toISOString();
    await ApplicationRepository.batchUpdateStatus(ids, newStatus, user?.uid);

    setApplications((prev) => {
      const updatedList = prev.map((a) =>
        ids.includes(a.id) ? { ...a, status: newStatus, stageUpdatedAt: now, updatedAt: now } : a
      );
      if (!user) {
        ApplicationRepository.saveGuestApplications(updatedList);
      }
      return updatedList;
    });

    addToast('success', 'Bulk Status Updated', `Moved ${ids.length} applications to ${newStatus}`);
  };

  // Bulk Delete
  const handleBulkDelete = async (ids: string[]) => {
    const count = ids.length;
    await ApplicationRepository.batchDelete(ids, user?.uid);

    setApplications((prev) => {
      const updatedList = prev.filter((a) => !ids.includes(a.id));
      if (!user) {
        ApplicationRepository.saveGuestApplications(updatedList);
      }
      return updatedList;
    });

    if (selectedAppId && ids.includes(selectedAppId)) setSelectedAppId(null);
    addToast('info', 'Bulk Deleted', `Removed ${count} applications.`);
  };

  // Sorting
  const handleSortChange = (field: SortField) => {
    setSort((prev) => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Filtered and Sorted Applications memoized
  const filteredAndSortedApplications = useMemo(() => {
    return filterAndSortApplications(applications, filter, sort);
  }, [applications, filter, sort]);

  const selectedApp = useMemo(() => {
    return applications.find((a) => a.id === selectedAppId) || null;
  }, [applications, selectedAppId]);

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
        {loading ? (
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
                onResetFilters={() => setFilter({ search: '', platform: 'All', status: 'All', dateRange: 'all' })}
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
                onResetFilters={() => setFilter({ search: '', platform: 'All', status: 'All', dateRange: 'all' })}
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
              <StatsView applications={applications} />
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

      {/* Global Toast Feedback Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
