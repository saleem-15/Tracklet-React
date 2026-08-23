import { useState, useRef, useEffect, useCallback } from 'react';
import {
  applyFormattingToText,
  handleListContinuationOnEnter,
} from './markdownEditorUtils';

export interface UseMarkdownEditorOptions {
  notes: string;
  hasUnsavedNotes: boolean;
  onNotesChange: (val: string) => void;
  onSaveNotes: () => void;
}

/**
 * Custom React hook encapsulating state, cursor positioning,
 * toolbar actions, and keyboard shortcuts for the markdown notes editor.
 */
export function useMarkdownEditor({
  notes,
  hasUnsavedNotes,
  onNotesChange,
  onSaveNotes,
}: UseMarkdownEditorOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Focus textarea immediately when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const startEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const saveAndClose = useCallback(() => {
    if (hasUnsavedNotes) {
      onSaveNotes();
    }
    setIsEditing(false);
  }, [hasUnsavedNotes, onSaveNotes]);

  const applyFormat = useCallback(
    (
      prefix: string,
      suffix: string = '',
      placeholder: string = 'text',
      isBlock: boolean = false
    ) => {
      if (!isEditing) {
        setIsEditing(true);
      }

      setTimeout(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const result = applyFormattingToText(
          notes,
          textarea.selectionStart,
          textarea.selectionEnd,
          prefix,
          suffix,
          placeholder,
          isBlock
        );

        onNotesChange(result.newText);

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(
              result.selectionStart,
              result.selectionEnd
            );
          }
        }, 0);
      }, 0);
    },
    [isEditing, notes, onNotesChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Save & close: Ctrl+Enter or Cmd+Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        saveAndClose();
        return;
      }

      // Bold: Ctrl+B or Cmd+B
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        applyFormat('**', '**', 'bold text');
        return;
      }

      // Italic: Ctrl+I or Cmd+I
      if ((e.metaKey || e.ctrlKey) && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        applyFormat('*', '*', 'italic text');
        return;
      }

      // Link: Ctrl+K or Cmd+K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        applyFormat('[', '](https://url.com)', 'link label');
        return;
      }

      // Escape: Exit edit mode
      if (e.key === 'Escape') {
        e.preventDefault();
        saveAndClose();
        return;
      }

      // Auto-continue lists on Enter
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const result = handleListContinuationOnEnter(
          notes,
          textarea.selectionStart
        );

        if (result.handled) {
          e.preventDefault();
          onNotesChange(result.newText);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(
                result.newCursorPos,
                result.newCursorPos
              );
            }
          }, 0);
        }
      }
    },
    [applyFormat, notes, onNotesChange, saveAndClose]
  );

  return {
    isEditing,
    textareaRef,
    startEdit,
    saveAndClose,
    applyFormat,
    handleKeyDown,
  };
}
