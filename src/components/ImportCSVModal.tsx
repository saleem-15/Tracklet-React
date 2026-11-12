import React, { useState, useRef, useEffect } from 'react';
import {
  CloudUpload,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Application } from '../types';
import { CloseIconButton } from './IconButton';
import { Modal } from './Modal';
import { UI_TOKENS } from '../theme/tokens';
import {
  parseRawCSV,
  autoDetectFieldMapping,
  CSVFieldMapping,
  normalizeCSVStatus,
  normalizeCSVPlatform,
  normalizeCSVWorkLocation,
  normalizeCSVEmploymentType,
  normalizeCSVDate
} from '../lib/importCsv';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Import the parsed applications. Resolve `false` only when a quota guard
   *  rejected them (the parent owns that messaging, e.g. a paywall toast);
   *  any other resolution — including `void` — counts as success. The modal
   *  closes on resolve either way; a rejected promise keeps it open so the
   *  failure can be surfaced and retried. Success feedback is owned by the
   *  import handler itself (single toast, shared by all its callers). */
  onImport: (
    apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => Promise<boolean | void>;
}

/** Field-index mapping before any file is parsed: every column unmapped. */
const INITIAL_MAPPING: CSVFieldMapping = {
  company: -1,
  role: -1,
  platform: -1,
  workLocation: -1,
  employmentType: -1,
  dateApplied: -1,
  status: -1,
  jobLink: -1,
  emailThreadUrl: -1,
  notes: -1,
  contactEmail: -1,
  location: -1,
  salary: -1,
};

