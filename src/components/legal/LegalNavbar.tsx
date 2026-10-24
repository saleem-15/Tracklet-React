import React from 'react';
import { LegalDocType } from '../../lib/routeUtils';

export interface LegalNavbarProps {
  activeDoc?: LegalDocType;
  onSelectDoc?: (doc: LegalDocType) => void;
  isAuthenticated: boolean;
  onNavigateHome: () => void;
  onNavigateAuth: (mode: 'signin' | 'signup') => void;
  onPrint: () => void;
}

export const LegalNavbar: React.FC<LegalNavbarProps> = ({
  isAuthenticated,
  onNavigateHome,
  onNavigateAuth,
  onPrint,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand Identity & Home link */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            aria-label="Tracklet Home"
            className="flex items-center gap-2.5 text-left rounded-xl p-1 -m-1 hover:bg-slate-100/70 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
          >
            <img src="/logo.svg" alt="Tracklet Logo" className="w-8 h-8 shrink-0" />
            <span className="font-heading font-extrabold text-base text-slate-900 tracking-tight leading-tight">
              Tracklet
            </span>
          </button>
        </div>

        {/* Right: Actions (Print & Nav) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrint}
            aria-label="Print Document"
            className="hidden sm:inline-flex items-center px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-semibold text-xs transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden motion-reduce:transform-none"
          >
            Print
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={onNavigateHome}
              aria-label="Back to App"
              className="inline-flex items-center px-3.5 py-1.5 min-h-[36px] rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-semibold text-xs transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden motion-reduce:transform-none"
            >
              Back to App
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onNavigateAuth('signin')}
                className="inline-flex items-center px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 font-semibold text-xs transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden motion-reduce:transform-none"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigateAuth('signup')}
                className="hidden md:inline-flex items-center px-3.5 py-1.5 min-h-[36px] rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs transition-all cursor-pointer shadow-2xs shadow-blue-500/20 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden motion-reduce:transform-none"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
