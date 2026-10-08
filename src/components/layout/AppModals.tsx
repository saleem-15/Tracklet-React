import { Application, Contact } from '../../types';
import { AddApplicationModal } from '../AddApplicationModal';
import { AuthModal } from '../AuthModal';
import { GuestMigrationModal } from '../GuestMigrationModal';
import { useNavigation } from '../../context/NavigationContext';
import { useApplicationsContext } from '../../context/ApplicationsContext';
import { useContactsContext } from '../../context/ContactsContext';
import { useToastContext } from '../../context/ToastContext';

import { useAuth } from '../../context/AuthContext';
import { TesterReportModal } from '../feedback/TesterReportModal';
import { ExtensionModal } from '../extension/ExtensionModal';
import { useExtensionContext } from '../../context/ExtensionContext';

export interface AppModalsProps {
  migration?: {
    isOpen: boolean;
    apps: Application[];
    contacts: Contact[];
    onImport: () => Promise<void>;
    onDiscard: () => void;
    onClose: () => void;
  };
}

/**
 * AppModals
 *
 * Renders all top-level modal dialogs: AddApplicationModal (new job entry),
 * AuthModal (multi-provider sign-in/sign-up), GuestMigrationModal
 * (transfer localStorage guest data to authenticated cloud account),
 * TesterReportModal (bug and feedback reporting), and ExtensionModal (Chrome extension companion).
 */
export function AppModals({ migration }: AppModalsProps = {}) {
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

  return (
    <>
      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        allContacts={contacts}
        onClose={closeAddModal}
        onAdd={handleAddApplication}
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

      {/* Guest-to-Account Data Migration Modal */}
      {migration && (
        <GuestMigrationModal
          isOpen={migration.isOpen}
          guestApplications={migration.apps}
          guestContacts={migration.contacts}
          onImport={migration.onImport}
          onDiscard={migration.onDiscard}
          onClose={migration.onClose}
        />
      )}
    </>
  );
}
