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
  X,
} from 'lucide-react';
import { useRichTextNotesEditor } from '../../lib/useRichTextNotesEditor';
import { NoteLinksBar } from './NoteLinksBar';

export interface ApplicationNotesSectionProps {
  notes: string;
  onNotesChange: (val: string) => void;
  saveStatus?: 'idle' | 'unsaved' | 'saving' | 'saved';
}

/**
 * High-clarity, live-rendered WYSIWYG notes surface.
 * Features:
 * - Single unified view: rendered Markdown typography without raw syntax markers.
 * - Direct in-place editing inside the rendered surface.
 * - Permanent formatting toolbar (Bold, Italic, Headings, Lists, Links, Code Blocks).
 * - Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+Shift+K).
 * - Markdown triggers (typing #, -, 1. at start of line morphs into styled element).
 * - Smart URL paste (auto-converts highlighted text into a link).
 * - 3-second debounced background persistence with zero data loss on close.
 * - Dedicated detected links bar for 1-click URL navigation.
 */
export const ApplicationNotesSection: React.FC<ApplicationNotesSectionProps> = ({
  notes,
  onNotesChange,
  saveStatus = 'idle',
}) => {
  const {
    editorRef,
    handleInput,
    handleKeyDown,
    handlePaste,
    handleClick,
    formatBold,
    formatItalic,
    formatHeading,
    formatBulletList,
    formatNumberedList,
    formatCodeBlock,
    formatLink,
    isLinkModalOpen,
    linkUrlInput,
    setLinkUrlInput,
    closeLinkDialog,
    applyLink,
  } = useRichTextNotesEditor({
    notes,
    onNotesChange,
  });

  const isEmpty = !notes || !notes.trim();

  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          Notes
        </h3>

        {/* Auto-Save Status Indicator */}
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all relative">
        {/* Stable Formatting Bar */}
        <div className="flex items-center justify-between bg-slate-50/90 border-b border-slate-200/80 px-2 py-1 text-xs text-slate-600 gap-1 select-none">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={formatBold}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={formatItalic}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={() => formatHeading('h3')}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Heading (### text or click)"
            >
              <Heading className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={formatBulletList}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Bullet List (- text or click)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={formatNumberedList}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer transition-colors"
              title="Numbered List (1. text or click)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={formatLink}
              className="p-1 hover:bg-slate-200/80 text-blue-700 hover:text-blue-800 rounded cursor-pointer flex items-center gap-1 font-mono text-[11px] transition-colors"
              title="Insert Link (Ctrl+K)"
            >
              <Link2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Link</span>
            </button>
            <button
              type="button"
              onClick={formatCodeBlock}
              className="p-1 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 rounded cursor-pointer flex items-center gap-1 font-mono text-[11px] transition-colors"
              title="Insert Code Block (Ctrl+Shift+K)"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Code</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-600 font-mono hidden sm:block">
            Ctrl+Click to open links
          </div>
        </div>

        {/* Link Insertion Popover / Mini-Modal */}
        {isLinkModalOpen && (
          <div className="bg-blue-50/90 border-b border-blue-200 px-3 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <input
              type="url"
              value={linkUrlInput}
              onChange={(e) => setLinkUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyLink(linkUrlInput);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  closeLinkDialog();
                }
              }}
              placeholder="https://..."
              autoFocus
              className="flex-1 px-2.5 py-1 text-xs bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-800"
            />
            <button
              type="button"
              onClick={() => applyLink(linkUrlInput)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded transition-colors cursor-pointer"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={closeLinkDialog}
              className="p-1 text-slate-500 hover:text-slate-700 rounded cursor-pointer"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live-Rendered WYSIWYG Editable Surface */}
        <div className="relative">
          {isEmpty && (
            <div className="absolute top-3.5 left-3.5 text-slate-400 text-xs pointer-events-none select-none font-sans leading-relaxed">
              Add notes, interview prep, salary details, contacts, code snippets, or paste links...
            </div>
          )}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onClick={handleClick}
            className="w-full min-h-[200px] p-3.5 bg-white text-slate-800 focus:outline-none font-sans text-xs leading-relaxed border-none block"
            role="textbox"
            aria-multiline="true"
            aria-label="Application Notes"
          />
        </div>
      </div>

      {/* Detected Quick-Access Links */}
      <NoteLinksBar notes={notes} />
    </div>
  );
};
