import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import {
  isInsideCodeFence,
  toggleTaskItem,
  htmlToMarkdown,
} from './richTextMarkdownUtils';
import {
  useValueSync,
} from './useValueSync';
import {
  useSlashMenu,
  EMPTY_SLASH,
} from './useSlashMenu';
import {
  useLinkPopover,
} from './useLinkPopover';
import {
  useClipboard,
} from './useClipboard';
import {
  resolveEnterStrategy,
  executeEnterStrategy,
  escapeInlineFormattingRight,
  shorthandFor,
} from './editorKeyboard';
import {
  getActionById,
  type EditorActionId,
  type FormattingAction,
} from './editorActions';
import {
  tryApplyInlineMarkdown,
} from './editorInlineMarkdown';
import { placeCaretAtEnd, cleanupEmptyLinks } from './editorDom';

export interface UseRichTextEditorOptions {
  value: string;
  onChange: (markdown: string) => void;
}

/**
 * Orchestrator composing the editor sub-hooks. Public API unchanged:
 * value in → canonical Markdown out, caret-safe across auto-save.
 */
export function useRichTextEditor({ value, onChange }: UseRichTextEditorOptions) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastMarkdownRef = useRef<string | null>(null);
  const suppressChangeRef = useRef(false);

  /* ---------------- change pipeline ---------------- */

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const md = htmlToMarkdown(el);
    lastMarkdownRef.current = md;
    onChange(md);
  }, [onChange]);

  const linkApi = useLinkPopover(editorRef, emitChange);

  /* ---------------- slash menu ---------------- */

  const slashApi = useSlashMenu(editorRef);
  const {
    slash,
    setSlash,
    closeSlashMenu,
    getCaretLineInfo,
    caretViewportPos,
    updateFromCaret,
    openOptimistically,
    stripAndSettle,
  } = slashApi;

  const handleInput = useCallback(() => {
    if (suppressChangeRef.current) return;
    const el = editorRef.current;
    const sel = window.getSelection();
    if (el && sel) {
      // Strip empty <a> wrappers the browser leaves behind after
      // Delete/Backspace at link boundaries — the native contentEditable
      // engine deletes the text content but keeps the zombie anchor tag.
      cleanupEmptyLinks(el, sel);
      tryApplyInlineMarkdown(el, sel);
    }
    emitChange();
    updateFromCaret();
  }, [emitChange, updateFromCaret]);

  /* ---------------- value sync ---------------- */

  const syncHooks = useMemo(
    () => ({
      beforeReplace: () => {
        suppressChangeRef.current = true;
      },
      afterReplace: () => {
        suppressChangeRef.current = false;
        lastMarkdownRef.current = value;
        setSlash(EMPTY_SLASH);
      },
    }),
    // Recreate when value changes so afterReplace captures the latest echo
    [value, setSlash]
  );
  useValueSync(editorRef, value, syncHooks, lastMarkdownRef);

  /* ---------------- action dispatch ---------------- */

  const applyAction = useCallback(
    (action: FormattingAction, fromSlashMenu: boolean) => {
      const el = editorRef.current;
      if (!el) return;
      if (fromSlashMenu) stripAndSettle();
      closeSlashMenu();
      action.apply({ editor: el, requestLink: linkApi.openLinkDialog });
      emitChange();
    },
    [stripAndSettle, closeSlashMenu, emitChange]
  );

  const onMutate = useCallback(() => {
    emitChange();
    updateFromCaret();
  }, [emitChange, updateFromCaret]);
  const clipboard = useClipboard(editorRef, onMutate);

  /* ---------------- keyboard ---------------- */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const el = editorRef.current;
      const sel = window.getSelection();

      /* --- Optimistic "/" open (fenced blocks excluded) --- */
      if (e.key === '/' && !isCmdOrCtrl && !e.altKey && !slash.open && el) {
        const anchorNode = sel?.anchorNode ?? el;
        if (!isInsideCodeFence(anchorNode) && openOptimistically()) {
          e.preventDefault();
          emitChange();
          return;
        }
      }

      /* --- Slash menu navigation --- */
      if (slash.open && el) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSlash((prev) => ({
              ...prev,
              selectedIndex:
                prev.items.length > 0
                  ? (prev.selectedIndex + 1) % prev.items.length
                  : 0,
            }));
            return;
          case 'ArrowUp':
            e.preventDefault();
            setSlash((prev) => ({
              ...prev,
              selectedIndex:
                prev.items.length > 0
                  ? (prev.selectedIndex - 1 + prev.items.length) % prev.items.length
                  : 0,
            }));
            return;
          case 'Enter': {
            e.preventDefault();
            const item = slash.items[slash.selectedIndex];
            if (item) applyAction(item, true);
            return;
          }
          case 'Escape':
            e.preventDefault();
            closeSlashMenu();
            el.focus();
            return;
          case ' ':
            closeSlashMenu(); // commit literal text; no preventDefault
            return;
        }
      }

      /* --- Registry shortcuts --- */
      if (isCmdOrCtrl && el) {
        const key = e.key.toLowerCase();
        const shortcutId: EditorActionId | 'link-dialog' | null =
          !e.shiftKey && key === 'b'
            ? 'bold'
            : !e.shiftKey && key === 'i'
              ? 'italic'
              : e.shiftKey && key === 'k'
                ? 'code'
                : !e.shiftKey && key === 'k'
                  ? 'link-dialog'
                  : null;
        if (shortcutId) {
          e.preventDefault();
          if (shortcutId === 'link-dialog') {
            linkApi.openLinkDialog();
          } else {
            const action = getActionById(shortcutId);
            if (action) applyAction(action, false);
          }
          return;
        }
      }

      if (!el || !sel) return;

      /* --- Keyboard-operable checkboxes (FR-021) --- */
      const target = e.target as HTMLElement;
      if (
        target?.matches?.('input[data-task-checkbox]') &&
        (e.key === ' ' || e.key === 'Enter')
      ) {
        e.preventDefault();
        const li = target.closest('li.task-item') as HTMLElement | null;
        if (li) {
          toggleTaskItem(li);
          handleInput();
        }
        return;
      }

      /* --- Enter strategies --- */
      if (e.key === 'Enter' && !e.shiftKey && !isCmdOrCtrl && sel.isCollapsed) {
        const strategy = resolveEnterStrategy(el, sel);
        if (strategy) {
          e.preventDefault();
          executeEnterStrategy(el, strategy, sel);
          handleInput();
          return;
        }
      }

      /* --- ArrowRight: escape inline formatting --- */
      if (e.key === 'ArrowRight' && !e.shiftKey && !isCmdOrCtrl) {
        if (escapeInlineFormattingRight(el)) {
          e.preventDefault();
          return;
        }
      }

      /* --- Markdown space-shorthands via the deterministic engine --- */
      if (e.key === ' ' && !isCmdOrCtrl && sel.isCollapsed && sel.anchorNode) {
        const anchorEl =
          sel.anchorNode.nodeType === Node.ELEMENT_NODE
            ? (sel.anchorNode as HTMLElement)
            : sel.anchorNode.parentElement;
        if (anchorEl && !isInsideCodeFence(sel.anchorNode)) {
          const info = getCaretLineInfo();
          const line = info.textBefore.split('\n').pop() ?? '';
          const sh = shorthandFor(line);
          if (sh && info.block) {
            e.preventDefault();
            if (
              sel.anchorNode.nodeType === Node.TEXT_NODE &&
              (sel.anchorNode as Text).nodeValue !== null
            ) {
              const t = sel.anchorNode as Text;
              t.deleteData(Math.max(0, sel.anchorOffset - sh.markerLen), sh.markerLen);
            }
            const action = getActionById(sh.actionId);
            if (action) applyAction(action, false);
            return;
          }
        }
      }
    },
    [
      slash,
      applyAction,
      closeSlashMenu,
      handleInput,
      getCaretLineInfo,
      caretViewportPos,
      openOptimistically,
      emitChange,
      linkApi,
      setSlash,
    ]
  );

  /* ---------------- click ---------------- */

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;

      const checkbox = target.closest?.('input[data-task-checkbox]');
      if (checkbox) {
        e.preventDefault();
        const li = checkbox.closest('li.task-item') as HTMLElement | null;
        if (li) {
          toggleTaskItem(li);
          handleInput();
        }
        return;
      }

      // If user clicks on the li row outside checkbox and text span (e.g. empty line padding or gap), route caret into .task-text
      const li = target.closest?.('li.task-item') as HTMLElement | null;
      if (li && !target.closest('.task-text')) {
        const textEl = li.querySelector('.task-text') as HTMLElement | null;
        if (textEl) placeCaretAtEnd(textEl);
      }

      const anchor = target.closest('a');
      if (anchor && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const href = anchor.getAttribute('href');
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
      }
    },
    [handleInput]
  );

  /* ---------------- public API (unchanged shape) ---------------- */

  return useMemo(
    () => ({
      editorRef,
      handleInput,
      handleKeyDown,
      handlePaste: clipboard.handlePaste,
      handleClick,
      handleCopy: clipboard.handleCopy,
      slash,
      setSlashSelectedIndex: (i: number) =>
        setSlash((p) => ({ ...p, selectedIndex: i })),
      applySlashAction: (id: Parameters<typeof getActionById>[0]) => {
        const action = getActionById(id);
        if (action) applyAction(action, true);
      },
      closeSlashMenu,
      openLinkDialog: linkApi.openLinkDialog,
      linkDialog: linkApi.linkDialog,
      setLinkUrl: linkApi.setLinkUrl,
      applyLinkFromDialog: () => linkApi.applyLinkFromDialog(),
      closeLinkDialog: linkApi.closeLinkDialog,
    }),
    [
      handleInput,
      handleKeyDown,
      clipboard.handlePaste,
      clipboard.handleCopy,
      slash,
      setSlash,
      applyAction,
      closeSlashMenu,
      linkApi,
    ]
  );
}
