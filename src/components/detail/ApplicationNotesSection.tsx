import React from 'react';
import { FileText } from 'lucide-react';

export interface ApplicationNotesSectionProps {
  notes: string;
  hasUnsavedNotes: boolean;
  onNotesChange: (val: string) => void;
  onSaveNotes: () => void;
}

export const ApplicationNotesSection: React.FC<ApplicationNotesSectionProps> = ({
  notes,
  hasUnsavedNotes,
  onNotesChange,
  onSaveNotes,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          Notes &amp; Scratchpad
        </h3>
        <span
          className={`text-[11px] font-mono transition-colors ${
            hasUnsavedNotes ? 'text-amber-600 font-semibold' : 'text-slate-500'
          }`}
        >
          {hasUnsavedNotes ? '● Unsaved · Ctrl+Enter to save' : 'Ctrl+Enter to save'}
        </span>
      </div>
      <textarea
        rows={6}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            if (hasUnsavedNotes) onSaveNotes();
          }
        }}
        placeholder="Interview prep notes, follow-up actions, salary details, contacts…"
        className="w-full bg-white text-slate-900 placeholder-slate-500 p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white font-mono text-xs leading-relaxed resize-y shadow-2xs transition-all"
      />
    </div>
  );
};
