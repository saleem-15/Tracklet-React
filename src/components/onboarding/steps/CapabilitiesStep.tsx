import React from 'react';
import { 
  FileText, 
  Clock, 
  Database 
} from 'lucide-react';

export interface CapabilitiesStepProps {
  onBack?: () => void;
  onComplete?: () => void;
  isCompleting?: boolean;
}

export const CapabilitiesStep: React.FC<CapabilitiesStepProps> = () => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="text-center space-y-1 max-w-md mx-auto">
        <h2 className="text-lg sm:text-xl font-bold font-heading text-slate-900 tracking-tight">
          Data Ownership & Notes
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Key features for managing your search with full data portability.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 pt-1">
        {/* Callout 1: 100% Data Portability */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
            <Database className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                100% Data Portability (Zero Lock-in)
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                Guarantee
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Export your full workspace — applications, contacts, templates, history — as CSV anytime in Settings. Your data is always yours.
            </p>
          </div>
        </div>

        {/* Callout 2: Markdown Notes with Slash Commands */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Markdown Notes with Slash Commands
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                /
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Every card includes a distraction-free editor. Type <code className="bg-slate-100 text-slate-800 px-1 py-0.2 rounded font-mono text-[10px]">/meeting</code> or <code className="bg-slate-100 text-slate-800 px-1 py-0.2 rounded font-mono text-[10px]">/prep</code> for instant templates.
            </p>
          </div>
        </div>

        {/* Callout 3: Stage Conversion Velocity & Stale Alerts */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-4 h-4 stroke-[2]" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-slate-900 block">
              Stage Velocity & Stale Application Alerts
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Track how many days applications spend in each stage. Tracklet gently flags roles untouched for 14+ days so opportunities never go cold.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
