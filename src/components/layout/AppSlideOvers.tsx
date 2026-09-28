import { Application, Contact } from '../../types';
import { ApplicationDetailPanel } from '../ApplicationDetailPanel';
import { ContactDetailPanel } from '../ContactDetailPanel';
import type { AddToastFn } from '../../hooks/useToast';

export interface AppSlideOversProps {
  /** ApplicationDetailPanel */
  selectedApp: Application | null;
  contacts: Contact[];
  currentUserEmail?: string;
  onCloseAppPanel: () => void;
  onUpdateApp: (id: string, updates: Partial<Application>) => Promise<void>;
  onDeleteApp: (id: string) => Promise<void>;
  onLinkContact: (contactId: string, appId: string) => Promise<void>;
  onUnlinkContact: (contactId: string, appId: string) => Promise<void>;
  onCreateAndLinkContact: (
    contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    appId: string
  ) => Promise<void>;
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  onSelectContact: (contactId: string) => void;
  onEditContact: (contact: Contact) => void;
  onShowToast: AddToastFn;

  /** ContactDetailPanel */
  selectedContact: Contact | null;
  applications: Application[];
  onCloseContactPanel: () => void;
  onDeleteContact: (id: string) => Promise<void>;
  onSelectApplication: (appId: string) => void;
  onFollowUp: (contact: Contact) => void;
}

/**
 * AppSlideOvers
 *
 * Renders the two right-side slide-over drawer panels:
 * - ApplicationDetailPanel: full application detail view with notes, tasks, contacts, emails
 * - ContactDetailPanel: full contact detail view with linked applications and follow-up actions
 *
 * Pure pass-through container — all cross-panel navigation callbacks
 * (switching from app→contact or contact→app) are pre-built in App.tsx.
 */
export function AppSlideOvers({
  selectedApp,
  contacts,
  currentUserEmail,
  onCloseAppPanel,
  onUpdateApp,
  onDeleteApp,
  onLinkContact,
  onUnlinkContact,
  onCreateAndLinkContact,
  onUpdateContact,
  onSelectContact,
  onEditContact,
  onShowToast,
  selectedContact,
  applications,
  onCloseContactPanel,
  onDeleteContact,
  onSelectApplication,
  onFollowUp,
}: AppSlideOversProps) {
  return (
    <>
      {/* Right Slide-over Application Detail Panel */}
      <ApplicationDetailPanel
        app={selectedApp}
        allContacts={contacts}
        currentUserEmail={currentUserEmail}
        onClose={onCloseAppPanel}
        onUpdateApp={onUpdateApp}
        onDeleteApp={onDeleteApp}
        onLinkContact={onLinkContact}
        onUnlinkContact={onUnlinkContact}
        onCreateAndLinkContact={onCreateAndLinkContact}
        onUpdateContact={onUpdateContact}
        onSelectContact={onSelectContact}
        onEditContact={onEditContact}
        onShowToast={onShowToast}
      />

      {/* Right Slide-over Contact Detail Panel */}
      <ContactDetailPanel
        contact={selectedContact}
        applications={applications}
        onClose={onCloseContactPanel}
        onUpdateContact={onUpdateContact}
        onDeleteContact={onDeleteContact}
        onUnlinkFromApp={onUnlinkContact}
        onSelectApplication={onSelectApplication}
        onFollowUp={onFollowUp}
      />
    </>
  );
}
