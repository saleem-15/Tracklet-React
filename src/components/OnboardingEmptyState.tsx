import React from 'react';
import { Plus, Sparkles, FileText, Kanban, Clock, ShieldCheck } from 'lucide-react';

interface OnboardingEmptyStateProps {
  onOpenAddModal: () => void;
  onSeedDemoData: () => void;
}

export const OnboardingEmptyState: React.FC<OnboardingEmptyStateProps> = ({
  onOpenAddModal,
  onSeedDemoData,
}) => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden text-center p-8 space-y-6 animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Icon & Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25">
            <Sparkles className="w-7 h-7 text-amber-300" />
          </div>
          <h2 className="text-xl font-bold font-heading text-slate-900 tracking-tight">
            Welcome to Your Job Pipeline
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-sans">
            Tracklet gives you high clarity over every job application, interview stage, contact, and follow-up task.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
              <Kanban className="w-4 h-4" />
              <span>Pipeline Board</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Drag applications across active interview stages.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs">
              <Clock className="w-4 h-4" />
              <span>Task Expiry</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Get alerted before recruiter tasks or interviews expire.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
              <FileText className="w-4 h-4" />
              <span>Full History</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Track timeline records for every stage change.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="w-full h-[38px] flex items-center justify-center gap-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Log Your First Application</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <span>Want to test with sample data?</span>
            <button
              type="button"
              onClick={onSeedDemoData}
              className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 cursor-pointer"
            >
              Load Sample Demo Dataset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
