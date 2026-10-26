import React from 'react';
import { Home, Menu } from 'lucide-react';
import { getLandingPageUrl } from '../lib/routeUtils';

export interface NotFoundViewProps {
  landingUrl?: string;
  onOpenMobileSidebar?: () => void;
}

/**
 * NotFoundView
 *
 * In-workspace 404 screen featuring an oversized bold numeral,
 * human-friendly error copy, and a single, high-clarity recovery CTA
 * returning the user to the landing page.
 */
export const NotFoundView: React.FC<NotFoundViewProps> = ({
  landingUrl: customLandingUrl,
  onOpenMobileSidebar,
}) => {
  const landingUrl = customLandingUrl || getLandingPageUrl();

  return (
    <section className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
      {/* Mobile-only header with navigation drawer toggle */}
      {onOpenMobileSidebar && (
        <header className="sm:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="p-1.5 -m-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-heading font-bold text-sm text-slate-800">Tracklet</span>
          <div className="w-5" aria-hidden="true" />
        </header>
      )}

      {/* Main Not Found Section */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:py-16">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center animate-in fade-in-50 zoom-in-95 duration-200">
          {/* Oversized 404 Numeral */}
          <span
            className="text-[7.5rem] sm:text-[10rem] md:text-[11rem] leading-none font-extrabold tracking-tighter text-slate-900 tabular-nums select-none"
            aria-hidden="true"
          >
            404
          </span>

          {/* Heading */}
          <h1 className="-mt-2 sm:-mt-4 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            This page took a wrong turn
          </h1>

          {/* Description */}
          <p className="mt-3 max-w-sm text-xs sm:text-sm text-slate-500 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved. Let&apos;s get you back on track.
          </p>

          {/* Single High-Clarity Recovery Action */}
          <div className="mt-8 flex justify-center w-full">
            <a
              href={landingUrl}
              className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-xs text-xs sm:text-sm cursor-pointer inline-flex items-center justify-center gap-2 transition-all shadow-blue-500/20"
            >
              <Home className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Back to home</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
