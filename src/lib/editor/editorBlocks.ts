import React from 'react';
import { BLOCK_STYLES, isInsideCodeFence } from './richTextMarkdownUtils';
import {
  findCaretBlock,
  selectionInside,
  focusEditor,
  placeCaretAtEnd,
  placeCaretAtStart,
  isEmptyBlock,
  ensurePlaceable,
  prepareListExtraction,
} from './editorDom';

/**
 * Deterministic block transformation engine.
 *
 * Every block-level format goes through here instead of execCommand so the
 * outcome is identical on every call: build the target element, swap it in
 * (list-aware), and place the caret explicitly.
 */

/** Forces semantic tags (<b>/<i>) instead of inline CSS spans. */
export function forceSemanticFormatting(): void {
  try {
    document.execCommand('styleWithCSS', false, 'false');
  } catch {
    /* unsupported — Chromium default is already off */
  }
}

export function makeElement(tag: string, className?: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

export interface EditorActionContext {
  editor: HTMLElement;
  requestLink?: () => void;
}

/**
 * Strips leading/trailing <br> seeds from a settled block's innerHTML so
 * they never leak into newly built targets (the phantom-line caret bug).
 */
export function blockInnerHtml(innerHtml: string): string {
  return innerHtml.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+\s*$/gi, '').trim();
}

/** Moves children of source into target (in order) and removes source. */
function absorb(source: HTMLElement, target: HTMLElement): void {
  while (source.firstChild) target.appendChild(source.firstChild);
  source.remove();
}

/**
 * Caret placement after a deterministic swap: empty hosts (no text, e.g.
 * a fresh to-do span) get START placement so typing lands inside the item;
 * populated hosts get END placement.
 */
function placeCaretInHost(caretEl: HTMLElement): void {
  if ((caretEl.textContent ?? '').trim() === '') placeCaretAtStart(caretEl);
  else placeCaretAtEnd(caretEl);
}

/**
 * Replaces `current` with `newEl`, correctly extracting from lists
 * (splitting trailing siblings into a cloned tail) and coalescing with
 * adjacent same-type lists. Then places the caret in `caretEl`.
 */
export function swapBlock(
  editor: HTMLElement,
  current: HTMLElement,
  newEl: HTMLElement,
  caretEl: HTMLElement
): void {
  const isListItem =
    current.tagName === 'LI' &&
    !!current.parentElement &&
    current.parentElement !== editor;

  if (isListItem) {
    const list = current.parentElement!;
    const prev = list.previousElementSibling as HTMLElement | null;
    if (prev && prev.tagName === newEl.tagName && prev.className === newEl.className) {
      // Merge into the preceding list of the same kind
      while (newEl.firstChild) prev.appendChild(newEl.firstChild);
      const split = prepareListExtraction(current);
      split.detach();
      placeCaretInHost(caretEl);
      return;
    }

    const split = prepareListExtraction(current);
    split.replaceWith(newEl);

    const next = newEl.nextElementSibling as HTMLElement | null;
    if (next && next.tagName === newEl.tagName && next.className === newEl.className) {
      absorb(next, newEl);
    }
    placeCaretInHost(caretEl);
    return;
  }

  current.replaceWith(newEl);

  // Coalesce with an adjacent list of the same kind (bullet -> bullet etc.)
  const prev = newEl.previousElementSibling as HTMLElement | null;
  if (prev && prev.tagName === newEl.tagName && prev.className === newEl.className) {
    absorb(newEl, prev);
    placeCaretInHost(caretEl);
    return;
  }
  const next = newEl.nextElementSibling as HTMLElement | null;
  if (next && next.tagName === newEl.tagName && next.className === newEl.className) {
    absorb(next, newEl);
  }
  placeCaretInHost(caretEl);
}

export function paragraphFrom(innerHtml: string): HTMLElement {
  const p = makeElement('p', BLOCK_STYLES.paragraph);
  p.innerHTML = innerHtml || '<br>';
  return p;
}

export function makeTaskItemEl(innerHtml: string, checked: boolean): HTMLElement {
  const list = makeElement('ul', `${BLOCK_STYLES.taskList} text-slate-800 text-xs`);
  const li = makeElement('li', `${BLOCK_STYLES.taskItem}${checked ? ' task-checked' : ''}`);
  li.dataset.task = 'true';
  li.dataset.checked = checked ? 'true' : 'false';

  const textLabel = innerHtml.replace(/<[^>]*>/g, '').trim() || 'Toggle task item';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.setAttribute('data-task-checkbox', 'true');
  input.setAttribute('aria-label', textLabel);
  input.className = BLOCK_STYLES.checkbox;

  const span = makeElement('span', 'flex-1 task-text');
  // No <br> seed — an empty span lets the caret fall back to container-start.
  span.innerHTML = innerHtml;

  li.appendChild(input);
  li.appendChild(span);
  list.appendChild(li);
  return list;
}

export interface TransformOptions {
  /** Builds the replacement element; receives cleaned inner HTML of source. */
  build: (innerHtml: string, source: HTMLElement) => HTMLElement;
  /** Element inside the replacement that should receive the caret. */
  caretSelector?: string;
  /** Resolve a different source element than the caret block. Return null to keep default. */
  resolveSource?: (current: HTMLElement, editor: HTMLElement) => HTMLElement | null;
}

/**
 * Deterministic block transformation at the caret.
 */
export function transformBlockAtCaret(
  editor: HTMLElement,
  options: TransformOptions
): void {
  const sel = selectionInside(editor);
  if (!sel) return;

  const current = findCaretBlock(editor, sel.startContainer);
  if (!current) return;

  const source =
    (options.resolveSource && options.resolveSource(current, editor)) || current;
  if (!editor.contains(source)) return;

  const rawHtml =
    source.classList.contains('task-item') && source.querySelector('.task-text')
      ? source.querySelector('.task-text')!.innerHTML
      : source.innerHTML;

  const newEl = options.build(blockInnerHtml(rawHtml), source);

  // Empty content still needs a placeable caret line
  if (isEmptyBlock(newEl)) ensurePlaceable(newEl);

  const caretHost =
    (options.caretSelector ? newEl.querySelector(options.caretSelector) : null) ??
    newEl;

  swapBlock(editor, source, newEl, caretHost as HTMLElement);
  focusEditor(editor);
}
