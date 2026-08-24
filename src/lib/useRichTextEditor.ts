import { useRef, useEffect, useCallback, useState } from 'react';
import {
  markdownToHtml,
  htmlToMarkdown,
  compareCanonical,
  isInsideCodeFence,
  toggleTaskItem,
  spawnNextTaskItem,
} from './richTextMarkdownUtils';
import {
  filterActions,
  getActionById,
  type EditorActionId,
  type FormattingAction,
} from '../components/editor/editorActions';

export interface UseRichTextEditorOptions {
  value: string;
  onChange: (markdown: string) => void;
}

export interface SlashMenuState {
  open: boolean;
  query: string;
  rect: { top: number; left: number } | null;
  items: FormattingAction[];
  selectedIndex: number;
}

export interface LinkDialogState {
  open: boolean;
  url: string;
}

const EMPTY_SLASH: SlashMenuState = {
  open: false,
  query: '',
  rect: null,
  items: [],
  selectedIndex: 0,
};

/**
 * Generic caret-safe rich text editing hook (Markdown in / Markdown out).
 *
 * Sync discipline (research R2):
 * 1. Full DOM replacement happens ONLY when the incoming value differs
 *    canonically from the serialized editor content — never on echo-backs
 *    of our own changes.
 * 2. While the user types, the DOM is authoritative and never rewritten,
 *    so caret/selection/scroll survive auto-save cycles untouched.
 */
