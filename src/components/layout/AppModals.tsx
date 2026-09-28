import { Application, Contact } from '../../types';
import { AddApplicationModal } from '../AddApplicationModal';
import { AuthModal } from '../AuthModal';
import { GuestMigrationModal } from '../GuestMigrationModal';
import { useNavigation } from '../../context/NavigationContext';
import { useApplicationsContext } from '../../context/ApplicationsContext';
import { useContactsContext } from '../../context/ContactsContext';
import { useToastContext } from '../../context/ToastContext';

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
 * AuthModal (multi-provider sign-in/sign-up), and GuestMigrationModal
 * (transfer localStorage guest data to authenticated cloud account).
 *
 * In Phase 3, AddApplicationModal and AuthModal consume state and actions
 * directly from feature context providers.
 */
export function AppModals({ migration }: AppModalsProps = {}) {
  const { isAddModalOpen, closeAddModal } = useNavigation();
  const { handleAddApplication } = useApplicationsContext();
  const { contacts, handleAddContact } = useContactsContext();
  const { addToast } = useToastContext();

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
