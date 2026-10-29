import React, { useState, useRef } from 'react';
import { 
  Database, 
  FileCode2, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useApplicationsContext } from '../../../../context/ApplicationsContext';
import { useContactsContext } from '../../../../context/ContactsContext';
import { useToastContext } from '../../../../context/ToastContext';
import { SettingsCard } from '../../SettingsCard';
import { exportApplicationsToJSON, validateAndParseJSONBackup } from '../../../../lib/backupJson';
import { exportContactsToCSV } from '../../../../lib/exportCsv';
import { ImportCSVModal } from '../../../ImportCSVModal';

/**
 * AccountDataPortabilityCard
 *
 * Dedicated sub-component for candidate data portability and backups within Account settings:
 * - 1:1 Complete Workspace JSON Backup & Restore
 * - CSV Portability (Applications Table Export, Contacts Directory Export, CSV Import)
 * - Quiet footer links to legal policies
 * - Enforces title-only header paradigm and sub-300 lines rule
 */
export const AccountDataPortabilityCard: React.FC = () => {
  const { 
    applications, 
    handleExportCSV, 
    handleBatchImportApplications 
  } = useApplicationsContext();
  
  const { contacts } = useContactsContext();
  const { addToast } = useToastContext();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

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
        await handleBatchImportApplications(res.applications);
        addToast('success', 'Backup Restored', `Imported ${res.applications.length} applications from JSON backup.`);
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
        icon={<Database className="w-5 h-5 text-blue-600" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* JSON Backup Download */}
          <button
            type="button"
            onClick={handleDownloadJSON}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 transition-colors cursor-pointer shadow-2xs group text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
                <FileCode2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-xs text-slate-900 truncate">JSON Backup</span>
                <span className="text-[11px] text-slate-500 truncate block">1:1 complete snapshot</span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-blue-600 shrink-0" />
          </button>

          {/* JSON Restore Drop */}
          <button
            type="button"
            onClick={() => jsonFileInputRef.current?.click()}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 transition-colors cursor-pointer shadow-2xs group text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-xs text-slate-900 truncate">Restore JSON</span>
                <span className="text-[11px] text-slate-500 truncate block">Import backup file</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 shrink-0" />
          </button>

          {/* CSV Import */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 transition-colors cursor-pointer shadow-2xs group text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-xs text-slate-900 truncate">Import CSV</span>
                <span className="text-[11px] text-slate-500 truncate block">Spreadsheet import</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          {/* CSV Export Applications */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 transition-colors cursor-pointer shadow-2xs group text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-bold text-xs text-slate-900 truncate">Export Jobs CSV</span>
                <span className="text-[11px] text-slate-500 truncate block">Applications table</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          </button>
        </div>

        {/* Secondary CSV Contacts & Legal Policy Links */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleDownloadContactsCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Contacts Directory (CSV)</span>
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              <span>Privacy Policy</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              <span>Terms of Service</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </SettingsCard>

      {/* Import CSV Modal */}
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={async (newApps) => {
          await handleBatchImportApplications(newApps);
        }}
      />
    </>
  );
};
