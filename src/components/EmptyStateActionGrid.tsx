import React from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Compass, 
  BriefcaseBusiness, 
  ArrowRight 
} from 'lucide-react';

export interface EmptyStateActionGridProps {
  onOpenTour: () => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onSeedDemoData: () => void;
}

export const EmptyStateActionGrid: React.FC<EmptyStateActionGridProps> = ({
  onOpenTour,
  onOpenAddModal,
  onOpenImportModal,
  onSeedDemoData,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mb-5 text-left">
      {/* Card 1: Guided Tour */}
      <button
        type="button"
        onClick={onOpenTour}
        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-150 flex items-start gap-3 group shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/80 group-hover:scale-105 transition-transform">
          <Compass className="w-4 h-4 stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Take the Tour
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            2-minute overview of extension, notes, and velocity tools.
          </p>
        </div>
      </button>

      {/* Card 2: Add First Application */}
      <button
        type="button"
        onClick={onOpenAddModal}
        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-150 flex items-start gap-3 group shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/80 group-hover:scale-105 transition-transform">
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              Add First Job
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Add a role manually with title, company, salary, and notes.
          </p>
        </div>
      </button>

      {/* Card 3: Import Spreadsheet */}
      <button
        type="button"
        onClick={onOpenImportModal}
        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-150 flex items-start gap-3 group shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      >
        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200/80 group-hover:scale-105 transition-transform">
          <FileSpreadsheet className="w-4 h-4 stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
              Import Spreadsheet
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Migrate existing applications from a CSV in seconds.
          </p>
        </div>
      </button>

      {/* Card 4: Load Demo Roles */}
      <button
        type="button"
        onClick={onSeedDemoData}
        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-150 flex items-start gap-3 group shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      >
        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/80 group-hover:scale-105 transition-transform">
          <BriefcaseBusiness className="w-4 h-4 stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
              Explore Demo Roles
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Seed realistic roles to see the Kanban board in action.
          </p>
        </div>
      </button>
    </div>
  );
};
