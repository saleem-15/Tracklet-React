import { PaywallTriggerContext } from '../../types';
import { ACTIVE_STATUSES } from '../../lib/constants';
import { UpgradePaywallModal } from '../paywall/UpgradePaywallModal';
import { AddApplicationModal } from '../AddApplicationModal';
import { AuthModal } from '../AuthModal';
import { useNavigation } from '../../context/NavigationContext';
import { useApplicationsContext } from '../../context/ApplicationsContext';
import { useContactsContext } from '../../context/ContactsContext';
import { useToastContext } from '../../context/ToastContext';

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
  const { extensionState } = useExtensionContext();

  const handleGuardedAdd = (app: Parameters<typeof handleAddApplication>[0]) => {
    if (paywall) {
      const activeCount = applications.filter(a => (ACTIVE_STATUSES as readonly string[]).includes(a.status)).length;
      if (activeCount >= paywall.maxQuota) {
        paywall.onUpgradeClick();
        return;
      }
    }
    handleAddApplication(app);
  };

  return (
    <>
      {/* Primary New Application Intake Modal */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        existingApplications={applications}
        existingContacts={contacts}
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
        onImportJSON={handleBatchImportApplications}
        onSeedDemoData={handleSeedDemoData}
        onShowToast={addToast}
        totalAppCount={applications.length}
      />

      {/* CSV Spreadsheet Import Modal */}
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        onImport={handleBatchImportApplications}
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
