import { useState, useEffect, useCallback } from 'react';
import { Contact } from './types';
import { ApplicationRepository } from './lib/applicationRepository';
import { ContactRepository } from './lib/contactRepository';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AuthGate } from './components/layout/AuthGate';
import { WorkspaceContent } from './components/layout/WorkspaceContent';
import { AppSlideOvers } from './components/layout/AppSlideOvers';
import { AppModals } from './components/layout/AppModals';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { useExpirySettings } from './hooks/useExpirySettings';
import { useContacts } from './hooks/useContacts';
import { useApplications } from './hooks/useApplications';
import { useGuestMigration } from './hooks/useGuestMigration';
import { useExtensionSync } from './hooks/useExtensionSync';
import { useDataLoader } from './hooks/useDataLoader';
import { useUrlNavigation, DEFAULT_FILTER, getPathForTab, isAuthPath } from './hooks/useUrlNavigation';

function TrackletAppContent() {
  const { user, loading: authLoading, openAuthModal, signOut } = useAuth();

  // ── URL-synchronized navigation & filter state ──
  const {
    activeTab, setActiveTab, filter, setFilter,
    selectedAppId, setSelectedAppId, isAddModalOpen, setIsAddModalOpen,
  } = useUrlNavigation();

  const { toasts, addToast, dismissToast } = useToast();

  // ── Domain hooks ──
  const {
    applications, setApplications, applicationsRef, selectedApp,
    sort, handleSortChange, filteredAndSortedApplications,
    duplicateCount, handleAddApplication, handleBatchImportApplications,
    handleUpdateApplication, handleDeleteApplication,
    handleBulkUpdateStatus, handleBulkDelete, handleMergeAllDuplicates, handleExportCSV,
  } = useApplications({ user, filter, addToast, selectedAppId, setSelectedAppId });

  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try { return localStorage.getItem('tracklet_guest_mode') === 'true'; } catch { return false; }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDuplicateBannerDismissed, setIsDuplicateBannerDismissed] = useState(false);

  const {
    contacts, setContacts, selectedContactId, setSelectedContactId, selectedContact,
    handleAddContact, handleUpdateContact, handleDeleteContact,
    handleLinkContact, handleUnlinkContact,
  } = useContacts({ user, applications, setApplications, addToast, setSelectedAppId });

  const {
    migrationApps, migrationContacts, isMigrationModalOpen, setIsMigrationModalOpen,
    checkAndPromptGuestMigration, handleImportGuestApps, handleDiscardGuestApps,
  } = useGuestMigration({ user, setApplications, setContacts, addToast });

  const { expirySettings, updateExpirySettings: handleUpdateExpirySettings } = useExpirySettings();

  const { dataLoading, loadData } = useDataLoader({
    user, authLoading, setApplications, setContacts, addToast, checkAndPromptGuestMigration,
  });

  useExtensionSync({
    user, applications, setApplications, applicationsRef,
    contacts, dataLoading, handleAddContact, setSelectedAppId, addToast,
  });

  // ── Auth URL synchronization ──
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

  // ── View-coordination callbacks ──
  const handleSignIn = () => openAuthModal('signin');

  const handleSignOut = async () => {
    try {
      await signOut();
      try { localStorage.removeItem('tracklet_guest_mode'); } catch { /* Ignore */ }
      setIsGuestMode(false);
      setSelectedAppId(null);
      setSelectedContactId(null);
      window.history.pushState(null, '', '/login');
      addToast('info', 'Signed Out', 'Returned to authentication screen.');
    } catch (err) { console.error('Sign-out failed:', err); }
  };

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

  const handleContinueAsGuest = useCallback(() => {
    try { localStorage.setItem('tracklet_guest_mode', 'true'); } catch { /* Ignore */ }
    setIsGuestMode(true);
    window.history.pushState(null, '', getPathForTab(activeTab));
    addToast('info', 'Guest Session Started', 'Applications will be saved to this browser.');
  }, [activeTab, addToast]);

  const handleSwitchToContact = useCallback((contactId: string) => {
    setSelectedAppId(null);
    setSelectedContactId(contactId);
  }, [setSelectedAppId, setSelectedContactId]);

  const handleSwitchToApp = useCallback((appId: string) => {
    setSelectedContactId(null);
    setSelectedAppId(appId);
  }, [setSelectedAppId, setSelectedContactId]);

  const handleCreateAndLinkContact = useCallback(async (
    contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, appId: string
  ) => {
    const mergedAppIds = Array.from(new Set([...(contactData.applicationIds || []), appId]));
    await handleAddContact({ ...contactData, applicationIds: mergedAppIds });
  }, [handleAddContact]);

  const handleContactFollowUp = useCallback((contact: Contact) => {
    if (contact.applicationIds && contact.applicationIds.length > 0) {
      const linkedApp = applications.find((a) => contact.applicationIds?.includes(a.id));
      if (linkedApp) { handleSwitchToApp(linkedApp.id); return; }
    }
    if (contact.email) window.open(`mailto:${contact.email}`, '_blank', 'noopener,noreferrer');
  }, [applications, handleSwitchToApp]);

  const handleAccountDeleted = useCallback(() => {
    setApplications([]);
    setSelectedAppId(null);
  }, [setApplications, setSelectedAppId]);

  const handleUpdatePipelineStatus = useCallback((id: string, newStatus: string) => {
    handleUpdateApplication(id, { status: newStatus as any, stageUpdatedAt: new Date().toISOString() });
  }, [handleUpdateApplication]);

  // ── Render ──
  return (
    <AuthGate
      user={user}
      authLoading={authLoading}
      isGuestMode={isGuestMode}
      onContinueAsGuest={handleContinueAsGuest}
      onReloadData={loadData}
      onShowToast={addToast}
      toasts={toasts}
      onDismissToast={dismissToast}
    >
      <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden antialiased select-none">
        <Sidebar
          activeTab={activeTab} setActiveTab={setActiveTab}
          applications={applications} contacts={contacts} expirySettings={expirySettings}
          user={user} onSignIn={handleSignIn} onSignOut={handleSignOut}
          onSeedDemoData={handleSeedDemoData}
          isMobileOpen={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {(activeTab === 'all' || activeTab === 'pipeline') && (
            <TopBar
              filter={filter} setFilter={setFilter}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              totalFilteredCount={filteredAndSortedApplications.length}
              onExportCSV={handleExportCSV} activeTab={activeTab}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            />
          )}
          <WorkspaceContent
            activeTab={activeTab} isLoading={authLoading || dataLoading}
            duplicateCount={duplicateCount} isDuplicateBannerDismissed={isDuplicateBannerDismissed}
            onDismissDuplicateBanner={() => setIsDuplicateBannerDismissed(true)}
            onMergeAllDuplicates={handleMergeAllDuplicates}
            applications={applications} filteredApplications={filteredAndSortedApplications}
            contacts={contacts} selectedAppId={selectedAppId}
            onSelectApp={(id) => setSelectedAppId(id)} onShowToast={addToast}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onResetFilters={() => setFilter(DEFAULT_FILTER)} onSeedDemoData={handleSeedDemoData}
            sort={sort} onSortChange={handleSortChange}
            onBulkUpdateStatus={handleBulkUpdateStatus} onBulkDelete={handleBulkDelete}
            onUpdatePipelineStatus={handleUpdatePipelineStatus}
            onAddContact={handleAddContact} onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
            onSelectContact={(contactId) => setSelectedContactId(contactId)}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            expiryThresholdHours={expirySettings.expiryThresholdHours}
            expirySettings={expirySettings} onUpdateExpirySettings={handleUpdateExpirySettings}
            onExportCSV={handleExportCSV} onImportApplications={handleBatchImportApplications}
            onAccountDeleted={handleAccountDeleted} userId={user?.uid}
          />
        </div>

        <AppSlideOvers
          selectedApp={selectedApp} contacts={contacts} currentUserEmail={user?.email || undefined}
          onCloseAppPanel={() => setSelectedAppId(null)}
          onUpdateApp={handleUpdateApplication} onDeleteApp={handleDeleteApplication}
          onLinkContact={handleLinkContact} onUnlinkContact={handleUnlinkContact}
          onCreateAndLinkContact={handleCreateAndLinkContact}
          onUpdateContact={handleUpdateContact}
          onSelectContact={handleSwitchToContact}
          onEditContact={(contact) => handleSwitchToContact(contact.id)}
          onShowToast={addToast}
          selectedContact={selectedContact} applications={applications}
          onCloseContactPanel={() => setSelectedContactId(null)}
          onDeleteContact={handleDeleteContact}
          onSelectApplication={handleSwitchToApp}
          onFollowUp={handleContactFollowUp}
        />

        <AppModals
          isAddModalOpen={isAddModalOpen} onCloseAddModal={() => setIsAddModalOpen(false)}
          contacts={contacts} onAddApplication={handleAddApplication}
          onCreateContact={handleAddContact} onShowToast={addToast}
          isMigrationModalOpen={isMigrationModalOpen} migrationApps={migrationApps}
          migrationContacts={migrationContacts} onImportGuestApps={handleImportGuestApps}
          onDiscardGuestApps={handleDiscardGuestApps}
          onCloseMigrationModal={() => setIsMigrationModalOpen(false)}
        />

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AuthGate>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TrackletAppContent />
    </AuthProvider>
  );
}
