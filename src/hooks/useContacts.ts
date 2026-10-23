import { useState, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { Contact, Application } from '../types';
import { ContactRepository } from '../lib/contactRepository';
import { broadcastDeletedContact } from '../lib/extensionSync';
import posthog from '../lib/posthog';

export interface UseContactsProps {
  user: User | null;
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  addToast: (
    type: 'success' | 'error' | 'info' | 'warning', 
    title: string, 
    message?: string, 
    action?: { label: string; onClick: () => void }
  ) => void;
  setSelectedAppId?: (id: string | null) => void;
}

export interface UseContactsReturn {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  selectedContactId: string | null;
  setSelectedContactId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedContact: Contact | null;
  handleAddContact: (newContact: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  handleUpdateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  handleDeleteContact: (id: string) => Promise<void>;
  handleBatchDeleteContacts: (ids: string[]) => Promise<void>;
  handleLinkContact: (contactId: string, appId: string) => Promise<void>;
  handleUnlinkContact: (contactId: string, appId: string) => Promise<void>;
}

/**
 * useContacts
 * 
 * Domain hook encapsulating Contacts Hub state and actions.
 * - Manages contacts collection state and selected contact
 * - Handles optimistic CRUD operations with background Firestore syncing
 * - Links and unlinks contacts to job applications with bi-directional synchronization
 * - Provides undo snackbars for deletions and unlinking
 */
export function useContacts({
  user,
  applications,
  setApplications,
  addToast,
}: UseContactsProps): UseContactsReturn {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const contactsRef = useRef<Contact[]>(contacts);
  contactsRef.current = contacts;
  const applicationsRef = useRef<Application[]>(applications);
  applicationsRef.current = applications;

  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;

  // Add Contact (Optimistic UI with Background Sync & Rollback)
  const handleAddContact = useCallback(async (
    newContact: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<Contact> => {
    const now = new Date().toISOString();
    const tempId = `c-opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const optimisticContact: Contact = {
      id: tempId,
      userId: user?.uid || '',
      createdAt: now,
      updatedAt: now,
      ...newContact,
      applicationIds: newContact.applicationIds || [],
    };

    if (!user?.uid) {
      addToast('warning', 'Sign In Required', 'Please sign in to add contacts.');
      return optimisticContact;
    }

    // 1. Synchronously update local contacts state
    setContacts((prev) => [optimisticContact, ...prev.filter((c) => c.id !== tempId)]);

    // 2. Synchronously link to application(s) in local state if provided
    if (optimisticContact.applicationIds && optimisticContact.applicationIds.length > 0) {
      setApplications((prev) =>
        prev.map((app) =>
          optimisticContact.applicationIds!.includes(app.id)
            ? {
                ...app,
                contactIds: Array.from(new Set([...(app.contactIds || []), tempId])),
              }
            : app
        )
      );
    }

    // 3. Instant toast feedback
    addToast('success', 'Contact Added', optimisticContact.name);

    // 4. Firestore persistence
    try {
      const created = await ContactRepository.addContact(newContact, user.uid);
      // Reconcile optimistic ID with the final Firestore document ID
      setContacts((prev) => prev.map((c) => (c.id === tempId ? created : c)));

      if (created.applicationIds && created.applicationIds.length > 0) {
        setApplications((prev) =>
          prev.map((app) =>
            created.applicationIds!.includes(app.id)
              ? {
                  ...app,
                  contactIds: (app.contactIds || []).map((cId) => (cId === tempId ? created.id : cId)),
                }
              : app
          )
        );

        const linkResults = await Promise.allSettled(
          created.applicationIds.map((appId) =>
            ContactRepository.linkContactToApplication(created.id, appId, user.uid)
          )
        );

        const failedAppIds = linkResults
          .map((res, idx) => (res.status === 'rejected' ? created.applicationIds![idx] : null))
          .filter((id): id is string => id !== null);

        if (failedAppIds.length > 0) {
          setApplications((prev) =>
            prev.map((app) =>
              failedAppIds.includes(app.id)
                ? {
                    ...app,
                    contactIds: (app.contactIds || []).filter(
                      (cId) => cId !== created.id && cId !== tempId
                    ),
                  }
                : app
            )
          );
          throw new Error(`Failed to link contact to application(s): ${failedAppIds.join(', ')}`);
        }
      }
      posthog.capture('contact_created', {
        category: created.category,
        linked_application_count: created.applicationIds?.length || 0,
      });

      return created;
    } catch (err) {
      console.error('Failed to sync contact to Firestore, rolling back:', err);
      // Rollback state
      setContacts((prev) => prev.filter((c) => c.id !== tempId));
      setApplications((prev) =>
        prev.map((app) => ({
          ...app,
          contactIds: (app.contactIds || []).filter((cId) => cId !== tempId),
        }))
      );
      addToast('error', 'Sync Failed', `Could not save ${optimisticContact.name} to cloud.`);
      return optimisticContact;
    }
  }, [user, addToast, setApplications]);

  // Update Contact
  const handleUpdateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    const currentContact = contactsRef.current.find((c) => c.id === id);

    const now = new Date().toISOString();
    const oldAppIds = currentContact?.applicationIds || [];
    const newAppIds = updates.applicationIds;
    const hasAppIdsChanged = newAppIds !== undefined && JSON.stringify(oldAppIds) !== JSON.stringify(newAppIds);

    const updatedContact: Contact = {
      ...(currentContact || { id, name: 'Contact' }),
      ...updates,
      userId: user?.uid || currentContact?.userId || '',
      updatedAt: now,
    };

    setContacts((prev) => prev.map((c) => (c.id === id ? updatedContact : c)));

    if (hasAppIdsChanged && newAppIds) {
      const addedAppIds = newAppIds.filter((appId) => !oldAppIds.includes(appId));
      const removedAppIds = oldAppIds.filter((appId) => !newAppIds.includes(appId));

      setApplications((prev) =>
        prev.map((app) => {
          if (addedAppIds.includes(app.id)) {
            return {
              ...app,
              contactIds: Array.from(new Set([...(app.contactIds || []), id])),
            };
          }
          if (removedAppIds.includes(app.id)) {
            return {
              ...app,
              contactIds: (app.contactIds || []).filter((cId) => cId !== id),
            };
          }
          return app;
        })
      );

      if (user?.uid) {
        for (const appId of addedAppIds) {
          const targetApp = applicationsRef.current.find((a) => a.id === appId);
          ContactRepository.linkContactToApplication(id, appId, user.uid, updatedContact, targetApp).catch((e) => {
            console.warn(`Could not sync link between contact ${id} and app ${appId}:`, e);
          });
        }
        for (const appId of removedAppIds) {
          const targetApp = applicationsRef.current.find((a) => a.id === appId);
          ContactRepository.unlinkContactFromApplication(id, appId, user.uid, updatedContact, targetApp).catch((e) => {
            console.warn(`Could not sync unlink between contact ${id} and app ${appId}:`, e);
          });
        }
      }
    }

    try {
      if (user?.uid) {
        await ContactRepository.updateContact(id, updates, user.uid, updatedContact);
      }
      posthog.capture('contact_updated', {
        category: updatedContact.category,
        linked_application_count: updatedContact.applicationIds?.length || 0,
      });
    } catch (err) {
      console.error('Failed to update contact:', err);
      if (currentContact) {
        setContacts((prev) => prev.map((c) => (c.id === id ? currentContact! : c)));
      }
      addToast('error', 'Update Failed', 'Could not save contact changes.');
    }
  }, [user, addToast, setApplications]);

  // Delete Contact (with cascade remove from applications and Undo snackbar)
  const handleDeleteContact = useCallback(async (id: string) => {
    const targetContact = contactsRef.current.find((c) => c.id === id);
    if (!targetContact) return;

    const linkedAppIds = targetContact.applicationIds || [];

    setContacts((prev) => prev.filter((c) => c.id !== id));

    const currentApps = applicationsRef.current;
    const affectedApps = currentApps.filter((app) => linkedAppIds.includes(app.id));

    if (linkedAppIds.length > 0) {
      setApplications((prev) =>
        prev.map((app) =>
          linkedAppIds.includes(app.id)
            ? { ...app, contactIds: (app.contactIds || []).filter((cId) => cId !== id) }
            : app
        )
      );
    }

    setSelectedContactId((current) => (current === id ? null : current));

    try {
      if (user?.uid) {
        await ContactRepository.deleteContact(
          id,
          user.uid,
          linkedAppIds,
          targetContact
        );
      }
      // Notify extension to purge from its pending/sync storage
      broadcastDeletedContact(id);
      posthog.capture('contact_deleted', {
        category: targetContact.category,
        linked_application_count: linkedAppIds.length,
      });

      addToast('info', `Deleted ${targetContact.name}`, undefined, {
        label: 'Undo',
        onClick: async () => {
          setContacts((prev) => [targetContact!, ...prev]);

          if (linkedAppIds.length > 0) {
            setApplications((prev) =>
              prev.map((app) =>
                linkedAppIds.includes(app.id)
                  ? { ...app, contactIds: Array.from(new Set([...(app.contactIds || []), id])) }
                  : app
              )
            );
          }

          try {
            if (user?.uid) {
              await ContactRepository.upsertContact(targetContact!, user.uid);
              await Promise.allSettled(
                linkedAppIds.map((appId) => {
                  const fullApp = applicationsRef.current.find((a) => a.id === appId);
                  return ContactRepository.linkContactToApplication(id, appId, user.uid, targetContact!, fullApp);
                })
              );
            }
            addToast('success', `Restored ${targetContact!.name}`);
          } catch (err) {
            console.error('Failed to restore contact:', err);
            setContacts((prev) => prev.filter((c) => c.id !== id));
            if (linkedAppIds.length > 0) {
              setApplications((prev) =>
                prev.map((app) =>
                  linkedAppIds.includes(app.id)
                    ? { ...app, contactIds: (app.contactIds || []).filter((cId) => cId !== id) }
                    : app
                )
              );
            }
            addToast('error', 'Restore Failed', 'Could not restore contact.');
          }
        },
      });
    } catch (err) {
      console.error('Failed to delete contact:', err);
      setContacts((prev) => [targetContact!, ...prev]);
      if (affectedApps.length > 0) {
        setApplications((prev) => {
          const appMap = new Map(affectedApps.map((a) => [a.id, a]));
          return prev.map((a) => appMap.get(a.id) || a);
        });
      }
      addToast('error', 'Delete Failed', 'Could not delete contact.');
    }
  }, [user, addToast, setApplications, setSelectedContactId]);

  // Batch Delete Contacts
  const handleBatchDeleteContacts = useCallback(async (ids: string[]) => {
    const currentContacts = contactsRef.current;
    const deleted = currentContacts.filter((c) => ids.includes(c.id));
    const deletedSet = new Set(ids);

    // Compute all linked application IDs
    const linkedAppIds = Array.from(
      new Set(deleted.flatMap((c) => c.applicationIds || []))
    );

    // Optimistically remove contacts
    setContacts((prev) => prev.filter((c) => !deletedSet.has(c.id)));

    // Optimistically remove deleted contact IDs from linked applications
    const currentApps = applicationsRef.current;
    const affectedApps = currentApps.filter((app) => linkedAppIds.includes(app.id));

    setApplications((prev) => {
      let changed = false;
      const next = prev.map((app) => {
        if (!app.contactIds || app.contactIds.length === 0) return app;
        const remaining = app.contactIds.filter((cId) => !deletedSet.has(cId));
        if (remaining.length !== app.contactIds.length) {
          changed = true;
          return { ...app, contactIds: remaining };
        }
        return app;
      });
      return changed ? next : prev;
    });

    try {
      if (user?.uid) {
        await ContactRepository.batchDelete(
          ids,
          user.uid,
          linkedAppIds,
          deleted
        );
      }
      // Notify extension to purge from its pending/sync storage
      broadcastDeletedContact(ids);
      addToast('info', `Deleted ${ids.length} contacts`);
    } catch (err) {
      console.error('Bulk delete contacts failed:', err);
      setContacts((prev) => [...deleted, ...prev]);
      if (affectedApps.length > 0) {
        setApplications((prev) => {
          const appMap = new Map(affectedApps.map((a) => [a.id, a]));
          return prev.map((a) => appMap.get(a.id) || a);
        });
      }
      addToast('error', 'Delete Failed', 'Could not batch delete contacts.');
    }
  }, [user, addToast, setApplications]);

  // Link Contact to Application
  const handleLinkContact = useCallback(async (contactId: string, appId: string) => {
    const prevContacts = contactsRef.current;
    const prevApps = applicationsRef.current;
    const targetContact = prevContacts.find((c) => c.id === contactId);
    const targetApp = prevApps.find((a) => a.id === appId);

    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, applicationIds: Array.from(new Set([...(c.applicationIds || []), appId])) }
          : c
      )
    );

    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, contactIds: Array.from(new Set([...(a.contactIds || []), contactId])) }
          : a
      )
    );

    try {
      if (user?.uid) {
        await ContactRepository.linkContactToApplication(
          contactId,
          appId,
          user.uid,
          targetContact,
          targetApp
        );
      }
      const cName = targetContact?.name || 'Contact';
      addToast('success', 'Contact Linked', cName);
    } catch (err) {
      console.error('Failed to link contact:', err);
      setContacts(prevContacts);
      setApplications(prevApps);
      addToast('error', 'Link Failed', 'Could not link contact.');
    }
  }, [user, addToast, setApplications]);

  // Unlink Contact from Application
  const handleUnlinkContact = useCallback(async (contactId: string, appId: string) => {
    const prevContacts = contactsRef.current;
    const prevApps = applicationsRef.current;
    const targetContact = prevContacts.find((c) => c.id === contactId);
    const targetApp = prevApps.find((a) => a.id === appId);

    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, applicationIds: (c.applicationIds || []).filter((id) => id !== appId) }
          : c
      )
    );

    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, contactIds: (a.contactIds || []).filter((id) => id !== contactId) }
          : a
      )
    );

    try {
      if (user?.uid) {
        await ContactRepository.unlinkContactFromApplication(
          contactId,
          appId,
          user.uid,
          targetContact,
          targetApp
        );
      }

      addToast('info', `Unlinked ${targetContact?.name || 'Contact'}`, undefined, {
        label: 'Undo',
        onClick: () => {
          handleLinkContact(contactId, appId);
        },
      });
    } catch (err) {
      console.error('Failed to unlink contact:', err);
      setContacts(prevContacts);
      setApplications(prevApps);
      addToast('error', 'Unlink Failed', 'Could not unlink contact.');
    }
  }, [user, addToast, setApplications, handleLinkContact]);

  return {
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
  };
}
