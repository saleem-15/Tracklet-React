import React from 'react';
import { FileText, Check, Loader2, Undo2, X } from 'lucide-react';
import { RichTextEditor } from '../editor';
import { NOTE_TEMPLATES } from '../../lib/editor/noteTemplates';

export interface ApplicationNotesSectionProps {
  notes: string;
  onNotesChange: (val: string) => void;
  saveStatus?: 'idle' | 'unsaved' | 'saving' | 'saved';
  appId?: string;
  /** True when a crashed-session recovery draft was just restored. */
  draftNoticeVisible?: boolean;
  onDismissDraftNotice?: () => void;
}

/**
 * Notes surface hosting the shared RichTextEditor.
 * - No permanent formatting toolbar; "/" opens the command menu (FR-001/006)
 * - Quiet-confidence auto-save status with aria-live announcement (FR-005/022)
 * - Crash-recovery chip when a local draft was restored (FR-018)
 */
export const ApplicationNotesSection: React.FC<ApplicationNotesSectionProps> = ({
  notes,
  onNotesChange,
  saveStatus = 'idle',
  appId,
  draftNoticeVisible = false,
  onDismissDraftNotice,
}) => {
  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          Notes
        </h3>

        {/* Auto-Save Status Indicator (quiet confidence) */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="flex items-center gap-1.5 font-mono text-[11px] min-h-[18px]"
        >
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

      {/* Recovery-draft chip (FR-018) */}
      {draftNoticeVisible && (
        <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium">
            <Undo2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            Restored unsaved draft
          </span>
          {onDismissDraftNotice && (
            <button
              type="button"
              onClick={onDismissDraftNotice}
              aria-label="Dismiss draft restoration notice"
              className="p-0.5 text-amber-600 hover:text-amber-800 rounded cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Unified Notes Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all relative">
        <RichTextEditor
          key={appId ?? 'notes'}
          value={notes}
          onChange={onNotesChange}
          ariaLabel="Application Notes"
          minRows={10}
          resizable
          placeholder="Add notes, interview prep, salary details, contacts, code snippets..."
          templates={NOTE_TEMPLATES}
        />
      </div>
    </div>
  );
};
