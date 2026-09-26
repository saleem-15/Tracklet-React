import { Application, ApplicationStatus, ApplicationTask, EmailLog, StatusHistoryEntry } from '../types';
import { normalizeJobUrl } from './extensionSync';

export const STAGE_PRIORITY: Record<ApplicationStatus, number> = {
  Offer: 6,
  Interview: 5,
  Screening: 4,
  Applied: 3,
  Saved: 2,
  Rejected: 1,
  Archived: 0,
};

/**
 * Normalizes text for matching by trimming, lowercasing, and collapsing whitespace.
 */
export function normalizeText(text: string): string {
  return (text || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Generates a deduplication key for an application.
 * Uses normalized company + role, or normalized jobLink if available.
 */
export function getApplicationDedupKey(app: Pick<Application, 'company' | 'role' | 'jobLink'>): string {
  const normComp = normalizeText(app.company);
  const normRole = normalizeText(app.role);
  const normUrl = app.jobLink ? normalizeJobUrl(app.jobLink) : '';

  if (normUrl) {
    return `url:${normUrl}`;
  }
  return `comp_role:${normComp}:::${normRole}`;
}

/**
 * Finds all groups of duplicate applications in the provided list.
 * Only returns groups that contain 2 or more applications.
 */
export function findDuplicateApplications(applications: Application[]): Map<string, Application[]> {
  const groups = new Map<string, Application[]>();

  for (const app of applications) {
    // Check match by direct dedup key
    const primaryKey = getApplicationDedupKey(app);
    
    // Also check company + role key if primary key was url
    const compRoleKey = `comp_role:${normalizeText(app.company)}:::${normalizeText(app.role)}`;

    let matchedGroupKey: string | null = null;

    if (groups.has(primaryKey)) {
      matchedGroupKey = primaryKey;
    } else if (groups.has(compRoleKey)) {
      matchedGroupKey = compRoleKey;
    }

    if (matchedGroupKey) {
      groups.get(matchedGroupKey)!.push(app);
    } else {
      // Store under compRoleKey if no url, otherwise primaryKey
      const keyToUse = compRoleKey.includes(':::') && normalizeText(app.company) && normalizeText(app.role)
        ? compRoleKey
        : primaryKey;
      groups.set(keyToUse, [app]);
    }
  }

  // Filter to only groups with duplicates
  const duplicatesOnly = new Map<string, Application[]>();
  for (const [key, list] of groups.entries()) {
    if (list.length > 1) {
      duplicatesOnly.set(key, list);
    }
  }

  return duplicatesOnly;
}

export interface MergeResult {
  mergedApp: Application;
  redundantIds: string[];
}

/**
 * Merges a list of duplicate applications into a single consolidated record.
 * - Chooses the record with the most advanced status (e.g. Applied over Saved).
 * - Preserves all custom rich notes, tasks, contacts, and emails.
 * - Returns the unified application along with all redundant IDs that should be purged.
 */
export function mergeDuplicateApplications(duplicates: Application[]): MergeResult {
  if (duplicates.length === 0) {
    throw new Error('Cannot merge empty duplicates list');
  }

  if (duplicates.length === 1) {
    return { mergedApp: duplicates[0], redundantIds: [] };
  }

  // Sort duplicates so the best primary record comes first:
  // 1. Stage priority (higher is better, e.g. Applied (3) > Saved (2))
  // 2. Presence of notes (non-empty notes preferred)
  // 3. Number of logged emails / tasks / contacts
  // 4. Most recently updated
  const sorted = [...duplicates].sort((a, b) => {
    const stageDiff = (STAGE_PRIORITY[b.status] ?? 0) - (STAGE_PRIORITY[a.status] ?? 0);
    if (stageDiff !== 0) return stageDiff;

    const aHasNotes = Boolean(a.notes && a.notes.trim().length > 0);
    const bHasNotes = Boolean(b.notes && b.notes.trim().length > 0);
    if (aHasNotes && !bHasNotes) return -1;
    if (!aHasNotes && bHasNotes) return 1;

    const aActivity = (a.emails?.length || 0) + (a.tasks?.length || 0) + (a.contactIds?.length || 0);
    const bActivity = (b.emails?.length || 0) + (b.tasks?.length || 0) + (b.contactIds?.length || 0);
    if (bActivity !== aActivity) return bActivity - aActivity;

    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const primary = sorted[0];
  const others = sorted.slice(1);
  const redundantIds = others.map((o) => o.id);

  // Consolidate notes: preserve primary notes; if another copy has unique notes, append them cleanly
  let consolidatedNotes = (primary.notes || '').trim();
  for (const other of others) {
    const oNotes = (other.notes || '').trim();
    if (oNotes && !consolidatedNotes.includes(oNotes)) {
      consolidatedNotes = consolidatedNotes ? `${consolidatedNotes}\n\n---\n\n${oNotes}` : oNotes;
    }
  }

  // Consolidate contact IDs
  const allContactIds = new Set<string>(primary.contactIds || []);
  for (const other of others) {
    (other.contactIds || []).forEach((cId) => allContactIds.add(cId));
  }

  // Consolidate tasks (deduplicating by title/id)
  const taskMap = new Map<string, ApplicationTask>();
  (primary.tasks || []).forEach((t) => taskMap.set(t.id || t.title, t));
  for (const other of others) {
    (other.tasks || []).forEach((t) => {
      const key = t.id || t.title;
      if (!taskMap.has(key)) {
        taskMap.set(key, t);
      }
    });
  }

  // Consolidate emails (deduplicating by email ID or emailUrl)
  const emailMap = new Map<string, EmailLog>();
  (primary.emails || []).forEach((e) => emailMap.set(e.id || e.emailUrl || e.subject, e));
  for (const other of others) {
    (other.emails || []).forEach((e) => {
      const key = e.id || e.emailUrl || e.subject;
      if (!emailMap.has(key)) {
        emailMap.set(key, e);
      }
    });
  }

  // Consolidate history entries
  const historyEntries: StatusHistoryEntry[] = [];
  const seenHistoryIds = new Set<string>();
  for (const item of duplicates) {
    for (const h of item.history || []) {
      const key = h.id || `${h.toStatus}-${h.timestamp}`;
      if (!seenHistoryIds.has(key)) {
        seenHistoryIds.add(key);
        historyEntries.push(h);
      }
    }
  }
  historyEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const nowISO = new Date().toISOString();

  const mergedApp: Application = {
    ...primary,
    jobLink: primary.jobLink || others.find((o) => o.jobLink)?.jobLink,
    emailThreadUrl: primary.emailThreadUrl || others.find((o) => o.emailThreadUrl)?.emailThreadUrl,
    companyDomain: primary.companyDomain || others.find((o) => o.companyDomain)?.companyDomain,
    logoUrl: primary.logoUrl || others.find((o) => o.logoUrl)?.logoUrl,
    notes: consolidatedNotes,
    contactIds: Array.from(allContactIds),
    tasks: Array.from(taskMap.values()),
    emails: Array.from(emailMap.values()),
    history: historyEntries.length > 0 ? historyEntries : primary.history,
    updatedAt: nowISO,
  };

  return { mergedApp, redundantIds };
}

export interface MergeAllDuplicatesResult {
  mergedApplications: Application[];
  purgedAppIds: string[];
  updatedApplications: Application[];
}

/**
 * Finds and merges all duplicate groups within an applications array.
 * Returns the final cleaned applications array, the purged IDs, and the updated primary apps.
 */
export function mergeAllDuplicateGroups(applications: Application[]): MergeAllDuplicatesResult {
  const duplicateGroups = findDuplicateApplications(applications);
  if (duplicateGroups.size === 0) {
    return {
      mergedApplications: applications,
      purgedAppIds: [],
      updatedApplications: [],
    };
  }

  const purgedIdsSet = new Set<string>();
  const updatedMap = new Map<string, Application>();

  for (const group of duplicateGroups.values()) {
    const { mergedApp, redundantIds } = mergeDuplicateApplications(group);
    redundantIds.forEach((id) => purgedIdsSet.add(id));
    updatedMap.set(mergedApp.id, mergedApp);
  }

  const purgedAppIds = Array.from(purgedIdsSet);
  const mergedApplications = applications
    .filter((a) => !purgedIdsSet.has(a.id))
    .map((a) => (updatedMap.has(a.id) ? updatedMap.get(a.id)! : a));

  return {
    mergedApplications,
    purgedAppIds,
    updatedApplications: Array.from(updatedMap.values()),
  };
}
