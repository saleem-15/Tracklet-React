import React from 'react';
import {
  FileText,
  Pencil,
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Link2,
  Check,
} from 'lucide-react';
import { MarkdownNoteView } from '../MarkdownNoteView';
import { useMarkdownEditor } from '../../lib/useMarkdownEditor';

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
  const {
    isEditing,
    textareaRef,
    startEdit,
    saveAndClose,
    applyFormat,
    handleKeyDown,
  } = useMarkdownEditor({
    notes,
    hasUnsavedNotes,
    onNotesChange,
    onSaveNotes,
  });

  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          Notes &amp; Scratchpad
        </h3>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-mono ${
              hasUnsavedNotes ? 'text-amber-600 font-semibold' : 'text-slate-500'
            }`}
          >
            {hasUnsavedNotes ? '● Unsaved · Ctrl+Enter to save' : 'Ctrl+Enter to save'}
          </span>
        </div>
      </div>

      {/* Unified Notes Card - Zero animation, Zero layout jumping */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Stable Formatting Bar */}
        <div className="flex items-center justify-between bg-slate-50/90 border-b border-slate-200/80 px-2 py-1 text-xs text-slate-600 gap-1 select-none">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => applyFormat('**', '**', 'bold text')}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('*', '*', 'italic text')}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={() => applyFormat('### ', '', 'Heading', true)}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer flex items-center gap-0.5"
              title="Heading (### text)"
            >
              <Heading className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('- ', '', 'List item', true)}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer"
              title="Bullet List (- item)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('1. ', '', 'Numbered item', true)}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer"
              title="Numbered List (1. item)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={() =>
                applyFormat('[', '](https://url.com)', 'link label')
              }
              className="p-1 hover:bg-slate-200/80 text-blue-700 hover:text-blue-800 rounded cursor-pointer flex items-center gap-1 font-mono text-[11px]"
              title="Insert Link (Ctrl+K)"
            >
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Link</span>
            </button>
          </div>

          <div>
            {isEditing ? (
              <button
                type="button"
                onClick={saveAndClose}
                className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 cursor-pointer"
                title="Save notes (Ctrl+Enter)"
              >
                <Check className="w-3 h-3" />
                <span>Done</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 cursor-pointer"
                title="Edit notes"
              >
                <Pencil className="w-3 h-3 text-slate-500" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Box: Identical padding, font, and dimensions with 0 animation */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            rows={9}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Interview prep notes, salary details, contacts, links (e.g. https://... or [docs](url))..."
            className="w-full min-h-[220px] p-3.5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none font-sans text-xs leading-relaxed resize-y border-none block"
          />
        ) : (
          <div
            onClick={startEdit}
            className="min-h-[220px] p-3.5 bg-white cursor-text select-text block"
            title="Click to edit notes"
          >
            <MarkdownNoteView content={notes} />
          </div>
        )}
      </div>
    </div>
  );
};
