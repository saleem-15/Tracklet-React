import React from 'react';
import { FileText } from 'lucide-react';
import { NoteLinksBar } from '../detail/NoteLinksBar';
import { RichTextEditor } from '../editor';
import { NOTE_TEMPLATES } from '../../lib/editor/noteTemplates';

export interface AddApplicationNotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

/**
 * Add-modal notes surface — same shared RichTextEditor as the detail
 * panel for full feature parity (SC-007). No autosave/draft pipeline:
 * persistence happens with the modal's save action.
 */
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <RichTextEditor
          value={notes}
          onChange={onNotesChange}
          ariaLabel="New application notes"
          minRows={6}
          placeholder="Referral info, salary target, interview notes... Type / for commands"
          templates={NOTE_TEMPLATES}
        />
      </div>
      <NoteLinksBar notes={notes} />
    </div>
  );
};
