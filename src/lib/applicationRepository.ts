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
 */
function sanitizeForFirestore<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeForFirestore(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
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
        return [];
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
        console.error('Failed to add document to Firestore (offline fallback):', err);
        createdId = `offline-${Date.now()}`;
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
        const batch = writeBatch(db);
        ids.forEach((id) => {
          const dRef = doc(db, 'users', userId, 'applications', id);
          const current = currentApps?.find((a) => a.id === id);
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
        await batch.commit();
      } catch (err) {
        console.error('Failed bulk status update in Firestore:', err);
      }
    }
  }

  /**
   * Batch delete multiple applications.
   */
  static async batchDelete(ids: string[], userId?: string): Promise<void> {
    if (userId) {
      try {
        const batch = writeBatch(db);
        for (const id of ids) {
          batch.delete(doc(db, 'users', userId, 'applications', id));
        }
        await batch.commit();
      } catch (err) {
        console.error('Failed bulk delete in Firestore:', err);
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
        const batch = writeBatch(db);

        for (const appItem of newApps) {
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
          batch.set(docRef, appObj);
          createdList.push({ id: docRef.id, ...(appObj as unknown as Omit<Application, 'id'>) });
        }

        await batch.commit();
      } catch (err) {
        console.error('Failed batch import in Firestore:', err);
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
        const deleteBatch = writeBatch(db);
        for (const d of snap.docs) {
          deleteBatch.delete(d.ref);
        }
        await deleteBatch.commit();

        // Seed new batch
        const insertBatch = writeBatch(db);
        const freshDocs: Application[] = [];
        for (const item of initialWithHistory) {
          const docRef = doc(collection(db, 'users', userId, 'applications'));
          const appObj = sanitizeForFirestore({
            ...item,
            userId,
          });
          insertBatch.set(docRef, appObj);
          freshDocs.push({ id: docRef.id, ...(appObj as unknown as Omit<Application, 'id'>) });
        }
        await insertBatch.commit();
        return freshDocs;
      } catch (err) {
        console.error('Failed to reset Firestore demo data:', err);
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
        const batch = writeBatch(db);
        for (const docSnap of snap.docs) {
          batch.delete(docSnap.ref);
        }
        
        try {
          batch.delete(doc(db, 'users', userId));
        } catch {
          // ignore
        }

        await batch.commit();
      }
    } catch (err) {
      console.error('Failed to purge user data from Firestore:', err);
      throw err;
    }
  }
}