export const ImportCSVModal: React.FC<ImportCSVModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [isInvalidFormat, setIsInvalidFormat] = useState(false);
  /** Live hover state while a file is dragged over the dropzone. Unlike
   *  `isInvalidFormat` (sticky after a dropped file), this clears as soon
   *  as the drag leaves the zone. 'unknown' lifts the zone but makes no
   *  color judgment. */
  const [dragHover, setDragHover] = useState<null | 'valid' | 'invalid' | 'unknown'>(null);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CSVFieldMapping>(INITIAL_MAPPING);

  const [parseError, setParseError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Session identity: bumped every open/close so work that outlives a
   *  session (an in-flight FileReader, an awaited `onImport`) can never
   *  mutate state or close a NEWER session's modal. */
  const sessionRef = useRef(0);
  /** The reader that owns the current session's read, if any. */
  const activeReaderRef = useRef<FileReader | null>(null);

  const showError = isInvalidFormat || dragHover === 'invalid';

  /** The component instance stays mounted across open/close (only the panel
   *  animates), so every open must start from a clean slate — a dropped
   *  .xlsx from a previous session must not bleed into this one. */
  useEffect(() => {
    // Bump on close too: in-flight reads and imports are invalidated the
    // moment the session ends, not just when the next one starts.
    sessionRef.current += 1;
    activeReaderRef.current = null;
    if (!isOpen) return;
    setStep('upload');
    setIsInvalidFormat(false);
    setDragHover(null);
    setDataRows([]);
    setMapping(INITIAL_MAPPING);
    setParseError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  const parsedApplications = dataRows
    .map((row) => mapRowToApp(row, mapping))
    .filter((app): app is Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'> => app !== null);

  /** Only genuine CSV files are accepted — a dropped .xlsx or .txt must not
   *  silently proceed to a confusing parse failure. */
  const isCsvFile = (file: File) =>
    file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';

  const processFile = (file: File) => {
    if (!isCsvFile(file)) {
      setIsInvalidFormat(true);
      return;
    }
    setIsInvalidFormat(false);
    const session = sessionRef.current;
    const reader = new FileReader();
    activeReaderRef.current = reader;
    /** Guard: this callback belongs to the still-current read of the
     *  still-current session. A read that outlives a close/reopen must not
     *  push its rows into the fresh session. */
    const isCurrentRead = () =>
      sessionRef.current === session && activeReaderRef.current === reader;
    reader.onload = (event) => {
      if (!isCurrentRead()) return;
      const content = event.target?.result as string;
      if (content) {
        processCSVContent(content);
      }
    };
    reader.onerror = () => {
      if (!isCurrentRead()) return;
      setParseError('Could not read the file. Please try again.');
    };
    reader.readAsText(file);
  };

  /** During dragover the drag data store is in "protected mode": file names
   *  are hidden until drop. The MIME `type` IS readable, so a recognizable
   *  non-CSV (xlsx, pdf, txt…) can light the zone red before the user
   *  releases. Unknown types lift the zone without a color judgment; the
   *  authoritative drop-time validation still catches every file. */
  const isCsvMime = (mime: string) => mime === 'text/csv' || mime === 'application/csv';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.items).filter((item) => item.kind === 'file');
    if (items.length === 0) return;
    const verdicts = items.map((item) => {
      const type = (item.type || '').toLowerCase();
      const name = ((item as DataTransferItem & { name?: string }).name || '').toLowerCase();
      if (isCsvMime(type) || name.endsWith('.csv')) return 'valid';
      if (type || name) return 'invalid'; // identifiable non-CSV
      return 'unknown'; // can't tell — don't guess
    });
    setDragHover(
      verdicts.includes('invalid')
        ? 'invalid'
        : verdicts.includes('valid')
          ? 'valid'
          : 'unknown'
    );
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Flicker guard: moving between child elements fires dragleave too.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragHover(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragHover(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processCSVContent = (content: string) => {
    const parsed = parseRawCSV(content);
    if (parsed.length < 2) {
      setParseError('CSV file must contain a header row and at least one data row.');
      return;
    }

    setParseError(null);
    setDataRows(parsed.slice(1));
    setMapping(autoDetectFieldMapping(parsed[0]));
    setStep('mapping');
  };

  const handleExecuteImport = async () => {
    if (parsedApplications.length === 0) {
      setParseError('No valid applications detected to import.');
      return;
    }

    setIsSubmitting(true);
    setParseError(null);
    const session = sessionRef.current;
    try {
      await onImport(parsedApplications);
      // Committed (or guard-rejected with parent-owned messaging) — done here.
      // Never close a modal that was reopened for a newer session.
      if (sessionRef.current === session) onClose();
    } catch (err) {
      console.error('Import failed:', err);
      if (sessionRef.current === session) {
        setParseError('Import failed. Please verify your CSV format and try again.');
      }
    } finally {
      if (sessionRef.current === session) setIsSubmitting(false);
    }
  };

  const resetAndBack = () => {
    setStep('upload');
    setIsInvalidFormat(false);
    setDataRows([]);
    setParseError(null);
  };

  const downloadSampleCSV = () => {
    const sample = `Company,Role,Platform,Work Location,Employment Type,Job Location,Date Applied,Status,Job Listing URL,Notes\nLinear,Frontend Engineer,LinkedIn,Hybrid,Full-time,"San Francisco, CA",2026-07-20,Interview,https://linear.app/careers,Referred by Sarah\nStripe,Full Stack Developer,Company Site,Remote,Contract,"Seattle, WA",2026-07-18,Applied,https://stripe.com/jobs,Applied via direct referral\nNotion,Product Designer,Otta,Onsite,Internship,"New York, NY",2026-07-15,Screening,,Recruiter call scheduled`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tracklet_sample_import.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Import CSV"
      maxWidthClassName="max-w-xl"
    >
      {/* Header — text only; the dropzone is the single visual anchor */}
      <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="font-heading font-bold text-sm text-slate-900">
            Import CSV
          </h2>
          <p className="text-xs text-slate-500 font-sans">
            Add your job applications from any spreadsheet in seconds.
          </p>
        </div>
        <CloseIconButton onClick={onClose} title="Close CSV import (Esc)" />
      </div>

      {/* Body */}
      <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
        {/* STEP 1: Choose CSV file */}
        {step === 'upload' && (
          <div className="space-y-3">
            <div
              className={[
                'csv-drop',
                showError ? 'is-error' : '',
                dragHover === 'valid' ? 'is-armed' : '',
                dragHover ? 'is-hover' : '',
              ].filter(Boolean).join(' ')}
              role="button"
              tabIndex={0}
              aria-label="Upload CSV: drop a file here, or press Enter to browse"
              onDragEnter={(e) => e.preventDefault()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                  e.target.value = '';
                }}
                accept=".csv, text/csv"
                className="hidden"
                onClick={(e) => e.stopPropagation()}
              />
              <CloudUpload size={32} strokeWidth={1.5} aria-hidden="true" />
              {showError ? (
                <>
                  <span className="font-semibold">Invalid format</span>
                  <span>Only .csv files are supported. Try again.</span>
                </>
              ) : (
                <>
                  <span>Drop your CSV here</span>
                  <span>or click to browse</span>
                </>
              )}
            </div>

            <p className="text-center text-xs text-slate-500">
              Need the format?{' '}
              <button
                type="button"
                onClick={downloadSampleCSV}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Download the sample CSV
              </button>
            </p>

            {parseError && (
              <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-[10px] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Preview & Confirm */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                <strong className="font-bold text-slate-900">{parsedApplications.length}</strong>{' '}
                valid application{parsedApplications.length === 1 ? '' : 's'} ready for import
              </span>
              <button
                type="button"
                onClick={resetAndBack}
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Change file
              </button>
            </div>

            {dataRows.length > 0 && parsedApplications.length === 0 && (
              <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-[10px] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  We couldn&apos;t match the Company or Role columns in this file. Rename those headers (for example &quot;Company&quot; and &quot;Role&quot;) and try again.
                </span>
              </div>
            )}

            {/* Table Preview */}
            <div className="border border-slate-200 rounded-[10px] overflow-hidden text-xs">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 sticky top-0 font-mono text-[11px] text-slate-600 uppercase">
                    <tr>
                      <th className="p-2.5">Company</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5">Platform</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {parsedApplications.map((app, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-bold text-slate-900">{app.company}</td>
                        <td className="p-2.5 text-slate-700">{app.role}</td>
                        <td className="p-2.5 text-slate-600">{app.platform}</td>
                        <td className="p-2.5 font-semibold text-slate-700">{app.status}</td>
                        <td className="p-2.5 font-mono text-slate-500 text-[11px]">{app.dateApplied}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {parseError && (
              <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-[10px] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {step === 'mapping' && (
        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={resetAndBack}
            className={UI_TOKENS.btnOutline}
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={isSubmitting || parsedApplications.length === 0}
            className={`${UI_TOKENS.btnPrimary} disabled:opacity-50`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                <span>Importing {parsedApplications.length} Entries...</span>
              </>
            ) : (
              <>
                <span>Import {parsedApplications.length} Applications</span>
              </>
            )}
          </button>
        </div>
      )}
    </Modal>
  );
};

/* ────────────────────────────────────────────────────────────────────────────
 * Row → Application mapping (pure, extracted from the render body)
 * ──────────────────────────────────────────────────────────────────────────── */

function mapRowToApp(
  row: string[],
  mapping: CSVFieldMapping
): Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'> | null {
  const company = mapping.company >= 0 ? row[mapping.company]?.trim() : '';
  const role = mapping.role >= 0 ? row[mapping.role]?.trim() : '';

  if (!company && !role) {
    return null; // Skip completely empty rows
  }

  const finalCompany = company || 'Unknown Company';
  const finalRole = role || 'Applicant';

  const platform = normalizeCSVPlatform(mapping.platform >= 0 ? row[mapping.platform] : '');
  const workLocation = normalizeCSVWorkLocation(mapping.workLocation >= 0 ? row[mapping.workLocation] : '');
  const employmentType = normalizeCSVEmploymentType(mapping.employmentType >= 0 ? row[mapping.employmentType] : '');
  const status = normalizeCSVStatus(mapping.status >= 0 ? row[mapping.status] : '');
  const dateApplied = normalizeCSVDate(mapping.dateApplied >= 0 ? row[mapping.dateApplied] : '');

  let jobLink = mapping.jobLink >= 0 ? row[mapping.jobLink]?.trim() : undefined;
  if (jobLink && !jobLink.startsWith('http://') && !jobLink.startsWith('https://')) {
    jobLink = `https://${jobLink}`;
  }

  let emailThreadUrl = mapping.emailThreadUrl >= 0 ? row[mapping.emailThreadUrl]?.trim() : undefined;
  if (emailThreadUrl && !emailThreadUrl.startsWith('http://') && !emailThreadUrl.startsWith('https://')) {
    emailThreadUrl = `https://${emailThreadUrl}`;
  }

  let notes = mapping.notes >= 0 ? row[mapping.notes]?.trim() : undefined;
  const contactEmail = mapping.contactEmail >= 0 ? row[mapping.contactEmail]?.trim() : undefined;
  const salary = mapping.salary >= 0 ? row[mapping.salary]?.trim() : undefined;
  const location = mapping.location >= 0 ? row[mapping.location]?.trim() : undefined;

  if (salary) {
    const extraStr = `Salary: ${salary}`;
    notes = notes ? `${notes}\n(${extraStr})` : extraStr;
  }

  let companyDomain: string | undefined = undefined;
  if (jobLink) {
    try {
      const host = new URL(jobLink).hostname.replace(/^www\./, '');
      if (host && host.includes('.')) {
        companyDomain = host;
      }
    } catch {
      // ignore domain extraction error
    }
  }

  const resumeFileName =
    mapping.resumeFileName != null && mapping.resumeFileName >= 0
      ? row[mapping.resumeFileName]?.trim()
      : undefined;

  return {
    company: finalCompany,
    companyDomain,
    role: finalRole,
    platform,
    workLocation: workLocation || undefined,
    employmentType: employmentType || undefined,
    location: location || undefined,
    dateApplied,
    status,
    jobLink: jobLink || undefined,
    emailThreadUrl: emailThreadUrl || undefined,
    contactEmail: contactEmail || undefined,
    notes: notes || undefined,
    resumeFileName: resumeFileName || undefined,
  };
}
