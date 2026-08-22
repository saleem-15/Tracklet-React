import { Application, ApplicationStatus, JobPlatform } from '../types';
import { normalizeCSVStatus, normalizeCSVPlatform, normalizeCSVDate } from './importCsv';

export interface JSONBackupEnvelope {
  version: string;
  exportDate: string;
  appCount: number;
  applications: Application[];
}

/**
 * Exports complete 1:1 application data (including contacts, tasks, status history, notes) as a formatted JSON backup file.
 */
export function exportApplicationsToJSON(
  applications: Application[],
  filenamePrefix: string = 'tracklet_backup'
): boolean {
  if (!applications || applications.length === 0) {
    return false;
  }

  const payload: JSONBackupEnvelope = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    appCount: applications.length,
    applications,
  };

  const jsonContent = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filenamePrefix}_${timestamp}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

export interface JSONImportResult {
  success: boolean;
  applications?: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[];
  error?: string;
}

/**
 * Validates, sanitizes, and parses a JSON backup file content.
 * Accepts either a JSONBackupEnvelope ({ applications: [...] }) or a raw array of Applications.
 */
export function validateAndParseJSONBackup(jsonString: string): JSONImportResult {
  if (!jsonString || !jsonString.trim()) {
    return { success: false, error: 'The provided file is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { success: false, error: 'Invalid JSON format. Please ensure the file contains valid JSON.' };
  }

  let rawList: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object' && 'applications' in parsed && Array.isArray((parsed as Record<string, unknown>).applications)) {
    rawList = (parsed as Record<string, unknown>).applications as unknown[];
  } else {
    return { success: false, error: 'JSON does not contain a valid list of applications.' };
  }

  if (rawList.length === 0) {
    return { success: false, error: 'No applications found in the backup file.' };
  }

  const sanitizedList: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;

    const company = typeof record.company === 'string' ? record.company.trim() : '';
    const role = typeof record.role === 'string' ? record.role.trim() : '';

    // Ignore items without at least company or role
    if (!company && !role) continue;

    const rawStatus = typeof record.status === 'string' ? record.status : 'Applied';
    const status: ApplicationStatus = normalizeCSVStatus(rawStatus);

    const rawPlatform = typeof record.platform === 'string' ? record.platform : 'Company Site';
    const platform: JobPlatform = normalizeCSVPlatform(rawPlatform);

    const rawDate = typeof record.dateApplied === 'string' ? record.dateApplied : '';
    const dateApplied = normalizeCSVDate(rawDate);

    const jobLink = typeof record.jobLink === 'string' ? record.jobLink.trim() : undefined;
    const notes = typeof record.notes === 'string' ? record.notes.trim() : undefined;
    const contactEmail = typeof record.contactEmail === 'string' ? record.contactEmail.trim() : undefined;
    const logoUrl = typeof record.logoUrl === 'string' ? record.logoUrl.trim() : undefined;
    const companyDomain = typeof record.companyDomain === 'string' ? record.companyDomain.trim() : undefined;

    // Validate sub-arrays if present with non-null object filtering
    const contacts = Array.isArray(record.contacts)
      ? (record.contacts as unknown[])
          .filter((c): c is Record<string, unknown> => c !== null && typeof c === 'object')
          .map((c, idx) => ({
            id: typeof c.id === 'string' ? c.id : `c-${idx}`,
            name: typeof c.name === 'string' ? c.name : 'Contact',
            role: typeof c.role === 'string' ? c.role : undefined,
            email: typeof c.email === 'string' ? c.email : undefined,
            phone: typeof c.phone === 'string' ? c.phone : undefined,
            linkedIn: typeof c.linkedIn === 'string' ? c.linkedIn : undefined,
            notes: typeof c.notes === 'string' ? c.notes : undefined,
          }))
      : undefined;

    const tasks = Array.isArray(record.tasks)
      ? (record.tasks as unknown[])
          .filter((t): t is Record<string, unknown> => t !== null && typeof t === 'object')
          .map((t, idx) => ({
            id: typeof t.id === 'string' ? t.id : `t-${idx}`,
            title: typeof t.title === 'string' ? t.title : 'Task',
            completed: Boolean(t.completed),
            dueDate: typeof t.dueDate === 'string' ? t.dueDate : undefined,
          }))
      : undefined;

    const emails = Array.isArray(record.emails)
      ? (record.emails as unknown[])
          .filter((e): e is Record<string, unknown> => e !== null && typeof e === 'object')
          .map((e, idx) => ({
            id: typeof e.id === 'string' ? e.id : `e-${idx}`,
            subject: typeof e.subject === 'string' ? e.subject : 'Email',
            sender: typeof e.sender === 'string' ? e.sender : 'Unknown',
            recipient: typeof e.recipient === 'string' ? e.recipient : undefined,
            date: typeof e.date === 'string' ? e.date : new Date().toISOString().slice(0, 10),
            snippet: typeof e.snippet === 'string' ? e.snippet : undefined,
          }))
      : undefined;

    const history = Array.isArray(record.history)
      ? (record.history as unknown[])
          .filter((h): h is Record<string, unknown> => h !== null && typeof h === 'object')
          .map((h, idx) => ({
            id: typeof h.id === 'string' ? h.id : `h-${idx}`,
            toStatus: normalizeCSVStatus(typeof h.toStatus === 'string' ? h.toStatus : 'Applied'),
            fromStatus: typeof h.fromStatus === 'string' ? normalizeCSVStatus(h.fromStatus) : undefined,
            timestamp: typeof h.timestamp === 'string' ? h.timestamp : new Date().toISOString(),
          }))
      : undefined;

    sanitizedList.push({
      company: company || 'Unknown Company',
      role: role || 'Unknown Role',
      platform,
      dateApplied,
      status,
      jobLink,
      notes,
      contactEmail,
      logoUrl,
      companyDomain,
      contacts,
      tasks,
      emails,
      history,
    });
  }

  if (sanitizedList.length === 0) {
    return { success: false, error: 'No valid application records could be parsed from the backup file.' };
  }

  return { success: true, applications: sanitizedList };
}
