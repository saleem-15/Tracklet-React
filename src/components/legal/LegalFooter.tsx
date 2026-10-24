import React from 'react';
import { Mail } from 'lucide-react';
import { LegalDocType } from '../../lib/routeUtils';
import { LEGAL_CONFIG } from '../../lib/constants';

export interface LegalFooterProps {
  onSelectDoc: (doc: LegalDocType) => void;
  onNavigateHome: () => void;
}

export const LegalFooter: React.FC<LegalFooterProps> = ({
  onSelectDoc,
  onNavigateHome,
}) => {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white py-10 text-xs text-slate-600 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Links and Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group text-left"
          >
            <img src="/logo.svg" alt="Tracklet Logo" className="w-5 h-5 group-hover:scale-105 transition-transform" />
            <span>&copy; {new Date().getFullYear()} Tracklet. All rights reserved.</span>
          </button>

          <div className="flex items-center gap-4 text-slate-600">
            <button
              type="button"
              onClick={() => onSelectDoc('privacy')}
              className="hover:text-slate-900 transition-colors cursor-pointer font-medium"
            >
              Privacy Policy
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => onSelectDoc('terms')}
              className="hover:text-slate-900 transition-colors cursor-pointer font-medium"
            >
              Terms of Service
            </button>
            <span className="text-slate-300">•</span>
            <a
              href={`mailto:${LEGAL_CONFIG.SUPPORT_EMAIL}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5 font-medium"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Contact Support</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
