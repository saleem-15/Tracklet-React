import { Application, Contact } from '../../types';
import { AddApplicationModal } from '../AddApplicationModal';
import { AuthModal } from '../AuthModal';
import { GuestMigrationModal } from '../GuestMigrationModal';
import type { AddToastFn } from '../../hooks/useToast';

export interface AppModalsProps {
  /** AddApplicationModal */
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  contacts: Contact[];
  onAddApplication: (newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>) => Promise<void>;
  onCreateContact: (newContact: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;

  /** AuthModal */
  onShowToast: AddToastFn;

  /** GuestMigrationModal */
  isMigrationModalOpen: boolean;
  migrationApps: Application[];
  migrationContacts: Contact[];
  onImportGuestApps: () => Promise<void>;
  onDiscardGuestApps: () => void;
  onCloseMigrationModal: () => void;
}

/**
 * AppModals
 *
 * Renders all top-level modal dialogs: AddApplicationModal (new job entry),
 * AuthModal (multi-provider sign-in/sign-up), and GuestMigrationModal
 * (transfer localStorage guest data to authenticated cloud account).
 *
 * Pure pass-through container — no state or logic of its own.
 */
export function AppModals({
  isAddModalOpen,
  onCloseAddModal,
  contacts,
  onAddApplication,
  onCreateContact,
  onShowToast,
  isMigrationModalOpen,
  migrationApps,
  migrationContacts,
  onImportGuestApps,
  onDiscardGuestApps,
  onCloseMigrationModal,
}: AppModalsProps) {
  return (
    <>
      {/* Add Application Modal */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        allContacts={contacts}
        onClose={onCloseAddModal}
        onAdd={onAddApplication}
        onCreateContact={onCreateContact}
      />

      {/* Multi-Provider Auth Modal */}
      <AuthModal onShowToast={onShowToast} />

      {/* Guest-to-Account Data Migration Modal */}
      <GuestMigrationModal
        isOpen={isMigrationModalOpen}
        guestApplications={migrationApps}
        guestContacts={migrationContacts}
        onImport={onImportGuestApps}
        onDiscard={onDiscardGuestApps}
        onClose={onCloseMigrationModal}
      />
    </>
  );
}
