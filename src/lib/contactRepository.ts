import { 
  db, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  arrayUnion,
  arrayRemove
} from './firebase';
import { Contact } from '../types';
import { INITIAL_SAMPLE_CONTACTS } from './sampleData';
import { LOCAL_STORAGE_KEYS } from './constants';

/**
 * Strips undefined properties recursively so Firestore does not reject document writes.
 */
function sanitizeForFirestore<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        result[key] = value.map((item) => {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            return sanitizeForFirestore(item as Record<string, unknown>);
          }
          return item;
        });
      } else if (value !== null && typeof value === 'object') {
        result[key] = sanitizeForFirestore(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Helper to commit Firestore batch operations in safe chunks (< 500 operations per batch).
 */
async function commitInChunks<T>(
  items: T[],
  operation: (batch: ReturnType<typeof writeBatch>, item: T) => void
): Promise<void> {
  const CHUNK_SIZE = 450;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      operation(batch, item);
    }
    await batch.commit();
  }
}

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

        // If cloud collection returned results, return them; otherwise check if local guest has items to merge
        if (docsData.length > 0) {
          return docsData;
        }

        const localGuest = this.loadGuestContacts();
        return localGuest;
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
        console.warn('Failed to add contact to Firestore (saving locally):', err);
        const currentGuest = this.loadGuestContacts();
        this.saveGuestContacts([
          { id: createdId, userId, ...contactData },
          ...currentGuest.filter((c) => c.id !== createdId),
        ]);
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
   * Update an existing contact record at /users/{userId}/contacts/{id}.
   */
  static async updateContact(
    id: string,
    updates: Partial<Contact>,
    userId?: string
  ): Promise<Partial<Contact>> {
    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      ...(updates.name ? { name: updates.name.trim() } : {}),
      updatedAt: now,
    };
    const updatedFields = sanitizeForFirestore(cleanUpdates);

    if (userId) {
      try {
        const docRef = doc(db, 'users', userId, 'contacts', id);
        await updateDoc(docRef, updatedFields);
      } catch (err) {
        console.error('Failed to update Firestore contact:', err);
        throw err;
      }
    }

    return updatedFields;
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
    userId?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    if (userId) {
      try {
        const batch = writeBatch(db);
        const contactRef = doc(db, 'users', userId, 'contacts', contactId);
        const appRef = doc(db, 'users', userId, 'applications', applicationId);

        batch.update(contactRef, {
          applicationIds: arrayUnion(applicationId),
          updatedAt: now,
        });

        batch.update(appRef, {
          contactIds: arrayUnion(contactId),
          updatedAt: now,
        });

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
    userId?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    if (userId) {
      try {
        const batch = writeBatch(db);
        const contactRef = doc(db, 'users', userId, 'contacts', contactId);
        const appRef = doc(db, 'users', userId, 'applications', applicationId);

        batch.update(contactRef, {
          applicationIds: arrayRemove(applicationId),
          updatedAt: now,
        });

        batch.update(appRef, {
          contactIds: arrayRemove(contactId),
          updatedAt: now,
        });

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
  ): Promise<Contact[]> {
    if (!userId || guestContacts.length === 0) return [];

    const now = new Date().toISOString();
    const itemsWithRefs = guestContacts.map((contact) => {
      const docRef = doc(collection(db, 'users', userId, 'contacts'));
      const contactObj = sanitizeForFirestore({
        name: contact.name,
        role: contact.role,
        organization: contact.organization,
        category: contact.category || 'Other',
        email: contact.email,
        phone: contact.phone,
        linkedIn: contact.linkedIn,
        notes: contact.notes,
        nextFollowUpDate: contact.nextFollowUpDate,
        applicationIds: contact.applicationIds || [],
        userId,
        createdAt: contact.createdAt || now,
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

      return itemsWithRefs.map(({ docRef, contactObj }) => ({
        id: docRef.id,
        ...(contactObj as unknown as Omit<Contact, 'id'>),
      }));
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
