import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  X, 
  ArrowRight, 
  RefreshCw, 
  Sparkles,
  FileText,
  Table,
  Check,
  ChevronDown
} from 'lucide-react';
import { Application, ApplicationStatus, JobPlatform } from '../types';
import { CustomSelectDropdown, SelectOption } from './CustomSelectDropdown';
import { CloseIconButton } from './IconButton';
import { UI_TOKENS } from '../theme/tokens';
import { 
  parseRawCSV, 
  autoDetectFieldMapping, 
  CSVFieldMapping, 
  normalizeCSVStatus, 
  normalizeCSVPlatform, 
  normalizeCSVDate, 
  downloadSampleCSVTemplate 
} from '../lib/importCsv';

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => Promise<void>;
}

export const ImportCSVModal: React.FC<ImportCSVModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'success'>('upload');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CSVFieldMapping>({
    company: -1,
    role: -1,
    platform: -1,
    dateApplied: -1,
    status: -1,
    jobLink: -1,
    notes: -1,
    contactEmail: -1,
    location: -1,
    salary: -1,
  });

  const [parseError, setParseError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processCSVContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processCSVContent = (content: string) => {
    const parsed = parseRawCSV(content);
    if (parsed.length < 2) {
      alert('CSV file must contain a header row and at least one data row.');
      return;
    }

    const detectedHeaders = parsed[0];
    const rows = parsed.slice(1);

    setHeaders(detectedHeaders);
    setDataRows(rows);
    setRawRows(parsed);

    const autoMapping = autoDetectFieldMapping(detectedHeaders);
    setMapping(autoMapping);
    setStep('mapping');
  };

  const handlePasteSubmit = () => {
    if (!csvText.trim()) {
      alert('Please paste valid CSV content.');
      return;
    }
    processCSVContent(csvText);
  };

  const mapRowToApp = (
    row: string[]
  ): Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'> | null => {
    const company = mapping.company >= 0 ? row[mapping.company]?.trim() : '';
    const role = mapping.role >= 0 ? row[mapping.role]?.trim() : '';

    if (!company && !role) {
      return null; // Skip completely empty rows
    }

    const finalCompany = company || 'Unknown Company';
    const finalRole = role || 'Applicant';

    const rawPlatform = mapping.platform >= 0 ? row[mapping.platform] : '';
    const platform = normalizeCSVPlatform(rawPlatform);

    const rawStatus = mapping.status >= 0 ? row[mapping.status] : '';
    const status = normalizeCSVStatus(rawStatus);

    const rawDate = mapping.dateApplied >= 0 ? row[mapping.dateApplied] : '';
    const dateApplied = normalizeCSVDate(rawDate);

    let jobLink = mapping.jobLink >= 0 ? row[mapping.jobLink]?.trim() : undefined;
    if (jobLink && !jobLink.startsWith('http://') && !jobLink.startsWith('https://')) {
      jobLink = `https://${jobLink}`;
    }

    let notes = mapping.notes >= 0 ? row[mapping.notes]?.trim() : undefined;
    const contactEmail = mapping.contactEmail >= 0 ? row[mapping.contactEmail]?.trim() : undefined;
    const salary = mapping.salary >= 0 ? row[mapping.salary]?.trim() : undefined;
    const location = mapping.location >= 0 ? row[mapping.location]?.trim() : undefined;

    const extraDetails: string[] = [];
    if (location) extraDetails.push(`Location: ${location}`);
    if (salary) extraDetails.push(`Salary: ${salary}`);
    if (extraDetails.length > 0) {
      const extraStr = extraDetails.join(' | ');
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

    return {
      company: finalCompany,
      companyDomain,
      role: finalRole,
      platform,
      dateApplied,
      status,
      jobLink: jobLink || undefined,
      contactEmail: contactEmail || undefined,
      notes: notes || undefined,
    };
  };

  const parsedApplications = dataRows
    .map(mapRowToApp)
    .filter((app): app is Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'> => app !== null);

  const handleExecuteImport = async () => {
    if (parsedApplications.length === 0) {
      alert('No valid applications detected to import.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onImport(parsedApplications);
      setImportedCount(parsedApplications.length);
      setStep('success');
    } catch (err) {
      console.error('Import failed:', err);
      alert('Import failed. Please verify your CSV format and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setStep('upload');
    setCsvText('');
  };

  const downloadSampleCSV = () => {
    const sample = `Company,Role,Platform,Date Applied,Status,Job Listing URL,Notes\nLinear,Frontend Engineer,LinkedIn,2026-07-20,Interview,https://linear.app/careers,Referred by Sarah\nStripe,Full Stack Developer,Company Site,2026-07-18,Applied,https://stripe.com/jobs,Applied via direct referral\nNotion,Product Designer,Otta,2026-07-15,Screening,,Recruiter call scheduled`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tracklet_sample_import.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`w-full max-w-2xl ${UI_TOKENS.modal} overflow-hidden flex flex-col my-auto text-slate-900 animate-in zoom-in-95 duration-150`}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs shrink-0">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                Import Applications via CSV
                <span className="font-mono text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                  Batch Upload
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-sans">
                Quickly migrate existing job tracking spreadsheets into Tracklet
              </p>
            </div>
          </div>
          <CloseIconButton onClick={onClose} title="Close CSV import (Esc)" />
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* STEP 1: Upload or Paste CSV */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Toggle Switch: Upload File vs Paste Text */}
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-[10px]">
                <button
                  type="button"
                  onClick={() => setPasteMode(false)}
                  className={`flex-1 py-1.5 px-3 rounded-[8px] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    !pasteMode
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Upload CSV File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPasteMode(true)}
                  className={`flex-1 py-1.5 px-3 rounded-[8px] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    pasteMode
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Paste CSV Text</span>
                </button>
              </div>

              {!pasteMode ? (
                /* Drag and drop box */
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv, .txt, text/csv"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-[12px] bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">
                      Click to upload or drag & drop your CSV file
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      Supports .csv format with headers (Company, Role, Platform, Date Applied, Status, etc.)
                    </p>
                  </div>
                </div>
              ) : (
                /* Textarea paste mode */
                <div className="space-y-2">
                  <label className="block text-xs font-mono font-medium text-slate-600 uppercase tracking-wider">
                    Paste CSV Raw Text:
                  </label>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Company,Role,Platform,Date Applied,Status,Job Listing URL&#10;Linear,Frontend Engineer,LinkedIn,2026-07-20,Interview,https://linear.app/careers&#10;Stripe,Full Stack,Company Site,2026-07-18,Applied,https://stripe.com/jobs"
                    rows={7}
                    className="w-full font-mono text-xs p-3 rounded-[10px] border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handlePasteSubmit}
                    disabled={!csvText.trim()}
                    className={`w-full ${UI_TOKENS.btnPrimary} disabled:opacity-50`}
                  >
                    <span>Parse CSV Text</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Sample Template Download Bar */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-[10px] p-3 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Don't have a CSV formatted yet?</span>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleCSV}
                  className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {parseError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-[10px] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Preview & Confirm */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-[10px] p-3 flex items-center justify-between text-xs text-blue-900 font-medium">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Parsed {parsedApplications.length} valid job applications ready for import!</span>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs text-blue-700 hover:underline cursor-pointer font-semibold"
                >
                  Change File
                </button>
              </div>

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
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{app.company}</td>
                          <td className="p-2.5 font-medium">{app.role}</td>
                          <td className="p-2.5">
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
                              {app.platform}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-slate-700">{app.status}</td>
                          <td className="p-2.5 font-mono text-slate-500 text-[11px]">{app.dateApplied}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Success Screen */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Import Successful!</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Successfully imported <strong className="text-emerald-700 font-bold">{importedCount}</strong> new job application records into Tracklet.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
                >
                  <span>Done & Close</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {step === 'mapping' && (
          <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs transition-all cursor-pointer"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isSubmitting || parsedApplications.length === 0}
              className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                  <span>Importing {parsedApplications.length} Entries...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Import {parsedApplications.length} Applications</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
