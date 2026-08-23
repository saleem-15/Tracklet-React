import React from 'react';
import { FileText } from 'lucide-react';
import { NoteLinksBar } from '../detail/NoteLinksBar';

export interface AddApplicationNotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export const AddApplicationNotesSection: React.FC<AddApplicationNotesSectionProps> = ({
  notes,
  onNotesChange,
}) => {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-blue-500" />
        Notes
      </h3>
      <textarea
        rows={6}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Referral info, salary target, interview notes, links (e.g. https://... or [docs](url))..."
        className="w-full bg-white text-slate-900 placeholder-slate-500 p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white font-mono text-xs leading-relaxed resize-y shadow-2xs transition-all"
      />
      <NoteLinksBar notes={notes} />
    </div>
  );
};
