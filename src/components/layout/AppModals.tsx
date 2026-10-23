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
    activeTab 
  } = useNavigation();
  const { user } = useAuth();
  const { handleAddApplication } = useApplicationsContext();
  const { contacts, handleAddContact } = useContactsContext();
  const { addToast } = useToastContext();
  const extensionState = useExtensionContext();

  const handleGuardedAdd = async (
    newApp: Parameters<typeof handleAddApplication>[0]
  ) => {
    if (
      paywall &&
      ACTIVE_STATUSES.includes(newApp.status as any) &&
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
      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        allContacts={contacts}
        onClose={closeAddModal}
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
