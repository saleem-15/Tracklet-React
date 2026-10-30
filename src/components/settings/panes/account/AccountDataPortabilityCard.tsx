import React, { useState, useRef } from 'react';
import {
  FileCode2,
  Upload,
  FileSpreadsheet,
  Download,
  ChevronRight
} from 'lucide-react';
import { useApplicationsContext } from '../../../../context/ApplicationsContext';
import { useContactsContext } from '../../../../context/ContactsContext';
import { useToastContext } from '../../../../context/ToastContext';
import { useEntitlementContext } from '../../../../context/EntitlementContext';
import { ACTIVE_STATUSES } from '../../../../lib/constants';
import { Application } from '../../../../types';
import { SettingsCard } from '../../SettingsCard';
import { exportApplicationsToJSON, validateAndParseJSONBackup } from '../../../../lib/backupJson';
import { exportContactsToCSV } from '../../../../lib/exportCsv';
import { ImportCSVModal } from '../../../ImportCSVModal';

interface PortabilityRowProps {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  description: string;
  meta?: string;
  trailing: 'download' | 'chevron';
  onClick: () => void;
}

/**
 * A quiet, full-width settings list row on the white canvas.
 * Icon chip + bold label + muted description + optional live count,
 * with a trailing affordance that hints at the outcome.
 */
const PortabilityRow: React.FC<PortabilityRowProps> = ({
  icon,
  iconClass,
  label,
  description,
  meta,
  trailing,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full flex items-center gap-3 px-3 -mx-3 py-3 rounded-xl text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 transition-colors cursor-pointer"
  >
    <span className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${iconClass}`}>
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-semibold text-slate-900 truncate">{label}</span>
      <span className="block text-xs text-slate-500 truncate">{description}</span>
    </span>
    {meta && (
      <span className="hidden sm:block font-mono text-xs text-slate-500 tabular-nums shrink-0">{meta}</span>
    )}
    {trailing === 'download' ? (
      <Download
        className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:-translate-y-0.5 transition-all shrink-0"
        aria-hidden="true"
      />
    ) : (
      <ChevronRight
        className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0"
        aria-hidden="true"
      />
    )}
  </button>
);

const Overline: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-xs font-semibold uppercase tracking-wider text-slate-500 ${className}`}>
    {children}
  </p>
);

/**
 * AccountDataPortabilityCard
 *
 * Data portability and backups within Account settings, on the flat white canvas:
 * - Workspace Backup rows: 1:1 JSON snapshot export + restore from file
 * - Spreadsheet rows: Jobs CSV export, Contacts directory export, CSV import
 * - Live record counts preview what each export contains
 * - Enforces title-only header paradigm and sub-300 lines rule
 */
