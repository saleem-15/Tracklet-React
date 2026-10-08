import React, { useState } from 'react';
import { 
  Download, 
  RefreshCw, 
  Copy, 
  Check, 
  ArrowRight, 
  RotateCw,
  FolderSync,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ExtensionStatus } from '../../types';
import { EXTENSION_DISTRIBUTION_CONFIG } from '../../lib/constants';
import { isUpdateAvailable } from '../../lib/versionUtils';

interface ExtensionUpdateGuideProps {
  installedVersion: string | null;
  latestVersion: string;
  status?: ExtensionStatus;
  onDownload?: () => void;
  onRecheck?: () => void;
  isChecking?: boolean;
}

export const ExtensionUpdateGuide: React.FC<ExtensionUpdateGuideProps> = ({
  installedVersion,
  latestVersion,
  status,
  onDownload,
  onRecheck,
  isChecking = false,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyChromeUrl = async () => {
    try {
      await navigator.clipboard.writeText(EXTENSION_DISTRIBUTION_CONFIG.chromeExtensionsUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // fallback
    }
  };

  const hasUpdate = status === 'update_available' || (Boolean(installedVersion) && isUpdateAvailable(installedVersion, latestVersion));
  const isUpToDate = status === 'connected' || (Boolean(installedVersion) && !isUpdateAvailable(installedVersion, latestVersion));

  return (
    <div className="space-y-4">
      {/* Version Status Card (Dynamic) */}
      {hasUpdate ? (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse motion-reduce:animate-none" />
              New Update Available
            </div>
            <div className="text-xs text-amber-700 mt-0.5">
              A newer version of the Tracklet Companion is ready to install.
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-mono shrink-0 shadow-2xs">
            <span className="text-slate-500 font-medium">v{installedVersion || '0.9.0'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-emerald-600 font-bold">v{latestVersion}</span>
          </div>
        </div>
      ) : isUpToDate ? (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Extension is Up to Date
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">
              You are running the latest version of Tracklet Companion.
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-mono shrink-0 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-700 font-bold">v{installedVersion || latestVersion}</span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-slate-500" />
              Extension Not Detected
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Make sure the extension is loaded in Chrome, then refresh this page (F5).
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono shrink-0 shadow-2xs">
            <span className="text-slate-500">Latest:</span>
            <span className="text-blue-600 font-bold">v{latestVersion}</span>
          </div>
        </div>
      )}

      {/* Step 1: Download & Overwrite Files */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
            1
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <FolderSync className="w-3.5 h-3.5 text-blue-600" />
              Download & Replace Files
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Download the updated package and extract the contents directly into your existing extension folder, replacing the older files. Your saved settings, sync status, and login session remain completely intact.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <a
                href={EXTENSION_DISTRIBUTION_CONFIG.localDownloadUrl}
                download={EXTENSION_DISTRIBUTION_CONFIG.downloadFilename}
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Update (.zip)
              </a>
              <span className="text-[11px] text-slate-500 font-mono">
                v{latestVersion}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Reload Extension in Chrome */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
            2
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 text-blue-600" />
              Click Reload on Tracklet Card
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Go to <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px] font-mono">chrome://extensions</code>, find the Tracklet extension card, and click the circular <strong>Reload (🔄)</strong> button. Then refresh this Tracklet page (<kbd className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono font-semibold">F5</kbd>) so the updated extension connects.
            </p>
            <div className="mt-2.5 flex items-center gap-2 max-w-md">
              <div className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 select-all truncate">
                {EXTENSION_DISTRIBUTION_CONFIG.chromeExtensionsUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyChromeUrl}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 ${
                  copiedUrl
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    Copy Address
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verify & Recheck Bar */}
      {onRecheck && (
        <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
          <span className="text-xs text-slate-500">
            Reloaded in Chrome already?
          </span>
          <button
            type="button"
            onClick={onRecheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            Recheck Extension Status
          </button>
        </div>
      )}
    </div>
  );
};
