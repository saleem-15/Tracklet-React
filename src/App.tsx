import { useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ToastContainer } from './components/Toast';
import { DomainMigrationBanner } from './components/DomainMigrationBanner';
import { AuthGate, WorkspaceContent, AppSlideOvers, AppModals } from './components/layout';
import {
  AppProviders, useAuth, useNavigation, useToastContext,
  useApplicationsContext, useContactsContext, useEntitlementContext,
} from './context';
import { useGuestMigration } from './hooks/useGuestMigration';
import { useExtensionSync } from './hooks/useExtensionSync';
import { useDataLoader } from './hooks/useDataLoader';
import { getPathForTab, isAuthPath, isLegalPath } from './lib/routeUtils';

function TrackletAppContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { activeTab, setSelectedAppId, openFeedbackModal } = useNavigation();
  const { toasts, addToast, dismissToast } = useToastContext();
  const { applications, setApplications, applicationsRef } = useApplicationsContext();
  const entitlement = useEntitlementContext();
  const { contacts, setContacts, handleAddContact, handleLinkContact, setSelectedContactId } = useContactsContext();

  const {
    migrationApps, migrationContacts, isMigrationModalOpen, setIsMigrationModalOpen,
    checkAndPromptGuestMigration, handleImportGuestApps, handleDiscardGuestApps,
  } = useGuestMigration({ user, setApplications, setContacts, addToast });

  const { dataLoading, loadData } = useDataLoader({
    user, authLoading, setApplications, setContacts, addToast, checkAndPromptGuestMigration,
  });

  useExtensionSync({
    user, applications, setApplications, applicationsRef,
    contacts, setContacts, dataLoading, handleAddContact, handleLinkContact, setSelectedAppId, addToast,
  });

  // Global hotkey: press 'Ctrl+Alt+B' or 'Ctrl+Shift+B' to summon tester issue reporter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isEditable = 
        activeEl?.tagName === 'INPUT' || 
        activeEl?.tagName === 'TEXTAREA' || 
        activeEl?.isContentEditable;

      const isReporterHotkey = 
        (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'b') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') ||
        (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'b');

      if (!isEditable && isReporterHotkey) {
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
    // Exempt public legal & trust pages from authentication redirect
    if (isLegalPath(path)) return;

    if (!user) {
      if (!isAuthPath(path)) window.history.replaceState(null, '', '/login');
    } else {
      if (!user.emailVerified) {
        if (path !== '/verify-email') window.history.replaceState(null, '', '/verify-email');
      } else if (isAuthPath(path) || path === '/verify-email') {
        window.history.replaceState(null, '', getPathForTab(activeTab));
      }
    }
  }, [user, user?.emailVerified, authLoading, activeTab]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      try { localStorage.removeItem('tracklet_guest_mode'); } catch { /* Ignore */ }
      setSelectedAppId(null);
      setSelectedContactId(null);
      window.history.pushState(null, '', '/login');
      addToast('info', 'Signed Out', 'Returned to authentication screen.');
    } catch (err) { console.error('Sign-out failed:', err); }
  }, [signOut, setSelectedAppId, setSelectedContactId, addToast]);

  return (
    <AuthGate onReloadData={loadData}>
      <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans overflow-hidden antialiased select-none">
        <Sidebar onSignOut={handleSignOut} />
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <DomainMigrationBanner />
          {(activeTab === 'all' || activeTab === 'pipeline') && <TopBar />}
          <WorkspaceContent 
            isLoading={authLoading || dataLoading}
            activeQuota={{
              current: entitlement.activeCount,
              max: entitlement.maxActiveQuota,
              isGrandfathered: entitlement.isGrandfathered,
              onUpgradeClick: () => entitlement.openPaywall('pipeline_cap'),
            }}
          />
        </div>
        <AppSlideOvers />
        <AppModals
          migration={{
            isOpen: isMigrationModalOpen, apps: migrationApps, contacts: migrationContacts,
            onImport: handleImportGuestApps, onDiscard: handleDiscardGuestApps,
            onClose: () => setIsMigrationModalOpen(false),
          }}
          paywall={{
            isOpen: entitlement.isPaywallOpen,
            context: entitlement.paywallContext,
            currentUsage: entitlement.activeCount,
            maxQuota: entitlement.maxActiveQuota,
            onClose: entitlement.closePaywall,
            onUpgradeClick: entitlement.handleUpgradeClick,
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
