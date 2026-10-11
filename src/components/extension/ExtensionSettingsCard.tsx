import React from 'react';
import { 
  Puzzle, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { ExtensionState } from '../../types';
import { EXTENSION_DISTRIBUTION_CONFIG, EXTENSION_STATUS_CONFIG } from '../../lib/constants';

interface ExtensionSettingsCardProps {
  extensionState: ExtensionState;
  onOpenModal: () => void;
  onDownload?: () => void;
}

export const ExtensionSettingsCard: React.FC<ExtensionSettingsCardProps> = ({
  extensionState,
  onOpenModal,
  onDownload,
}) => {
  const { status, installedVersion, latestVersion, isChecking, recheck } = extensionState;
  const statusConfig = EXTENSION_STATUS_CONFIG[status];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-slate-300/80 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left Side: Brand icon, title, description */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <Puzzle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Tracklet Companion
              </h3>
              {/* Dynamic Status Badge */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                {status === 'connected' ? `Connected • v${installedVersion}` : statusConfig.label}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Persistent Chrome Side Panel for 1-click job clipping on LinkedIn, recruiter contact extraction, webmail interview logging, and ATS application autofill.
            </p>
          </div>
        </div>

        {/* Right Side: CTA Action Buttons */}
        <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            {status === 'update_available' ? (
              <>
                <span>Update Extension</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : status === 'connected' ? (
              <>
                <span>Shortcuts & Features</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Setup Guide</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <a
            href={EXTENSION_DISTRIBUTION_CONFIG.localDownloadUrl}
            download={EXTENSION_DISTRIBUTION_CONFIG.downloadFilename}
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download (.zip)
          </a>
        </div>
      </div>

      {/* Bottom Status / Diagnostic Bar */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-500">
          {status === 'connected' ? (
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Live cross-tab sync active (v{installedVersion})
            </span>
          ) : status === 'update_available' ? (
            <span className="flex items-center gap-1.5 text-amber-700 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Newer version available: v{latestVersion} (installed: v{installedVersion})
            </span>
          ) : (
            <span className="text-slate-500">
              Not detected on this browser tab. Run via Developer mode (Load unpacked).
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={recheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Ping extension to check connection status"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            Recheck
          </button>
          <span className="text-slate-300">•</span>
          <span className="text-[11px] text-slate-400 font-mono">
            Latest: v{latestVersion}
          </span>
        </div>
      </div>
    </div>
  );
};
