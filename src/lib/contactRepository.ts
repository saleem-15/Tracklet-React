import { 
  db, 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  runTransaction,
  arrayUnion,
  arrayRemove,
  deleteField
} from './firebase';
import { Contact, Application } from '../types';
import { INITIAL_SAMPLE_CONTACTS } from './sampleData';
import { LOCAL_STORAGE_KEYS, clearGuestMigrationMarkers } from './constants';
import { sanitizeForFirestore, commitInChunks } from './firestoreUtils';

export class ContactRepository {
  /**
   * Load contacts from Firestore if authenticated (/users/{userId}/contacts), or localStorage if guest.
   */
  static async loadContacts(userId?: string): Promise<Contact[]> {
    if (userId) {
      try {
        const userContactCol = collection(db, 'users', userId, 'contacts');
        const querySnapshot = await getDocs(userContactCol);
        const docsData: Contact[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<Contact, 'id'>;
          docsData.push({
            ...data,
            id: docSnap.id,
          });
        });

        return docsData;
      } catch (err) {
        console.warn('Could not fetch Firestore contacts (falling back to local cache):', err);
        return this.loadGuestContacts();
      }
    } else {
      return this.loadGuestContacts();
    }
  }

  /**
   * Load contacts from localStorage for guest users.
   */
  static loadGuestContacts(): Contact[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }

    return [];
  }

  /**
   * Persist array to localStorage (guest mode).
   */
  static saveGuestContacts(contacts: Contact[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS, JSON.stringify(contacts));
      clearGuestMigrationMarkers();
    } catch (e) {
      console.error('Failed to save contacts to localStorage:', e);
    }
  }

  /**
   * Add a new contact record to /users/{userId}/contacts.
   */
  static async addContact(
    newContact: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    userId?: string
  ): Promise<Contact> {
    const now = new Date().toISOString();
    const contactData = {
      ...newContact,
      name: newContact.name.trim(),
      category: newContact.category || 'Other',
      applicationIds: newContact.applicationIds || [],
      createdAt: now,
      updatedAt: now,
    };

    let createdContact: Contact;

    if (userId) {
      let createdId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      try {
        const payload = sanitizeForFirestore({
          ...contactData,
          userId,
        });
        const docRef = await addDoc(collection(db, 'users', userId, 'contacts'), payload);
        createdId = docRef.id;
      } catch (err) {
        console.error('Failed to add contact to Firestore:', err);
        throw err;
      }
      createdContact = {
        id: createdId,
        userId,
        ...contactData,
      };
    } else {
      createdContact = {
        id: `guest-contact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: 'guest',
        ...contactData,
      };
    }

    return createdContact;
  }

  /**
   * Safely upserts a contact preserving its existing ID (for undo/restore or legacy migration).
   */
  static async upsertContact(
    contact: Contact,
    userId?: string
  ): Promise<Contact> {
    const now = new Date().toISOString();
    const contactData: Contact = {
      ...contact,
      name: contact.name.trim(),
      category: contact.category || 'Other',
      applicationIds: contact.applicationIds || [],
      updatedAt: now,
    };

    if (userId) {
      try {
        const docRef = doc(db, 'users', userId, 'contacts', contact.id);
        const payload = sanitizeForFirestore({
          ...contactData,
          userId,
        });
        await setDoc(docRef, payload, { merge: true });
      } catch (err) {
        console.error('Failed to upsert contact in Firestore:', err);
        throw err;
      }
    }

    return contactData;
  }

  /**
   * Update an existing contact record at /users/{userId}/contacts/{id}.
   * Safely upserts using setDoc with merge: true so that un-persisted or guest-migrated
   * contacts are seamlessly written to Firestore without throwing 'No document to update'.
   */
  static async updateContact(
    id: string,
    updates: Partial<Contact>,
    userId?: string,
    fullContact?: Contact
  ): Promise<Partial<Contact>> {
    const now = new Date().toISOString();
    const rawUpdates: Record<string, unknown> = {
      ...updates,
      ...(updates.name ? { name: updates.name.trim() } : {}),
      updatedAt: now,
    };

    // If nextFollowUpDate is explicitly set to undefined or null, translate to deleteField() for Firestore
    if ('nextFollowUpDate' in updates && (!updates.nextFollowUpDate || updates.nextFollowUpDate === '')) {
      rawUpdates.nextFollowUpDate = deleteField();
    }

    if (userId) {
      try {
        const docRef = doc(db, 'users', userId, 'contacts', id);
        if (fullContact) {
          const payload = sanitizeForFirestore({
            ...fullContact,
            ...rawUpdates,
            userId,
          });
          await setDoc(docRef, payload, { merge: true });
        } else {
          const payload = sanitizeForFirestore({
            ...rawUpdates,
            userId,
          });
          await setDoc(docRef, payload, { merge: true });
        }
      } catch (err) {
        console.error('Failed to update Firestore contact:', err);
        throw err;
      }
    }

    return sanitizeForFirestore(rawUpdates);
  }

  /**
   * Delete a contact at /users/{userId}/contacts/{id} and cascade remove from linked applications.
   * Delegates to batchDelete to ensure atomic, race-safe cleanup across linked applications.
   */
  static async deleteContact(
    id: string,
    userId?: string,
    linkedAppIds: string[] = [],
    fullContact?: Contact
  ): Promise<void> {
    return this.batchDelete([id], userId, linkedAppIds, fullContact ? [fullContact] : undefined);
  }

  /**
   * Batch delete multiple contacts and cascade remove them from linked applications.
   * - Uses a race-safe transaction when operations fit within the transaction limit (<= 450 ops),
   *   reading each linked application inside the transaction and updating only apps that have matching contacts.
   * - For large operations exceeding transaction limits:
   *   1. Identifies existing applications and maps each to only the contact IDs being deleted that are actually present on it.
   *   2. Cleans up surviving application links FIRST, removing only those per-application contact IDs.
   *      If an application chunk fails after retries, compensates by restoring only the exact removed links via arrayUnion.
   *   3. Commits contact deletions only after application link cleanup succeeds.
   *      If contact deletion fails midway after retries, restores deleted contacts from authoritative data
   *      and re-links applications before propagating the error.
   */
  static async batchDelete(
    ids: string[],
    userId?: string,
    linkedAppIds: string[] = [],
    authoritativeContacts?: Contact[]
  ): Promise<void> {
    if (!userId || ids.length === 0) return;

    try {
      const deletedIdSet = new Set(ids);
      const totalOps = ids.length + linkedAppIds.length;
      const CHUNK_SIZE = 450;

      // Helper function to commit batch with retries for transient network failures
      const commitBatchWithRetry = async (
        buildBatch: (batch: ReturnType<typeof writeBatch>) => void,
        retries = 2,
        backoffMs = 50
      ): Promise<void> => {
        let lastErr: unknown;
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const batch = writeBatch(db);
            buildBatch(batch);
            await batch.commit();
            return;
          } catch (err) {
            lastErr = err;
            if (attempt < retries) {
              await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
            }
          }
        }
        throw lastErr;
      };

      // Helper to build authoritative contact data for recovery if needed
      const getAuthoritativeContactMap = async (): Promise<Map<string, Contact>> => {
        const map = new Map<string, Contact>();
        if (authoritativeContacts && authoritativeContacts.length > 0) {
          for (const c of authoritativeContacts) {
            map.set(c.id, c);
          }
        } else {
          const contactSnaps = await Promise.all(
            ids.map((id) => getDoc(doc(db, 'users', userId, 'contacts', id)))
          );
          for (const snap of contactSnaps) {
            if (snap.exists()) {
              map.set(snap.id, { id: snap.id, ...snap.data() } as Contact);
            }
          }
        }
        return map;
      };

      // Fast-path: no linked applications to cascade
      if (linkedAppIds.length === 0) {
        if (ids.length <= CHUNK_SIZE) {
          const batch = writeBatch(db);
          for (const id of ids) {
            batch.delete(doc(db, 'users', userId, 'contacts', id));
          }
          await batch.commit();
        } else {
          // If chunked contact deletion fails, restore already-deleted contacts from authoritative data
          const committedDeletedContactIds: string[] = [];
          const authoritativeMap = await getAuthoritativeContactMap();
          try {
            for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
              const chunk = ids.slice(i, i + CHUNK_SIZE);
              await commitBatchWithRetry((batch) => {
                for (const id of chunk) {
                  batch.delete(doc(db, 'users', userId, 'contacts', id));
                }
              });
              committedDeletedContactIds.push(...chunk);
            }
          } catch (contactDeleteErr) {
            console.error('Failed during standalone contact deletion; restoring committed contacts:', contactDeleteErr);
            if (committedDeletedContactIds.length > 0) {
              try {
                for (let i = 0; i < committedDeletedContactIds.length; i += CHUNK_SIZE) {
                  const chunk = committedDeletedContactIds.slice(i, i + CHUNK_SIZE);
                  await commitBatchWithRetry((restoreBatch) => {
                    for (const id of chunk) {
                      const contactData = authoritativeMap.get(id);
                      if (contactData) {
                        const { id: _ignored, ...payload } = contactData;
                        restoreBatch.set(doc(db, 'users', userId, 'contacts', id), sanitizeForFirestore(payload), { merge: true });
                      }
                    }
                  });
                }
              } catch (restoreErr) {
                console.error('Failed to rollback deleted contacts:', restoreErr);
              }
            }
            throw contactDeleteErr;
          }
        }
        return;
      }

      // Race-safe atomic transaction path (<= 450 ops)
      if (totalOps <= CHUNK_SIZE) {
        await runTransaction(db, async (transaction) => {
          // In Firestore transactions, all reads MUST precede all writes.
          const appSnapshots = await Promise.all(
            linkedAppIds.map((appId) =>
              transaction.get(doc(db, 'users', userId, 'applications', appId))
            )
          );

          const now = new Date().toISOString();
          for (let i = 0; i < appSnapshots.length; i++) {
            const appSnap = appSnapshots[i];
            if (appSnap.exists()) {
              const appData = appSnap.data() as Application;
              const currentContactIds = appData?.contactIds || [];
              const matchingIds = currentContactIds.filter((cId) => deletedIdSet.has(cId));
              if (matchingIds.length > 0) {
                transaction.update(appSnap.ref, {
                  contactIds: arrayRemove(...matchingIds),
                  updatedAt: now,
                });
              }
            }
          }

          for (const id of ids) {
            transaction.delete(doc(db, 'users', userId, 'contacts', id));
          }
        });
        return;
      }

      // Large-operation path (> 450 ops):
      // 1. Verify which linked application documents exist and filter to only those containing IDs to remove.
      const appSnapshots = await Promise.all(
        linkedAppIds.map((appId) => getDoc(doc(db, 'users', userId, 'applications', appId)))
      );
      const appMatchingContactMap = new Map<string, string[]>();
      for (let i = 0; i < appSnapshots.length; i++) {
        const snap = appSnapshots[i];
        if (snap.exists()) {
          const appData = snap.data() as Application;
          const currentContactIds = appData?.contactIds || [];
          const matchingIds = currentContactIds.filter((cId) => deletedIdSet.has(cId));
          if (matchingIds.length > 0) {
            appMatchingContactMap.set(linkedAppIds[i], matchingIds);
          }
        }
      }

      const validAppIds = Array.from(appMatchingContactMap.keys());

      // Pre-load authoritative contact data for recovery in case of partial chunk failures
      const authoritativeMap = await getAuthoritativeContactMap();

      // 2. Clean up surviving application links FIRST with compensation tracking.
      // Uses per-application IDs to avoid applying all deleted contact IDs to every linked application.
      const committedAppIds: string[] = [];
      if (validAppIds.length > 0) {
        try {
          for (let i = 0; i < validAppIds.length; i += CHUNK_SIZE) {
            const chunk = validAppIds.slice(i, i + CHUNK_SIZE);
            const now = new Date().toISOString();
            await commitBatchWithRetry((batch) => {
              for (const appId of chunk) {
                const appRef = doc(db, 'users', userId, 'applications', appId);
                const toRemove = appMatchingContactMap.get(appId) || [];
                if (toRemove.length > 0) {
                  batch.update(appRef, {
                    contactIds: arrayRemove(...toRemove),
                    updatedAt: now,
                  });
                }
              }
            });
            committedAppIds.push(...chunk);
          }
        } catch (appCleanupErr) {
          console.error('Failed during application link cleanup; compensating committed chunks:', appCleanupErr);
          // Restore already-committed application links using per-application IDs to prevent cross-contamination
          if (committedAppIds.length > 0) {
            try {
              for (let i = 0; i < committedAppIds.length; i += CHUNK_SIZE) {
                const chunk = committedAppIds.slice(i, i + CHUNK_SIZE);
                const now = new Date().toISOString();
                await commitBatchWithRetry((rollbackBatch) => {
                  for (const appId of chunk) {
                    const appRef = doc(db, 'users', userId, 'applications', appId);
                    const toRestore = appMatchingContactMap.get(appId) || [];
                    if (toRestore.length > 0) {
                      rollbackBatch.update(appRef, {
                        contactIds: arrayUnion(...toRestore),
                        updatedAt: now,
                      });
                    }
                  }
                });
              }
            } catch (rollbackErr) {
              console.error('Failed to rollback application links after partial cleanup error:', rollbackErr);
            }
          }
          throw appCleanupErr;
        }
      }

      // 3. Commit contact deletions only after application-link cleanup has fully succeeded.
      // If contact deletion fails midway, restore deleted contacts from authoritative data
      // and re-link applications so that no partial deletion or split-brain state is left in Firestore.
      const committedDeletedContactIds: string[] = [];
      try {
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
          const chunk = ids.slice(i, i + CHUNK_SIZE);
          await commitBatchWithRetry((batch) => {
            for (const id of chunk) {
              batch.delete(doc(db, 'users', userId, 'contacts', id));
            }
          });
          committedDeletedContactIds.push(...chunk);
        }
      } catch (contactDeleteErr) {
        console.error('Failed during contact deletion; recovering deleted contacts and application links:', contactDeleteErr);
        // Step 3a: Restore deleted contacts from authoritative data
        if (committedDeletedContactIds.length > 0) {
          try {
            for (let i = 0; i < committedDeletedContactIds.length; i += CHUNK_SIZE) {
              const chunk = committedDeletedContactIds.slice(i, i + CHUNK_SIZE);
              await commitBatchWithRetry((restoreContactsBatch) => {
                for (const id of chunk) {
                  const contactData = authoritativeMap.get(id);
                  if (contactData) {
                    const { id: _ignored, ...payload } = contactData;
                    restoreContactsBatch.set(
                      doc(db, 'users', userId, 'contacts', id),
                      sanitizeForFirestore(payload),
                      { merge: true }
                    );
                  }
                }
              });
            }
          } catch (restoreContactsErr) {
            console.error('Failed to restore deleted contacts during recovery:', restoreContactsErr);
          }
        }

        // Step 3b: Restore all application links that were removed in Step 2
        if (committedAppIds.length > 0) {
          try {
            for (let i = 0; i < committedAppIds.length; i += CHUNK_SIZE) {
              const chunk = committedAppIds.slice(i, i + CHUNK_SIZE);
              const now = new Date().toISOString();
              await commitBatchWithRetry((rollbackAppsBatch) => {
                for (const appId of chunk) {
                  const appRef = doc(db, 'users', userId, 'applications', appId);
                  const toRestore = appMatchingContactMap.get(appId) || [];
                  if (toRestore.length > 0) {
                    rollbackAppsBatch.update(appRef, {
                      contactIds: arrayUnion(...toRestore),
                      updatedAt: now,
                    });
                  }
                }
              });
            }
          } catch (restoreAppsErr) {
            console.error('Failed to restore application links during contact deletion recovery:', restoreAppsErr);
          }
        }

        throw contactDeleteErr;
      }
    } catch (err) {
      console.error('Failed bulk delete in Firestore:', err);
      throw err;
    }
  }

  /**
   * Atomically link a contact to an application (many-to-many).
   */
  static async linkContactToApplication(
    contactId: string,
    applicationId: string,
    userId?: string,
    fullContact?: Contact,
    fullApp?: Application
  ): Promise<void> {
    const now = new Date().toISOString();
    if (userId) {
      try {
        const batch = writeBatch(db);
        const contactRef = doc(db, 'users', userId, 'contacts', contactId);
        const appRef = doc(db, 'users', userId, 'applications', applicationId);

        if (fullContact) {
          const mergedAppIds = Array.from(
            new Set([...(fullContact.applicationIds || []), applicationId])
          );
          const payload = sanitizeForFirestore({
            ...fullContact,
            applicationIds: mergedAppIds,
            updatedAt: now,
            userId,
          });
          batch.set(contactRef, payload, { merge: true });
        } else {
          batch.update(contactRef, {
            applicationIds: arrayUnion(applicationId),
            updatedAt: now,
          });
        }

        if (fullApp) {
          const mergedContactIds = Array.from(
            new Set([...(fullApp.contactIds || []), contactId])
          );
          const payload = sanitizeForFirestore({
            ...fullApp,
            contactIds: mergedContactIds,
            updatedAt: now,
            userId,
          });
          batch.set(appRef, payload, { merge: true });
        } else {
          batch.update(appRef, {
            contactIds: arrayUnion(contactId),
            updatedAt: now,
          });
        }

        await batch.commit();
      } catch (err) {
        console.error('Failed to link contact to application in Firestore:', err);
        throw err;
      }
    }
  }

  /**
   * Atomically unlink a contact from an application.
   */
  static async unlinkContactFromApplication(
    contactId: string,
    applicationId: string,
    userId?: string,
    fullContact?: Contact,
    fullApp?: Application
  ): Promise<void> {
    const now = new Date().toISOString();
    if (userId) {
      try {
        const batch = writeBatch(db);
        const contactRef = doc(db, 'users', userId, 'contacts', contactId);
        const appRef = doc(db, 'users', userId, 'applications', applicationId);

        if (fullContact) {
          const filteredAppIds = (fullContact.applicationIds || []).filter(
            (id) => id !== applicationId
          );
          const payload = sanitizeForFirestore({
            ...fullContact,
            applicationIds: filteredAppIds,
            updatedAt: now,
            userId,
          });
          batch.set(contactRef, payload, { merge: true });
        } else {
          batch.update(contactRef, {
            applicationIds: arrayRemove(applicationId),
            updatedAt: now,
          });
        }

        if (fullApp) {
          const filteredContactIds = (fullApp.contactIds || []).filter(
            (id) => id !== contactId
          );
          const payload = sanitizeForFirestore({
            ...fullApp,
            contactIds: filteredContactIds,
            updatedAt: now,
            userId,
          });
          batch.set(appRef, payload, { merge: true });
        } else {
          batch.update(appRef, {
            contactIds: arrayRemove(contactId),
            updatedAt: now,
          });
        }

        await batch.commit();
      } catch (err) {
        console.error('Failed to unlink contact from application in Firestore:', err);
        throw err;
      }
    }
  }

  /**
   * Reset / re-seed demo contacts under /users/{userId}/contacts.
   */
  static async seedDemoContacts(userId?: string): Promise<Contact[]> {
    const now = new Date().toISOString();
    const demoItems = INITIAL_SAMPLE_CONTACTS.map((item) => ({
      ...item,
      category: item.category || 'Other',
      applicationIds: item.applicationIds || [],
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
    }));

    if (userId) {
      try {
        const snap = await getDocs(collection(db, 'users', userId, 'contacts'));
        if (!snap.empty) {
          await commitInChunks(snap.docs, (batch, d) => {
            batch.delete(d.ref);
          });
        }

        const itemsWithRefs = demoItems.map((item) => {
          const docRef = doc(collection(db, 'users', userId, 'contacts'));
          const contactObj = sanitizeForFirestore({
            ...item,
            userId,
          });
          return { docRef, contactObj };
        });

        await commitInChunks(itemsWithRefs, (batch, { docRef, contactObj }) => {
          batch.set(docRef, contactObj);
        });

        return itemsWithRefs.map(({ docRef, contactObj }) => ({
          id: docRef.id,
          ...(contactObj as unknown as Omit<Contact, 'id'>),
        }));
      } catch (err) {
        console.error('Failed to reset Firestore demo contacts:', err);
        throw err;
      }
    }

    const initial = demoItems.map((item, idx) => ({
      ...item,
      id: `guest-contact-${idx + 1}`,
      userId: 'guest',
    }));
    this.saveGuestContacts(initial);
    return initial;
  }

  /**
   * Migrate guest contacts to Firestore on account sign-in.
   */
  static async migrateGuestContacts(
    userId: string,
    guestContacts: Contact[]
  ): Promise<{ migratedContacts: Contact[]; idMap: Map<string, string> }> {
    if (!userId || guestContacts.length === 0) {
      return { migratedContacts: [], idMap: new Map() };
    }

    const now = new Date().toISOString();
    const idMap = new Map<string, string>();

    const itemsWithRefs = guestContacts.map((contact) => {
      const docRef = doc(collection(db, 'users', userId, 'contacts'));
      if (contact.id) {
        idMap.set(contact.id, docRef.id);
      }

      const cleanName = String(contact.name || 'Contact').trim().slice(0, 200) || 'Contact';
      const cleanCategory = contact.category || 'Other';

      const contactObj = sanitizeForFirestore({
        name: cleanName,
        role: contact.role ? String(contact.role).slice(0, 200) : undefined,
        organization: contact.organization ? String(contact.organization).slice(0, 200) : undefined,
        category: cleanCategory,
        email: contact.email ? String(contact.email).slice(0, 200) : undefined,
        phone: contact.phone ? String(contact.phone).slice(0, 50) : undefined,
        linkedIn: contact.linkedIn ? String(contact.linkedIn).slice(0, 1000) : undefined,
        notes: contact.notes ? String(contact.notes).slice(0, 20000) : undefined,
        nextFollowUpDate: contact.nextFollowUpDate ? String(contact.nextFollowUpDate).slice(0, 40) : undefined,
        applicationIds: Array.isArray(contact.applicationIds) ? contact.applicationIds.slice(0, 100) : [],
        userId,
        createdAt: contact.createdAt ? String(contact.createdAt).slice(0, 40) : now,
        updatedAt: now,
      });

      return { docRef, contactObj, originalGuestId: contact.id };
    });

    try {
      await commitInChunks(itemsWithRefs, (batch, { docRef, contactObj }) => {
        batch.set(docRef, contactObj);
      });

      const migratedContacts: Contact[] = itemsWithRefs.map(({ docRef, contactObj }) => ({
        ...(contactObj as unknown as Omit<Contact, 'id'>),
        id: docRef.id,
      }));

      return { migratedContacts, idMap };
    } catch (err) {
      console.error('Failed to migrate guest contacts to Firestore:', err);
      throw err;
    }
  }

  /**
   * Permanently purge all user contacts from Firestore (GDPR).
   */
  static async purgeUserData(userId: string): Promise<void> {
    if (!userId) return;

    try {
      const snap = await getDocs(collection(db, 'users', userId, 'contacts'));

      if (!snap.empty) {
        await commitInChunks(snap.docs, (batch, docSnap) => {
          batch.delete(docSnap.ref);
        });
      }
    } catch (err) {
      console.error('Failed to purge user contacts from Firestore:', err);
      throw err;
    }
  }
}
