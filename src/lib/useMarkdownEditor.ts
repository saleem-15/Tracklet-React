import { useRef, useEffect, useCallback } from 'react';
import {
  applyFormattingToText,
  handleListContinuationOnEnter,
} from './markdownEditorUtils';

export interface UseMarkdownEditorOptions {
  notes: string;
  onNotesChange: (val: string) => void;
}

/**
 * Custom React hook managing textarea auto-grow height, cursor math,
 * formatting insertion (bold, italic, headings, lists, links, code blocks),
 * and keyboard shortcuts for the always-editable notes surface.
 */
export function useMarkdownEditor({
  notes,
  onNotesChange,
}: UseMarkdownEditorOptions) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow textarea height to fit content without nested scrollbars
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(200, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [notes, adjustHeight]);

  const applyFormat = useCallback(
    (
      prefix: string,
      suffix: string = '',
      placeholder: string = 'text',
      isBlock: boolean = false
    ) => {
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

      // Restore focus and precise caret selection
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            result.selectionStart,
            result.selectionEnd
          );
          adjustHeight();
        }
      });
    },
    [adjustHeight, notes, onNotesChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Code Block: Ctrl+Shift+K or Cmd+Shift+K
      if (isCmdOrCtrl && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        applyFormat('```\n', '\n```', 'code here', true);
        return;
      }

      // Bold: Ctrl+B or Cmd+B
      if (isCmdOrCtrl && !e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        applyFormat('**', '**', 'bold text');
        return;
      }

      // Italic: Ctrl+I or Cmd+I
      if (isCmdOrCtrl && !e.shiftKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        applyFormat('*', '*', 'italic text');
        return;
      }

      // Link: Ctrl+K or Cmd+K
      if (isCmdOrCtrl && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        applyFormat('[', '](https://url.com)', 'link label');
        return;
      }

      // Auto-continue numbered/bullet lists on Enter
      if (e.key === 'Enter' && !e.shiftKey && !isCmdOrCtrl) {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const result = handleListContinuationOnEnter(
          notes,
          textarea.selectionStart
        );

        if (result.handled) {
          e.preventDefault();
          onNotesChange(result.newText);
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(
                result.newCursorPos,
                result.newCursorPos
              );
              adjustHeight();
            }
          });
        }
      }
    },
    [adjustHeight, applyFormat, notes, onNotesChange]
  );

  return {
    textareaRef,
    applyFormat,
    handleKeyDown,
    adjustHeight,
  };
}
