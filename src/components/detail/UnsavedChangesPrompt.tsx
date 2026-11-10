import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { useEscapeKey } from '../../lib/useEscapeKey';

/**
 * Props for UnsavedChangesPrompt.
 */
export interface UnsavedChangesPromptProps {
  /** Callback to close the prompt and retain draft state for further editing */
  onKeepEditing: () => void;
  /** Callback to discard all draft edits, reset form state, and close the parent dialog */
  onDiscardAndExit: () => void;
}

/**
 * UnsavedChangesPrompt Component
 *
 * Interstitial confirmation dialog presented when a user attempts to dismiss a dirty modal.
 * Manages its own focus trap and auto-focuses the primary action ("Keep Editing").
 * Supports LIFO Escape key dismissal.
 */
export const UnsavedChangesPrompt: React.FC<UnsavedChangesPromptProps> = ({
  onKeepEditing,
  onDiscardAndExit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const keepEditingBtnRef = useRef<HTMLButtonElement>(null);

  // Dismiss prompt on Escape key (topmost on stack)
  useEscapeKey(onKeepEditing, true);

  // Manage keyboard focus: auto-focus "Keep Editing" on mount
  useEffect(() => {
    keepEditingBtnRef.current?.focus();
  }, []);

  // Trap Tab navigation strictly within the prompt's action controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && containerRef.current) {
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      e.stopPropagation();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 animate-in fade-in duration-150"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-prompt-title"
        aria-describedby="unsaved-prompt-desc"
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 space-y-4 text-center animate-in zoom-in-95 duration-150"
      >
        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 id="unsaved-prompt-title" className="font-bold text-slate-900 text-sm">
            Discard unsaved changes?
          </h3>
          <p id="unsaved-prompt-desc" className="text-xs text-slate-500">
            You have unsaved edits. Exit without saving?
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            ref={keepEditingBtnRef}
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
