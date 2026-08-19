import React from 'react';
import { Plus, FileStack } from 'lucide-react';
import { UI_TOKENS } from '../theme/tokens';

interface OnboardingEmptyStateProps {
  onOpenAddModal: () => void;
  onSeedDemoData: () => void;
}

export const OnboardingEmptyState: React.FC<OnboardingEmptyStateProps> = ({
  onOpenAddModal,
  onSeedDemoData,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-12 sm:py-16 px-4 animate-in fade-in-50 zoom-in-95 duration-200">
      {/* Subtle Icon Badge */}
      <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
        <FileStack className="w-5 h-5 stroke-[1.85]" />
      </div>

      {/* Direct Copy */}
      <div className="space-y-1.5 mb-5">
        <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight">
          No applications yet
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          Start tracking your job search by keeping applications, interviews, and follow-ups organized in one place.
        </p>
      </div>

      {/* Action Controls */}
      <div className="space-y-3 flex flex-col items-center">
        <button
          type="button"
          onClick={onOpenAddModal}
          className={UI_TOKENS.btnPrimary}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Application</span>
        </button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <span>Just exploring?</span>
          <button
            type="button"
            onClick={onSeedDemoData}
            className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded"
          >
            Load sample data
          </button>
        </div>
      </div>
    </div>
  );
};
