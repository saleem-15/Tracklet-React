import React from 'react';
import { Trash2, Check, Save } from 'lucide-react';

export interface ApplicationDetailFooterProps {
  onDelete: () => void;
  onSaveNotes: () => void;
  hasUnsavedNotes: boolean;
  isSavingNotes: boolean;
  showSavedToast: boolean;
}

export const ApplicationDetailFooter: React.FC<ApplicationDetailFooterProps> = ({
  onDelete,
  onSaveNotes,
  hasUnsavedNotes,
  isSavingNotes,
  showSavedToast,
}) => {
  return (
    <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-between shrink-0">
      <button
        type="button"
        onClick={onDelete}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-slate-200 hover:border-rose-200 transition-all font-medium shadow-2xs cursor-pointer text-xs"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>

      <div className="flex items-center gap-2">
        {showSavedToast && (
          <span className="text-emerald-600 font-mono text-[11px] flex items-center gap-1 font-semibold animate-in fade-in duration-150">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
        <button
          type="button"
          onClick={onSaveNotes}
          disabled={!hasUnsavedNotes || isSavingNotes}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
            hasUnsavedNotes
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20'
              : 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
          }`}
        >
          <Save className="w-3.5 h-3.5" />
          {isSavingNotes ? 'Saving…' : 'Save Notes'}
        </button>
      </div>
    </div>
  );
};
