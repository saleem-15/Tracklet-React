import React from 'react';
import { 
  Briefcase, 
  UserPlus, 
  Mail, 
  Zap, 
  Keyboard, 
  PanelRightOpen, 
  Save, 
  Search, 
  CornerDownLeft
} from 'lucide-react';

interface ExtensionFeaturesGuideProps {
  className?: string;
}

export const ExtensionFeaturesGuide: React.FC<ExtensionFeaturesGuideProps> = ({ className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Core Capabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-900">Job Clipper</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Auto-detects title, company, salary, and requirements from LinkedIn, Indeed, Greenhouse, and Lever.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-900">Contact Clipper</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Extracts recruiter profiles and hiring managers directly into your standalone Contacts Hub.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200/70 text-purple-600 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-900">Webmail Logger</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Logs interview invitation emails from Gmail and Outlook straight to your active application timeline.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-900">1-Click Autofill</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Fills repetitive ATS job forms with your stored profile details safely without auto-submitting.
            </p>
          </div>
        </div>
      </div>

      {/* Redesigned Tactile Keyboard Shortcuts Section */}
      <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Keyboard className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 font-sans">
              Companion Keyboard Shortcuts
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wide">
            Power User Controls
          </span>
        </div>

        {/* Shortcuts List */}
        <div className="divide-y divide-slate-100/90 space-y-1">
          {/* Toggle Side Panel */}
          <div className="pt-2 pb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <PanelRightOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 text-xs block">
                  Toggle Chrome Side Panel
                </span>
                <span className="text-[11px] text-slate-500">
                  Open or close Tracklet on any website or job board
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <kbd className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-slate-200/90 rounded shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                Alt
              </kbd>
              <span className="text-slate-400 font-mono text-[11px]">+</span>
              <kbd className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-slate-200/90 rounded shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                Shift
              </kbd>
              <span className="text-slate-400 font-mono text-[11px]">+</span>
              <kbd className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-slate-200/90 rounded shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                A
              </kbd>
            </div>
          </div>

          {/* Save Application */}
          <div className="pt-2.5 pb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Save className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 text-xs block">
                  Save Active Form
                </span>
                <span className="text-[11px] text-slate-500">
                  Quick-save clipped job or recruiter inside Side Panel
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <kbd className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-slate-200/90 rounded shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                Ctrl
              </kbd>
              <span className="text-slate-400 font-mono text-[11px]">+</span>
              <kbd className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-slate-200/90 rounded shadow-[0_1px_1px_rgba(0,0,0,0.06)] gap-0.5">
                <CornerDownLeft className="w-2.5 h-2.5 text-slate-500" />
                <span>Enter</span>
              </kbd>
            </div>
          </div>

          {/* Quick Search in App */}
          <div className="pt-2.5 pb-1 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800 text-xs block">
                  Global Search in Web App
                </span>
                <span className="text-[11px] text-slate-500">
                  Focus workspace search from anywhere
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <kbd className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-slate-200/90 rounded shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                Ctrl
              </kbd>
              <span className="text-slate-400 font-mono text-[11px]">+</span>
              <kbd className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-slate-200/90 rounded shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                K
              </kbd>
              <span className="text-slate-400 text-xs font-mono px-0.5">or</span>
              <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-slate-200/90 rounded shadow-[0_1px_1px_rgba(0,0,0,0.06)]">
                /
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
