import React from 'react';
import { ShieldCheck, Mail, ExternalLink } from 'lucide-react';
import { LegalDocType } from '../../lib/routeUtils';

export interface LegalFooterProps {
  onSelectDoc: (doc: LegalDocType) => void;
  onNavigateHome: () => void;
}

export const LegalFooter: React.FC<LegalFooterProps> = ({
  onSelectDoc,
  onNavigateHome,
}) => {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white py-12 text-xs text-slate-500 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Trust Pillars Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-heading font-bold text-slate-900 text-xs">
              The Tracklet Security Commitment
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 font-medium">
            <span>✓ AES-256 Cloud Encryption</span>
            <span>✓ Strict Tenant Isolation</span>
            <span>✓ Zero Recruiter Monetization</span>
            <span>✓ Instant Data Portability</span>
          </div>
        </div>

        {/* Links and Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-slate-600">
            <img src="/logo.svg" alt="Tracklet Logo" className="w-5 h-5" />
            <span>&copy; {new Date().getFullYear()} Tracklet. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <button
              type="button"
              onClick={() => onSelectDoc('privacy')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => onSelectDoc('terms')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="text-slate-300">•</span>
            <a
              href="mailto:support@tracklet.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition-colors inline-flex items-center gap-1"
            >
              <Mail className="w-3 h-3 text-slate-400" />
              <span>Contact Support</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
