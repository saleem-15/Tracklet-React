import React from 'react';
import { Puzzle } from 'lucide-react';
import { ExtensionState } from '../../types';
import { EXTENSION_STATUS_CONFIG } from '../../lib/constants';

interface ExtensionStatusBadgeProps {
  extensionState: ExtensionState;
  onClick: () => void;
  className?: string;
}

export const ExtensionStatusBadge: React.FC<ExtensionStatusBadgeProps> = ({
  extensionState,
  onClick,
  className = '',
}) => {
  const { status, installedVersion, latestVersion } = extensionState;
  const config = EXTENSION_STATUS_CONFIG[status];

  const getTooltip = () => {
    switch (status) {
      case 'connected':
        return `Tracklet Companion v${installedVersion} Connected — Click for shortcuts & settings`;
      case 'update_available':
        return `New update v${latestVersion} available! Click to update`;
      case 'checking':
        return 'Checking browser extension status...';
      case 'not_installed':
      default:
        return 'Tracklet Chrome Extension — Click to download & install';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={getTooltip()}
      aria-label="Browser Extension Status"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-2xs ${
        status === 'update_available'
          ? 'bg-amber-50/90 text-amber-800 border-amber-300 hover:bg-amber-100/90 hover:border-amber-400'
          : status === 'connected'
          ? 'bg-emerald-50/70 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100/80'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
      } ${className}`}
    >
      <Puzzle className={`w-3.5 h-3.5 shrink-0 ${
        status === 'connected' 
          ? 'text-emerald-600' 
          : status === 'update_available' 
          ? 'text-amber-600' 
          : 'text-slate-500'
      }`} />

      {/* Status indicator dot */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />

      {/* Dynamic text label */}
      <span className="hidden md:inline font-sans">
        {status === 'connected' ? (
          <>
            <span>Extension</span>
            <span className="font-mono text-[11px] text-emerald-700 ml-1 font-bold">
              v{installedVersion}
            </span>
          </>
        ) : status === 'update_available' ? (
          <span className="font-bold text-amber-900">
            Update Ready
          </span>
        ) : (
          <span>Extension</span>
        )}
      </span>

      {/* Compact mobile/tablet label */}
      <span className="inline md:hidden">
        {status === 'update_available' ? 'Update' : 'Ext'}
      </span>
    </button>
  );
};
