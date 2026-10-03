import { ApplicationDetailPanel } from '../ApplicationDetailPanel';
import { ContactDetailPanel } from '../ContactDetailPanel';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useApplicationsContext } from '../../context/ApplicationsContext';
import { useContactsContext } from '../../context/ContactsContext';
import { useToastContext } from '../../context/ToastContext';

/**
 * AppSlideOvers
 *
 * Renders the two right-side slide-over drawer panels:
 * - ApplicationDetailPanel: full application detail view with notes, tasks, contacts, emails
 * - ContactDetailPanel: full contact detail view with linked applications and follow-up actions
 *
 * In Phase 3, consumes all state and handlers directly from feature context providers,
 * eliminating 19 drilled props.
 */
export function AppSlideOvers() {
  const { user } = useAuth();
  const { setSelectedAppId } = useNavigation();
  const { addToast } = useToastContext();

  const {
    applications,
    selectedApp,
    handleUpdateApplication,
    handleDeleteApplication,
  } = useApplicationsContext();

  const {
    contacts,
    selectedContact,
    setSelectedContactId,
    handleUpdateContact,
    handleDeleteContact,
    handleLinkContact,
    handleUnlinkContact,
    handleCreateAndLinkContact,
    handleSwitchToContact,
    handleSwitchToApp,
    handleContactFollowUp,
  } = useContactsContext();

  return (
    <>
      {/* Right Slide-over Application Detail Panel */}
      <ApplicationDetailPanel
        app={selectedApp}
        allContacts={contacts}
        currentUserEmail={user?.email || undefined}
        onClose={() => setSelectedAppId(null)}
        onUpdateApp={handleUpdateApplication}
        onDeleteApp={handleDeleteApplication}
        onLinkContact={handleLinkContact}
        onUnlinkContact={handleUnlinkContact}
        onCreateAndLinkContact={handleCreateAndLinkContact}
        onUpdateContact={handleUpdateContact}
        onSelectContact={handleSwitchToContact}
        onEditContact={(contact) => handleSwitchToContact(contact.id)}
        onShowToast={addToast}
      />

      {/* Right Slide-over Contact Detail Panel */}
      <ContactDetailPanel
        contact={selectedContact}
        applications={applications}
        onClose={() => setSelectedContactId(null)}
        onUpdateContact={handleUpdateContact}
        onDeleteContact={handleDeleteContact}
        onUnlinkFromApp={handleUnlinkContact}
        onSelectApplication={handleSwitchToApp}
        onFollowUp={handleContactFollowUp}
      />
    </>
  );
}