export function useRichTextEditor({ value, onChange }: UseRichTextEditorOptions) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastMarkdownRef = useRef<string>(value || '');
  const suppressChangeRef = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const linkedAnchorRef = useRef<HTMLAnchorElement | null>(null);

  const [slash, setSlash] = useState<SlashMenuState>(EMPTY_SLASH);
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({
    open: false,
    url: '',
  });

  /* ---------------- value sync (caret-safe) ---------------- */

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    if (compareCanonical(htmlToMarkdown(el), value)) {
      // No-op: DOM already represents this Markdown (typing echo / save round-trip)
      lastMarkdownRef.current = value;
      return;
    }

    // External replacement: record switch, draft restore, template insert
    suppressChangeRef.current = true;
    el.innerHTML = markdownToHtml(value || '');
    lastMarkdownRef.current = value;
    suppressChangeRef.current = false;
    setSlash(EMPTY_SLASH);
  }, [value]);

  /* ---------------- caret/line helpers ---------------- */

  const getCaretLineInfo = useCallback((): {
    block: HTMLElement | null;
    textBefore: string;
  } => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
      return { block: null, textBefore: '' };
    }
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;
    let block: HTMLElement | null = null;
    while (node && el.contains(node)) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as HTMLElement).parentElement === el
      ) {
        block = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }
    if (!block) return { block: null, textBefore: '' };

    const pre = document.createRange();
    try {
      pre.selectNodeContents(block);
      pre.setEnd(range.startContainer, range.startOffset);
    } catch {
      return { block, textBefore: '' };
    }
    return { block, textBefore: pre.toString() };
  }, []);

  const updateSlashFromCaret = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    const anchorNode = sel?.anchorNode ?? el;
    const { textBefore } = getCaretLineInfo();

    let rect: { top: number; left: number } | null = null;
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const r = sel.getRangeAt(0).getBoundingClientRect();
      rect = { top: r.bottom + 4, left: r.left };
    }
    const caretRect =
      sel && sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null;

    const line = textBefore.split('\n').pop() ?? '';
    const match = /^\/(\S*)$/.exec(line);

    if (!match || isInsideCodeFence(anchorNode)) {
      setSlash((prev) => (prev.open ? EMPTY_SLASH : prev));
      return;
    }

    const pos = caretRect
      ? { top: caretRect.bottom + 4, left: caretRect.left }
      : rect;
    const items = filterActions(match[1]);
    setSlash({
      open: true,
      query: match[1],
      rect: pos,
      items,
      selectedIndex: 0,
    });
  }, [getCaretLineInfo]);

  const closeSlashMenu = useCallback(() => setSlash(EMPTY_SLASH), []);

  /** Deletes the "/query" literal before applying a slash action. */
  const stripSlashLiteral = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;
    const info = getCaretLineInfo();
    if (!info.block) return;
    const line = info.textBefore.split('\n').pop() ?? '';
    const match = /^\/(\S*)$/.exec(line);
    if (!match) return;

    const endOffset = info.textBefore.length;
    const startOffset = endOffset - line.length; // position of '/'
    const walkerBlock = info.block;
    const range = document.createRange();
    range.selectNodeContents(walkerBlock);

    // Walk text nodes to char offsets
    const walker = document.createTreeWalker(walkerBlock, NodeFilter.SHOW_TEXT);
    let pos = 0;
    let startNode: Text | null = null;
    let startOff = 0;
    let endNode: Text | null = null;
    let endOff = 0;
    while (walker.nextNode()) {
      const t = walker.currentNode as Text;
      const len = t.nodeValue?.length ?? 0;
      if (!startNode && pos + len >= startOffset) {
        startNode = t;
        startOff = startOffset - pos;
      }
      if (!endNode && pos + len >= endOffset) {
        endNode = t;
        endOff = endOffset - pos;
        break;
      }
      pos += len;
    }
    if (startNode && endNode) {
      range.setStart(startNode, Math.max(0, startOff));
      range.setEnd(endNode, Math.max(0, endOff));
      range.deleteContents();
    }
  }, [getCaretLineInfo]);

  /* ---------------- change pipeline ---------------- */

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const md = htmlToMarkdown(el);
    lastMarkdownRef.current = md;
    onChange(md);
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (suppressChangeRef.current) return;
    emitChange();
    updateSlashFromCaret();
  }, [emitChange, updateSlashFromCaret]);

  /* ---------------- slash actions ---------------- */

  const applyAction = useCallback(
    (action: FormattingAction, fromSlashMenu: boolean) => {
      const el = editorRef.current;
      if (!el) return;
      if (fromSlashMenu) stripSlashLiteral();
      closeSlashMenu();
      action.apply({ editor: el, requestLink: openLinkDialog });
      emitChange();
    },
    [stripSlashLiteral, closeSlashMenu, emitChange]
  );

  const applySlashSelection = useCallback(() => {
    const item = slash.items[slash.selectedIndex];
    if (item) applyAction(item, true);
  }, [slash, applyAction]);

  /* ---------------- link dialog ---------------- */

  function openLinkDialog() {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    linkedAnchorRef.current = null;
    let prefilled = 'https://';
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      const node =
        sel.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (sel.anchorNode as HTMLElement)
          : sel.anchorNode?.parentElement;
      const anchor = node?.closest('a');
      if (anchor && el.contains(anchor)) {
        linkedAnchorRef.current = anchor as HTMLAnchorElement;
        prefilled = anchor.getAttribute('href') || prefilled;
      }
    }
    setLinkDialog({ open: true, url: prefilled });
  }

  const closeLinkDialog = useCallback(() => {
    setLinkDialog({ open: false, url: '' });
    savedRangeRef.current = null;
    linkedAnchorRef.current = null;
  }, []);

  const applyLink = useCallback(
    (url: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const cleanUrl = url.trim();

      // Update/remove path for an existing link
      if (linkedAnchorRef.current) {
        const anchor = linkedAnchorRef.current;
        if (!cleanUrl || cleanUrl === 'https://' || cleanUrl === 'http://') {
          // Remove link: unwrap anchor
          const parent = anchor.parentNode;
          if (parent) {
            while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
            parent.removeChild(anchor);
          }
        } else {
          anchor.setAttribute('href', cleanUrl);
        }
        linkedAnchorRef.current = null;
        savedRangeRef.current = null;
        closeLinkDialog();
        emitChange();
        return;
      }

      if (savedRangeRef.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedRangeRef.current);
      }

      if (cleanUrl && cleanUrl !== 'https://' && cleanUrl !== 'http://') {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString() : '';
        if (!selectedText) {
          document.execCommand(
            'insertHTML',
            false,
            `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium cursor-pointer">${cleanUrl}</a>&nbsp;`
          );
        } else {
          document.execCommand('createLink', false, cleanUrl);
        }
        emitChange();
      }
      closeLinkDialog();
    },
    [closeLinkDialog, emitChange]
  );

  /* ---------------- paste ---------------- */

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const pastedText = e.clipboardData.getData('text/plain');
      if (!pastedText) return;

      const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
      const isUrl = urlRegex.test(pastedText.trim());

      const selection = window.getSelection();
      const hasSelection =
        selection && !selection.isCollapsed && selection.toString().length > 0;

      if (isUrl && hasSelection) {
        e.preventDefault();
        document.execCommand('createLink', false, pastedText.trim());
        handleInput();
      }
    },
    [handleInput]
  );

  /* ---------------- keyboard ---------------- */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const el = editorRef.current;

      /* --- Slash menu navigation (US2 surface) --- */
      if (slash.open) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSlash((prev) => ({
            ...prev,
            selectedIndex:
              prev.items.length > 0
                ? (prev.selectedIndex + 1) % prev.items.length
                : 0,
          }));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSlash((prev) => ({
            ...prev,
            selectedIndex:
              prev.items.length > 0
                ? (prev.selectedIndex - 1 + prev.items.length) % prev.items.length
                : 0,
          }));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          applySlashSelection();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          closeSlashMenu();
          el?.focus();
          return;
        }
        if (e.key === ' ') {
          // Commit literal "/" text and dismiss — no preventDefault
          closeSlashMenu();
          return;
        }
      }

      /* --- Registry shortcuts --- */
      if (isCmdOrCtrl && !e.shiftKey && (e.key === 'b' || e.key === 'B') && el) {
        e.preventDefault();
        applyAction(getActionById('bold')!, false);
        return;
      }
      if (isCmdOrCtrl && !e.shiftKey && (e.key === 'i' || e.key === 'I') && el) {
        e.preventDefault();
        applyAction(getActionById('italic')!, false);
        return;
      }
      if (isCmdOrCtrl && e.shiftKey && (e.key === 'k' || e.key === 'K') && el) {
        e.preventDefault();
        applyAction(getActionById('code')!, false);
        return;
      }
      if (isCmdOrCtrl && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openLinkDialog();
        return;
      }

      if (!el) return;

      /* --- Keyboard-operable checkboxes (FR-021) --- */
      const target = e.target as HTMLElement;
      if (
        target &&
        target.matches?.('input[data-task-checkbox]') &&
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

      /* --- Enter at end of a task item spawns the next one (FR-010) --- */
      if (e.key === 'Enter' && !e.shiftKey && !isCmdOrCtrl) {
        const selection = window.getSelection();
        if (selection && selection.isCollapsed && selection.rangeCount > 0) {
          const anchor = selection.anchorNode;
          const taskLi =
            anchor?.nodeType === Node.ELEMENT_NODE
              ? (anchor as HTMLElement).closest('li.task-item')
              : anchor?.parentElement?.closest('li.task-item');
          if (taskLi && el.contains(taskLi)) {
            const caretRange = selection.getRangeAt(0);
            const endProbe = document.createRange();
            endProbe.selectNodeContents(taskLi.querySelector('.task-text') ?? taskLi);
            endProbe.collapse(false);
            if (caretRange.compareBoundaryPoints(Range.END_TO_END, endProbe) >= 0) {
              e.preventDefault();
              const next = spawnNextTaskItem(taskLi as HTMLElement);
              const focusSpan = next.querySelector('.task-text') ?? next;
              const newRange = document.createRange();
              newRange.selectNodeContents(focusSpan);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              handleInput();
              return;
            }
          }
        }
      }

      /* --- Enter: escape headings into paragraphs --- */
      if (e.key === 'Enter' && !e.shiftKey && !isCmdOrCtrl) {
        const selection = window.getSelection();
        if (selection && selection.isCollapsed && selection.rangeCount > 0) {
          const anchor = selection.anchorNode;
          const headingParent =
            anchor?.nodeType === Node.ELEMENT_NODE
              ? (anchor as HTMLElement).closest('h1, h2, h3, h4, h5, h6')
              : anchor?.parentElement?.closest('h1, h2, h3, h4, h5, h6');

          if (headingParent && el.contains(headingParent)) {
            e.preventDefault();
            const p = document.createElement('p');
            p.className = 'text-slate-800 text-xs leading-relaxed my-1';
            p.innerHTML = '<br>';
            headingParent.insertAdjacentElement('afterend', p);

            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            handleInput();
            return;
          }
        }
      }

      /* --- ArrowRight: escape inline formatting --- */
      if (e.key === 'ArrowRight' && !e.shiftKey && !isCmdOrCtrl) {
        const selection = window.getSelection();
        if (selection && selection.isCollapsed && selection.rangeCount > 0) {
          const node = selection.anchorNode;
          const formatEl = node?.parentElement?.closest('strong, b, em, i, code, a');
          if (formatEl && el.contains(formatEl)) {
            const range = selection.getRangeAt(0);
            const endRange = document.createRange();
            endRange.selectNodeContents(formatEl);
            endRange.collapse(false);

            if (range.compareBoundaryPoints(Range.END_TO_END, endRange) === 0) {
              e.preventDefault();
              let nextNode = formatEl.nextSibling;
              if (!nextNode || nextNode.nodeType !== Node.TEXT_NODE) {
                nextNode = document.createTextNode('\u200B');
                formatEl.parentNode?.insertBefore(nextNode, formatEl.nextSibling);
              }
              const newRange = document.createRange();
              newRange.setStart(nextNode, nextNode.nodeValue ? 1 : 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              return;
            }
          }
        }
      }

      /* --- Markdown shorthand triggers on Space --- */
      if (e.key === ' ') {
        const selection = window.getSelection();
        if (selection && selection.isCollapsed && selection.anchorNode) {
          const textNode = selection.anchorNode;
          if (textNode.nodeType === Node.TEXT_NODE) {
            const textContent = textNode.nodeValue || '';
            const offset = selection.anchorOffset;
            const textBeforeCaret = textContent.slice(0, offset);

            if (textBeforeCaret === '#') {
              e.preventDefault();
              textNode.nodeValue = textContent.slice(offset);
              document.execCommand('formatBlock', false, '<h2>');
              handleInput();
              return;
            }
            if (textBeforeCaret === '##') {
              e.preventDefault();
              textNode.nodeValue = textContent.slice(offset);
              document.execCommand('formatBlock', false, '<h3>');
              handleInput();
              return;
            }
            if (textBeforeCaret === '###') {
              e.preventDefault();
              textNode.nodeValue = textContent.slice(offset);
              document.execCommand('formatBlock', false, '<h4>');
              handleInput();
              return;
            }
            if (textBeforeCaret === '-' || textBeforeCaret === '*') {
              e.preventDefault();
              textNode.nodeValue = textContent.slice(offset);
              document.execCommand('insertUnorderedList', false);
              handleInput();
              return;
            }
            if (textBeforeCaret === '1.') {
              e.preventDefault();
              textNode.nodeValue = textContent.slice(offset);
              document.execCommand('insertOrderedList', false);
              handleInput();
              return;
            }
          }
        }
      }
    },
    [slash, applySlashSelection, closeSlashMenu, applyAction, handleInput]
  );

  /* ---------------- click (Ctrl+Click links) ---------------- */

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;

      // Interactive checkbox toggle inside the editable surface
      const checkbox = target.closest?.('input[data-task-checkbox]');
      if (checkbox) {
        e.preventDefault(); // own the state flip deterministically
        const li = checkbox.closest('li.task-item') as HTMLElement | null;
        if (li) {
          toggleTaskItem(li);
          handleInput();
        }
        return;
      }

      const anchor = target.closest('a');
      if (anchor && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const href = anchor.getAttribute('href');
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    },
    [handleInput]
  );

  return {
    editorRef,
    handleInput,
    handleKeyDown,
    handlePaste,
    handleClick,
    slash,
    setSlashSelectedIndex: (i: number) => setSlash((p) => ({ ...p, selectedIndex: i })),
    applySlashAction: (id: EditorActionId) => {
      const action = getActionById(id);
      if (action) applyAction(action, true);
    },
    closeSlashMenu,
    openLinkDialog,
    linkDialog,
    setLinkUrl: (url: string) => setLinkDialog((p) => ({ ...p, url })),
    applyLinkFromDialog: () => applyLink(linkDialog.url),
    closeLinkDialog,
  };
}
