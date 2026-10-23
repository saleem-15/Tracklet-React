import React from 'react';
import { ShieldCheck, FileText, Printer, ArrowLeft, LogIn } from 'lucide-react';
import { LegalDocType } from '../../lib/routeUtils';

export interface LegalNavbarProps {
  activeDoc: LegalDocType;
  onSelectDoc: (doc: LegalDocType) => void;
  isAuthenticated: boolean;
  onNavigateHome: () => void;
  onNavigateAuth: (mode: 'signin' | 'signup') => void;
  onPrint: () => void;
}

export const LegalNavbar: React.FC<LegalNavbarProps> = ({
  activeDoc,
  onSelectDoc,
  isAuthenticated,
  onNavigateHome,
  onNavigateAuth,
  onPrint,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity & Home link */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateHome}
            aria-label="Tracklet Home"
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <img src="/logo.svg" alt="Tracklet Logo" className="w-8 h-8 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-base text-slate-900 tracking-tight leading-tight">
                Tracklet
              </span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                Trust & Legal
              </span>
            </div>
          </button>
        </div>

        {/* Center: Document Switcher Tabs */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => onSelectDoc('privacy')}
            aria-selected={activeDoc === 'privacy'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeDoc === 'privacy'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeDoc === 'privacy' ? 'text-blue-600' : 'text-slate-500'}`} />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectDoc('terms')}
            aria-selected={activeDoc === 'terms'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeDoc === 'terms'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${activeDoc === 'terms' ? 'text-emerald-600' : 'text-slate-500'}`} />
            <span>Terms of Service</span>
          </button>
        </div>

        {/* Right: Actions (Print & Nav) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrint}
            aria-label="Print Document"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Workspace</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onNavigateAuth('signin')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateAuth('signup')}
                className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs shadow-blue-500/20"
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
