import React, { useState } from 'react';
import { ExternalLink, X, Sparkles } from 'lucide-react';

interface DomainMigrationBannerProps {
  targetUrl?: string;
}

export const DomainMigrationBanner: React.FC<DomainMigrationBannerProps> = ({
  targetUrl,
}) => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return (
        sessionStorage.getItem('tracklet_migration_banner_dismissed') === 'true' ||
        localStorage.getItem('tracklet_migration_banner_dismissed') === 'true'
      );
    } catch {
      return false;
    }
  });

  // Target Cloudflare destination
  const destinationUrl = targetUrl || import.meta.env.VITE_CLOUDFLARE_URL || '';

  // Detect whether currently running on Netlify or an explicitly configured legacy origin
  const isNetlifyOrigin = (() => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    const legacyHost = import.meta.env.VITE_LEGACY_HOST;
    if (legacyHost && hostname === legacyHost) return true;
    return hostname.includes('netlify.app');
  })();

  if (dismissed || !isNetlifyOrigin || !destinationUrl) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem('tracklet_migration_banner_dismissed', 'true');
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  const handleSwitch = () => {
    try {
      const parsedTarget = new URL(destinationUrl);
      parsedTarget.pathname = window.location.pathname;
      parsedTarget.search = window.location.search;
      parsedTarget.hash = window.location.hash;
      window.location.href = parsedTarget.toString();
    } catch {
      window.location.href = destinationUrl;
    }
  };

  return (
    <div
      role="region"
      aria-label="Domain migration announcement"
      className="bg-indigo-600 text-white px-3 sm:px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium shadow-sm transition-colors duration-150 z-30"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="w-4 h-4 text-indigo-200 shrink-0" aria-hidden="true" />
        <span className="truncate">
          Tracklet has moved to our faster home on Cloudflare! Please update your bookmarks.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          type="button"
          onClick={handleSwitch}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-indigo-700 font-semibold text-xs hover:bg-indigo-50 active:bg-indigo-100 transition-colors cursor-pointer"
        >
          <span>Switch Now</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss migration notice"
          className="p-1 rounded text-indigo-200 hover:text-white hover:bg-indigo-700/60 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
