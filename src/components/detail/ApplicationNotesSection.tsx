import React from 'react';
import {
  FileText,
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Link2,
  Code2,
  Check,
  Loader2,
} from 'lucide-react';
import { useMarkdownEditor } from '../../lib/useMarkdownEditor';
import { NoteLinksBar } from './NoteLinksBar';

export interface ApplicationNotesSectionProps {
  notes: string;
  onNotesChange: (val: string) => void;
  saveStatus?: 'idle' | 'unsaved' | 'saving' | 'saved';
}

/**
 * High-clarity, always-editable notes surface.
 * Features:
 * - Instant typing with zero view/edit mode-switching latency.
 * - Dynamic auto-growing textarea height with no nested scrollbars.
 * - Permanent formatting toolbar (Bold, Italic, Headings, Lists, Links, Code Blocks).
 * - Automatic background 3-second debounced Firestore persistence.
 * - Dedicated detected links bar for 1-click URL access.
 */
export const ApplicationNotesSection: React.FC<ApplicationNotesSectionProps> = ({
  notes,
  onNotesChange,
  saveStatus = 'idle',
}) => {
  const { textareaRef, applyFormat, handleKeyDown } = useMarkdownEditor({
    notes,
    onNotesChange,
  });

  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          Notes
        </h3>

        {/* Quiet Auto-Save Status Indicator */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] min-h-[18px]">
          {saveStatus === 'saving' && (
            <span className="text-blue-600 font-medium flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              <span>Saving…</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <span className="text-amber-500 text-xs">●</span>
              <span>Unsaved</span>
            </span>
          )}
        </div>
      </div>

      {/* Unified Notes Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        {/* Stable Formatting Bar */}
        <div className="flex items-center justify-between bg-slate-50/90 border-b border-slate-200/80 px-2 py-1 text-xs text-slate-600 gap-1 select-none">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => applyFormat('**', '**', 'bold text')}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('*', '*', 'italic text')}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={() => applyFormat('### ', '', 'Heading', true)}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Heading (### text)"
            >
              <Heading className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('- ', '', 'List item', true)}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Bullet List (- item)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyFormat('1. ', '', 'Numbered item', true)}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer transition-colors"
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
              className="p-1 hover:bg-slate-200/80 text-blue-700 hover:text-blue-800 rounded cursor-pointer flex items-center gap-1 font-mono text-[11px] transition-colors"
              title="Insert Link (Ctrl+K)"
            >
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Link</span>
            </button>
            <button
              type="button"
              onClick={() =>
                applyFormat('```\n', '\n```', 'code here', true)
              }
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer flex items-center gap-1 font-mono text-[11px] transition-colors"
              title="Insert Code Block (Ctrl+Shift+K)"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Code</span>
            </button>
          </div>
        </div>

        {/* Always-Editable Auto-Growing Textarea */}
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add notes, interview prep, salary details, contacts, code snippets, or links (e.g. https://... or [label](url))..."
          className="w-full min-h-[200px] p-3.5 bg-white text-slate-900 placeholder-slate-400 focus:outline-none font-sans text-xs leading-relaxed border-none block resize-none overflow-hidden"
        />
      </div>

      {/* Detected Quick-Access Links */}
      <NoteLinksBar notes={notes} />
    </div>
  );
};
