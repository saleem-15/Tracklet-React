import React from 'react';
import { Plus, SearchX, Briefcase, Sparkles, FilterX, CheckCircle2, Building2 } from 'lucide-react';

interface EmptyStateProps {
  isFiltered?: boolean;
  onAddApplication?: () => void;
  onResetFilters?: () => void;
  title?: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isFiltered = false,
  onAddApplication,
  onResetFilters,
  title,
  description,
}) => {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center my-auto max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mb-4 shadow-xs">
          <SearchX className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1.5 tracking-tight">
          {title || 'No matching applications found'}
        </h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          {description || 'Try tweaking your search keywords or clearing active filters to see all your tracked job applications.'}
        </p>
        <div className="flex items-center justify-center gap-2.5">
          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer border border-slate-200"
            >
              <FilterX className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Filters</span>
            </button>
          )}
          {onAddApplication && (
            <button
              onClick={onAddApplication}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Application</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center max-w-xl mx-auto my-auto">
      {/* Visual Stacked Card Graphic */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full transform scale-125" />
        
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg ring-4 ring-white border border-blue-400/30">
            <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.75]" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl ring-2 ring-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 tracking-tight">
        {title || 'Start tracking your job search'}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 mb-8 max-w-md leading-relaxed">
        {description || 'Keep all your job applications, interviews, contacts, and offer details cleanly organized in one clear dashboard.'}
      </p>

      {/* Primary Action Button */}
      {onAddApplication && (
        <button
          onClick={onAddApplication}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5 shadow-blue-500/20"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Your First Application</span>
        </button>
      )}

      {/* Feature Highlights Grid */}
      <div className="mt-10 pt-8 border-t border-slate-200/60 w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5">
          <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[11px] font-bold text-slate-800">Auto Logos</h4>
            <p className="text-[10px] text-slate-500 leading-snug">Fetches company branding automatically.</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[11px] font-bold text-slate-800">Stage Pipeline</h4>
            <p className="text-[10px] text-slate-500 leading-snug">Drag and drop applications effortlessly.</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[11px] font-bold text-slate-800">History & Tasks</h4>
            <p className="text-[10px] text-slate-500 leading-snug">Track follow-ups, contacts & status dates.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
