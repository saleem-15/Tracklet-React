import { Application, Contact, FollowUpTemplate } from '../types';
import { calculateDaysInStage } from './sampleData';

/**
 * Escapes values for CSV format and neutralizes CSV / Formula Injection (CWE-1236).
 * Prepends a single quote if the field begins with =, +, -, @, \t, \r, or % so
 * spreadsheet programs treat it as plain text instead of executing a formula.
 */
export function escapeCSV(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  let str = String(value);

  // If string begins with spreadsheet formula operators, prepend single quote
  if (/^[=+\-@\t\r%]/.test(str)) {
    str = `'${str}`;
  }

  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Shared helper to create a UTF-8 CSV Blob and trigger browser download.
 */
function downloadCsv(headers: string[], rows: string[], filenamePrefix: string): boolean {
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filenamePrefix}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Nested-data flatteners (ADR 0014: 100% of structured data in CSV).
 * Multi-value fields collapse into single cells separated by "; ".
 * ──────────────────────────────────────────────────────────────────────────── */

const STATUS_HISTORY_COLUMN = 'Status History';
const TASKS_COLUMN = 'Tasks';
const EMAILS_COLUMN = 'Emails';
const LINKED_CONTACTS_COLUMN = 'Linked Contacts';

const flattenStatusHistory = (app: Application): string =>
  (app.history || [])
    .map((h) => {
      const day = h.timestamp ? h.timestamp.slice(0, 10) : '';
      const transition = h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : h.toStatus;
      const note = h.note ? ` (${h.note})` : '';
      return `${day}: ${transition}${note}`;
    })
    .join('; ');

const flattenTasks = (app: Application): string =>
  (app.tasks || [])
    .map((t) => {
      const state = t.completed ? 'done' : 'open';
      const due = t.dueDate ? ` due ${t.dueDate}` : '';
      return `${t.title} [${state}]${due}`;
    })
    .join('; ');

const flattenEmails = (app: Application): string =>
  (app.emails || [])
    .map((e) => {
      const dir = e.direction ? ` (${e.direction})` : '';
      const body = e.body ? ` — ${e.body}` : '';
      return `${e.date}${dir}: ${e.subject}${body}`;
    })
    .join('; ');

const flattenLinkedContacts = (app: Application): string => {
  if (app.contacts && app.contacts.length > 0) {
    return app.contacts
      .map((c) => `${c.name}${c.email ? ` <${c.email}>` : ''}`)
      .join('; ');
  }
  return (app.contactIds || []).join('; ');
};

/* ────────────────────────────────────────────────────────────────────────────
 * Applications export
 * ──────────────────────────────────────────────────────────────────────────── */

export function exportApplicationsToCSV(
  applications: Application[],
  filenamePrefix: string = 'tracklet_job_applications'
): boolean {
  if (!applications || applications.length === 0) {
    return false;
  }

  const headers = [
    'Company',
    'Role',
    'Platform',
    'Work Location',
    'Employment Type',
    'Job Location',
    'Date Applied',
    'Status',
    'Days In Stage',
    'Job Listing URL',
    'Email Thread URL',
    'Notes',
    'Contact Email',
    LINKED_CONTACTS_COLUMN,
    STATUS_HISTORY_COLUMN,
    TASKS_COLUMN,
    EMAILS_COLUMN,
    'Company Domain',
    'Resume File Name',
    'Resume File Size',
    'Resume Uploaded At',
    'Created At',
    'Updated At',
  ];

  const rows = applications.map((app) => {
    const days = calculateDaysInStage(app.stageUpdatedAt);
    return [
      escapeCSV(app.company),
      escapeCSV(app.role),
      escapeCSV(app.platform),
      escapeCSV(app.workLocation || ''),
      escapeCSV(app.employmentType || ''),
      escapeCSV(app.location || ''),
      escapeCSV(app.dateApplied),
      escapeCSV(app.status),
      days.toString(),
      escapeCSV(app.jobLink || ''),
      escapeCSV(app.emailThreadUrl || ''),
      escapeCSV(app.notes || ''),
      escapeCSV(app.contactEmail || ''),
      escapeCSV(flattenLinkedContacts(app)),
      escapeCSV(flattenStatusHistory(app)),
      escapeCSV(flattenTasks(app)),
      escapeCSV(flattenEmails(app)),
      escapeCSV(app.companyDomain || ''),
      escapeCSV(app.resumeFileName || ''),
      escapeCSV(app.resumeFileSize != null ? app.resumeFileSize.toString() : ''),
      escapeCSV(app.resumeUploadedAt || ''),
      escapeCSV(app.createdAt || ''),
      escapeCSV(app.updatedAt || ''),
    ].join(',');
  });

  return downloadCsv(headers, rows, filenamePrefix);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Contacts export
 * ──────────────────────────────────────────────────────────────────────────── */

const flattenContactEmailLogs = (contact: Contact): string =>
  (contact.emails || [])
    .map((e) => {
      const dir = e.direction ? ` (${e.direction})` : '';
      const body = e.body ? ` — ${e.body}` : '';
      return `${e.date}${dir}: ${e.subject}${body}`;
    })
    .join('; ');

export function exportContactsToCSV(
  contacts: Contact[],
  filenamePrefix: string = 'tracklet_contacts_directory'
): boolean {
  if (!contacts || contacts.length === 0) {
    return false;
  }

  const headers = [
    'Name',
    'Category',
    'Role',
    'Organization',
    'Email',
    'Phone',
    'LinkedIn',
    'Next Follow-up Date',
    'Notes',
    'Email Logs',
    'Linked Application IDs',
  ];

  const rows = contacts.map((c) => {
    return [
      escapeCSV(c.name),
      escapeCSV(c.category || 'Other'),
      escapeCSV(c.role || ''),
      escapeCSV(c.organization || ''),
      escapeCSV(c.email || ''),
      escapeCSV(c.phone || ''),
      escapeCSV(c.linkedIn || ''),
      escapeCSV(c.nextFollowUpDate || ''),
      escapeCSV(c.notes || ''),
      escapeCSV(flattenContactEmailLogs(c)),
      escapeCSV((c.applicationIds || []).join('; ')),
    ].join(',');
  });

  return downloadCsv(headers, rows, filenamePrefix);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Follow-up templates export (ADR 0014: user-created data must be exportable)
 * ──────────────────────────────────────────────────────────────────────────── */

export function exportFollowUpTemplatesToCSV(
  templates: FollowUpTemplate[],
  filenamePrefix: string = 'tracklet_followup_templates'
): boolean {
  if (!templates || templates.length === 0) {
    return false;
  }

  const headers = [
    'Title',
    'Category',
    'Subject',
    'Body',
    'Order',
    'Built-in',
    'Created At',
  ];

  const rows = templates.map((t) => {
    return [
      escapeCSV(t.title),
      escapeCSV(t.category || ''),
      escapeCSV(t.subject),
      escapeCSV(t.body),
      t.order != null ? t.order.toString() : '',
      t.isBuiltIn ? 'yes' : 'no',
      escapeCSV(t.createdAt || ''),
    ].join(',');
  });

  return downloadCsv(headers, rows, filenamePrefix);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Full workspace export (ADR 0014): one user action, one CSV per data family.
 * Downloads fire synchronously inside the click gesture — no ZIP library, no
 * bundling. Browsers present their native multi-download permission prompt once.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface WorkspaceExportInput {
  applications: Application[];
  contacts: Contact[];
  templates?: FollowUpTemplate[];
}

export interface WorkspaceExportResult {
  files: number;
  applications: number;
  contacts: number;
  templates: number;
}

export function exportWorkspaceDataToCSV(
  input: WorkspaceExportInput
): WorkspaceExportResult | null {
  const { applications, contacts, templates } = input;
  let files = 0;

  if (exportApplicationsToCSV(applications)) files += 1;
  if (exportContactsToCSV(contacts)) files += 1;
  if (templates && templates.length > 0 && exportFollowUpTemplatesToCSV(templates)) files += 1;

  if (files === 0) {
    return null;
  }

  return {
    files,
    applications: applications.length,
    contacts: contacts.length,
    templates: templates?.length ?? 0,
  };
}
