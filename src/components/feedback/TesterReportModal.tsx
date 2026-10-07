import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Bug, 
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { 
  TesterReportCategory, 
  TesterReportSeverity, 
  TesterAttachment, 
  AuthUser 
} from '../../types';
import { 
  TESTER_REPORT_CATEGORIES, 
  TESTER_REPORT_SEVERITIES 
} from '../../lib/constants';
import { CustomSelectDropdown, SelectOption } from '../CustomSelectDropdown';
import { collectDiagnosticContext } from '../../lib/diagnosticUtils';
import { FeedbackRepository } from '../../lib/feedbackRepository';
import { DiagnosticSummaryCard } from './DiagnosticSummaryCard';
import { AttachmentDropzone } from './AttachmentDropzone';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { useToastContext } from '../../context/ToastContext';

interface TesterReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  user?: AuthUser | null;
}

export const TesterReportModal: React.FC<TesterReportModalProps> = ({
  isOpen,
  onClose,
  activeTab = 'pipeline',
  user,
}) => {
  const { addToast } = useToastContext();

  // Form State
  const [type, setType] = useState<TesterReportCategory>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<TesterReportSeverity>('medium');
  const [reporterName, setReporterName] = useState(user?.displayName || '');
  const [reporterEmail, setReporterEmail] = useState(user?.email || '');
  const [attachments, setAttachments] = useState<TesterAttachment[]>([]);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [submittedIssueNumber, setSubmittedIssueNumber] = useState<number | null>(null);
  const [submittedIssueUrl, setSubmittedIssueUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Load draft on mount / open
  useEffect(() => {
    if (isOpen) {
      setSubmittedReportId(null);
      setSubmittedIssueNumber(null);
      setSubmittedIssueUrl(null);
      setErrorMessage(null);
      setShowDiscardConfirm(false);

      const draft = FeedbackRepository.loadDraft();
      if (draft) {
        if (draft.type) setType(draft.type);
        if (draft.title) setTitle(draft.title);
        if (draft.description) setDescription(draft.description);
        if (draft.severity) setSeverity(draft.severity);
        if (draft.reporterName) setReporterName(draft.reporterName);
        if (draft.reporterEmail) setReporterEmail(draft.reporterEmail);
      } else {
        if (user?.displayName && !reporterName) setReporterName(user.displayName);
        if (user?.email && !reporterEmail) setReporterEmail(user.email);
      }
    }
  }, [isOpen, user]);

  // Auto-save draft on changes
  useEffect(() => {
    if (isOpen && !submittedReportId) {
      FeedbackRepository.saveDraft({
        type,
        title,
        description,
        severity,
        reporterName,
        reporterEmail,
      });
    }
  }, [isOpen, type, title, description, severity, reporterName, reporterEmail, submittedReportId]);

  const isDirty = Boolean(title.trim() || description.trim() || attachments.length > 0);

  const handleRequestClose = () => {
    if (isDirty && !submittedReportId) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  useEscapeKey(handleRequestClose, isOpen);

  const categoryOptions: SelectOption<TesterReportCategory>[] = TESTER_REPORT_CATEGORIES.map((c) => ({
    label: c.label,
    value: c.value,
  }));

  const diagnostics = collectDiagnosticContext({
    activeTab,
    user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (trimmedTitle.length < 3) {
      setErrorMessage('Please enter an issue summary (at least 3 characters).');
      return;
    }
    if (trimmedDesc.length < 10) {
      setErrorMessage('Please describe the issue or steps to reproduce (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const savedReport = await FeedbackRepository.saveReport({
        type,
        title: trimmedTitle,
        description: trimmedDesc,
        severity,
        reporterName: reporterName.trim() || undefined,
        reporterEmail: reporterEmail.trim() || undefined,
        diagnostics,
        attachments,
      });

      // Dispatch to Vercel Serverless / GitHub
      const dispatchResult = await FeedbackRepository.dispatchToApi(savedReport);

      setSubmittedReportId(savedReport.id);
      if (dispatchResult.success && dispatchResult.issueNumber) {
        setSubmittedIssueNumber(dispatchResult.issueNumber);
        setSubmittedIssueUrl(dispatchResult.issueUrl || null);
      } else if (dispatchResult.issueUrl) {
        setSubmittedIssueUrl(dispatchResult.issueUrl);
      } else if (dispatchResult.fallbackUrl) {
        setSubmittedIssueUrl(dispatchResult.fallbackUrl);
      }

      addToast(
        'success',
        'Report Submitted',
        `Thanks for testing Tracklet! Logged as ${savedReport.id}.`
      );
    } catch (err) {
      console.error('Failed submitting report:', err);
      setErrorMessage('Failed to submit report. Your typed text is preserved. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Report Issue or Feedback"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Report an Issue or Feedback
              </h2>
              <p className="text-xs text-slate-500">
                Help us polish Tracklet during beta testing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {submittedReportId ? (
            /* Success Receipt State */
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Thank You for Your Feedback!</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Your report has been securely logged with diagnostic details.
                </p>
                <div className="inline-block mt-2 px-3 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs font-semibold">
                  Reference: {submittedReportId}
                </div>
              </div>

              {submittedIssueNumber ? (
                <div className="pt-2 flex flex-col items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>GitHub Issue #{submittedIssueNumber} Created</span>
                  </div>
                  {submittedIssueUrl && (
                    <a
                      href={submittedIssueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-2xs transition-all"
                    >
                      <span>View Issue #{submittedIssueNumber} on GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : submittedIssueUrl ? (
                <div className="pt-2 flex flex-col items-center gap-2">
                  <p className="text-2xs text-slate-500">
                    Automated GitHub sync not configured. You can submit directly via GitHub Issues:
                  </p>
                  <a
                    href={submittedIssueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-2xs transition-all"
                  >
                    <span>Open Pre-filled GitHub Issue</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : null}

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Return to Testing
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <form id="tester-report-form" onSubmit={handleSubmit} noValidate className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Category & Severity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelectDropdown
                    value={type}
                    onChange={(val) => setType(val as TesterReportCategory)}
                    options={categoryOptions}
                    size="sm"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Severity <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TESTER_REPORT_SEVERITIES.map((sev) => (
                      <button
                        key={sev.value}
                        type="button"
                        onClick={() => setSeverity(sev.value)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          severity === sev.value
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dotColor}`} />
                        <span>{sev.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Issue Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Kanban card disappears after drag-and-drop"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                  maxLength={120}
                  required
                />
              </div>

              {/* Description textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  What happened? Steps to reproduce <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what occurred, what you expected, or any specific actions that triggered the issue..."
                  rows={4}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all resize-y"
                  required
                />
              </div>

              {/* Optional Reporter Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="e.g., Alex"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:border-blue-500 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Email <span className="text-slate-400 font-normal">(Optional for follow-up)</span>
                  </label>
                  <input
                    type="email"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                    placeholder="e.g., alex@test.com"
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:border-blue-500 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              {/* Screenshots dropzone */}
              <AttachmentDropzone
                attachments={attachments}
                onAddAttachment={(att) => setAttachments((prev) => [...prev, att])}
                onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
                disabled={isSubmitting}
              />

              {/* Diagnostics Accordion */}
              <DiagnosticSummaryCard diagnostics={diagnostics} />
            </form>
          )}
        </div>

        {/* Footer */}
        {!submittedReportId && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Draft is auto-saved locally
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="tester-report-form"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Discard confirmation dialog */}
      {showDiscardConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Discard changes?</h3>
            <p className="text-xs text-slate-600">
              You have typed content in your report. Your draft is saved, but do you want to close this window now?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-medium cursor-pointer hover:bg-rose-700"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
