import { 
  db, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch 
} from './firebase';
import { Application, ApplicationStatus } from '../types';
import { INITIAL_SAMPLE_APPLICATIONS } from './sampleData';
import { LOCAL_STORAGE_KEYS, APPLICATION_STATUSES } from './constants';
import { createStatusHistoryEntry, appendStatusHistory } from './historyService';

/**
 * Strips undefined properties recursively so Firestore does not reject document writes.
 * Supports nested objects, array elements, and primitive values.
 */
function sanitizeForFirestore<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Recursively sanitize array elements that are objects, dropping nulls/undefineds
        result[key] = value
          .filter((item) => item !== undefined && item !== null)
          .map((item) => {
            if (typeof item === 'object' && !Array.isArray(item)) {
              return sanitizeForFirestore(item as Record<string, unknown>);
            }
            return item;
          });
      } else if (typeof value === 'object') {
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

export class ApplicationRepository {
  /**
   * Load applications from Firestore if authenticated (/users/{userId}/applications), or localStorage if guest.
   */
  static async loadApplications(userId?: string): Promise<Application[]> {
    if (userId) {
      try {
        const userAppCol = collection(db, 'users', userId, 'applications');
        const querySnapshot = await getDocs(userAppCol);
        const docsData: Application[] = [];
        querySnapshot.forEach((docSnap) => {
          docsData.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Application, 'id'>),
          });
        });

        return docsData;
      } catch (err) {
        console.error('Error fetching Firestore applications:', err);
        throw err;
      }
    } else {
      return this.loadGuestApplications();
    }
  }

  /**
   * Load applications from localStorage for guest users.
   */
  static loadGuestApplications(): Application[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_APPS);
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
  static saveGuestApplications(apps: Application[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_APPS, JSON.stringify(apps));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  /**
   * Add a new application record to /users/{userId}/applications with embedded history.
   */
  static async addApplication(
    newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>,
    userId?: string
  ): Promise<Application> {
    const now = new Date().toISOString();
    const initialHistory = newApp.history && newApp.history.length > 0
      ? newApp.history
      : [createStatusHistoryEntry(newApp.status, undefined, now)];

    const appData = {
      ...newApp,
      contactIds: newApp.contactIds || [],
      history: initialHistory,
      stageUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    let createdApp: Application;

    if (userId) {
      let createdId = '';
      try {
        const payload = sanitizeForFirestore({
          ...appData,
          userId,
        });
        const docRef = await addDoc(collection(db, 'users', userId, 'applications'), payload);
        createdId = docRef.id;
      } catch (err) {
        console.error('Failed to add document to Firestore:', err);
        throw err;
      }
      createdApp = {
        id: createdId,
        userId,
        ...appData,
      };
    } else {
      createdApp = {
        id: `guest-${Date.now()}`,
        userId: 'guest',
        ...appData,
      };
    }

    return createdApp;
  }

  /**
   * Update an existing application record at /users/{userId}/applications/{id}.
   */
  static async updateApplication(
    id: string,
    updates: Partial<Application>,
    userId?: string
  ): Promise<Partial<Application>> {
    const now = new Date().toISOString();
    const updatedFields = sanitizeForFirestore({ ...updates, updatedAt: now });

    if (userId) {
      try {
        const docRef = doc(db, 'users', userId, 'applications', id);
        await updateDoc(docRef, updatedFields);
      } catch (err) {
        console.error('Failed to update Firestore application:', err);
        throw err;
      }
    }

    return updatedFields;
  }

  /**
   * Delete an application at /users/{userId}/applications/{id}.
   */
  static async deleteApplication(id: string, userId?: string): Promise<void> {
    if (userId) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'applications', id));
      } catch (err) {
        console.error('Failed to delete application from Firestore:', err);
        throw err;
      }
    }
  }

  /**
   * Batch update status for multiple applications at /users/{userId}/applications/{id}.
   */
  static async batchUpdateStatus(
    ids: string[],
    newStatus: ApplicationStatus,
    userId?: string,
    currentApps?: Application[]
  ): Promise<void> {
    const now = new Date().toISOString();

    if (userId) {
      try {
        const appMap = currentApps ? new Map(currentApps.map((a) => [a.id, a])) : null;
        await commitInChunks(ids, (batch, id) => {
          const dRef = doc(db, 'users', userId, 'applications', id);
          const current = appMap?.get(id);
          const updatedHistory = current
            ? appendStatusHistory(current.history, newStatus, current.status, now)
            : undefined;

          const updatePayload: Record<string, unknown> = {
            status: newStatus,
            stageUpdatedAt: now,
            updatedAt: now,
          };
          if (updatedHistory) {
            updatePayload.history = updatedHistory;
          }

          batch.update(dRef, sanitizeForFirestore(updatePayload));
        });
      } catch (err) {
        console.error('Failed bulk status update in Firestore:', err);
        throw err;
      }
    }
  }

  /**
   * Batch delete multiple applications.
   */
  static async batchDelete(ids: string[], userId?: string): Promise<void> {
    if (userId) {
      try {
        await commitInChunks(ids, (batch, id) => {
          batch.delete(doc(db, 'users', userId, 'applications', id));
        });
      } catch (err) {
        console.error('Failed bulk delete in Firestore:', err);
        throw err;
      }
    }
  }

  /**
   * Batch import applications (from CSV or guest migration) into /users/{userId}/applications.
   */
  static async batchImport(
    newApps: (Partial<Application> | Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>)[],
    userId?: string
  ): Promise<Application[]> {
    const now = new Date().toISOString();
    const createdList: Application[] = [];

    if (userId) {
      try {
        const itemsWithRefs = newApps.map((appItem) => {
          const docRef = doc(collection(db, 'users', userId, 'applications'));
          
          const validStatus: ApplicationStatus = 
            appItem.status && (APPLICATION_STATUSES as string[]).includes(appItem.status)
              ? (appItem.status as ApplicationStatus)
              : 'Saved';

          const initialHistory = Array.isArray(appItem.history) && appItem.history.length > 0
            ? appItem.history.slice(0, 100)
            : [createStatusHistoryEntry(validStatus, undefined, now)];

          // Extract and strip any existing client ID / userId to avoid document payload pollution
          const { id: _oldId, userId: _oldUserId, ...restFields } = appItem as Record<string, unknown>;

          const sanitizedPayload: Record<string, unknown> = {
            ...restFields,
            company: String(appItem.company || 'Untitled Company').trim().slice(0, 200) || 'Untitled Company',
            role: String(appItem.role || 'Position').trim().slice(0, 200) || 'Position',
            status: validStatus,
            platform: String(appItem.platform || 'Other').trim().slice(0, 100) || 'Other',
            dateApplied: String(appItem.dateApplied || now.slice(0, 10)).trim().slice(0, 40) || now.slice(0, 10),
            contactIds: Array.isArray(appItem.contactIds) ? appItem.contactIds.slice(0, 100) : [],
            tasks: Array.isArray(appItem.tasks) ? appItem.tasks.slice(0, 100) : [],
            emails: Array.isArray(appItem.emails) ? appItem.emails.slice(0, 100) : [],
            history: initialHistory,
            userId,
            stageUpdatedAt: typeof restFields.stageUpdatedAt === 'string' ? restFields.stageUpdatedAt.slice(0, 40) : now,
            createdAt: typeof restFields.createdAt === 'string' ? restFields.createdAt.slice(0, 40) : now,
            updatedAt: now,
          };

          if (appItem.notes) {
            sanitizedPayload.notes = String(appItem.notes).slice(0, 20000);
          }
          if (appItem.jobLink) {
            sanitizedPayload.jobLink = String(appItem.jobLink).slice(0, 3000);
          }
          if (appItem.companyDomain) {
            sanitizedPayload.companyDomain = String(appItem.companyDomain).slice(0, 200);
          }
          if (appItem.contactEmail) {
            sanitizedPayload.contactEmail = String(appItem.contactEmail).slice(0, 200);
          }
          if (Array.isArray(appItem.contacts)) {
            sanitizedPayload.contacts = appItem.contacts.slice(0, 50);
          }

          const appObj = sanitizeForFirestore(sanitizedPayload);

          return { docRef, appObj };
        });

        await commitInChunks(itemsWithRefs, (batch, { docRef, appObj }) => {
          batch.set(docRef, appObj);
        });

        itemsWithRefs.forEach(({ docRef, appObj }) => {
          createdList.push({ ...(appObj as unknown as Omit<Application, 'id'>), id: docRef.id });
        });
      } catch (err) {
        console.error('Failed batch import in Firestore:', err);
        throw err;
      }
    } else {
      newApps.forEach((appItem, index) => {
        const validStatus: ApplicationStatus = 
          appItem.status && (APPLICATION_STATUSES as string[]).includes(appItem.status)
            ? (appItem.status as ApplicationStatus)
            : 'Saved';

        const initialHistory = Array.isArray(appItem.history) && appItem.history.length > 0
          ? appItem.history.slice(0, 100)
          : [createStatusHistoryEntry(validStatus, undefined, now)];

        const { id: oldId, userId: _oldUserId, ...restFields } = appItem as Record<string, unknown>;

        createdList.push({
          ...(restFields as unknown as Omit<Application, 'id' | 'userId'>),
          id: (typeof oldId === 'string' && oldId) ? oldId : `imported-${Date.now()}-${index}`,
          userId: 'guest',
          company: String(appItem.company || 'Untitled Company').trim() || 'Untitled Company',
          role: String(appItem.role || 'Position').trim() || 'Position',
          status: validStatus,
          platform: (appItem.platform as any) || 'Other',
          dateApplied: String(appItem.dateApplied || now.slice(0, 10)).trim() || now.slice(0, 10),
          contactIds: Array.isArray(appItem.contactIds) ? appItem.contactIds : [],
          history: initialHistory,
          stageUpdatedAt: typeof restFields.stageUpdatedAt === 'string' ? restFields.stageUpdatedAt : now,
          createdAt: typeof restFields.createdAt === 'string' ? restFields.createdAt : now,
          updatedAt: now,
        });
      });
    }

    return createdList;
  }

  /**
   * Reset / re-seed demo data under /users/{userId}/applications.
   */
  static async seedDemoData(userId?: string): Promise<Application[]> {
    const now = new Date().toISOString();
    const initialWithHistory = INITIAL_SAMPLE_APPLICATIONS.map((item) => ({
      ...item,
      contactIds: item.contactIds || [],
      history: item.history && item.history.length > 0
        ? item.history
        : [createStatusHistoryEntry(item.status, undefined, item.createdAt || now)],
    }));

    if (userId) {
      try {
        const snap = await getDocs(collection(db, 'users', userId, 'applications'));
        if (!snap.empty) {
          await commitInChunks(snap.docs, (batch, d) => {
            batch.delete(d.ref);
          });
        }

        // Seed new batch
        const itemsWithRefs = initialWithHistory.map((item) => {
          const docRef = doc(collection(db, 'users', userId, 'applications'));
          const appObj = sanitizeForFirestore({
            ...item,
            userId,
          });
          return { docRef, appObj };
        });

        await commitInChunks(itemsWithRefs, (batch, { docRef, appObj }) => {
          batch.set(docRef, appObj);
        });

        return itemsWithRefs.map(({ docRef, appObj }) => ({
          id: docRef.id,
          ...(appObj as unknown as Omit<Application, 'id'>),
        }));
      } catch (err) {
        console.error('Failed to reset Firestore demo data:', err);
        throw err;
      }
    }

    const initial = initialWithHistory.map((item, idx) => ({
      ...item,
      id: `guest-${idx + 1}`,
      userId: 'guest',
    }));
    this.saveGuestApplications(initial);
    return initial;
  }

  /**
   * Permanently purge all user applications from Firestore (GDPR).
   */
  static async purgeUserData(userId: string): Promise<void> {
    if (!userId) return;

    try {
      const snap = await getDocs(collection(db, 'users', userId, 'applications'));

      if (!snap.empty) {
        await commitInChunks(snap.docs, (batch, docSnap) => {
          batch.delete(docSnap.ref);
        });
      }

      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch {
        // ignore missing user profile doc
      }
    } catch (err) {
      console.error('Failed to purge user data from Firestore:', err);
      throw err;
    }
  }
}
