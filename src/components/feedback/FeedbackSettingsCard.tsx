import React, { useState } from 'react';
import { Bug, Copy, Check, ExternalLink, Laptop, ShieldCheck } from 'lucide-react';
import { collectDiagnosticContext } from '../../lib/diagnosticUtils';
import { AuthUser } from '../../types';
import { useToastContext } from '../../context/ToastContext';

interface FeedbackSettingsCardProps {
  onOpenReportModal: () => void;
  user?: AuthUser | null;
}

export const FeedbackSettingsCard: React.FC<FeedbackSettingsCardProps> = ({
  onOpenReportModal,
  user,
}) => {
  const { addToast } = useToastContext();
  const [isCopied, setIsCopied] = useState(false);

  const diagnostics = collectDiagnosticContext({
    activeTab: 'settings',
    user,
  });

  const handleCopyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      setIsCopied(true);
      addToast('info', 'Diagnostics Copied', 'System diagnostics copied to clipboard.');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.warn('Could not copy diagnostics:', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
      <div className="p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 shrink-0">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                Beta Feedback & Issue Reporting
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Found a bug, visual glitch, or have an idea? Help us polish Tracklet.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenReportModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Bug className="w-4 h-4" />
            <span>Report an Issue</span>
          </button>
        </div>

        {/* Diagnostic Snapshot Bar */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 min-w-0">
            <Laptop className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">
              Detected Client: <strong className="font-semibold text-slate-900">{diagnostics.browser}</strong> on {diagnostics.os} ({diagnostics.viewport})
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyDiagnostics}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100/80 text-slate-700 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="Copy system diagnostics JSON to clipboard"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Diagnostics Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Diagnostics</span>
              </>
            )}
          </button>
        </div>

        {/* Privacy Note */}
        <div className="flex items-start gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Diagnostic capture strictly omits personal resumes, candidate notes, and authentication credentials.
          </span>
        </div>
      </div>
    </div>
  );
};
