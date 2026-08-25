import { useCallback, useState, type RefObject } from 'react';
import { isInsideCodeFence } from './richTextMarkdownUtils';
import {
  findCaretBlock,
  selectionInside,
  charOffsetToRange,
  placeCaretAtOffset,
} from './editorDom';
import { menuActions, type FormattingAction } from './editorActions';

export interface SlashMenuState {
  open: boolean;
  query: string;
  rect: { anchorTop: number; anchorBottom: number; left: number } | null;
  items: FormattingAction[];
  selectedIndex: number;
}

export const EMPTY_SLASH: SlashMenuState = {
  open: false,
  query: '',
  rect: null,
  items: [],
  selectedIndex: 0,
};

/** Viewport anchor for a popover, with zero-rect fallbacks. */
export function caretViewportRect(
  el: HTMLElement,
  blockFallback: HTMLElement | null
): { anchorTop: number; anchorBottom: number; left: number } {
  const range = selectionInside(el);
  let r: DOMRect | undefined = range
    ? range.getClientRects()[range.getClientRects().length - 1] ??
      (range.getBoundingClientRect() as DOMRect | undefined)
    : undefined;

  if (!r || (r.top === 0 && r.left === 0 && r.height === 0)) {
    const fb = (blockFallback ?? el).getBoundingClientRect();
    r = fb as DOMRect;
  }
  return { anchorTop: r.top, anchorBottom: r.bottom, left: r.left };
}

/**
 * Slash command menu state machine: optimistic open, query filtering,
 * navigation index, and the atomic strip-and-settle used before applying.
 */
export function useSlashMenu(editorRef: RefObject<HTMLDivElement | null>) {
  const [slash, setSlash] = useState<SlashMenuState>(EMPTY_SLASH);

  const closeSlashMenu = useCallback(() => setSlash(EMPTY_SLASH), []);

  /** Line-level info for the current caret (nested-aware). */
  const getCaretLineInfo = useCallback((): {
    block: HTMLElement | null;
    textBefore: string;
  } => {
    const el = editorRef.current;
    if (!el) return { block: null, textBefore: '' };
    const range = selectionInside(el);
    if (!range) return { block: null, textBefore: '' };

    const block = findCaretBlock(el, range.startContainer);
    if (!block) return { block: null, textBefore: '' };

    const pre = document.createRange();
    try {
      pre.selectNodeContents(block);
      pre.setEnd(range.startContainer, range.startOffset);
    } catch {
      return { block, textBefore: '' };
    }
    return { block, textBefore: pre.toString() };
  }, [editorRef]);

  const caretViewportPos = useCallback(
    () => {
      const el = editorRef.current;
      if (!el) return null;
      const info = getCaretLineInfo();
      return caretViewportRect(el, info.block);
    },
    [editorRef, getCaretLineInfo]
  );

  const updateFromCaret = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    const anchorNode = sel?.anchorNode ?? el;
    const { textBefore } = getCaretLineInfo();

    const line = textBefore.split('\n').pop() ?? '';
    const match = /^\/(\S*)$/.exec(line);

    if (!match || isInsideCodeFence(anchorNode)) {
      setSlash((prev) => (prev.open ? EMPTY_SLASH : prev));
      return;
    }

    setSlash({
      open: true,
      query: match[1],
      rect: caretViewportPos(),
      items: menuActions(match[1]),
      selectedIndex: 0,
    });
  }, [getCaretLineInfo, caretViewportPos, editorRef]);

  /**
   * Optimistic open on the "/" keypress itself — deterministic insertText,
   * independent of input-event ordering on fresh empty lines.
   * Returns false when the context must not open (mid-word, code fence).
   */
  const openOptimistically = useCallback((): boolean => {
    const el = editorRef.current;
    if (!el) return false;
    const sel = window.getSelection();
    const anchorNode = sel?.anchorNode ?? el;
    if (isInsideCodeFence(anchorNode)) return false;

    const info = getCaretLineInfo();
    if (!info.block) return false;
    const line = info.textBefore.split('\n').pop() ?? '';
    if (!(line === '' || /^\/\S*$/.test(line))) return false;

    focusEditorSafe(el);
    document.execCommand('insertText', false, '/');
    setSlash({
      open: true,
      query: '',
      rect: caretViewportPos(),
      items: menuActions(''),
      selectedIndex: 0,
    });
    return true;
  }, [editorRef, getCaretLineInfo, caretViewportPos]);

  /**
   * Atomically deletes the "/query" literal and settles the caret INSIDE
   * the affected block. Query start uses `lastIndexOf('\n') + 1` so
   * continuation lines never lose their preceding break.
   */
  const stripAndSettle = useCallback((): HTMLElement | null => {
    const el = editorRef.current;
    if (!el) return null;
    el.focus();
    const info = getCaretLineInfo();
    if (!info.block) return null;

    const line = info.textBefore.split('\n').pop() ?? '';
    const match = /^\/(\S*)$/.exec(line);

    const endOffset = info.textBefore.length;
    const startOffset = match ? info.textBefore.lastIndexOf('\n') + 1 : endOffset;

    if (match) {
      const range = charOffsetToRange(info.block, startOffset, endOffset);
      if (range) range.deleteContents();

      if (info.block.firstChild?.nodeType === Node.TEXT_NODE) {
        const t = info.block.firstChild as Text;
        t.nodeValue = (t.nodeValue ?? '').replace(/^\s+/, '');
        if (!t.nodeValue) t.remove();
      }
    }

    const len = (info.block.textContent ?? '').length;
    placeCaretAtOffset(info.block, Math.min(startOffset, len));
    return info.block;
  }, [editorRef, getCaretLineInfo]);

  return {
    slash,
    setSlash,
    closeSlashMenu,
    getCaretLineInfo,
    caretViewportPos,
    updateFromCaret,
    openOptimistically,
    stripAndSettle,
  };
}

function focusEditorSafe(el: HTMLElement): void {
  if (document.activeElement !== el) el.focus();
}
