import { 
  db, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  writeBatch 
} from './firebase';
import { Application, ApplicationStatus } from '../types';
import { INITIAL_SAMPLE_APPLICATIONS } from './sampleData';
import { LOCAL_STORAGE_KEYS } from './constants';
import { addStatusHistoryEntry } from './historyService';

export class ApplicationRepository {
  /**
   * Load applications from Firestore if authenticated, or localStorage if guest.
   */
  static async loadApplications(userId?: string): Promise<Application[]> {
    if (userId) {
      try {
        const q = query(collection(db, 'applications'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        const docsData: Application[] = [];
        querySnapshot.forEach((docSnap) => {
          docsData.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Application, 'id'>),
          });
        });

        if (docsData.length === 0) {
          return await this.seedDemoData(userId);
        }
        return docsData;
      } catch (err) {
        console.error('Error fetching Firestore applications, falling back to guest mode:', err);
        return this.loadGuestApplications();
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
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }

    const initial = INITIAL_SAMPLE_APPLICATIONS.map((item, idx) => ({
      ...item,
      id: `guest-${idx + 1}`,
      userId: 'guest',
    }));
    this.saveGuestApplications(initial);
    return initial;
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
   * Add a new application record.
   */
  static async addApplication(
    newApp: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>,
    userId?: string
  ): Promise<Application> {
    const now = new Date().toISOString();
    const appData = {
      ...newApp,
      stageUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    let createdApp: Application;

    if (userId) {
      let createdId = '';
      try {
        const docRef = await addDoc(collection(db, 'applications'), {
          ...appData,
          userId,
        });
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

    await addStatusHistoryEntry(createdApp.id, newApp.status, undefined, now);
    return createdApp;
  }

  /**
   * Update an existing application record.
   */
  static async updateApplication(
    id: string,
    updates: Partial<Application>,
    userId?: string
  ): Promise<Partial<Application>> {
    const now = new Date().toISOString();
    const updatedFields = { ...updates, updatedAt: now };

    if (userId) {
      try {
        const docRef = doc(db, 'applications', id);
        await updateDoc(docRef, updatedFields);
      } catch (err) {
        console.error('Failed to update Firestore application:', err);
      }
    }

    return updatedFields;
  }

  /**
   * Delete an application.
   */
  static async deleteApplication(id: string, userId?: string): Promise<void> {
    if (userId) {
      try {
        await deleteDoc(doc(db, 'applications', id));
      } catch (err) {
        console.error('Failed to delete application from Firestore:', err);
      }
    }
  }

  /**
   * Batch update status for multiple applications.
   */
  static async batchUpdateStatus(
    ids: string[],
    newStatus: ApplicationStatus,
    userId?: string
  ): Promise<void> {
    const now = new Date().toISOString();

    if (userId) {
      try {
        const batch = writeBatch(db);
        ids.forEach((id) => {
          const dRef = doc(db, 'applications', id);
          batch.update(dRef, { status: newStatus, stageUpdatedAt: now, updatedAt: now });
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
        ids.forEach((id) => {
          batch.delete(doc(db, 'applications', id));
        });
        await batch.commit();
      } catch (err) {
        console.error('Failed bulk delete in Firestore:', err);
      }
    }
  }

  /**
   * Batch import applications (from CSV).
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
          const docRef = doc(collection(db, 'applications'));
          const appObj: Omit<Application, 'id'> = {
            ...appItem,
            userId,
            stageUpdatedAt: now,
            createdAt: now,
            updatedAt: now,
          };
          batch.set(docRef, appObj);
          createdList.push({ id: docRef.id, ...appObj });
        }

        await batch.commit();
      } catch (err) {
        console.error('Failed batch import in Firestore:', err);
      }
    } else {
      newApps.forEach((appItem, index) => {
        createdList.push({
          id: `imported-${Date.now()}-${index}`,
          userId: 'guest',
          ...appItem,
          stageUpdatedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      });
    }

    for (const app of createdList) {
      await addStatusHistoryEntry(app.id, app.status, undefined, now);
    }

    return createdList;
  }

  /**
   * Reset / re-seed demo data.
   */
  static async seedDemoData(userId?: string): Promise<Application[]> {
    if (userId) {
      try {
        // Clear existing Firestore applications for this user
        const q = query(collection(db, 'applications'), where('userId', '==', userId));
        const snap = await getDocs(q);
        const deleteBatch = writeBatch(db);
        snap.forEach((d) => deleteBatch.delete(d.ref));
        await deleteBatch.commit();

        // Seed new batch
        const insertBatch = writeBatch(db);
        const freshDocs: Application[] = [];
        for (const item of INITIAL_SAMPLE_APPLICATIONS) {
          const docRef = doc(collection(db, 'applications'));
          const appObj: Omit<Application, 'id'> = {
            ...item,
            userId,
          };
          insertBatch.set(docRef, appObj);
          freshDocs.push({ id: docRef.id, ...appObj });
        }
        await insertBatch.commit();
        return freshDocs;
      } catch (err) {
        console.error('Failed to reset Firestore demo data:', err);
      }
    }

    const initial = INITIAL_SAMPLE_APPLICATIONS.map((item, idx) => ({
      ...item,
      id: `guest-${idx + 1}`,
      userId: 'guest',
    }));
    this.saveGuestApplications(initial);
    return initial;
  }
}
