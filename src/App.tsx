import React, { useState, useEffect, useCallback } from 'react';
import { Application, Contact } from './types';
import { ApplicationRepository } from './lib/applicationRepository';
import { ContactRepository } from './lib/contactRepository';
import { migrateLegacyEmbeddedContacts } from './lib/contactMigration';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AllApplicationsTable } from './components/AllApplicationsTable';
import { ActivePipelineBoard } from './components/ActivePipelineBoard';
import { ApplicationDetailPanel } from './components/ApplicationDetailPanel';
import { ContactDetailPanel } from './components/ContactDetailPanel';
import { AddApplicationModal } from './components/AddApplicationModal';
import { ContactsView } from './components/ContactsView';
import { StatsView } from './components/StatsView';
import { SettingsView } from './components/SettingsView';
import { AuthScreen } from './components/AuthScreen';
import { AuthModal } from './components/AuthModal';
import { EmailVerificationGate } from './components/EmailVerificationGate';
import { GuestMigrationModal } from './components/GuestMigrationModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useExpirySettings } from './hooks/useExpirySettings';
import { useContacts } from './hooks/useContacts';
import { useApplications } from './hooks/useApplications';
import { useGuestMigration } from './hooks/useGuestMigration';
import { useExtensionSync } from './hooks/useExtensionSync';
import { AlertTriangle, X } from 'lucide-react';

import { useUrlNavigation, DEFAULT_FILTER, getPathForTab, isAuthPath } from './hooks/useUrlNavigation';

