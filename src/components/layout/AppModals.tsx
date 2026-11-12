import { PaywallTriggerContext, Application } from '../../types';
import { ACTIVE_STATUSES } from '../../lib/constants';
import { UpgradePaywallModal } from '../paywall/UpgradePaywallModal';
import { AddApplicationModal } from '../AddApplicationModal';
import { AuthModal } from '../AuthModal';
import { useNavigation } from '../../context/NavigationContext';
import { useApplicationsContext } from '../../context/ApplicationsContext';
import { useContactsContext } from '../../context/ContactsContext';
import { useToastContext } from '../../context/ToastContext';
import { useEntitlementContext } from '../../context/EntitlementContext';

import { useAuth } from '../../context/AuthContext';
import { TesterReportModal } from '../feedback/TesterReportModal';
import { ExtensionModal } from '../extension/ExtensionModal';
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import { ImportCSVModal } from '../ImportCSVModal';
import { useExtensionContext } from '../../context/ExtensionContext';

export interface AppModalsProps {
  paywall?: {
    isOpen: boolean;
    context: PaywallTriggerContext;
    currentUsage: number;
    maxQuota: number;
    onClose: () => void;
    onUpgradeClick: () => void;
  };
}

/**
 * AppModals
 *
 * Renders all top-level modal dialogs: AddApplicationModal (new job entry),
 * AuthModal (multi-provider sign-in/sign-up),
 * TesterReportModal (bug and feedback reporting), ExtensionModal (Chrome extension companion),
 * and UpgradePaywallModal (SaaS pipeline & scrape quotas paywall).
 */
export function AppModals({ paywall }: AppModalsProps = {}) {
  const { 
    isAddModalOpen, 
    closeAddModal, 
    isFeedbackModalOpen, 
    closeFeedbackModal, 
    isExtensionModalOpen,
    closeExtensionModal,
    isShortcutsModalOpen,
    closeShortcutsModal,
    isOnboardingModalOpen,
    closeOnboardingModal,
    onboardingInitialStep,
    isImportModalOpen,
    closeImportModal,
    openImportModal,
    activeTab 
  } = useNavigation();
  const { user } = useAuth();
  const { 
    applications,
    handleAddApplication, 
    handleSeedDemoData, 
    handleBatchImportApplications 
  } = useApplicationsContext();
  const { contacts, handleAddContact } = useContactsContext();
  const { addToast } = useToastContext();
  const { activeCount, maxActiveQuota, openPaywall } = useEntitlementContext();
  const extensionState = useExtensionContext();

  /**
   * Quota-guarded import so the active cap holds at EVERY entry point — the
   * onboarding flow and the CSV import modal both route through here.
   * Mirrors the settings card's `handleGuardedImport`. Resolves `false` when
   * the guard rejected the batch (the paywall messaging is fired here).
   */
  const handleQuotaGuardedImport = async (
    newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ): Promise<boolean> => {
    const newActiveCount = newApps.filter(
      (a) => a.status && (ACTIVE_STATUSES as readonly string[]).includes(a.status)
    ).length;
    if (
      Number.isFinite(maxActiveQuota) &&
      newActiveCount > 0 &&
      activeCount + newActiveCount > maxActiveQuota
    ) {
      addToast(
        'warning',
        'Pipeline Capacity Reached',
        `Importing ${newActiveCount} active application${newActiveCount === 1 ? '' : 's'} would exceed your Free tier limit of ${maxActiveQuota}. Upgrade to Pro for unlimited applications.`
      );
      openPaywall('pipeline_cap');
      return false;
    }
    await handleBatchImportApplications(newApps);
    return true;
  };

  const handleGuardedAdd = async (newApp: Parameters<typeof handleAddApplication>[0]) => {
    if (
      paywall &&
      (ACTIVE_STATUSES as readonly string[]).includes(newApp.status) &&
      paywall.currentUsage >= paywall.maxQuota
    ) {
      addToast(
        'warning',
        'Pipeline Capacity Reached',
        `Free accounts can track up to ${paywall.maxQuota} active applications. Upgrade to Pro to track more applications.`
      );
      closeAddModal();
      paywall.onUpgradeClick();
      return;
    }
    return handleAddApplication(newApp);
  };

  return (
    <>
      {/* Primary New Application Intake Modal */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        allContacts={contacts}
        onAdd={handleGuardedAdd}
        onCreateContact={handleAddContact}
      />

      {/* Multi-Provider Auth Modal */}
      <AuthModal onShowToast={addToast} />

      {/* Tester Issue & Feedback Reporting Modal */}
      <TesterReportModal
        isOpen={isFeedbackModalOpen}
        onClose={closeFeedbackModal}
        activeTab={activeTab}
        user={user}
      />

      {/* Browser Extension Companion Modal */}
      <ExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={closeExtensionModal}
        extensionState={extensionState}
        onShowToast={addToast}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={closeShortcutsModal}
      />

      {/* Interactive User Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        initialStep={onboardingInitialStep}
        onClose={closeOnboardingModal}
        onImportCSV={openImportModal}
        onBatchImportCSV={handleQuotaGuardedImport}
        onSeedDemoData={handleSeedDemoData}
        onShowToast={addToast}
        totalAppCount={applications.length}
      />

      {/* CSV Spreadsheet Import Modal */}
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        onImport={handleQuotaGuardedImport}
      />

      {/* SaaS Entitlement Upgrade Modal */}
      {paywall && (
        <UpgradePaywallModal
          isOpen={paywall.isOpen}
          triggerContext={paywall.context}
          currentUsage={paywall.currentUsage}
          maxQuota={paywall.maxQuota}
          onClose={paywall.onClose}
          onUpgradeClick={paywall.onUpgradeClick}
        />
      )}
    </>
  );
}
