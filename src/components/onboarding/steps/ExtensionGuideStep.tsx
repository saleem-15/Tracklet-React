import React from 'react';
import { 
  Puzzle, 
  CheckCircle2, 
  ExternalLink, 
  Pin,
  Command
} from 'lucide-react';
import { useExtensionContext } from '../../../context/ExtensionContext';

export interface ExtensionGuideStepProps {
  onBack?: () => void;
  onContinue?: () => void;
  onOpenExtensionModal?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const ExtensionGuideStep: React.FC<ExtensionGuideStepProps> = ({
  onOpenExtensionModal,
}) => {
  const extensionState = useExtensionContext();
  const isConnected = extensionState.status === 'connected';

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="text-center space-y-1 max-w-md mx-auto">
        <h2 className="text-lg sm:text-xl font-bold font-heading text-slate-900 tracking-tight">
          Browser Extension
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Save job postings directly from LinkedIn, Indeed, and ATS boards.
        </p>
      </div>

      {/* Visual Preview Mockup of Job Card with Non-interactive Quick Capture Diagram */}
      <div className="relative rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-slate-100/70 p-3.5 shadow-2xs overflow-hidden pointer-events-none select-none">
        {/* Simulated Job Board Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 text-[10px] sm:text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700">LinkedIn Job Post</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">linkedin.com/jobs/view/...</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
            Actively Hiring
          </span>
        </div>

        {/* Job Card Details */}
        <div className="pt-2.5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-slate-800">
            STR
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-baseline gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                Senior Frontend Engineer
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Stripe - San Francisco, CA (Remote)
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                $185,000 - $225,000 / yr
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Full-time
              </span>
            </div>
          </div>
        </div>

        {/* Non-interactive Quick Capture Diagram Overlay */}
        <div className="mt-3 bg-white/95 border border-slate-200 rounded-lg p-2 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
              <Puzzle className="w-3.5 h-3.5 stroke-[2]" />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-bold text-slate-900">
                Tracklet Quick Capture
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                Auto-extracts title, company, salary, and description
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-mono border border-slate-200">
            <span className="text-slate-500">Shortcut</span>
            <kbd className="bg-white text-slate-800 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-slate-300 shadow-2xs">
              Alt+S
            </kbd>
          </div>
        </div>
      </div>

      {/* Live Reactive Connection State */}
      {isConnected ? (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-emerald-950 font-heading">
                  Extension Connected
                </span>
                <span className="font-mono text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  v{extensionState.installedVersion || extensionState.latestVersion}
                </span>
              </div>
              <p className="text-xs text-emerald-800/90 font-sans mt-0.5">
                Your browser companion is synced with your cloud workspace.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60">
            <div className="bg-white/90 border border-emerald-200/80 rounded-lg p-2.5 space-y-0.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <Pin className="w-3.5 h-3.5 text-blue-600 stroke-[2]" />
                <span>Pin to Toolbar</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Click the puzzle icon in Chrome and pin Tracklet so it is always 1 click away.
              </p>
            </div>

            <div className="bg-white/90 border border-emerald-200/80 rounded-lg p-2.5 space-y-0.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <Command className="w-3.5 h-3.5 text-blue-600 stroke-[2]" />
                <span>Alt+S Shortcut</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Press <code className="bg-slate-100 px-1 py-0.2 rounded font-mono text-[10px] text-slate-800 font-bold">Alt+S</code> on any job post to scrape and clip into your pipeline.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
              <Puzzle className="w-4 h-4 stroke-[1.85]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-heading">
                Install in 2 Simple Steps
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Compatible with Chrome, Brave, Edge, and Arc.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
            <div className="flex items-start gap-2 text-xs text-slate-700">
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>
                Download and extract <strong>tracklet-extension.zip</strong> on your computer.
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-700">
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>
                Open <code className="bg-slate-200/80 px-1 py-0.2 rounded text-[10px] font-mono text-slate-800">chrome://extensions</code>, enable <strong>Developer mode</strong>, and click <strong>Load unpacked</strong>.
              </span>
            </div>
          </div>

          {onOpenExtensionModal && (
            <div className="pt-1.5 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60">
              <span>Need detailed step-by-step instructions?</span>
              <button
                type="button"
                onClick={onOpenExtensionModal}
                className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <span>Open Extension Guide</span>
                <ExternalLink className="w-3 h-3 stroke-[2]" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
