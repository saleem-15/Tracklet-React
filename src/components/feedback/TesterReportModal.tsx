import React, { useState, useEffect, useRef } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { TesterAttachment, AuthUser } from '../../types';
import { collectDiagnosticContext } from '../../lib/diagnosticUtils';
import { FeedbackRepository } from '../../lib/feedbackRepository';
import { AttachmentDropzone } from './AttachmentDropzone';
import { FeedbackSuccessState } from './FeedbackSuccessState';
import { FeedbackIntentSelector } from './FeedbackIntentSelector';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { useToastContext } from '../../context/ToastContext';
import { 
  extractReportTitle, 
  inferReportSeverity, 
  FEEDBACK_INTENTS, 
  FeedbackIntentId 
} from '../../lib/feedbackUtils';
import posthog from '../../lib/posthog';

interface TesterReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  user?: AuthUser | null;
}

// Hidden for now; attachments pipeline to be continued in a later phase
const ATTACHMENTS_ENABLED = false;

export const TesterReportModal: React.FC<TesterReportModalProps> = ({
  isOpen,
  onClose,
  activeTab = 'pipeline',
  user,
}) => {
  const { addToast } = useToastContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Form State
  const [intentId, setIntentId] = useState<FeedbackIntentId>('bug');
  const [message, setMessage] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [attachments, setAttachments] = useState<TesterAttachment[]>([]);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeIntent = FEEDBACK_INTENTS.find((i) => i.id === intentId) || FEEDBACK_INTENTS[0];
  const type = activeIntent.key;

  // Reset state & auto-focus on open
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setErrorMessage(null);
      setMessage('');
      setAttachments([]);

      if (user?.email) {
        setReporterEmail(user.email);
      } else {
        setReporterEmail('');
      }

      // Auto-focus textarea smoothly
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, user?.email]);

  const handleRequestClose = () => {
    FeedbackRepository.clearDraft();
    setMessage('');
    setAttachments([]);
    setErrorMessage(null);
    onClose();
  };

  useEscapeKey(handleRequestClose, isOpen);

  const diagnostics = collectDiagnosticContext({
    activeTab,
    user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    const trimmed = message.trim();
    if (trimmed.length < 5) {
      setErrorMessage('Please share a few details so we can assist you (at least 5 characters).');
      textareaRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const derivedTitle = extractReportTitle(trimmed, type, intentId);
      const computedSeverity = inferReportSeverity(type, trimmed, diagnostics);
      const resolvedName = user?.displayName || user?.email?.split('@')[0] || 'Tracklet User';
      const resolvedEmail = user?.email || reporterEmail.trim() || undefined;

      const savedReport = await FeedbackRepository.saveReport({
        type,
        title: derivedTitle,
        description: trimmed,
        severity: computedSeverity,
        reporterName: resolvedName,
        reporterEmail: resolvedEmail,
        diagnostics,
        attachments,
      });

      const dispatchResult = await FeedbackRepository.dispatchToApi(savedReport);
      if (!dispatchResult.success) {
        setErrorMessage(
          dispatchResult.error
            ? `Submission failed: ${dispatchResult.error.replace(/\.+$/, '')}. Your input is saved. Please retry.`
            : 'Failed to submit. Your input is preserved. Please retry.'
        );
        return;
      }

      FeedbackRepository.clearDraft();
      setIsSuccess(true);

      posthog.capture('feedback_report_submitted', {
        category: type,
        intent_id: intentId,
        severity: computedSeverity,
        has_attachments: attachments.length > 0,
        dispatch_succeeded: true,
      });

      if (dispatchResult.devMode) {
        addToast(
          'info',
          'Dev Simulation Mode',
          'Report logged locally. Set GITHUB_TOKEN to create real GitHub issues.'
        );
      } else {
        addToast('success', 'Feedback Sent', 'Thanks for helping make Tracklet better!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit report. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Larger, Confident Title */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <h2 id="feedback-dialog-title" className="text-lg font-bold text-slate-900 font-heading tracking-tight">
            Feedback & Support
          </h2>
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
        <div className="p-6 flex-1 overflow-y-auto">
          {isSuccess ? (
            <FeedbackSuccessState onClose={onClose} />
          ) : (
            <form id="feedback-report-form" onSubmit={handleSubmit} noValidate className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Pill Chips Category Selector */}
              <FeedbackIntentSelector selectedId={intentId} onSelect={setIntentId} />

              {/* Message Canvas with Label & Counter */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="feedback-message-textarea" className="block text-xs font-semibold text-slate-800">
                    Message
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {message.length} / 1000
                  </span>
                </div>
                <textarea
                  id="feedback-message-textarea"
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      const form = document.getElementById('feedback-report-form') as HTMLFormElement;
                      if (form) form.requestSubmit();
                    }
                  }}
                  placeholder={activeIntent.placeholder}
                  maxLength={1000}
                  rows={5}
                  className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all resize-y leading-relaxed"
                  required
                />
              </div>

              {/* Guest Email Field (Only if unauthenticated) */}
              {!user && (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Your Email <span className="text-slate-400 font-normal">(Optional for follow-up)</span>
                  </label>
                  <input
                    type="email"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                    placeholder="e.g., alex@company.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                  />
                </div>
              )}

              {/* Attachments tray (hidden for now; to be continued later) */}
              {ATTACHMENTS_ENABLED && (
                <AttachmentDropzone
                  attachments={attachments}
                  onAddAttachment={(att) => setAttachments((prev) => [...prev, att])}
                  onAddAttachments={(newAtts) => setAttachments((prev) => [...prev, ...newAtts])}
                  onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
                  disabled={isSubmitting}
                />
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="feedback-report-form"
              disabled={isSubmitting || message.trim().length === 0}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
