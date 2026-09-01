import { Application, Contact } from '../types';
import { calculateDaysInStage } from './sampleData';

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
    'Notes',
  ];

  /**
   * Escapes values for CSV format and neutralizes CSV / Formula Injection (CWE-1236).
   * Prepends a single quote if the field begins with =, +, -, @, \t, \r, or % so
   * spreadsheet programs treat it as plain text instead of executing a formula.
   */
  const escapeCSV = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return '""';
    let str = String(value);

    // If string begins with spreadsheet formula operators, prepend single quote
    if (/^[=+\-@\t\r%]/.test(str)) {
      str = `'${str}`;
    }

    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

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
      escapeCSV(app.notes || ''),
    ].join(',');
  });

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
  ];

  const escapeCSV = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return '""';
    let str = String(value);

    if (/^[=+\-@\t\r%]/.test(str)) {
      str = `'${str}`;
    }

    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

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
    ].join(',');
  });

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