export const AccountDataPortabilityCard: React.FC = () => {
  const {
    applications,
    handleExportCSV,
    handleBatchImportApplications
  } = useApplicationsContext();
  const { activeCount, maxActiveQuota, openPaywall } = useEntitlementContext();

  const { contacts } = useContactsContext();
  const { addToast } = useToastContext();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const applicationCount = applications?.length ?? 0;
  const contactCount = contacts?.length ?? 0;
  const applicationMeta = `${applicationCount} application${applicationCount === 1 ? '' : 's'}`;
  const contactMeta = `${contactCount} contact${contactCount === 1 ? '' : 's'}`;

  const handleDownloadJSON = () => {
    if (!applications || applications.length === 0) {
      addToast('warning', 'Backup Empty', 'No applications available to backup.');
      return;
    }
    const success = exportApplicationsToJSON(applications);
    if (success) {
      addToast('success', 'JSON Backup Exported', `Saved 1:1 complete snapshot of ${applications.length} applications.`);
    }
  };

  const handleDownloadContactsCSV = () => {
    if (!contacts || contacts.length === 0) {
      addToast('warning', 'No Contacts', 'Add recruiter contacts to export a directory CSV.');
      return;
    }
    const success = exportContactsToCSV(contacts);
    if (success) {
      addToast('success', 'Contacts Exported', `Downloaded ${contacts.length} contacts as CSV.`);
    } else {
      addToast('error', 'Export Failed', 'Could not generate CSV file.');
    }
  };

  /**
   * Shared quota-guarded import used by both JSON restore and CSV import so
   * activeQuota.current can never exceed activeQuota.max.
   * Mirrors WorkspaceContent's handleGuardedBatchImport.
   */
  const handleGuardedImport = async (
    newApps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ): Promise<boolean> => {
    const newActiveCount = newApps.filter((a) => a.status && ACTIVE_STATUSES.includes(a.status)).length;
    if (Number.isFinite(maxActiveQuota) && newActiveCount > 0 && activeCount + newActiveCount > maxActiveQuota) {
      addToast(
        'warning',
        'Pipeline Capacity Reached',
        `Importing ${newActiveCount} active application${newActiveCount === 1 ? '' : 's'} would exceed your Free tier limit of ${maxActiveQuota}. Upgrade to Pro for unlimited applications.`
      );
      openPaywall('pipeline_cap');
      return false;
    }
    await handleBatchImportApplications(newApps);
    return true;
  };

  const handleJSONFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      addToast('error', 'File Read Error', 'Failed to read the backup file from disk.');
    };
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = validateAndParseJSONBackup(content);
        if (!res.success || !res.applications) {
          addToast('error', 'Restore Failed', res.error || 'Invalid backup file.');
          return;
        }
        const imported = await handleGuardedImport(res.applications);
        if (imported) {
          addToast('success', 'Backup Restored', `Imported ${res.applications.length} applications from JSON backup.`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not read backup file.';
        addToast('error', 'Import Error', msg);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      {/* Hidden JSON file picker input */}
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleJSONFileChange}
        className="hidden"
        aria-label="Upload JSON Backup File"
      />

      <SettingsCard
        title="Data Portability & Backups"
        subtitle="Your workspace, your data. Export a complete snapshot, restore it anywhere, or move records in and out with spreadsheets."
      >
        {/* ── Workspace Backup ── */}
        <div className="space-y-1">
          <Overline className="pb-1">Workspace Backup</Overline>
          <div className="divide-y divide-slate-100">
            <PortabilityRow
              icon={<FileCode2 className="w-4 h-4" />}
              iconClass="bg-blue-50 text-blue-600 border-blue-200/80"
              label="JSON Backup"
              description="1:1 complete snapshot of your pipeline"
              meta={applicationMeta}
              trailing="download"
              onClick={handleDownloadJSON}
            />
            <PortabilityRow
              icon={<Upload className="w-4 h-4" />}
              iconClass="bg-indigo-50 text-indigo-600 border-indigo-200/80"
              label="Restore JSON"
              description="Bring a .json backup file back into Tracklet"
              trailing="chevron"
              onClick={() => jsonFileInputRef.current?.click()}
            />
          </div>
        </div>

        {/* ── Spreadsheets ── */}
        <div className="space-y-1 pt-4">
          <Overline className="pb-1">Spreadsheets</Overline>
          <div className="divide-y divide-slate-100">
            <PortabilityRow
              icon={<FileSpreadsheet className="w-4 h-4" />}
              iconClass="bg-emerald-50 text-emerald-600 border-emerald-200/80"
              label="Export Jobs CSV"
              description="Applications table with status and history"
              meta={applicationMeta}
              trailing="download"
              onClick={handleExportCSV}
            />
            <PortabilityRow
              icon={<FileSpreadsheet className="w-4 h-4" />}
              iconClass="bg-slate-100 text-slate-600 border-slate-200"
              label="Export Contacts Directory (CSV)"
              description="Recruiter and mentor directory"
              meta={contactMeta}
              trailing="download"
              onClick={handleDownloadContactsCSV}
            />
            <PortabilityRow
              icon={<Upload className="w-4 h-4" />}
              iconClass="bg-slate-100 text-slate-600 border-slate-200"
              label="Import CSV"
              description="Bulk-add applications from a spreadsheet"
              trailing="chevron"
              onClick={() => setIsImportModalOpen(true)}
            />
          </div>
        </div>
      </SettingsCard>

      {/* Import CSV Modal */}
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={async (newApps) => {
          await handleGuardedImport(newApps);
        }}
      />
    </>
  );
};
