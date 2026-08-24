/** Deterministic DOM utilities for the WYSIWYG editor.
 *
 * Everything that used to rely on execCommand quirks for block
 * transformations goes through here so behavior is identical on every
 * call: find the real line-level block (even nested inside lists or
 * quotes), convert character offsets to Ranges and back, and place the
 * caret explicitly instead of hoping the browser guessed right.
 */

import { BLOCK_STYLES } from './richTextMarkdownUtils';

/** Line-level blocks the editor recognizes. */
export const LINE_BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, blockquote';

const isElement = (n: Node | null): n is HTMLElement =>
  !!n && n.nodeType === Node.ELEMENT_NODE;

/**
 * Nearest line-level block containing `node`, scoped to `root`.
 * Inside `<ul><li><span>text` this returns the LI (not the UL) â€”
 * the previous implementation returned the whole list here.
 */
export function findCaretBlock(root: HTMLElement, node: Node): HTMLElement | null {
  let cur: Node | null = node;
  while (cur && root.contains(cur)) {
    if (isElement(cur)) {
      if (cur === root) return null;
      if (cur.matches(LINE_BLOCK_SELECTOR)) return cur;
    }
    cur = cur.parentNode;
  }
  return null;
}

/** Direct child of root containing (or equal to) block. */
export function topLevelChildOf(root: HTMLElement, node: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = node;
  while (cur && cur.parentElement !== root) {
    if (cur.parentElement === null || !root.contains(cur.parentElement)) return null;
    cur = cur.parentElement;
  }
  return cur;
}

export function selectionInside(root: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  return range;
}

/** Character offset of the caret within `container`'s text content. */
export function caretCharOffset(container: HTMLElement, range: Range): number {
  const pre = document.createRange();
  try {
    pre.selectNodeContents(container);
    pre.setEnd(range.startContainer, range.startOffset);
  } catch {
    return 0;
  }
  return pre.toString().length;
}

interface OffsetPoint {
  node: Text;
  offset: number;
}

function locateCharOffset(container: HTMLElement, target: number): OffsetPoint | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let last: OffsetPoint | null = null;
  while (walker.nextNode()) {
    const t = walker.currentNode as Text;
    const len = t.nodeValue?.length ?? 0;
    if (pos + len >= target) return { node: t, offset: target - pos };
    last = { node: t, offset: len };
    pos += len;
  }
  // No text nodes at all (fully empty container)
  return last;
}

/** Range spanning [start,end] character offsets within container's text. */
export function charOffsetToRange(
  container: HTMLElement,
  start: number,
  end: number
): Range | null {
  const startPoint = locateCharOffset(container, Math.max(0, start));
  const endPoint = locateCharOffset(container, Math.max(0, end));
  if (!startPoint || !endPoint) return null;
  const range = document.createRange();
  try {
    range.setStart(startPoint.node, Math.max(0, Math.min(startPoint.offset, startPoint.node.length)));
    range.setEnd(endPoint.node, Math.max(0, Math.min(endPoint.offset, endPoint.node.length)));
  } catch {
    return null;
  }
  return range;
}

