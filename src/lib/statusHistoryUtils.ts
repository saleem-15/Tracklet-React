import { ApplicationStatus, StatusHistoryEntry } from '../types';

/**
 * Enriched status history entry with computed dwell duration,
 * human-readable dwell labels, current active flag, and relative time.
 */
export interface EnrichedStatusHistoryEntry extends StatusHistoryEntry {
  dwellDays?: number;
  dwellLabel?: string;
  isCurrent?: boolean;
  relativeTime: string;
}

/**
 * Formats an ISO string into relative time (e.g. "Just now", "2 hours ago", "5 days ago").
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    if (isNaN(timestamp)) return isoString;

    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return 'Just now'; // Handle slight clock skews or immediate actions

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`;
    if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
    if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
    if (diffMonth < 12) return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
    return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
  } catch {
    return isoString;
  }
}

/**
 * Formats a duration in milliseconds into human-readable stage dwell time (e.g. "12 days", "3 hours", "< 1 hour").
 */
export function formatDwellDuration(durationMs: number): string {
  if (durationMs < 0) durationMs = 0;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));

  if (days >= 1) {
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (hours >= 1) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  const minutes = Math.floor(durationMs / (1000 * 60));
  if (minutes >= 1) {
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
  }
  return '< 1 hour';
}

/**
 * Accurately sorts history chronologically, calculates the time spent in each stage
 * between transitions, adds relative time formatting, and flags the latest active stage.
 *
 * @param history Raw status history array
 * @param createdAt Application creation timestamp
 * @param stageUpdatedAt Latest stage update timestamp
 * @param sortOrder 'desc' (newest first, default for timelines) or 'asc' (oldest first)
 */
export function calculateStageDwellTimes(
  history: StatusHistoryEntry[] = [],
  createdAt?: string,
  stageUpdatedAt?: string,
  sortOrder: 'desc' | 'asc' = 'desc'
): EnrichedStatusHistoryEntry[] {
  if (!history || history.length === 0) {
    return [];
  }

  // 1. Sort chronologically ASCENDING (oldest to newest) to compute transition deltas accurately
  const chronological = [...history].sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
  });

  const nowMs = Date.now();
  const enriched: EnrichedStatusHistoryEntry[] = [];

  for (let i = 0; i < chronological.length; i++) {
    const entry = chronological[i];
    const isCurrent = i === chronological.length - 1;
    const entryTime = new Date(entry.timestamp).getTime();

    // Determine timestamp of prior state
    let prevTime: number;
    if (i > 0) {
      prevTime = new Date(chronological[i - 1].timestamp).getTime();
    } else if (createdAt) {
      const createdTime = new Date(createdAt).getTime();
      prevTime = isNaN(createdTime) ? entryTime : Math.min(createdTime, entryTime);
    } else {
      prevTime = entryTime;
    }

    let dwellDays = 0;
    let dwellLabel = '';

    if (isCurrent) {
      // Current active stage: compute time elapsed from when this stage started until now
      const currentStart = stageUpdatedAt ? new Date(stageUpdatedAt).getTime() : entryTime;
      const validStartTime = isNaN(currentStart) ? entryTime : currentStart;
      const activeDurationMs = Math.max(0, nowMs - validStartTime);

      dwellDays = Math.floor(activeDurationMs / (1000 * 60 * 60 * 24));
      dwellLabel = `Active for ${formatDwellDuration(activeDurationMs)}`;
    } else {
      // Historical transition: compute how long candidate was in fromStatus prior to this transition
      const stageDurationMs = Math.max(0, entryTime - prevTime);
      dwellDays = Math.floor(stageDurationMs / (1000 * 60 * 60 * 24));
      const priorStage = entry.fromStatus || (i > 0 ? chronological[i - 1].toStatus : 'previous stage');
      dwellLabel = `Spent ${formatDwellDuration(stageDurationMs)} in ${priorStage}`;
    }

    enriched.push({
      ...entry,
      dwellDays,
      dwellLabel,
      isCurrent,
      relativeTime: formatRelativeTime(entry.timestamp),
    });
  }

  // 2. Return in requested order (default descending for timeline feeds)
  if (sortOrder === 'desc') {
    return enriched.reverse();
  }

  return enriched;
}

