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
import { useExtensionSync } from './hooks/useExtensionSync';
import { useDataLoader } from './hooks/useDataLoader';
import { getPathForTab, isAuthPath, isLegalPath, isKnownRoute } from './lib/routeUtils';
import { purgeLegacyGuestStorage, SUBSCRIPTIONS_ENABLED } from './lib/constants';

function TrackletAppContent() {
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    activeTab,
    isNotFound,
    setActiveTab,
    setSelectedAppId,
    openFeedbackModal,
    isShortcutsModalOpen,
    openShortcutsModal,
    closeShortcutsModal,
  } = useNavigation();
  const { toasts, addToast, dismissToast } = useToastContext();
  const { applications, setApplications, applicationsRef } = useApplicationsContext();
  const entitlement = useEntitlementContext();
  const { contacts, setContacts, handleAddContact, handleLinkContact, setSelectedContactId } = useContactsContext();

  const { dataLoading, loadData } = useDataLoader({
    user, authLoading, setApplications, setContacts, addToast,
  });

  useExtensionSync({
    user, applications, setApplications, applicationsRef,
    contacts, setContacts, dataLoading, handleAddContact, handleLinkContact, setSelectedAppId, addToast,
  });

  // Purge any stale legacy guest mode storage keys
  useEffect(() => {
    purgeLegacyGuestStorage();
  }, []);

  // Global keyboard shortcuts: '?' or 'Ctrl+/' (shortcuts cheat sheet), 'Ctrl+Alt+B' (bug reporter), '1'-'5' (tab switching)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isEditable =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT' ||
        activeEl?.isContentEditable ||
        activeEl?.getAttribute('contenteditable') === 'true' ||
        activeEl?.closest('[contenteditable="true"]') !== null;

      // 1. Cheat sheet toggle: '?' (when not typing) or 'Ctrl+/' / 'Cmd+/'
      const isShortcutsHotkey =
        (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === '?') ||
        ((e.ctrlKey || e.metaKey) && e.key === '/');

      if (!isEditable && isShortcutsHotkey) {
        e.preventDefault();
        if (isShortcutsModalOpen) {
          closeShortcutsModal();
        } else {
          openShortcutsModal();
        }
        return;
      }

      // 2. Tester issue & bug reporting hotkey: 'Ctrl+Alt+B', 'Ctrl+Shift+B', or 'Cmd+Shift+B'
      const isReporterHotkey =
        (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'b') ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') ||
        (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'b');

      if (!isEditable && isReporterHotkey) {
        e.preventDefault();
        openFeedbackModal();
        return;
      }

      // 3. Numbered tab navigation: '1'-'5' (or 'Alt+1'-'Alt+5') when not typing and no modal dialog is active
      const hasOpenModal =
        document.querySelector('[role="dialog"]') !== null ||
        document.querySelector('.fixed.inset-0.z-50') !== null ||
        document.querySelector('[aria-modal="true"]') !== null;

      if (!isEditable && !hasOpenModal) {
        const tabNumberMap: Record<string, typeof activeTab> = {
          '1': 'all',
          '2': 'pipeline',
          '3': 'contacts',
          '4': 'stats',
          '5': 'settings',
        };
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && tabNumberMap[e.key]) {
          e.preventDefault();
          setActiveTab(tabNumberMap[e.key]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    openFeedbackModal,
    isShortcutsModalOpen,
    openShortcutsModal,
    closeShortcutsModal,
    setActiveTab,
  ]);

  useEffect(() => {
    if (authLoading) return;
    const path = window.location.pathname;
    // Exempt public legal & trust pages from authentication redirect
    if (isLegalPath(path)) return;

    if (!user) {
      if (!isKnownRoute(path)) return;
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
      purgeLegacyGuestStorage();
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
          {(activeTab === 'all' || activeTab === 'pipeline') && !isNotFound && <TopBar />}
          <WorkspaceContent 
            isLoading={authLoading || dataLoading}
            activeQuota={SUBSCRIPTIONS_ENABLED ? {
              current: entitlement.activeCount,
              max: entitlement.maxActiveQuota,
              isGrandfathered: entitlement.isGrandfathered,
              onUpgradeClick: () => entitlement.openPaywall('pipeline_cap'),
            } : undefined}
          />
        </div>
        <AppSlideOvers />
        <AppModals
          paywall={SUBSCRIPTIONS_ENABLED ? {
            isOpen: entitlement.isPaywallOpen,
            context: entitlement.paywallContext,
            currentUsage: entitlement.activeCount,
            maxQuota: entitlement.maxActiveQuota,
            onClose: entitlement.closePaywall,
            onUpgradeClick: entitlement.handleUpgradeClick,
          } : undefined}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AuthGate>
  );
}

export default function App() {
  return <AppProviders><TrackletAppContent /></AppProviders>;
}
