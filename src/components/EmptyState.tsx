import React from 'react';
import { Plus, SearchX, Briefcase, FilterX } from 'lucide-react';
import { UI_TOKENS } from '../theme/tokens';

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
      <div className="flex flex-col items-center justify-center p-6 text-center my-auto max-w-md mx-auto">
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mb-3 shadow-2xs">
          <SearchX className="w-5 h-5" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1.5 tracking-tight font-heading">
          {title || 'No matching applications found'}
        </h3>
        <p className="text-xs text-slate-500 mb-5 max-w-sm leading-relaxed">
          {description || 'Try tweaking your search keywords or clearing active filters to see all your tracked applications.'}
        </p>
        <div className="flex items-center justify-center gap-2.5">
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className={UI_TOKENS.btnSecondary}
            >
              <FilterX className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Reset Filters</span>
            </button>
          )}
          {onAddApplication && (
            <button
              type="button"
              onClick={onAddApplication}
              className={UI_TOKENS.btnPrimary}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Application</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto">
      {/* Visual Icon */}
      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/70 flex items-center justify-center mb-3 shadow-2xs">
        <Briefcase className="w-5 h-5 stroke-[2]" />
      </div>

      <h3 className="text-base font-bold text-slate-900 mb-1.5 tracking-tight font-heading">
        {title || 'No applications yet'}
      </h3>
      <p className="text-xs text-slate-500 mb-5 max-w-sm leading-relaxed">
        {description || 'Start tracking your job search by keeping applications, interviews, and follow-ups organized in one place.'}
      </p>

      {/* Primary Action Button */}
      {onAddApplication && (
        <button
          type="button"
          onClick={onAddApplication}
          className={UI_TOKENS.btnPrimary}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Application</span>
        </button>
      )}
    </div>
  );
};
