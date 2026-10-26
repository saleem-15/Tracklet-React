import React, { useEffect } from 'react';
import { Home } from 'lucide-react';
import { getLandingPageUrl, navigateToRoute } from '../lib/routeUtils';

export interface NotFoundPageProps {
  landingUrl?: string;
}

/**
 * NotFoundPage
 *
 * Standalone public 404 error page featuring an oversized numeral hero,
 * strong typography, and a single, high-clarity recovery action returning
 * the user to the landing page.
 */
export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  landingUrl: customLandingUrl,
}) => {
  useEffect(() => {
    document.title = '404 — Page Not Found | Tracklet';
  }, []);

  const landingUrl = customLandingUrl || getLandingPageUrl();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between">
      {/* Brand Header */}
      <header className="w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a
            href={landingUrl}
            aria-label="Tracklet Home"
            className="flex items-center gap-2.5 text-left rounded-xl p-1 -m-1 hover:bg-slate-100/70 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
          >
            <img src="/logo.svg" alt="Tracklet Logo" className="w-8 h-8 shrink-0" />
            <span className="font-heading font-extrabold text-base text-slate-900 tracking-tight leading-tight">
              Tracklet
            </span>
          </a>
        </div>
      </header>

      {/* Main Not Found Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 sm:py-16">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center animate-in fade-in duration-200">
          {/* Oversized 404 Numeral */}
          <span
            className="text-[8rem] sm:text-[10rem] md:text-[11rem] leading-none font-extrabold tracking-tighter text-slate-900 tabular-nums select-none"
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
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200/70 py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} Tracklet. All rights reserved.</p>
          <div className="flex items-center gap-4 font-medium">
            <button
              type="button"
              onClick={() => navigateToRoute('/privacy')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-slate-300" aria-hidden="true">&bull;</span>
            <button
              type="button"
              onClick={() => navigateToRoute('/terms')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
