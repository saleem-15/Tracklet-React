import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Puzzle, 
  RefreshCw 
} from 'lucide-react';
import { ExtensionState } from '../../types';
import { EXTENSION_DISTRIBUTION_CONFIG, EXTENSION_STATUS_CONFIG } from '../../lib/constants';
import { ExtensionInstallGuide } from './ExtensionInstallGuide';
import { ExtensionUpdateGuide } from './ExtensionUpdateGuide';
import { ExtensionFeaturesGuide } from './ExtensionFeaturesGuide';

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  extensionState: ExtensionState;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

type TabType = 'install' | 'update' | 'features';

export const ExtensionModal: React.FC<ExtensionModalProps> = ({
  isOpen,
  onClose,
  extensionState,
  onShowToast,
}) => {
  const { status, installedVersion, latestVersion, isChecking, recheck } = extensionState;

  // Determine initial tab based on extension state
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (status === 'update_available') return 'update';
    if (status === 'connected') return 'features';
    return 'install';
  });

  // Reset active tab to sensible default only when modal transitions from closed to open
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (!wasOpen && isOpen) {
      if (status === 'update_available') {
        setActiveTab('update');
      } else if (status === 'connected') {
        setActiveTab('features');
      } else {
        setActiveTab('install');
      }
    }
  }, [isOpen, status]);

  // Handle Escape key dismissal (Mandatory rule from AGENTS.md)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const statusConfig = EXTENSION_STATUS_CONFIG[status];

  const handleDownloadInitiated = () => {
    onShowToast?.(
      'info',
      'Download Started',
      `Downloading ${EXTENSION_DISTRIBUTION_CONFIG.downloadFilename} (v${latestVersion}).`
    );
  };

  const handleManualRecheck = async () => {
    const prevStatus = status;
    const outcome = await recheck();

    if (outcome.status === 'connected') {
      if (prevStatus === 'update_available') {
        onShowToast?.(
          'success',
          'Extension Updated!',
          `Tracklet Companion has been successfully updated to v${latestVersion}.`
        );
      } else {
        onShowToast?.('success', 'Connected', `Tracklet Companion v${latestVersion} is connected and ready.`);
      }
    } else if (outcome.status === 'update_available') {
      onShowToast?.(
        'info',
        'Update Still Pending',
        `Installed version is still v${outcome.version || 'older'}. Make sure to reload the extension in chrome://extensions.`
      );
    } else {
      onShowToast?.(
        'info',
        'Status Checked',
        'Tracklet extension was not detected. Make sure it is loaded in Chrome and refresh this page.'
      );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="extension-modal-title"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <Puzzle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 id="extension-modal-title" className="text-sm font-bold text-slate-900 truncate">
                  Tracklet Companion
                </h3>
                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.badgeClass} shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                  {status === 'connected' ? `Connected • v${installedVersion}` : statusConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Chrome Side Panel for 1-click job clipping & ATS autofill
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200/60 bg-slate-50/50 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('install')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'install'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Setup Guide
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('update')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'update'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span>Update Guide</span>
            {status === 'update_available' && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse motion-reduce:animate-none" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'features'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            Shortcuts & Features
          </button>
        </div>

        {/* Tab Body Container */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {activeTab === 'install' && (
            <ExtensionInstallGuide onDownload={handleDownloadInitiated} />
          )}

          {activeTab === 'update' && (
            <ExtensionUpdateGuide
              installedVersion={installedVersion}
              latestVersion={latestVersion}
              status={status}
              onDownload={handleDownloadInitiated}
              onSwitchToInstall={() => setActiveTab('install')}
            />
          )}

          {activeTab === 'features' && (
            <ExtensionFeaturesGuide />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleManualRecheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Ping extension to recheck active connection"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
