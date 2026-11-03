import React from 'react';
import { ShieldCheck, ExternalLink, AlertCircle } from 'lucide-react';

interface LegacyMigrationScreenProps {
  destinationUrl?: string;
}

export const LegacyMigrationScreen: React.FC<LegacyMigrationScreenProps> = ({
  destinationUrl = 'https://tracklet.pages.dev',
}) => {
  const handleNavigate = () => {
    try {
      const parsedTarget = new URL(destinationUrl);
      // Preserve deep link path and hash if visitor arrived at a specific route
      parsedTarget.pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete('demo');
      const searchStr = searchParams.toString();
      parsedTarget.search = searchStr ? `?${searchStr}` : '';
      parsedTarget.hash = window.location.hash;
      window.location.href = parsedTarget.toString();
    } catch {
      window.location.href = destinationUrl;
    }
  };

  return (
    <div
      role="region"
      aria-label="Domain migration required"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 p-4 sm:p-6 select-text overflow-y-auto"
    >
      {/* Main Single-Container Migration Canvas */}
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-4">
          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Domain Migration Notice</span>
        </div>

        {/* Heading */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Tracklet Has Moved Permanently
        </h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Tracklet has permanently moved to our new official URL:{' '}
          <strong className="font-semibold text-slate-900 underline decoration-indigo-300 underline-offset-2">
            tracklet.pages.dev
          </strong>
          . Please update your bookmarks.
        </p>

        {/* Data Safety Reassurance Box */}
        <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-4 mt-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span>Your Data Is 100% Safe</span>
          </div>
          <p className="text-xs text-emerald-800/90 mt-1.5 leading-relaxed">
            All your job applications, notes, interview records, and account credentials remain completely intact and secure in the cloud. No data has been lost or modified.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleNavigate}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm transition-colors duration-150 shadow-2xs cursor-pointer"
          >
            <span>Go to tracklet.pages.dev</span>
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
