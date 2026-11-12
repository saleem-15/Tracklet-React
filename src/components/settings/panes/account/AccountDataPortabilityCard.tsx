import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileUp,
  Download,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useApplicationsContext } from '../../../../context/ApplicationsContext';
import { useContactsContext } from '../../../../context/ContactsContext';
import { useToastContext } from '../../../../context/ToastContext';
import { useEntitlementContext } from '../../../../context/EntitlementContext';
import { useAuth } from '../../../../context/AuthContext';
import { ACTIVE_STATUSES } from '../../../../lib/constants';
import { Application } from '../../../../types';
import { TemplateRepository } from '../../../../lib/templateRepository';
import { uploadResume, formatFileSize, ResumeUploadResult } from '../../../../lib/resumeStorage';
import { SettingsCard } from '../../SettingsCard';
import { exportWorkspaceDataToCSV, WorkspaceExportResult } from '../../../../lib/exportCsv';
import { ImportCSVModal } from '../../../ImportCSVModal';
import { UploadModal } from '../../../UploadModal';

interface PortabilityRowProps {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  description: string;
  meta?: string;
  trailing: 'download' | 'chevron' | 'spinner';
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
    ) : trailing === 'spinner' ? (
      <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" aria-hidden="true" />
    ) : (
      <ChevronRight
        className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0"
        aria-hidden="true"
      />
    )}
  </button>
);

/**
 * AccountDataPortabilityCard
 *
 * Import & Export within Account settings, on the flat white canvas (ADR 0014):
 * - Import CSV: bulk-add applications from a spreadsheet (opens ImportCSVModal)
 * - Upload Resume: real Firebase Cloud Storage upload via UploadModal
 * - Export Data: one click, one CSV per data family — jobs, contacts, templates.
 *   100% of structured data, including status history, tasks and email logs.
 * - Enforces title-only header paradigm and sub-300 lines rule
 */
export const AccountDataPortabilityCard: React.FC = () => {
  const {
    applications,
    handleBatchImportApplications
  } = useApplicationsContext();
  const { activeCount, maxActiveQuota, openPaywall } = useEntitlementContext();

  const { contacts } = useContactsContext();
  const { addToast } = useToastContext();
  const { user } = useAuth();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const applicationCount = applications?.length ?? 0;
  const contactCount = contacts?.length ?? 0;

  /**
   * Quota-guarded import so activeQuota.current can never exceed activeQuota.max.
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

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Strict read: a failed or signed-out template fetch must not present
      // generated defaults as the user's saved data.
      const templates = await TemplateRepository.loadTemplatesStrict(user?.uid);

      if (
        applicationCount === 0 &&
        contactCount === 0 &&
        (!templates || templates.length === 0)
      ) {
        addToast('warning', 'Nothing to Export', 'Add applications or contacts before exporting.');
        return;
      }

      const result: WorkspaceExportResult | null = exportWorkspaceDataToCSV({
        applications: applications || [],
        contacts: contacts || [],
        templates: templates ?? [],
      });

      if (!result) {
        addToast('error', 'Export Failed', 'Could not generate CSV files.');
        return;
      }

      const summary = `Downloaded ${result.files} CSV file${result.files === 1 ? '' : 's'}: ${result.applications} applications, ${result.contacts} contacts${result.templates ? `, ${result.templates} templates` : ''}.`;

      if (templates === null) {
        addToast(
          'warning',
          'Export Incomplete',
          `${summary} Your saved templates could not be read and were not included.`
        );
      } else {
        addToast('success', 'Data Exported', summary);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not generate CSV files.';
      addToast('error', 'Export Failed', msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <SettingsCard
        title="Import & Export"
        subtitle="Move your data in and out of Tracklet anytime. Everything exports as CSV — including status history, tasks and email logs."
      >
        <div className="space-y-1">
          <div className="divide-y divide-slate-100">
            <PortabilityRow
              icon={<FileSpreadsheet className="w-4 h-4" />}
              iconClass="bg-emerald-50 text-emerald-600 border-emerald-200/80"
              label="Import CSV"
              description="Bulk-add applications from a spreadsheet"
              trailing="chevron"
              onClick={() => setIsImportModalOpen(true)}
            />
            <PortabilityRow
              icon={<FileUp className="w-4 h-4" />}
              iconClass="bg-amber-50 text-amber-600 border-amber-200/80"
              label="Upload Resume"
              description="Store a resume in your private cloud storage"
              trailing="chevron"
              onClick={() => setIsUploadModalOpen(true)}
            />
            <PortabilityRow
              icon={<Download className="w-4 h-4" />}
              iconClass="bg-blue-50 text-blue-600 border-blue-200/80"
              label="Export Data"
              description="Download your full workspace as CSV"
              meta={`${applicationCount} job${applicationCount === 1 ? '' : 's'} · ${contactCount} contact${contactCount === 1 ? '' : 's'}`}
              trailing={isExporting ? 'spinner' : 'download'}
              onClick={handleExportData}
            />
          </div>
        </div>
      </SettingsCard>

      {/* Import CSV Modal */}
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleGuardedImport}
      />

      {/* Resume Upload Modal — real Firebase Cloud Storage transfer */}
      <UploadModal<ResumeUploadResult>
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Resume"
        metaCopy="PDF, DOC or TXT up to 10 MB"
        onUpload={(file, onProgress) => {
          if (!user?.uid) {
            return {
              promise: Promise.reject(new Error('You must be signed in to upload.')),
              cancel: () => {},
            };
          }
          return uploadResume(user.uid, file, onProgress);
        }}
        onUploaded={(result) => {
          addToast(
            'success',
            'Resume Uploaded',
            `${result.fileName} (${formatFileSize(result.fileSize)}) is stored in your private cloud storage.`
          );
        }}
      />
    </>
  );
};
