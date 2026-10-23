import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { Contact } from '../types';
import { ContactRepository } from '../lib/contactRepository';
import { findDuplicateContact } from '../lib/contactUtils';
import { useContacts } from '../hooks/useContacts';
import { useAuth } from './AuthContext';
import { useNavigation } from './NavigationContext';
import { useApplicationsContext } from './ApplicationsContext';
import { useToastContext } from './ToastContext';

export interface ContactsContextType {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  selectedContactId: string | null;
  setSelectedContactId: (id: string | null) => void;
  selectedContact: Contact | null;
  handleAddContact: (newContact: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  handleUpdateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  handleDeleteContact: (id: string) => Promise<void>;
  handleBatchDeleteContacts: (ids: string[]) => Promise<void>;
  handleLinkContact: (contactId: string, appId: string) => Promise<void>;
  handleUnlinkContact: (contactId: string, appId: string) => Promise<void>;
  handleCreateAndLinkContact: (
    contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    appId: string
  ) => Promise<void>;
  handleSwitchToContact: (contactId: string) => void;
  handleSwitchToApp: (appId: string) => void;
  handleContactFollowUp: (contact: Contact) => void;
  handleCloseApp: () => void;
  handleCloseContact: () => void;
}

const ContactsContext = createContext<ContactsContextType | null>(null);

/**
 * ContactsProvider
 *
 * Scoped feature provider for Networking / Contacts Hub domain.
 * Analogous to Flutter's ContactsBloc / ContactsCubit.
 * Encapsulates contacts collection, optimistic UI updates, bi-directional
 * linking with applications, cross-drawer transitions, and follow-ups.
 */
export const ContactsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeTab, selectedAppId, setSelectedAppId } = useNavigation();
  const [returnToContactId, setReturnToContactId] = React.useState<string | null>(null);
  const [returnToAppId, setReturnToAppId] = React.useState<string | null>(null);
  const { applications, setApplications, registerContactSeeder } = useApplicationsContext();
  const { addToast } = useToastContext();

  const {
    contacts,
    setContacts,
    selectedContactId,
    setSelectedContactId,
    selectedContact,
    handleAddContact,
    handleUpdateContact,
    handleDeleteContact,
    handleBatchDeleteContacts,
    handleLinkContact,
    handleUnlinkContact,
  } = useContacts({
    user,
    applications,
    setApplications,
    addToast,
    setSelectedAppId,
  });

  useEffect(() => {
    setReturnToContactId(null);
    setReturnToAppId(null);
  }, [activeTab]);

  const handleSwitchToContact = useCallback((contactId: string) => {
    if (selectedAppId) {
      setReturnToAppId(selectedAppId);
    } else {
      setReturnToAppId(null);
    }
    setSelectedAppId(null);
    setSelectedContactId(contactId);
  }, [selectedAppId, setSelectedAppId, setSelectedContactId]);

  const handleSwitchToApp = useCallback((appId: string) => {
    if (selectedContactId) {
      setReturnToContactId(selectedContactId);
    }
    setSelectedContactId(null);
    setSelectedAppId(appId);
  }, [selectedContactId, setSelectedAppId, setSelectedContactId]);

  const handleCloseApp = useCallback(() => {
    setSelectedAppId(null);
    if (returnToContactId) {
      setSelectedContactId(returnToContactId);
      setReturnToContactId(null);
    }
  }, [returnToContactId, setSelectedAppId, setSelectedContactId]);

  const handleCloseContact = useCallback(() => {
    setSelectedContactId(null);
    if (returnToAppId) {
      setSelectedAppId(returnToAppId);
      setReturnToAppId(null);
    }
  }, [returnToAppId, setSelectedAppId, setSelectedContactId]);

  const handleCreateAndLinkContact = useCallback(async (
    contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    appId: string
  ) => {
    const existing = findDuplicateContact(contactData, contacts);
    if (existing) {
      if (!existing.applicationIds?.includes(appId)) {
        await handleLinkContact(existing.id, appId);
        addToast(
          'info',
          'Existing contact linked',
          `Linked existing contact ${existing.name} instead of creating a new contact.`
        );
      } else {
        addToast('info', 'Contact already linked', `${existing.name} is already linked to this application.`);
      }
      return;
    }
    const mergedAppIds = Array.from(new Set([...(contactData.applicationIds || []), appId]));
    await handleAddContact({ ...contactData, applicationIds: mergedAppIds });
  }, [contacts, handleLinkContact, handleAddContact, addToast]);

  const handleContactFollowUp = useCallback((contact: Contact) => {
    if (contact.applicationIds && contact.applicationIds.length > 0) {
      const linkedApp = applications.find((a) => contact.applicationIds?.includes(a.id));
      if (linkedApp) {
        handleSwitchToApp(linkedApp.id);
        return;
      }
    }
    if (contact.email) {
      window.open(`mailto:${contact.email}`, '_blank', 'noopener,noreferrer');
    }
  }, [applications, handleSwitchToApp]);

  // Register contact seeder callback with ApplicationsProvider for unified demo data loading
  const seedContacts = useCallback(async () => {
    if (!user?.uid) return;
    const freshContacts = await ContactRepository.seedDemoContacts(user.uid);
    setContacts(freshContacts);
    setSelectedContactId(null);
  }, [user, setContacts, setSelectedContactId]);

  useEffect(() => {
    registerContactSeeder(seedContacts);
    return () => registerContactSeeder(null);
  }, [registerContactSeeder, seedContacts]);

  const value = useMemo<ContactsContextType>(() => ({
    contacts,
    setContacts,
    selectedContactId,
    setSelectedContactId,
    selectedContact,
    handleAddContact,
    handleUpdateContact,
    handleDeleteContact,
    handleBatchDeleteContacts,
    handleLinkContact,
    handleUnlinkContact,
    handleCreateAndLinkContact,
    handleSwitchToContact,
    handleSwitchToApp,
    handleContactFollowUp,
    handleCloseApp,
    handleCloseContact,
  }), [
    contacts,
    setContacts,
    selectedContactId,
    setSelectedContactId,
    selectedContact,
    handleAddContact,
    handleUpdateContact,
    handleDeleteContact,
    handleBatchDeleteContacts,
    handleLinkContact,
    handleUnlinkContact,
    handleCreateAndLinkContact,
    handleSwitchToContact,
    handleSwitchToApp,
    handleContactFollowUp,
    handleCloseApp,
    handleCloseContact,
  ]);

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContactsContext = (): ContactsContextType => {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error('useContactsContext must be used within a ContactsProvider');
  }
  return context;
};
