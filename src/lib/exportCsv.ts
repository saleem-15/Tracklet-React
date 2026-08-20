import { Application } from '../types';
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
    'Date Applied',
    'Status',
    'Days In Stage',
    'Job Listing URL',
    'Notes',
  ];

  const escapeCSV = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return '""';
    const str = String(value);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = applications.map((app) => {
    const days = calculateDaysInStage(app.stageUpdatedAt);
    return [
      escapeCSV(app.company),
      escapeCSV(app.role),
      escapeCSV(app.platform),
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