function TrackletAppContent() {
  const { user, loading: authLoading, openAuthModal, signOut } = useAuth();

  // ── URL-synchronized navigation & filter state ──
  const {
    activeTab,
    setActiveTab,
    filter,
    setFilter,
    selectedAppId,
    setSelectedAppId,
    isAddModalOpen,
    setIsAddModalOpen,
  } = useUrlNavigation();

  // Toast notifications
  const { toasts, addToast, dismissToast } = useToast();

  // Applications management hook
  const {
    applications,
    setApplications,
    applicationsRef,
    selectedApp,
    sort,
    setSort,
    handleSortChange,
    filteredAndSortedApplications,
    duplicateGroups,
    duplicateCount,
    handleAddApplication,
    handleBatchImportApplications,
    handleUpdateApplication,
    handleDeleteApplication,
    handleBulkUpdateStatus,
    handleBulkDelete,
    handleMergeAllDuplicates,
    handleExportCSV,
  } = useApplications({
    user,
    filter,
    addToast,
    selectedAppId,
    setSelectedAppId,
  });

  const [dataLoading, setDataLoading] = useState(true);

  // Guest Mode State (when unauthenticated visitor explicitly chooses to explore as guest from sign-up)
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tracklet_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isDuplicateBannerDismissed, setIsDuplicateBannerDismissed] = useState<boolean>(false);

  // Contacts management hook
  const {
    contacts,
    setContacts,
    selectedContactId,
    setSelectedContactId,
    selectedContact,
    handleAddContact,
    handleUpdateContact,
    handleDeleteContact,
    handleBatchDeleteContacts,
    handleLinkContact,
    handleUnlinkContact,
  } = useContacts({
    user,
    applications,
    setApplications,
    addToast,
    setSelectedAppId,
  });

  // Guest migration hook (detects guest data and handles transfer to authenticated cloud account)
  const {
    migrationApps,
    migrationContacts,
    isMigrationModalOpen,
    setIsMigrationModalOpen,
    checkAndPromptGuestMigration,
    handleImportGuestApps,
    handleDiscardGuestApps,
  } = useGuestMigration({
    user,
    setApplications,
    setContacts,
    addToast,
  });

  // Expiry notification settings
  const { expirySettings, updateExpirySettings: handleUpdateExpirySettings } = useExpirySettings();

  // Load applications and contacts whenever user changes or email is verified
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      if (user && user.emailVerified) {
        const [appsResult, contactsResult] = await Promise.allSettled([
          ApplicationRepository.loadApplications(user.uid),
          ContactRepository.loadContacts(user.uid),
        ]);

        let loadedApps: Application[] = [];
        let loadedContacts: Contact[] = [];

        if (appsResult.status === 'fulfilled') {
          loadedApps = appsResult.value;
        } else {
          console.error('Failed to load applications from Firestore:', appsResult.reason);
          throw appsResult.reason;
        }

        if (contactsResult.status === 'fulfilled') {
          loadedContacts = contactsResult.value;
        } else {
          console.warn('Failed to load contacts from Firestore (using local fallback):', contactsResult.reason);
          loadedContacts = ContactRepository.loadGuestContacts();
        }

        // Automatic legacy embedded contact migration
        const { migratedContacts, updatedApplications, hasChanges } = migrateLegacyEmbeddedContacts(
          loadedApps,
          loadedContacts
        );

        if (hasChanges) {
          loadedApps = updatedApplications;
          loadedContacts = migratedContacts;
          // Asynchronously persist any newly migrated standalone contacts preserving IDs
          for (const newC of migratedContacts) {
            ContactRepository.upsertContact(newC, user.uid).catch((err) => {
              console.warn('Could not save migrated contact to Firestore:', err);
            });
          }
        }

        setApplications(loadedApps);
        setContacts(loadedContacts);

        // Check for guest data migration
        checkAndPromptGuestMigration();
      } else if (!user) {
        let guestApps = ApplicationRepository.loadGuestApplications();
        let guestContacts = ContactRepository.loadGuestContacts();

        // Run automatic legacy embedded contact migration on guest data
        const { migratedContacts, updatedApplications, migratedCount } = migrateLegacyEmbeddedContacts(
          guestApps,
          guestContacts
        );

        if (migratedCount > 0) {
          guestApps = updatedApplications;
          guestContacts = migratedContacts;
          ApplicationRepository.saveGuestApplications(guestApps);
          ContactRepository.saveGuestContacts(guestContacts);
        }

        setApplications(guestApps);
        setContacts(guestContacts);
      }
    } catch (err) {
      console.error('Error loading applications and contacts:', err);
      addToast('error', 'Load Error', 'Could not load data from repository.');
    } finally {
      setDataLoading(false);
    }
  }, [user, addToast, checkAndPromptGuestMigration]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading, user?.uid, user?.emailVerified, loadData]);

  // Extension synchronization, event listener, and background ingestion buffer
  useExtensionSync({
    user,
    applications,
    setApplications,
    applicationsRef,
    contacts,
    dataLoading,
    handleAddContact,
    setSelectedAppId,
    addToast,
  });

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
      setSelectedContactId(null);
      window.history.pushState(null, '', '/login');
      addToast('info', 'Signed Out', 'Returned to authentication screen.');
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  // Reset / Load Demo Data
  const handleSeedDemoData = async () => {
    try {
      const [freshDocs, freshContacts] = await Promise.all([
        ApplicationRepository.seedDemoData(user?.emailVerified ? user.uid : undefined),
        ContactRepository.seedDemoContacts(user?.emailVerified ? user.uid : undefined),
      ]);
      setApplications(freshDocs);
      setContacts(freshContacts);
      setSelectedAppId(null);
      setSelectedContactId(null);
      addToast('info', 'Sample data loaded', 'Demo applications and contacts ready.');
    } catch (err) {
      console.error('Failed to seed demo data:', err);
      addToast('error', 'Error', 'Could not load demo dataset.');
    }
  };



  // If authentication state is still loading
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 font-sans text-xs text-slate-500 select-none">
        <div className="flex flex-col items-center gap-3 p-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs animate-in fade-in duration-200 motion-reduce:animate-none">
          <img src="/logo.svg" alt="Tracklet Logo" className="w-10 h-10 animate-pulse motion-reduce:animate-none" />
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
        contacts={contacts}
        expirySettings={expirySettings}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onSeedDemoData={handleSeedDemoData}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
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
            onExportCSV={handleExportCSV}
            activeTab={activeTab}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />
        )}

        {/* Dynamic Screen View */}
        {authLoading || dataLoading ? (
          <div className="flex-1 flex items-center justify-center font-mono text-xs text-slate-500">
            Loading Tracklet workspace...
          </div>
        ) : (
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
            {/* Duplicate Applications Detected Banner */}
            {(activeTab === 'all' || activeTab === 'pipeline') && duplicateCount > 0 && !isDuplicateBannerDismissed && (
              <div
                role="status"
                aria-live="polite"
                className="shrink-0 mx-4 md:mx-6 mt-3 px-3.5 py-2.5 bg-amber-50/95 border border-amber-200/80 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none z-10"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                  <p className="truncate">
                    <span className="font-semibold text-amber-950">Duplicate applications detected:</span>{' '}
                    <span>{duplicateCount} duplicate instance{duplicateCount === 1 ? '' : 's'} found across your pipeline.</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleMergeAllDuplicates}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600 cursor-pointer"
                  >
                    Merge All
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDuplicateBannerDismissed(true)}
                    aria-label="Dismiss duplicate notice"
                    className="p-1 text-amber-600 hover:text-amber-800 rounded-md hover:bg-amber-100/60 active:bg-amber-200/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

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
                onShowToast={addToast}
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

            {activeTab === 'contacts' && (
              <ContactsView
                contacts={contacts}
                applications={applications}
                onAddContact={handleAddContact}
                onUpdateContact={handleUpdateContact}
                onDeleteContact={handleDeleteContact}
                onSelectContact={(contactId) => setSelectedContactId(contactId)}
                onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                onShowToast={addToast}
                expiryThresholdHours={expirySettings.expiryThresholdHours}
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
                  contacts={contacts}
                  onSelectApplication={(id) => setSelectedAppId(id)}
                  onExportCSV={handleExportCSV}
                  onImportCSV={handleBatchImportApplications}
                  onImportJSON={handleBatchImportApplications}
                  onSeedDemoData={handleSeedDemoData}
                  onShowToast={addToast}
                  onAccountDeleted={() => {
                    setApplications([]);
                    setSelectedAppId(null);
                  }}
                  userId={user?.uid}
                />
              </div>
            )}
          </main>
        )}
      </div>

      {/* Right Slide-over Detail Panel */}
      <ApplicationDetailPanel
        app={selectedApp}
        allContacts={contacts}
        currentUserEmail={user?.email || undefined}
        onClose={() => setSelectedAppId(null)}
        onUpdateApp={handleUpdateApplication}
        onDeleteApp={handleDeleteApplication}
        onLinkContact={handleLinkContact}
        onUnlinkContact={handleUnlinkContact}
        onCreateAndLinkContact={async (contactData, appId) => {
          const mergedAppIds = Array.from(new Set([...(contactData.applicationIds || []), appId]));
          await handleAddContact({
            ...contactData,
            applicationIds: mergedAppIds,
          });
        }}
        onUpdateContact={handleUpdateContact}
        onSelectContact={(contactId) => {
          setSelectedAppId(null);
          setSelectedContactId(contactId);
        }}
        onEditContact={(contact) => {
          setSelectedAppId(null);
          setSelectedContactId(contact.id);
        }}
        onShowToast={addToast}
      />

      {/* Right Slide-over Contact Detail Panel */}
      <ContactDetailPanel
        contact={selectedContact}
        applications={applications}
        onClose={() => setSelectedContactId(null)}
        onUpdateContact={handleUpdateContact}
        onDeleteContact={handleDeleteContact}
        onUnlinkFromApp={handleUnlinkContact}
        onSelectApplication={(appId) => {
          setSelectedContactId(null);
          setSelectedAppId(appId);
        }}
        onFollowUp={(contact) => {
          if (contact.applicationIds && contact.applicationIds.length > 0) {
            const linkedApp = applications.find((a) => contact.applicationIds?.includes(a.id));
            if (linkedApp) {
              setSelectedContactId(null);
              setSelectedAppId(linkedApp.id);
              return;
            }
          }
          if (contact.email) {
            window.open(`mailto:${contact.email}`, '_blank', 'noopener,noreferrer');
          }
        }}
      />

      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        allContacts={contacts}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddApplication}
        onCreateContact={handleAddContact}
      />

      {/* Multi-Provider Auth Modal */}
      <AuthModal onShowToast={addToast} />

      {/* Guest-to-Account Data Migration Modal */}
      <GuestMigrationModal
        isOpen={isMigrationModalOpen}
        guestApplications={migrationApps}
        guestContacts={migrationContacts}
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
