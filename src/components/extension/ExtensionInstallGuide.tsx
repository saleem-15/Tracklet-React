import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  FolderArchive, 
  Sliders, 
  Puzzle
} from 'lucide-react';
import { EXTENSION_DISTRIBUTION_CONFIG } from '../../lib/constants';

interface ExtensionInstallGuideProps {
  onDownload?: () => void;
}

export const ExtensionInstallGuide: React.FC<ExtensionInstallGuideProps> = ({ onDownload }) => {
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

  return (
    <div className="space-y-4">
      {/* Step 1: Download & Extract */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
            1
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
              Download & Extract Archive
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Download the Tracklet Companion archive and unzip it into a folder on your computer (e.g. inside your Documents folder). Keep this folder intact.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={EXTENSION_DISTRIBUTION_CONFIG.localDownloadUrl}
                download={EXTENSION_DISTRIBUTION_CONFIG.downloadFilename}
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Extension (.zip)
              </a>
              <span className="text-[11px] text-slate-500 font-mono">
                v{EXTENSION_DISTRIBUTION_CONFIG.latestVersion}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Open Extensions Page */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
            2
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              Open Extensions Manager
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Open the extensions manager in Chrome, Edge, Brave, or Arc. Chromium security blocks web pages from navigating directly to settings, so copy and paste this URL into a new tab:
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

      {/* Step 3: Load Unpacked */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 transition-colors">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
            3
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Puzzle className="w-3.5 h-3.5 text-blue-600" />
              Toggle Developer Mode & Load Unpacked
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              In the top-right corner of the Extensions page, switch <strong className="text-slate-800">Developer mode</strong> ON. Then click <strong className="text-slate-800">Load unpacked</strong> (top left) and select the unzipped directory containing <code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px] font-mono">manifest.json</code>. Once loaded, click <strong>Check Connection</strong> in the modal footer below.
            </p>
            <div className="mt-3 p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-lg text-xs text-blue-900 flex items-center gap-2">
              <span className="text-base shrink-0">💡</span>
              <div className="flex-1 leading-relaxed">
                <strong>Pro tip:</strong> Pin Tracklet in your browser toolbar, then press{' '}
                <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200/90 text-[11px] font-semibold text-blue-950 shadow-2xs">Alt</kbd>
                {' + '}
                <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200/90 text-[11px] font-semibold text-blue-950 shadow-2xs">Shift</kbd>
                {' + '}
                <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200/90 text-[11px] font-semibold text-blue-950 shadow-2xs">A</kbd>
                {' '}to dock the Side Panel anytime!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
