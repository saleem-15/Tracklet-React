import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut, 
  onAuthStateChanged,
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  writeBatch,
  User 
} from './lib/firebase';
import { 
  Application, 
  ActiveTab, 
  FilterState, 
  SortState, 
  ApplicationStatus, 
  SortField 
} from './types';
import { INITIAL_SAMPLE_APPLICATIONS, calculateDaysInStage } from './lib/sampleData';
import { exportApplicationsToCSV } from './lib/exportCsv';
import { addStatusHistoryEntry } from './lib/historyService';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AllApplicationsTable } from './components/AllApplicationsTable';
import { ActivePipelineBoard } from './components/ActivePipelineBoard';
import { ApplicationDetailPanel } from './components/ApplicationDetailPanel';
import { AddApplicationModal } from './components/AddApplicationModal';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { loadExpirySettings, saveExpirySettings } from './lib/expiryUtils';
import { ExpiryNotificationSettings } from './types';

import { ToastContainer, ToastMessage } from './components/Toast';

const LOCAL_STORAGE_KEY = 'tracklet_guest_apps_v1';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
      if (currentUser) {
        await loadFirestoreApplications(currentUser.uid);
      } else {
        loadGuestApplications();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load from Guest localStorage or initial sample data
  const loadGuestApplications = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setApplications(JSON.parse(stored));
      } else {
        const initial = INITIAL_SAMPLE_APPLICATIONS.map((item, idx) => ({
          ...item,
          id: `guest-${idx + 1}`,
          userId: 'guest',
        }));
        setApplications(initial);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      }
    } catch {
      const initial = INITIAL_SAMPLE_APPLICATIONS.map((item, idx) => ({
        ...item,
        id: `guest-${idx + 1}`,
        userId: 'guest',
      }));
      setApplications(initial);
    }
  };

  // Load from Firestore for logged in user
  const loadFirestoreApplications = async (userId: string) => {
    try {
      const q = query(collection(db, 'applications'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const docsData: Application[] = [];
      querySnapshot.forEach((docSnap) => {
        docsData.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Application, 'id'>),
        });
      });

      if (docsData.length === 0) {
        // Seed default applications to Firestore for a rich initial experience
        const batch = writeBatch(db);
        const seeded: Application[] = [];

        for (const item of INITIAL_SAMPLE_APPLICATIONS) {
          const docRef = doc(collection(db, 'applications'));
          const appObj: Omit<Application, 'id'> = {
            ...item,
            userId,
          };
          batch.set(docRef, appObj);
          seeded.push({ id: docRef.id, ...appObj });
        }
        await batch.commit();
        setApplications(seeded);
      } else {
        setApplications(docsData);
      }
    } catch (err) {
      console.error('Error fetching Firestore applications:', err);
      addToast('error', 'Cloud Sync Warning', 'Could not connect to database. Showing offline local storage copy.');
      loadGuestApplications();
    }
  };

  // Sync Guest localStorage
  const saveGuestAppsToStorage = (updated: Application[]) => {
    if (!user) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  // Sign In / Sign Out
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
    const initial = INITIAL_SAMPLE_APPLICATIONS.map((item, idx) => ({
      ...item,
      id: user ? `seed-${idx + 1}` : `guest-${idx + 1}`,
      userId: user ? user.uid : 'guest',
    }));

    if (user) {
      try {
        // Clear existing Firestore applications for this user
        const q = query(collection(db, 'applications'), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        const deleteBatch = writeBatch(db);
        snap.forEach((d) => deleteBatch.delete(d.ref));
        await deleteBatch.commit();

        // Seed new batch
        const insertBatch = writeBatch(db);
        const freshDocs: Application[] = [];
        for (const item of INITIAL_SAMPLE_APPLICATIONS) {
          const docRef = doc(collection(db, 'applications'));
          const appObj: Omit<Application, 'id'> = {
            ...item,
            userId: user.uid,
          };
          insertBatch.set(docRef, appObj);
          freshDocs.push({ id: docRef.id, ...appObj });
        }
        await insertBatch.commit();
        setApplications(freshDocs);
      } catch (err) {
        console.error('Failed to reset Firestore demo data:', err);
      }
    } else {
      setApplications(initial);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    }
    setSelectedAppId(null);
    addToast('info', 'Workspace Reset', 'Sample job application dataset loaded.');
  };

  // Add Application
  const handleAddApplication = async (
    newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>
  ) => {
    const now = new Date().toISOString();
    const appData = {
      ...newApp,
      stageUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    let createdId = '';
    if (user) {
      try {
        const docRef = await addDoc(collection(db, 'applications'), {
          ...appData,
          userId: user.uid,
        });
        createdId = docRef.id;
      } catch (err) {
        console.error('Failed to add document to Firestore (offline fallback):', err);
        createdId = `offline-${Date.now()}`;
      }
      const created: Application = {
        id: createdId,
        userId: user.uid,
        ...appData,
      };
      setApplications((prev) => [created, ...prev]);
    } else {
      createdId = `guest-${Date.now()}`;
      const guestCreated: Application = {
        id: createdId,
        userId: 'guest',
        ...appData,
      };
      const updated = [guestCreated, ...applications];
      setApplications(updated);
      saveGuestAppsToStorage(updated);
    }

    // Record initial status history entry
    if (createdId) {
      await addStatusHistoryEntry(createdId, newApp.status, undefined, now);
    }

    addToast('success', 'Application Added', `Logged ${newApp.company} (${newApp.role})`);
  };

  // Batch Import Applications from CSV
  const handleBatchImportApplications = async (
    newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => {
    const now = new Date().toISOString();

    if (user) {
      try {
        const batch = writeBatch(db);
        const createdList: Application[] = [];

        for (const appItem of newApps) {
          const docRef = doc(collection(db, 'applications'));
          const appObj: Omit<Application, 'id'> = {
            ...appItem,
            userId: user.uid,
            stageUpdatedAt: now,
            createdAt: now,
            updatedAt: now,
          };
          batch.set(docRef, appObj);
          createdList.push({ id: docRef.id, ...appObj });
        }

        await batch.commit();
        setApplications((prev) => [...createdList, ...prev]);

        for (const app of createdList) {
          await addStatusHistoryEntry(app.id, app.status, undefined, now);
        }
      } catch (err) {
        console.error('Failed batch import in Firestore:', err);
      }
    } else {
      const createdList: Application[] = newApps.map((appItem, index) => ({
        id: `imported-${Date.now()}-${index}`,
        userId: 'guest',
        ...appItem,
        stageUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
      }));

      setApplications((prev) => {
        const updated = [...createdList, ...prev];
        saveGuestAppsToStorage(updated);
        return updated;
      });

      for (const app of createdList) {
        await addStatusHistoryEntry(app.id, app.status, undefined, now);
      }
    }

    addToast('success', 'Batch Import Complete', `Successfully imported ${newApps.length} job applications.`);
  };

  // Update Application
  const handleUpdateApplication = async (id: string, updates: Partial<Application>) => {
    const now = new Date().toISOString();
    const currentApp = applications.find((a) => a.id === id);
    const isStatusChanged = updates.status && currentApp && updates.status !== currentApp.status;

    const updatedFields = { ...updates, updatedAt: now };

    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updatedFields } : a))
    );

    if (user) {
      try {
        const docRef = doc(db, 'applications', id);
        await updateDoc(docRef, updatedFields);
      } catch (err) {
        console.error('Failed to update Firestore application:', err);
      }
    } else {
      const updatedList = applications.map((a) =>
        a.id === id ? { ...a, ...updatedFields } : a
      );
      saveGuestAppsToStorage(updatedList);
    }

    // Record status history if status changed
    if (isStatusChanged && updates.status && currentApp) {
      await addStatusHistoryEntry(id, updates.status, currentApp.status, now);
      addToast('info', 'Status Updated', `${currentApp.company} moved to ${updates.status}`);
    }
  };

  // Delete Application
  const handleDeleteApplication = async (id: string) => {
    const targetApp = applications.find((a) => a.id === id);
    setApplications((prev) => prev.filter((a) => a.id !== id));
    if (selectedAppId === id) setSelectedAppId(null);

    if (user) {
      try {
        await deleteDoc(doc(db, 'applications', id));
      } catch (err) {
        console.error('Failed to delete application from Firestore:', err);
      }
    } else {
      const updatedList = applications.filter((a) => a.id !== id);
      saveGuestAppsToStorage(updatedList);
    }

    if (targetApp) {
      addToast('info', 'Application Removed', `Deleted ${targetApp.company} record.`);
    }
  };

  // Bulk Actions
  const handleBulkUpdateStatus = async (ids: string[], newStatus: ApplicationStatus) => {
    const now = new Date().toISOString();
    const appMap = new Map<string, ApplicationStatus>(applications.map((a) => [a.id, a.status]));

    setApplications((prev) =>
      prev.map((a) =>
        ids.includes(a.id) ? { ...a, status: newStatus, stageUpdatedAt: now, updatedAt: now } : a
      )
    );

    if (user) {
      try {
        const batch = writeBatch(db);
        ids.forEach((id) => {
          const dRef = doc(db, 'applications', id);
          batch.update(dRef, { status: newStatus, stageUpdatedAt: now, updatedAt: now });
        });
        await batch.commit();
      } catch (err) {
        console.error('Failed bulk status update in Firestore:', err);
      }
    } else {
      const updatedList = applications.map((a) =>
        ids.includes(a.id) ? { ...a, status: newStatus, stageUpdatedAt: now, updatedAt: now } : a
      );
      saveGuestAppsToStorage(updatedList);
    }

    // Log history entry for each application in bulk update
    for (const id of ids) {
      const prevStatus = appMap.get(id);
      if (prevStatus && prevStatus !== newStatus) {
        await addStatusHistoryEntry(id, newStatus, prevStatus, now);
      }
    }

    addToast('success', 'Bulk Status Updated', `Moved ${ids.length} applications to ${newStatus}`);
  };

  const handleBulkDelete = async (ids: string[]) => {
    const count = ids.length;
    setApplications((prev) => prev.filter((a) => !ids.includes(a.id)));
    if (selectedAppId && ids.includes(selectedAppId)) setSelectedAppId(null);

    if (user) {
      try {
        const batch = writeBatch(db);
        ids.forEach((id) => {
          batch.delete(doc(db, 'applications', id));
        });
        await batch.commit();
      } catch (err) {
        console.error('Failed bulk delete in Firestore:', err);
      }
    } else {
      const updatedList = applications.filter((a) => !ids.includes(a.id));
      saveGuestAppsToStorage(updatedList);
    }

    addToast('info', 'Bulk Deleted', `Removed ${count} applications.`);
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
        // Search filter
        if (filter.search.trim()) {
          const q = filter.search.toLowerCase();
          const matchCompany = app.company.toLowerCase().includes(q);
          const matchRole = app.role.toLowerCase().includes(q);
          const matchNotes = app.notes ? app.notes.toLowerCase().includes(q) : false;
          if (!matchCompany && !matchRole && !matchNotes) return false;
        }

        // Platform filter
        if (filter.platform !== 'All' && app.platform !== filter.platform) {
          return false;
        }

        // Status filter
        if (filter.status === 'Active') {
          if (app.status === 'Rejected' || app.status === 'Archived') return false;
        } else if (filter.status !== 'All' && app.status !== filter.status) {
          return false;
        }

        // Date range filter
        if (filter.dateRange !== 'all') {
          const appDate = new Date(app.dateApplied);
          const now = new Date();
          const daysAgo = (now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24);

          if (filter.dateRange === '7days' && daysAgo > 7) return false;
          if (filter.dateRange === '30days' && daysAgo > 30) return false;
          if (filter.dateRange === '60days' && daysAgo > 60) return false;

          // Weekly filters
          if (filter.dateRange === 'this_week') {
            const startOfWeek = new Date(now);
            const day = now.getDay();
            const diffToMon = (day === 0 ? -6 : 1 - day); // Monday as start of week
            startOfWeek.setDate(now.getDate() + diffToMon);
            startOfWeek.setHours(0, 0, 0, 0);
            if (appDate < startOfWeek) return false;
          }

          if (filter.dateRange === 'last_week') {
            const startOfThisWeek = new Date(now);
            const day = now.getDay();
            const diffToMon = (day === 0 ? -6 : 1 - day);
            startOfThisWeek.setDate(now.getDate() + diffToMon);
            startOfThisWeek.setHours(0, 0, 0, 0);

            const startOfLastWeek = new Date(startOfThisWeek);
            startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

            if (appDate < startOfLastWeek || appDate >= startOfThisWeek) return false;
          }

          // Monthly filters
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
        {/* Top Header Bar - Only render on All Applications and Active Pipeline views */}
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
