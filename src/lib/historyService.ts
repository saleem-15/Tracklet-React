import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy 
} from './firebase';
import { ApplicationStatus, StatusHistoryEntry } from '../types';

const LOCAL_HISTORY_PREFIX = 'tracklet_history_';

/**
 * Record a new status change event in the application's Firestore 'history' sub-collection.
 */
export async function addStatusHistoryEntry(
  appId: string,
  toStatus: ApplicationStatus,
  fromStatus?: ApplicationStatus,
  timestamp?: string
): Promise<StatusHistoryEntry> {
  const time = timestamp || new Date().toISOString();
  const entryData = {
    toStatus,
    ...(fromStatus ? { fromStatus } : {}),
    timestamp: time,
  };

  // Try saving to Firestore if possible
  try {
    const historyColRef = collection(db, 'applications', appId, 'history');
    const docRef = await addDoc(historyColRef, entryData);
    const newEntry: StatusHistoryEntry = {
      id: docRef.id,
      ...entryData,
    };

    // Also update local storage fallback
    saveLocalHistoryEntry(appId, newEntry);
    return newEntry;
  } catch (err) {
    console.warn('Firestore history write failed, falling back to local storage:', err);
    const localEntry: StatusHistoryEntry = {
      id: `local-hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...entryData,
    };
    saveLocalHistoryEntry(appId, localEntry);
    return localEntry;
  }
}

/**
 * Fetch all status history entries for a specific application.
 */
export async function fetchStatusHistory(appId: string): Promise<StatusHistoryEntry[]> {
  try {
    const historyColRef = collection(db, 'applications', appId, 'history');
    const q = query(historyColRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const entries: StatusHistoryEntry[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          toStatus: data.toStatus as ApplicationStatus,
          fromStatus: data.fromStatus as ApplicationStatus | undefined,
          timestamp: data.timestamp || new Date().toISOString(),
        };
      });
      return entries;
    }
  } catch (err) {
    console.warn('Failed to fetch history from Firestore, checking local storage:', err);
  }

  // Fallback to local storage
  return getLocalHistoryEntries(appId);
}

// Local Storage Fallback Helpers
function getLocalHistoryEntries(appId: string): StatusHistoryEntry[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_HISTORY_PREFIX}${appId}`);
    if (raw) {
      return JSON.parse(raw) as StatusHistoryEntry[];
    }
  } catch (err) {
    console.error('Error reading history from localStorage:', err);
  }
  return [];
}

function saveLocalHistoryEntry(appId: string, entry: StatusHistoryEntry) {
  try {
    const current = getLocalHistoryEntries(appId);
    // Prevent duplicate entries by timestamp & toStatus
    const exists = current.some((e) => e.timestamp === entry.timestamp && e.toStatus === entry.toStatus);
    if (!exists) {
      const updated = [entry, ...current].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      localStorage.setItem(`${LOCAL_HISTORY_PREFIX}${appId}`, JSON.stringify(updated));
    }
  } catch (err) {
    console.error('Error saving history to localStorage:', err);
  }
}
