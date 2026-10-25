import React, { useState } from 'react';
import { TooltipVariant } from '../lib/tooltipUtils';

interface TooltipLabSwitcherProps {
  variant: TooltipVariant;
  onVariantChange: (variant: TooltipVariant) => void;
}

export const TooltipLabSwitcher: React.FC<TooltipLabSwitcherProps> = ({
  variant,
  onVariantChange,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const currentPort = typeof window !== 'undefined' ? window.location.port : '';

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        aria-label="Open Tooltip Lab Switcher"
        className="fixed bottom-3 right-3 z-[9998] p-2 bg-slate-900/90 text-slate-300 hover:text-white rounded-full border border-slate-700/70 shadow-lg text-xs backdrop-blur-md transition-colors"
        title="Open Tooltip Lab Switcher"
      >
        ✨
      </button>
    );
  }

  return (
    <aside
      aria-label="Tooltip Design Lab"
      className="fixed bottom-3 right-3 z-[9998] flex items-center gap-2 px-3 py-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-xl shadow-slate-950/40 text-xs font-sans text-slate-200 pointer-events-auto"
    >
      <div className="flex items-center gap-1.5 font-medium text-slate-400">
        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          Tooltip Lab
        </span>
      </div>

      <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/50">
        <button
          type="button"
          onClick={() => onVariantChange('a')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
            variant === 'a'
              ? 'bg-blue-600 text-white shadow-2xs font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Variant A (Floating Island)
        </button>
        <button
          type="button"
          onClick={() => onVariantChange('b')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
            variant === 'b'
              ? 'bg-blue-600 text-white shadow-2xs font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Variant B (Micro-Caret)
        </button>
      </div>

      {currentPort && (
        <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 pl-1 border-l border-slate-700/60">
          <span>Server:</span>
          {currentPort === '3005' ? (
            <a
              href="http://localhost:3007/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline font-mono"
              title="Open Port 3007 (Variant B Server) in new tab"
            >
              Open 3007 ↗
            </a>
          ) : (
            <a
              href="http://localhost:3005/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline font-mono"
              title="Open Port 3005 (Variant A Server) in new tab"
            >
              Open 3005 ↗
            </a>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsMinimized(true)}
        aria-label="Minimize Tooltip Lab Switcher"
        className="ml-1 text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
      >
        ✕
      </button>
    </aside>
  );
};
