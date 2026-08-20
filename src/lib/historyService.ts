import { ApplicationStatus, StatusHistoryEntry } from '../types';

export const MAX_STATUS_HISTORY_ENTRIES = 50;

function generateHistoryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `hist-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Creates a new StatusHistoryEntry object.
 */
export function createStatusHistoryEntry(
  toStatus: ApplicationStatus,
  fromStatus?: ApplicationStatus,
  timestamp?: string
): StatusHistoryEntry {
  return {
    id: generateHistoryId(),
    toStatus,
    ...(fromStatus ? { fromStatus } : {}),
    timestamp: timestamp || new Date().toISOString(),
  };
}

/**
 * Appends a status change entry to an existing history array.
 * Newest entries are placed at the beginning, capped at MAX_STATUS_HISTORY_ENTRIES.
 */
export function appendStatusHistory(
  existingHistory: StatusHistoryEntry[] | undefined,
  toStatus: ApplicationStatus,
  fromStatus?: ApplicationStatus,
  timestamp?: string
): StatusHistoryEntry[] {
  const newEntry = createStatusHistoryEntry(toStatus, fromStatus, timestamp);
  const current = existingHistory ? [...existingHistory] : [];
  return [newEntry, ...current].slice(0, MAX_STATUS_HISTORY_ENTRIES);
}
