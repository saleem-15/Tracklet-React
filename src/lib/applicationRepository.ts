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
import { LOCAL_STORAGE_KEYS } from './constants';
import { createStatusHistoryEntry, appendStatusHistory } from './historyService';

/**
 * Strips undefined properties recursively so Firestore does not reject document writes.
 * Supports nested objects, array elements, and primitive values.
 */
function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeValue(item));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        result[k] = sanitizeValue(v);
      }
    }
    return result;
  }
  return value;
}

function sanitizeForFirestore<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return (sanitizeValue(obj) as Record<string, unknown>) || {};
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
   * Batch import applications (from CSV) into /users/{userId}/applications.
   */
  static async batchImport(
    newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[],
    userId?: string
  ): Promise<Application[]> {
    const now = new Date().toISOString();
    const createdList: Application[] = [];

    if (userId) {
      try {
        const itemsWithRefs = newApps.map((appItem) => {
          const docRef = doc(collection(db, 'users', userId, 'applications'));
          const initialHistory = appItem.history && appItem.history.length > 0
            ? appItem.history
            : [createStatusHistoryEntry(appItem.status, undefined, now)];

          const appObj = sanitizeForFirestore({
            ...appItem,
            history: initialHistory,
            userId,
            stageUpdatedAt: now,
            createdAt: now,
            updatedAt: now,
          });

          return { docRef, appObj };
        });

        await commitInChunks(itemsWithRefs, (batch, { docRef, appObj }) => {
          batch.set(docRef, appObj);
        });

        itemsWithRefs.forEach(({ docRef, appObj }) => {
          createdList.push({ id: docRef.id, ...(appObj as unknown as Omit<Application, 'id'>) });
        });
      } catch (err) {
        console.error('Failed batch import in Firestore:', err);
        throw err;
      }
    } else {
      newApps.forEach((appItem, index) => {
        const initialHistory = appItem.history && appItem.history.length > 0
          ? appItem.history
          : [createStatusHistoryEntry(appItem.status, undefined, now)];

        createdList.push({
          id: `imported-${Date.now()}-${index}`,
          userId: 'guest',
          ...appItem,
          history: initialHistory,
          stageUpdatedAt: now,
          createdAt: now,
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
