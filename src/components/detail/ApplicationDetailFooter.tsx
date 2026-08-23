import React from 'react';
import { Trash2, Check, Save } from 'lucide-react';

export interface ApplicationDetailFooterProps {
  onDelete: () => void;
  onSave?: () => void;
  onSaveNotes?: () => void;
  hasUnsavedChanges?: boolean;
  hasUnsavedNotes?: boolean;
  isSaving?: boolean;
  isSavingNotes?: boolean;
  showSavedToast?: boolean;
}

export const ApplicationDetailFooter: React.FC<ApplicationDetailFooterProps> = ({
  onDelete,
  onSave,
  onSaveNotes,
  hasUnsavedChanges,
  hasUnsavedNotes,
  isSaving,
  isSavingNotes,
  showSavedToast,
}) => {
  const saveHandler = onSave || onSaveNotes;
  const isDirty = hasUnsavedChanges ?? hasUnsavedNotes ?? false;
  const saving = isSaving ?? isSavingNotes ?? false;

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
        {saveHandler && (
          <button
            type="button"
            onClick={saveHandler}
            disabled={!isDirty || saving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold transition-all text-xs cursor-pointer ${
              isDirty
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  );
};