/**
 * Handles deleting a status history entry and safely rolls back the application status
 * if the deleted entry was the most recent transition (resolves accidental misclicks).
 *
 * @param history Existing status history entries
 * @param entryId ID of the entry to remove
 * @param currentStatus Current application status before deletion
 * @returns updatedHistory and optional rolledBackStatus / rolledBackStageUpdatedAt
 */
export function deleteStatusHistoryEntry(
  history: StatusHistoryEntry[] = [],
  entryId: string,
  currentStatus: ApplicationStatus
): {
  updatedHistory: StatusHistoryEntry[];
  rolledBackStatus?: ApplicationStatus;
  rolledBackStageUpdatedAt?: string;
} {
  const targetEntry = history.find((e) => e.id === entryId);
  if (!targetEntry) {
    return { updatedHistory: [...history] };
  }

  // Sort chronologically ascending to identify the most recent transition
  const sorted = [...history].sort((a, b) => {
    const tA = new Date(a.timestamp).getTime();
    const tB = new Date(b.timestamp).getTime();
    return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
  });

  const mostRecent = sorted[sorted.length - 1];
  const isDeletingMostRecent = mostRecent && mostRecent.id === entryId;
  const updatedHistory = history.filter((e) => e.id !== entryId);

  if (!isDeletingMostRecent) {
    return { updatedHistory };
  }

  // The deleted entry was the most recent transition!
  const remainingSorted = sorted.filter((e) => e.id !== entryId);
  const remainingLatest = remainingSorted[remainingSorted.length - 1];

  let rolledBackStatus: ApplicationStatus;
  let rolledBackStageUpdatedAt: string | undefined;

  if (remainingLatest) {
    // Revert to the destination status of the preceding transition
    rolledBackStatus = remainingLatest.toStatus;
    rolledBackStageUpdatedAt = remainingLatest.timestamp;
  } else if (targetEntry.fromStatus) {
    // If no remaining history entries, revert to fromStatus of the deleted entry
    rolledBackStatus = targetEntry.fromStatus;
    rolledBackStageUpdatedAt = undefined;
  } else {
    // Fallback to existing current status
    rolledBackStatus = currentStatus;
    rolledBackStageUpdatedAt = undefined;
  }

  return {
    updatedHistory,
    rolledBackStatus,
    rolledBackStageUpdatedAt,
  };
}

/**
 * Updates a status history entry by ID (e.g. editing a transition note, timestamp, or stage).
 */
export function updateStatusHistoryEntry(
  history: StatusHistoryEntry[] = [],
  entryId: string,
  updates: {
    toStatus?: ApplicationStatus;
    fromStatus?: ApplicationStatus;
    timestamp?: string;
    note?: string | null;
  }
): StatusHistoryEntry[] {
  return history.map((entry) => {
    if (entry.id !== entryId) return entry;
    const nextEntry: StatusHistoryEntry = {
      ...entry,
      ...(updates.toStatus !== undefined ? { toStatus: updates.toStatus } : {}),
      ...(updates.fromStatus !== undefined ? { fromStatus: updates.fromStatus } : {}),
      ...(updates.timestamp !== undefined ? { timestamp: updates.timestamp } : {}),
    };

    if ('note' in updates) {
      if (typeof updates.note === 'string' && updates.note.trim().length > 0) {
        nextEntry.note = updates.note.trim();
      } else {
        delete nextEntry.note;
      }
    }

    return nextEntry;
  });
}

/**
 * Appends a new status history entry when moving an application between stages.
 */
export function addStatusHistoryEntry(
  history: StatusHistoryEntry[] = [],
  toStatus: ApplicationStatus,
  fromStatus: ApplicationStatus,
  note?: string,
  timestamp?: string
): StatusHistoryEntry[] {
  const newEntry: StatusHistoryEntry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `hist_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    toStatus,
    fromStatus,
    timestamp: timestamp || new Date().toISOString(),
    ...(note !== undefined && note.trim() !== '' ? { note: note.trim() } : {}),
  };

  return [...history, newEntry];
}
