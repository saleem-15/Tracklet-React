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
    setFileName(null);
    setRawRows([]);
    setHeaders([]);
    setDataRows([]);
    setImportedCount(0);
    setPasteMode(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto text-slate-900 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Import Applications from CSV</span>
                <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">
                  Batch Import
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Bulk upload job postings from LinkedIn, Excel, or custom CSV exports.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* STEP 1: Upload or Paste CSV */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Toggle Switch: Upload File vs Paste Text */}
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPasteMode(false)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
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
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
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
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-xs">
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
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handlePasteSubmit}
                    disabled={!csvText.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Parse CSV Text</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Sample Template Download Bar */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-sans">Need a starting structure?</span>
                <button
                  type="button"
                  onClick={downloadSampleCSVTemplate}
                  className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Field Mapping & Live Preview */}
          {step === 'mapping' && (
            <div className="space-y-5">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-blue-900 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Detected <strong>{headers.length}</strong> columns and <strong>{dataRows.length}</strong> application records from {fileName || 'CSV'}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetModal}
                  className="font-mono text-[11px] text-blue-700 hover:text-blue-900 underline cursor-pointer shrink-0"
                >
                  Change File
                </button>
              </div>

              {/* Header Selector Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-blue-600" />
                  <span>Map CSV Columns to Tracklet Fields</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  {/* Company */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-700 font-bold mb-1">
                      Company Name <span className="text-rose-500">*</span>
                    </label>
                    <CustomSelectDropdown<number>
                      value={mapping.company}
                      onChange={(val) => setMapping((m) => ({ ...m, company: val }))}
                      options={[
                        { label: '-- Not Mapped --', value: -1 },
                        ...headers.map((h, idx) => ({ label: h, value: idx })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-700 font-bold mb-1">
                      Role / Position <span className="text-rose-500">*</span>
                    </label>
                    <CustomSelectDropdown<number>
                      value={mapping.role}
                      onChange={(val) => setMapping((m) => ({ ...m, role: val }))}
                      options={[
                        { label: '-- Not Mapped --', value: -1 },
                        ...headers.map((h, idx) => ({ label: h, value: idx })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Platform */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 font-medium mb-1">
                      Platform / Source
                    </label>
                    <CustomSelectDropdown<number>
                      value={mapping.platform}
                      onChange={(val) => setMapping((m) => ({ ...m, platform: val }))}
                      options={[
                        { label: '-- Default: LinkedIn --', value: -1 },
                        ...headers.map((h, idx) => ({ label: h, value: idx })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 font-medium mb-1">
                      Application Status
                    </label>
                    <CustomSelectDropdown<number>
                      value={mapping.status}
                      onChange={(val) => setMapping((m) => ({ ...m, status: val }))}
                      options={[
                        { label: '-- Default: Applied --', value: -1 },
                        ...headers.map((h, idx) => ({ label: h, value: idx })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Date Applied */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 font-medium mb-1">
                      Date Applied
                    </label>
                    <CustomSelectDropdown<number>
                      value={mapping.dateApplied}
                      onChange={(val) => setMapping((m) => ({ ...m, dateApplied: val }))}
                      options={[
                        { label: "-- Default: Today's Date --", value: -1 },
                        ...headers.map((h, idx) => ({ label: h, value: idx })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Job Listing URL */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 font-medium mb-1">
                      Job Listing URL
                    </label>
                    <CustomSelectDropdown<number>
                      value={mapping.jobLink}
                      onChange={(val) => setMapping((m) => ({ ...m, jobLink: val }))}
                      options={[
                        { label: '-- Not Mapped --', value: -1 },
                        ...headers.map((h, idx) => ({ label: h, value: idx })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 font-medium mb-1">
                      Notes / Comments
                    </label>
                    <CustomSelectDropdown<number>
                      value={mapping.notes}
                      onChange={(val) => setMapping((m) => ({ ...m, notes: val }))}
                      options={[
                        { label: '-- Not Mapped --', value: -1 },
                        ...headers.map((h, idx) => ({ label: h, value: idx })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label className="block text-[11px] font-mono text-slate-600 font-medium mb-1">
                      Contact Email
                    </label>
                    <CustomSelectDropdown<number>
                      value={mapping.contactEmail}
                      onChange={(val) => setMapping((m) => ({ ...m, contactEmail: val }))}
                      options={[
                        { label: '-- Not Mapped --', value: -1 },
                        ...headers.map((h, idx) => ({ label: h, value: idx })),
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Live Parsed Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
                    Parsed Sample Preview (First 5 Items)
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    Total Valid to Import: <strong className="text-blue-600 font-bold">{parsedApplications.length}</strong>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-mono text-[11px]">
                        <th className="py-2 px-3">Company</th>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Platform</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Date Applied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedApplications.slice(0, 5).map((app, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-semibold text-slate-900">{app.company}</td>
                          <td className="py-2 px-3 text-slate-700">{app.role}</td>
                          <td className="py-2 px-3 font-mono text-slate-500">{app.platform}</td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
                              {app.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-500">{app.dateApplied}</td>
                        </tr>
                      ))}
                      {parsedApplications.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                            No valid records parsed yet. Please check your mapping options.
                          </td>
                        </tr>
                      )}
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
                  <RefreshCw className="w-4 h-4 animate-spin" />
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
