import { useState, useCallback, useRef } from 'react';
import type { User } from 'firebase/auth';
import { Contact, Application } from '../types';
import { ContactRepository } from '../lib/contactRepository';
import { ApplicationRepository } from '../lib/applicationRepository';

export interface UseContactsProps {
  user: User | null;
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string, action?: { label: string; onClick: () => void }) => void;
  setSelectedAppId: (id: string | null) => void;
}

export interface UseContactsReturn {
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
}

/**
 * useContacts
 * 
 * Domain hook encapsulating Networking / Contacts Hub state and CRUD actions.
 * - Manages contacts collection state and selectedContactId
 * - Optimistic UI updates with background Firestore synchronization and rollback
 * - Bi-directional linking / unlinking between contacts and applications
 * - Undo snackbars for single contact deletions
 */
export function useContacts({
  user,
  applications,
  setApplications,
  addToast,
  setSelectedAppId,
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
      userId: user?.uid || 'guest',
      createdAt: now,
      updatedAt: now,
      ...newContact,
      applicationIds: newContact.applicationIds || [],
    };

    // 1. Synchronously update local contacts state
    setContacts((prev) => {
      const next = [optimisticContact, ...prev.filter((c) => c.id !== tempId)];
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

    // 2. Synchronously link to application(s) in local state if provided
    if (optimisticContact.applicationIds && optimisticContact.applicationIds.length > 0) {
      setApplications((prev) => {
        const next = prev.map((app) =>
          optimisticContact.applicationIds!.includes(app.id)
            ? {
                ...app,
                contactIds: Array.from(new Set([...(app.contactIds || []), tempId])),
              }
            : app
        );
        if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
        return next;
      });
    }

    // 3. Instant toast feedback
    addToast('success', 'Contact Added', optimisticContact.name);

    // 4. Background Firestore sync if authenticated
    if (user?.emailVerified) {
      let persistedContactId: string | null = null;
      ContactRepository.addContact(newContact, user.uid)
        .then(async (created) => {
          persistedContactId = created.id;
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
        })
        .catch((err) => {
          console.error('Failed to sync contact to Firestore, rolling back:', err);
          // Rollback state
          setContacts((prev) => prev.filter((c) => c.id !== tempId && c.id !== persistedContactId));
          setApplications((prev) =>
            prev.map((app) => ({
              ...app,
              contactIds: (app.contactIds || []).filter(
                (cId) => cId !== tempId && cId !== persistedContactId
              ),
            }))
          );
          addToast('error', 'Sync Failed', `Could not save ${optimisticContact.name} to cloud.`);
        });
    }

    return optimisticContact;
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
      userId: user?.uid || currentContact?.userId || 'guest',
      updatedAt: now,
    };

    setContacts((prev) => {
      const next = prev.map((c) => (c.id === id ? updatedContact : c));
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

    if (hasAppIdsChanged && newAppIds) {
      const addedAppIds = newAppIds.filter((appId) => !oldAppIds.includes(appId));
      const removedAppIds = oldAppIds.filter((appId) => !newAppIds.includes(appId));

      setApplications((prev) => {
        const next = prev.map((app) => {
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
        });
        if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
        return next;
      });

      if (user?.emailVerified) {
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
      if (user?.emailVerified) {
        await ContactRepository.updateContact(id, updates, user.uid, updatedContact);
      }
    } catch (err) {
      console.error('Failed to update contact:', err);
      if (currentContact) {
        setContacts((prev) => {
          const reverted = prev.map((c) => (c.id === id ? currentContact! : c));
          if (!user?.emailVerified) ContactRepository.saveGuestContacts(reverted);
          return reverted;
        });
      }
      addToast('error', 'Update Failed', 'Could not save contact changes.');
    }
  }, [user, addToast, setApplications]);

  // Delete Contact (with cascade remove from applications and Undo snackbar)
  const handleDeleteContact = useCallback(async (id: string) => {
    const targetContact = contactsRef.current.find((c) => c.id === id);
    if (!targetContact) return;

    const linkedAppIds = targetContact.applicationIds || [];

    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

    const currentApps = applicationsRef.current;
    const affectedApps = currentApps.filter((app) => linkedAppIds.includes(app.id));

    if (linkedAppIds.length > 0) {
      setApplications((prev) => {
        const next = prev.map((app) =>
          linkedAppIds.includes(app.id)
            ? { ...app, contactIds: (app.contactIds || []).filter((cId) => cId !== id) }
            : app
        );
        if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
        return next;
      });
    }

    setSelectedContactId((current) => (current === id ? null : current));

    try {
      await ContactRepository.deleteContact(
        id,
        user?.emailVerified ? user.uid : undefined,
        linkedAppIds,
        targetContact
      );

      addToast('info', `Deleted ${targetContact.name}`, undefined, {
        label: 'Undo',
        onClick: async () => {
          setContacts((prev) => {
            const next = [targetContact!, ...prev];
            if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
            return next;
          });

          if (linkedAppIds.length > 0) {
            setApplications((prev) => {
              const next = prev.map((app) =>
                linkedAppIds.includes(app.id)
                  ? { ...app, contactIds: Array.from(new Set([...(app.contactIds || []), id])) }
                  : app
              );
              if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
              return next;
            });
          }

          try {
            if (user?.emailVerified) {
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
            setContacts((prev) => {
              const next = prev.filter((c) => c.id !== id);
              if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
              return next;
            });
            if (linkedAppIds.length > 0) {
              setApplications((prev) => {
                const next = prev.map((app) =>
                  linkedAppIds.includes(app.id)
                    ? { ...app, contactIds: (app.contactIds || []).filter((cId) => cId !== id) }
                    : app
                );
                if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
                return next;
              });
            }
            addToast('error', 'Restore Failed', 'Could not restore contact.');
          }
        },
      });
    } catch (err) {
      console.error('Failed to delete contact:', err);
      setContacts((prev) => {
        const reverted = [targetContact!, ...prev];
        if (!user?.emailVerified) ContactRepository.saveGuestContacts(reverted);
        return reverted;
      });
      if (affectedApps.length > 0) {
        setApplications((prev) => {
          const appMap = new Map(affectedApps.map((a) => [a.id, a]));
          const next = prev.map((a) => appMap.get(a.id) || a);
          if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
          return next;
        });
      }
      addToast('error', 'Delete Failed', 'Could not delete contact.');
    }
  }, [user, addToast, setApplications]);

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
    setContacts((prev) => {
      const next = prev.filter((c) => !deletedSet.has(c.id));
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

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
      if (changed && (!user || !user.emailVerified)) {
        ApplicationRepository.saveGuestApplications(next);
      }
      return changed ? next : prev;
    });

    try {
      await ContactRepository.batchDelete(
        ids,
        user?.emailVerified ? user.uid : undefined,
        linkedAppIds,
        deleted
      );
      addToast('info', `Deleted ${ids.length} contacts`);
    } catch (err) {
      console.error('Bulk delete contacts failed:', err);
      setContacts((prev) => {
        const reverted = [...deleted, ...prev];
        if (!user?.emailVerified) ContactRepository.saveGuestContacts(reverted);
        return reverted;
      });
      if (affectedApps.length > 0) {
        setApplications((prev) => {
          const appMap = new Map(affectedApps.map((a) => [a.id, a]));
          const next = prev.map((a) => appMap.get(a.id) || a);
          if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
          return next;
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

    setContacts((prev) => {
      const next = prev.map((c) =>
        c.id === contactId
          ? { ...c, applicationIds: Array.from(new Set([...(c.applicationIds || []), appId])) }
          : c
      );
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

    setApplications((prev) => {
      const next = prev.map((a) =>
        a.id === appId
          ? { ...a, contactIds: Array.from(new Set([...(a.contactIds || []), contactId])) }
          : a
      );
      if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
      return next;
    });

    try {
      if (user?.emailVerified) {
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
      if (!user?.emailVerified) {
        ContactRepository.saveGuestContacts(prevContacts);
        ApplicationRepository.saveGuestApplications(prevApps);
      }
      addToast('error', 'Link Failed', 'Could not link contact.');
    }
  }, [user, addToast, setApplications]);

  // Unlink Contact from Application
  const handleUnlinkContact = useCallback(async (contactId: string, appId: string) => {
    const prevContacts = contactsRef.current;
    const prevApps = applicationsRef.current;
    const targetContact = prevContacts.find((c) => c.id === contactId);
    const targetApp = prevApps.find((a) => a.id === appId);

    setContacts((prev) => {
      const next = prev.map((c) =>
        c.id === contactId
          ? { ...c, applicationIds: (c.applicationIds || []).filter((id) => id !== appId) }
          : c
      );
      if (!user?.emailVerified) ContactRepository.saveGuestContacts(next);
      return next;
    });

    setApplications((prev) => {
      const next = prev.map((a) =>
        a.id === appId
          ? { ...a, contactIds: (a.contactIds || []).filter((id) => id !== contactId) }
          : a
      );
      if (!user?.emailVerified) ApplicationRepository.saveGuestApplications(next);
      return next;
    });

    try {
      if (user?.emailVerified) {
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
      if (!user?.emailVerified) {
        ContactRepository.saveGuestContacts(prevContacts);
        ApplicationRepository.saveGuestApplications(prevApps);
      }
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