function applySelection(range: Range): void {
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Places the caret at a character offset within container. */
export function placeCaretAtOffset(container: HTMLElement, offset: number): void {
  const point = locateCharOffset(container, Math.max(0, offset));
  if (point) {
    const range = document.createRange();
    try {
      range.setStart(point.node, Math.max(0, Math.min(point.offset, point.node.length)));
      range.collapse(true);
      applySelection(range);
      return;
    } catch {
      /* fall through to container fallback */
    }
  }
  // No text nodes (e.g., <br>-only or empty block): park the caret at
  // the start of the container itself.
  const fallback = document.createRange();
  fallback.selectNodeContents(container);
  fallback.collapse(true);
  applySelection(fallback);
}

export function placeCaretAtStart(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(true);
  applySelection(range);
}

export function placeCaretAtEnd(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  applySelection(range);
}

export function focusEditor(editor: HTMLElement): void {
  if (document.activeElement !== editor) editor.focus();
}

/**
 * Snapshot of caret position + scroll for restore across innerHTML rewrites.
 * Offsets are document-wide character offsets; clamped on restore.
 */
export interface CaretSnapshot {
  offset: number;
  scrollTop: number;
}

export function snapshotCaret(root: HTMLElement): CaretSnapshot | null {
  const range = selectionInside(root);
  const docText = root.textContent ?? '';
  if (!range) return { offset: docText.length, scrollTop: root.scrollTop };
  // Document-wide offset: walk all text nodes before the caret container
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let pos = 0;
  while (walker.nextNode()) {
    const t = walker.currentNode as Text;
    if (t === range.startContainer) {
      pos += range.startOffset;
      break;
    }
    pos += t.nodeValue?.length ?? 0;
  }
  return { offset: pos, scrollTop: root.scrollTop };
}

export function restoreCaret(root: HTMLElement, snap: CaretSnapshot | null): void {
  root.scrollTop = snap?.scrollTop ?? 0;
  if (!snap) return;
  const total = (root.textContent ?? '').length;
  const offset = Math.max(0, Math.min(snap.offset, total));
  const point = locateCharOffset(root, offset);
  if (!point) return;
  const range = document.createRange();
  try {
    range.setStart(point.node, Math.max(0, Math.min(point.offset, point.node.length)));
    range.collapse(true);
    applySelection(range);
  } catch {
    /* ignore */
  }
}

/** True when block has no meaningful content (no text, no img). */
export function isEmptyBlock(block: HTMLElement): boolean {
  if (block.querySelector('img')) return false;
  return (block.textContent ?? '').trim().length === 0;
}

/**
 * Enter-inside-a-callout: exits the quote into a normal paragraph BELOW it,
 * carrying any post-caret text along (Notion-style). Content before the
 * caret stays quoted. Returns true when the event was handled.
 */
export function exitCalloutOnEnter(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;

  let bq: HTMLElement | null = null;
  let node: Node | null = range.startContainer;
  while (node && editor.contains(node)) {
    if (isElement(node) && (node as HTMLElement).tagName === 'BLOCKQUOTE') {
      bq = node as HTMLElement;
      break;
    }
    if (node === editor) break;
    node = node.parentNode;
  }
  if (!bq) return false;

  const p = document.createElement('p');
  p.className = BLOCK_STYLES.paragraph;

  const insertRef: ChildNode | null = bq.nextSibling;
  const insertParent: HTMLElement = bq.parentElement ?? editor;

  if (bq.hasChildNodes()) {
    // Everything from the caret to the end of the quote travels to the new p
    const tail = document.createRange();
    tail.setStart(range.startContainer, range.startOffset);
    try {
      tail.setEndAfter(bq.lastChild!);
    } catch {
      /* degenerate quote â€” fall through with empty tail */
    }
    const frag = tail.extractContents();

    // Drop the line-breaks that separated the caret line from later lines
    while (
      frag.firstChild &&
      isElement(frag.firstChild) &&
      (frag.firstChild as HTMLElement).tagName === 'BR'
    ) {
      frag.removeChild(frag.firstChild);
    }

    if (frag.hasChildNodes()) p.appendChild(frag);
    else p.innerHTML = '<br>';

    // Tidy trailing separators left behind in the quote
    while (
      bq.lastChild &&
      isElement(bq.lastChild) &&
      (bq.lastChild as HTMLElement).tagName === 'BR'
    ) {
      bq.removeChild(bq.lastChild);
    }
    if (isEmptyBlock(bq)) bq.remove();
  } else {
    bq.remove();
  }

  insertParent.insertBefore(p, insertRef);
  placeCaretAtStart(p);
  focusEditor(editor);
  return true;
}

/** Guarantees a collapsed caret can live in the block (<br> seed). */
export function ensurePlaceable(block: HTMLElement): void {
  if (!block.querySelector('br') && (block.textContent ?? '').length === 0 && !block.querySelector('img')) {
    block.appendChild(document.createElement('br'));
  }
}

export interface ListSplit {
  /** Element to insert the replacement after (the list itself when li is last). */
  insertAfter: HTMLElement;
  /** Removes the li from its list, cleaning up empty shells. Returns nothing. */
  detach(): void;
}

/**
 * Prepares extraction of an LI from its list: splits sibling items into a
 * cloned tail list so order survives replacing just one item.
 */
export function prepareListExtraction(li: HTMLElement): ListSplit {
  const list = li.parentElement as HTMLElement;
  const siblings = Array.from(list.children);
  const index = siblings.indexOf(li);
  const after = siblings.slice(index + 1);

  return {
    insertAfter: list,
    detach() {
      if (after.length > 0) {
        const tail = list.cloneNode(false) as HTMLElement;
        after.forEach((c) => tail.appendChild(c));
        list.insertAdjacentElement('afterend', tail);
      }
      list.removeChild(li);
      if (list.children.length === 0) list.remove();
    },
  };
}
