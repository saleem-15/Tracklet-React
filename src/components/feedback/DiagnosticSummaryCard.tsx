import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Laptop, AlertCircle } from 'lucide-react';
import { DiagnosticContext } from '../../types';

interface DiagnosticSummaryCardProps {
  diagnostics: DiagnosticContext;
  className?: string;
}

export const DiagnosticSummaryCard: React.FC<DiagnosticSummaryCardProps> = ({
  diagnostics,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const formattedJson = JSON.stringify(diagnostics, null, 2);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formattedJson);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy diagnostics:', err);
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200/90 bg-slate-50/70 overflow-hidden transition-all text-xs ${className}`}>
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors cursor-pointer select-none"
        aria-expanded={isExpanded}
        aria-label="Toggle system diagnostics details"
      >
        <div className="flex items-center gap-2 min-w-0 text-slate-700 font-medium">
          <Laptop className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="truncate">
            Auto-Detected Environment: <strong className="font-semibold text-slate-900">{diagnostics.browser}</strong> on {diagnostics.os}
          </span>
          {diagnostics.recentErrors.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              <AlertCircle className="w-3 h-3" />
              {diagnostics.recentErrors.length} error{diagnostics.recentErrors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy system diagnostics JSON to clipboard"
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] text-emerald-600 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {/* Expanded Details Body */}
      {isExpanded && (
        <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/80 bg-white/60 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-500 block text-[10px]">Viewport</span>
              <span className="font-mono font-medium text-slate-800">{diagnostics.viewport}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-500 block text-[10px]">Active View</span>
              <span className="font-mono font-medium text-slate-800">{diagnostics.activeTab}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-500 block text-[10px]">Auth Mode</span>
              <span className="font-mono font-medium text-slate-800">{diagnostics.authMode}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
              <span className="text-slate-500 block text-[10px]">App Version</span>
              <span className="font-mono font-medium text-slate-800">{diagnostics.appVersion}</span>
            </div>
          </div>

          {diagnostics.recentErrors.length > 0 && (
            <div className="mt-2">
              <span className="text-slate-500 block text-[11px] font-medium mb-1">Recent Client Errors (Sanitized):</span>
              <div className="space-y-1">
                {diagnostics.recentErrors.map((err, idx) => (
                  <div key={idx} className="p-1.5 rounded bg-rose-50/60 border border-rose-200/70 text-[11px] font-mono text-rose-800 break-all">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
