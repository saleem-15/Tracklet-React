import { 
  db, 
  collection, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  arrayUnion,
  arrayRemove,
  deleteField
} from './firebase';
import { Contact, Application } from '../types';
import { INITIAL_SAMPLE_CONTACTS } from './sampleData';
import { LOCAL_STORAGE_KEYS } from './constants';
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
          docsData.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Contact, 'id'>),
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
   */
  static async deleteContact(
    id: string,
    userId?: string,
    linkedAppIds: string[] = []
  ): Promise<void> {
    if (userId) {
      try {
        const contactRef = doc(db, 'users', userId, 'contacts', id);
        await deleteDoc(contactRef);

        // Cascade cleanup in linked applications in Firestore
        if (linkedAppIds.length > 0) {
          await commitInChunks(linkedAppIds, (batch, appId) => {
            const appRef = doc(db, 'users', userId, 'applications', appId);
            batch.update(appRef, {
              contactIds: arrayRemove(id),
              updatedAt: new Date().toISOString(),
            });
          });
        }
      } catch (err) {
        console.error('Failed to delete contact from Firestore:', err);
        throw err;
      }
    }
  }

  /**
   * Batch delete multiple contacts.
   */
  static async batchDelete(ids: string[], userId?: string): Promise<void> {
    if (userId) {
      try {
        await commitInChunks(ids, (batch, id) => {
          batch.delete(doc(db, 'users', userId, 'contacts', id));
        });
      } catch (err) {
        console.error('Failed bulk delete in Firestore:', err);
        throw err;
      }
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

      // Clear guest contacts from local storage
      localStorage.removeItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS);

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
