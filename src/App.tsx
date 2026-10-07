import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ToastContainer } from './components/Toast';
import { AuthGate, WorkspaceContent, AppSlideOvers, AppModals } from './components/layout';
import {
  AppProviders, useAuth, useNavigation, useToastContext,
  useApplicationsContext, useContactsContext,
} from './context';
import { useGuestMigration } from './hooks/useGuestMigration';
import { useExtensionSync } from './hooks/useExtensionSync';
import { useDataLoader } from './hooks/useDataLoader';
import { getPathForTab, isAuthPath } from './lib/routeUtils';

function TrackletAppContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { activeTab, setSelectedAppId, openFeedbackModal } = useNavigation();
  const { toasts, addToast, dismissToast } = useToastContext();
  const { applications, setApplications, applicationsRef } = useApplicationsContext();
  const { contacts, setContacts, handleAddContact, handleLinkContact, setSelectedContactId } = useContactsContext();

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
    contacts, dataLoading, handleAddContact, handleLinkContact, setSelectedAppId, addToast,
  });

  // Global hotkey: press '?' or 'Ctrl+Alt+B' to summon tester issue reporter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isEditable = 
        activeEl?.tagName === 'INPUT' || 
        activeEl?.tagName === 'TEXTAREA' || 
        activeEl?.isContentEditable;

      if (!isEditable && (e.key === '?' || (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'b'))) {
        e.preventDefault();
        openFeedbackModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openFeedbackModal]);

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

  const handleContinueAsGuest = useCallback(() => {
    try { localStorage.setItem('tracklet_guest_mode', 'true'); } catch { /* Ignore */ }
    setIsGuestMode(true);
    window.history.pushState(null, '', getPathForTab(activeTab));
    addToast('info', 'Guest Session Started', 'Applications will be saved to this browser.');
  }, [activeTab, addToast]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      try { localStorage.removeItem('tracklet_guest_mode'); } catch { /* Ignore */ }
      setIsGuestMode(false);
      setSelectedAppId(null);
      setSelectedContactId(null);
      window.history.pushState(null, '', '/login');
      addToast('info', 'Signed Out', 'Returned to authentication screen.');
    } catch (err) { console.error('Sign-out failed:', err); }
  }, [signOut, setSelectedAppId, setSelectedContactId, addToast]);

  return (
    <AuthGate isGuestMode={isGuestMode} onContinueAsGuest={handleContinueAsGuest} onReloadData={loadData}>
      <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden antialiased select-none">
        <Sidebar onSignOut={handleSignOut} />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {(activeTab === 'all' || activeTab === 'pipeline') && <TopBar />}
          <WorkspaceContent isLoading={authLoading || dataLoading} />
        </div>
        <AppSlideOvers />
        <AppModals
          migration={{
            isOpen: isMigrationModalOpen, apps: migrationApps, contacts: migrationContacts,
            onImport: handleImportGuestApps, onDiscard: handleDiscardGuestApps,
            onClose: () => setIsMigrationModalOpen(false),
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AuthGate>
  );
}

export default function App() {
  return <AppProviders><TrackletAppContent /></AppProviders>;
}
