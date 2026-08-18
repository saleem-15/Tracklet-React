import React from 'react';
import { Sparkles } from 'lucide-react';

export interface UnsavedChangesPromptProps {
  onKeepEditing: () => void;
  onDiscardAndExit: () => void;
}

export const UnsavedChangesPrompt: React.FC<UnsavedChangesPromptProps> = ({
  onKeepEditing,
  onDiscardAndExit,
}) => {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 animate-in fade-in duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 text-center animate-in zoom-in-95 duration-150">
        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-slate-900 text-sm">Discard unsaved changes?</h3>
          <p className="text-xs text-slate-500">You have unsaved edits. Exit without saving?</p>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onKeepEditing}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={onDiscardAndExit}
            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            Discard &amp; Exit
          </button>
        </div>
      </div>
    </div>
  );
};
