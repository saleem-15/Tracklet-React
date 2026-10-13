
export interface DwellTimeResult {
  days: number;
  hours: number;
  shortLabel: string;
  fullLabel: string;
}

/**
 * Calculates dwell time elapsed between two timestamps.
 * If endIso is omitted, compares against current time.
 */
export function calculateDwellTime(startIso?: string, endIso?: string): DwellTimeResult {
  if (!startIso) {
    return { days: 0, hours: 0, shortLabel: '0d', fullLabel: '0 days' };
  }

  try {
    const start = new Date(startIso).getTime();
    const end = endIso ? new Date(endIso).getTime() : Date.now();

    if (isNaN(start) || isNaN(end) || end < start) {
      return { days: 0, hours: 0, shortLabel: '0d', fullLabel: '0 days' };
    }

    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 1000 * 60 * 60) {
      return { days: 0, hours: 0, shortLabel: '<1h', fullLabel: '< 1 hour' };
    }

    if (diffDays === 0) {
      return {
        days: 0,
        hours: diffHours,
        shortLabel: `${diffHours}h`,
        fullLabel: `${diffHours} hr${diffHours > 1 ? 's' : ''}`,
      };
    }

    return {
      days: diffDays,
      hours: diffHours,
      shortLabel: `${diffDays}d`,
      fullLabel: `${diffDays} day${diffDays > 1 ? 's' : ''}`,
    };
  } catch {
    return { days: 0, hours: 0, shortLabel: '0d', fullLabel: '0 days' };
  }
}

/**
 * Formats an ISO string to localized human-readable date & time e.g. "Oct 12, 2026 · 2:30 PM".
 */
export function formatTimelineTimestamp(isoString?: string): string {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart} · ${timePart}`;
  } catch {
    return isoString;
  }
}
