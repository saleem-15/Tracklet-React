import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { Contact } from '../types';
import { ContactRepository } from '../lib/contactRepository';
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
  const { setSelectedAppId } = useNavigation();
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

  const handleSwitchToContact = useCallback((contactId: string) => {
    setSelectedAppId(null);
    setSelectedContactId(contactId);
  }, [setSelectedAppId, setSelectedContactId]);

  const handleSwitchToApp = useCallback((appId: string) => {
    setSelectedContactId(null);
    setSelectedAppId(appId);
  }, [setSelectedAppId, setSelectedContactId]);

  const handleCreateAndLinkContact = useCallback(async (
    contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    appId: string
  ) => {
    const mergedAppIds = Array.from(new Set([...(contactData.applicationIds || []), appId]));
    await handleAddContact({ ...contactData, applicationIds: mergedAppIds });
  }, [handleAddContact]);

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
    const freshContacts = await ContactRepository.seedDemoContacts(user?.emailVerified ? user.uid : undefined);
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
