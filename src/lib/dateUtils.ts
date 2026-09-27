/**
 * Date formatting and calculation utility functions for Tracklet
 */

/**
 * Calculates days elapsed between stageUpdatedAt timestamp and current time.
 */
export function calculateDaysInStage(stageUpdatedAt: string): number {
  if (!stageUpdatedAt) return 0;
  try {
    const updated = new Date(stageUpdatedAt);
    const now = new Date();
    if (isNaN(updated.getTime())) return 0;
    const diffMs = now.getTime() - updated.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  } catch {
    return 0;
  }
}

/**
 * Formats YYYY-MM-DD or ISO date string to short human-readable string (e.g. "Jul 15").
 */
export function formatAppDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Formats an ISO string to localized timestamp string (e.g. "Jul 15, 2026, 2:30 PM").
 */
export function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

/**
 * Parses time from an ISO timestamp string with 'T' and returns localized 12-hour format e.g. "2:32 PM".
 * Returns null if no valid non-midnight time is found.
 */
export function formatEmailTime(timestamp?: string): string | null {
  if (!timestamp || !timestamp.includes('T')) return null;
  const timeMatch = timestamp.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!timeMatch) return null;
  const hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2];
  const seconds = timeMatch[3] || '00';
  if (hours === 0 && minutes === '00' && seconds === '00') return null;
  if (isNaN(hours) || hours < 0 || hours > 23) return null;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

/**
 * Formats an email date and optional timestamp into a clean, human-readable display e.g. "Sep 26, 2026 · 2:32 PM".
 */
export function formatEmailDateTime(dateStr?: string, timestamp?: string): string {
  const time = formatEmailTime(timestamp) || formatEmailTime(dateStr);

  // Format base date
  let formattedDate = '';
  const candidate = (dateStr ? dateStr.split('T')[0] : '') || (timestamp ? timestamp.split('T')[0] : '');

  if (candidate) {
    try {
      const parts = candidate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
    } catch {
      // fallback to candidate
    }
  }

  if (!formattedDate) {
    formattedDate = candidate || 'Unknown date';
  }

  return time ? `${formattedDate} · ${time}` : formattedDate;
}

/**
 * Adds a specified number of business days (Monday-Friday) to a given date.
 * Returns ISO date string in YYYY-MM-DD format.
 */
export function addBusinessDays(startDate: Date | string = new Date(), days: number = 5): string {
  let current: Date;
  if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
    const [y, m, d] = startDate.trim().split('-').map(Number);
    current = new Date(y, m - 1, d);
  } else {
    current = new Date(startDate);
  }
  let added = 0;
  while (added < days) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  const yyyy = current.getFullYear();
  const mm = String(current.getMonth() + 1).padStart(2, '0');
  const dd = String(current.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
