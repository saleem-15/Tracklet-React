import { ApplicationStatus, StatusHistoryEntry } from '../types';

/**
 * Creates a new StatusHistoryEntry object.
 */
export function createStatusHistoryEntry(
  toStatus: ApplicationStatus,
  fromStatus?: ApplicationStatus,
  timestamp?: string
): StatusHistoryEntry {
  return {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    toStatus,
    ...(fromStatus ? { fromStatus } : {}),
    timestamp: timestamp || new Date().toISOString(),
  };
}

/**
 * Appends a status change entry to an existing history array.
 * Newest entries are placed at the beginning.
 */
export function appendStatusHistory(
  existingHistory: StatusHistoryEntry[] | undefined,
  toStatus: ApplicationStatus,
  fromStatus?: ApplicationStatus,
  timestamp?: string
): StatusHistoryEntry[] {
  const newEntry = createStatusHistoryEntry(toStatus, fromStatus, timestamp);
  const current = existingHistory ? [...existingHistory] : [];
  return [newEntry, ...current];
}
