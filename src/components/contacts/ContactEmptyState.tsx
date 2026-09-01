import React from 'react';
import { Users, UserPlus, Sparkles, SearchX } from 'lucide-react';

interface ContactEmptyStateProps {
  isFiltered?: boolean;
  onAddContact?: () => void;
  onResetFilter?: () => void;
}

export const ContactEmptyState: React.FC<ContactEmptyStateProps> = ({
  isFiltered = false,
  onAddContact,
  onResetFilter,
}) => {
  if (isFiltered) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-white border border-slate-200/80 shadow-2xs max-w-lg mx-auto my-8 animate-in fade-in duration-200">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center mb-3 text-slate-500 shadow-inner">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 font-heading">No matching contacts</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
          No contacts match your current search query or category filter.
        </p>
        {onResetFilter && (
          <button
            type="button"
            onClick={onResetFilter}
            className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200/80 transition-all cursor-pointer min-h-[36px]"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-white border border-slate-200/80 shadow-2xs max-w-md mx-auto my-8 animate-in fade-in duration-200">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-inner">
          <Users className="w-8 h-8 stroke-[1.75]" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-white shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 fill-current" />
        </div>
      </div>

      <h3 className="text-base font-bold text-slate-900 font-heading tracking-tight">
        Build Your Professional Network
      </h3>
      <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
        Track mentors, recruiters, hiring managers, and referrals all in one unified directory. Connect them directly to your job applications.
      </p>

      {onAddContact && (
        <button
          type="button"
          onClick={onAddContact}
          className="mt-5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2 min-h-[40px]"
        >
          <UserPlus className="w-4 h-4 stroke-[2.2]" />
          <span>Add Your First Contact</span>
        </button>
      )}
    </div>
  );
};
