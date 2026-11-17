/**
 * Table view utility functions: last-activity computation, salary comparison,
 * stage-aging tiers, and preference persistence for the applications table lens.
 */

import { Application, ApplicationStatus, SortField, SortState, TableViewPrefs, DEFAULT_TABLE_VIEW_PREFS } from '../types';
import { LOCAL_STORAGE_KEYS } from './constants';

/** Fields that read most naturally newest/largest first */
const DESC_FIRST_FIELDS = new Set<SortField>(['dateApplied', 'daysInStage', 'lastActivity', 'salary']);

/** Default table sort: Applied, newest first */
export const DEFAULT_SORT_STATE: SortState = { field: 'dateApplied', order: 'desc' };

/**
 * Pure sort-state transition for table header clicks:
 * - new column: desc-first for time/magnitude fields, asc otherwise
 * - same column: cycles first order -> second order -> back to the default sort
 *   (the default column itself just keeps cycling asc/desc)
 */
export function nextSortState(prev: SortState, field: SortField): SortState {
  if (prev.field !== field) {
    return { field, order: DESC_FIRST_FIELDS.has(field) ? 'desc' : 'asc' };
  }
  const secondState = DESC_FIRST_FIELDS.has(field) ? 'asc' : 'desc';
  if (field !== 'dateApplied' && prev.order === secondState) {
    return { ...DEFAULT_SORT_STATE };
  }
  return { field, order: prev.order === 'asc' ? 'desc' : 'asc' };
}

/**
 * Returns the most recent activity timestamp (epoch ms) across logged emails,
 * stage changes, task updates, and the record's own updatedAt. Falls back to 0
 * when nothing is traceable so callers can render an em dash.
 */
export function getLastActivityTimestamp(app: Application): number {
  let latest = 0;

  const consider = (raw: string | undefined) => {
    if (!raw) return;
    const t = new Date(raw).getTime();
    if (!isNaN(t) && t > latest) latest = t;
  };

  consider(app.updatedAt);
  consider(app.stageUpdatedAt);

  for (const email of app.emails || []) {
    consider(email.timestamp || email.date);
  }

  for (const task of app.tasks || []) {
    if (task.completed && task.completedAt) consider(task.completedAt);
  }

  return latest;
}

/**
 * Formats a last-activity epoch ms as a compact relative label:
 * "just now", "45m", "3d", "2w", "5mo". Returns '' when no activity exists.
 */
export function formatRelativeActivity(epochMs: number, now: number = Date.now()): string {
  if (!epochMs) return '';
  const diffMs = now - epochMs;
  if (diffMs < 0) return 'just now';

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (days < 60) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

/**
 * Parses the leading numeric value of a salary string (handles ranges by
 * taking the minimum) into a comparable number. Returns null when unparseable.
 * Examples: '$190,000' -> 190000, '$85k - $110k' -> 85000, 'Competitive' -> null
 */
export function parseSalaryValue(salary: string | undefined): number | null {
  if (!salary) return null;

  // Range: take the minimum bound
  const rangeMatch = salary.match(
    /[$]?\s*(\d+(?:\.\d+)?)\s*[kK]?\s*(?:[-–—]|\bto\b)\s*[$]?\s*\d+(?:\.\d+)?\s*[kK]?/i
  );
  const source = rangeMatch ? rangeMatch[1] : salary;

  const kMatch = source.match(/[$]?\s*(\d+(?:\.\d+)?)\s*[kK]/);
  if (kMatch) {
    return parseFloat(kMatch[1]) * 1000;
  }

  const numMatch = source.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return null;
  const num = parseFloat(numMatch[1]);
  return isNaN(num) ? null : num;
}

export type StageAgingTier = 'fresh' | 'ok' | 'warning' | 'stale' | 'critical';

/**
 * Stage-aware staleness tiers for the "In Stage" aging bar.
 * Thresholds reflect realistic recruiting cadences per stage rather than one
 * blanket urgency rule.
 */
export function getStageAgingTier(status: ApplicationStatus, daysInStage: number): StageAgingTier {
  if (status === 'Rejected' || status === 'Archived') return 'fresh';

  switch (status) {
    case 'Saved':
      return daysInStage > 30 ? 'warning' : 'ok';
    case 'Applied':
      if (daysInStage > 21) return 'stale';
      if (daysInStage > 10) return 'warning';
      return 'ok';
    case 'Screening':
    case 'Interview':
      if (daysInStage > 14) return 'critical';
      if (daysInStage > 7) return 'warning';
      return 'ok';
    case 'Offer':
      return daysInStage > 3 ? 'critical' : 'ok';
    default:
      return daysInStage > 14 ? 'warning' : 'ok';
  }
}

/** Visual token (bar + text) per aging tier. One accent per row: only this bar carries urgency color. */
export const STAGE_AGING_STYLES: Record<StageAgingTier, { bar: string; text: string }> = {
  fresh: { bar: 'bg-slate-200', text: 'text-slate-400' },
  ok: { bar: 'bg-slate-300', text: 'text-slate-600' },
  warning: { bar: 'bg-amber-400', text: 'text-slate-700' },
  stale: { bar: 'bg-orange-500', text: 'text-slate-700' },
  critical: { bar: 'bg-rose-500', text: 'text-slate-800' },
};

/**
 * Loads persisted table view preferences from localStorage, merging with
 * defaults so newly-added keys always have values. Unknown keys (including the
 * retired `grouping` key from older installs) are dropped.
 */
export function loadTableViewPrefs(): TableViewPrefs {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.TABLE_VIEW);
    if (!raw) return { ...DEFAULT_TABLE_VIEW_PREFS };
    const parsed = JSON.parse(raw) as Partial<TableViewPrefs>;
    // Pick only known keys so prefs removed in later versions don't linger
    return {
      ...DEFAULT_TABLE_VIEW_PREFS,
      ...(parsed.showLocation !== undefined && { showLocation: parsed.showLocation }),
      ...(parsed.showSalary !== undefined && { showSalary: parsed.showSalary }),
      ...(parsed.showLastActivity !== undefined && { showLastActivity: parsed.showLastActivity }),
      ...(parsed.showEmploymentType !== undefined && { showEmploymentType: parsed.showEmploymentType }),
    };
  } catch {
    return { ...DEFAULT_TABLE_VIEW_PREFS };
  }
}

/** Persists table view preferences; silently ignores storage access errors. */
export function saveTableViewPrefs(prefs: TableViewPrefs): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TABLE_VIEW, JSON.stringify(prefs));
  } catch {
    // Ignore storage access error (private mode, quota, SSR)
  }
}
