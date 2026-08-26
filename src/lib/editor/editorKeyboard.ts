import { BLOCK_STYLES } from './richTextMarkdownUtils';
import {
  prepareListExtraction,
  placeCaretAtStart,
  isEmptyBlock,
} from './editorDom';

export type EnterStrategy =
  | 'task-exit'
  | 'task-split'
  | 'list-exit'
  | 'callout-exit'
  | 'heading-exit';

function closest(node: Node | null, selector: string): HTMLElement | null {
  const el =
    node?.nodeType === Node.ELEMENT_NODE
      ? (node as HTMLElement)
      : node?.parentElement ?? null;
  return el?.closest?.(selector) ?? null;
}

/**
 * Decides which Enter strategy applies at the current caret.
 * Order matters: task → plain list item → callout → heading → null (default).
 */
export function resolveEnterStrategy(
  editor: HTMLElement,
  selection: Selection
): EnterStrategy | null {
  if (!selection.isCollapsed || selection.rangeCount === 0) return null;
  const anchor = selection.anchorNode;
  if (!anchor || !editor.contains(anchor)) return null;

  const taskLi = closest(anchor, 'li.task-item');
  if (taskLi && editor.contains(taskLi)) {
    const textEl = taskLi.querySelector('.task-text') ?? taskLi;
    return (textEl.textContent ?? '').trim() === '' ? 'task-exit' : 'task-split';
  }

  const li = closest(anchor, 'li');
  if (li && editor.contains(li) && li.dataset.task !== 'true') {
    return (li.textContent ?? '').trim() === '' ? 'list-exit' : null;
  }

  const bq = closest(anchor, 'blockquote');
  if (bq && editor.contains(bq)) return 'callout-exit';

  const heading = closest(anchor, 'h1, h2, h3, h4, h5, h6');
  if (heading && editor.contains(heading)) return 'heading-exit';

  return null;
}

/** Builds a normal paragraph seeded with a line break. */
export function spawnParagraphAfter(refEl: HTMLElement): HTMLElement {
  const p = document.createElement('p');
  p.className = BLOCK_STYLES.paragraph;
  p.innerHTML = '<br>';
  refEl.insertAdjacentElement('afterend', p);
  placeCaretAtStart(p);
  return p;
}

/**
 * Executes a resolved Enter strategy with deterministic DOM mutations.
 */
export function executeEnterStrategy(
  editor: HTMLElement,
  strategy: EnterStrategy,
  selection: Selection
): void {
  switch (strategy) {
    case 'task-exit': {
      const li = closest(selection.anchorNode, 'li.task-item')!;
      const p = document.createElement('p');
      p.className = BLOCK_STYLES.paragraph;
      p.innerHTML = '<br>';
      const split = prepareListExtraction(li);
      split.replaceWith(p);
      placeCaretAtStart(p);
      return;
    }

    case 'task-split': {
      const li = closest(selection.anchorNode, 'li.task-item') as HTMLElement;
      const textEl = (li.querySelector('.task-text') ?? li) as HTMLElement;

      const caretRange = selection.getRangeAt(0);
      const endProbe = document.createRange();
      endProbe.selectNodeContents(textEl);
      endProbe.collapse(false);
      const atEnd =
        caretRange.compareBoundaryPoints(Range.END_TO_END, endProbe) >= 0;

      // Spawn the next unchecked item (bullet-list parity)
      const list = document.createElement('ul');
      list.className = BLOCK_STYLES.taskList + ' text-slate-800 text-xs';
      const next = makeTaskItem();
      const nextText = next.querySelector('.task-text') as HTMLElement;
      list.appendChild(next);

      if (!atEnd) {
        const tail = document.createRange();
        tail.setStart(caretRange.startContainer, caretRange.startOffset);
        try {
          tail.setEndAfter(textEl.lastChild ?? textEl);
        } catch {
          /* empty tail is fine */
        }
        const frag = tail.extractContents();
        if (frag.hasChildNodes()) nextText.appendChild(frag);
      }

      // Insert right after the current li within its task list
      const listParent = li.parentElement!;
      if (listParent.tagName === 'UL' && listParent.classList.contains('task-list')) {
        listParent.insertBefore(next, li.nextSibling);
      } else {
        li.parentElement!.insertBefore(list, li.nextSibling);
      }
      placeCaretAtStart(nextText);
      return;
    }

    case 'list-exit': {
      const li = closest(selection.anchorNode, 'li') as HTMLElement;
      const p = document.createElement('p');
      p.className = BLOCK_STYLES.paragraph;
      p.innerHTML = '<br>';
      if (li.parentElement && li.parentElement !== editor) {
        const split = prepareListExtraction(li);
        split.replaceWith(p);
      } else {
        li.replaceWith(p);
      }
      placeCaretAtStart(p);
      return;
    }

    case 'callout-exit': {
      exitCalloutInline(editor, selection);
      return;
    }

    case 'heading-exit': {
      const heading = closest(selection.anchorNode, 'h1, h2, h3, h4, h5, h6')!;
      const p = document.createElement('p');
      p.className = BLOCK_STYLES.paragraph;
      p.innerHTML = '<br>';
      heading.insertAdjacentElement('afterend', p);
      placeCaretAtStart(p);
      return;
    }
  }
}

function makeTaskItem(): HTMLElement {
  const li = document.createElement('li');
  li.className = BLOCK_STYLES.taskItem;
  li.dataset.task = 'true';
  li.dataset.checked = 'false';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('data-task-checkbox', 'true');
  input.setAttribute('aria-label', 'Toggle task item');
  input.className = BLOCK_STYLES.checkbox;

  const span = document.createElement('span');
  span.className = 'flex-1 task-text';

  li.appendChild(input);
  li.appendChild(span);
  return li;
}

/** Callout exit without importing the heavier helper (keeps this module lean). */
function exitCalloutInline(editor: HTMLElement, selection: Selection): void {
  const range = selection.getRangeAt(0);
  let bq: HTMLElement | null = null;
  let node: Node | null = range.startContainer;
  while (node && editor.contains(node)) {
    if ((node as HTMLElement).tagName === 'BLOCKQUOTE') {
      bq = node as HTMLElement;
      break;
    }
    if (node === editor) break;
    node = node.parentNode;
  }
  if (!bq) return;

  const p = document.createElement('p');
  p.className = BLOCK_STYLES.paragraph;

  const insertRef: ChildNode | null = bq.nextSibling;
  const insertParent: HTMLElement = bq.parentElement ?? editor;

  if (bq.hasChildNodes()) {
    const tail = document.createRange();
    tail.setStart(range.startContainer, range.startOffset);
    try {
      tail.setEndAfter(bq.lastChild!);
    } catch {
      /* degenerate quote */
    }
    const frag = tail.extractContents();
    while (
      frag.firstChild &&
      (frag.firstChild as HTMLElement).tagName === 'BR'
    ) {
      frag.removeChild(frag.firstChild);
    }
    if (frag.hasChildNodes()) p.appendChild(frag);
    else p.innerHTML = '<br>';

    while (bq.lastChild && (bq.lastChild as HTMLElement).tagName === 'BR') {
      bq.removeChild(bq.lastChild);
    }
    if (isEmptyBlock(bq)) bq.remove();
  } else {
    bq.remove();
  }

  insertParent.insertBefore(p, insertRef);
  placeCaretAtStart(p);
}

/** ArrowRight at the end of bold/italic/code/link steps out of the tag. */
export function escapeInlineFormattingRight(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const formatEl = closest(range.startContainer, 'strong, b, em, i, code, a');
  if (!formatEl || !editor.contains(formatEl)) return false;

  const endRange = document.createRange();
  endRange.selectNodeContents(formatEl);
  endRange.collapse(false);
  if (range.compareBoundaryPoints(Range.END_TO_END, endRange) !== 0) return false;

  let nextNode = formatEl.nextSibling;
  let offset = 0;
  if (!nextNode || nextNode.nodeType !== Node.TEXT_NODE) {
    nextNode = document.createTextNode('\u200B');
    formatEl.parentNode?.insertBefore(nextNode, formatEl.nextSibling);
    offset = 1;
  }
  const newRange = document.createRange();
  newRange.setStart(nextNode, offset);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
  return true;
}

/** Markdown block shorthand typed just before a Space ("# ", "- ", "1. "). */
export function shorthandFor(
  textBefore: string
): { actionId: 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered'; markerLen: number } | null {
  switch (textBefore) {
    case '#': return { actionId: 'h1', markerLen: 1 };
    case '##': return { actionId: 'h2', markerLen: 2 };
    case '###': return { actionId: 'h3', markerLen: 3 };
    case '-': case '*': return { actionId: 'bullet', markerLen: 1 };
    case '1.': return { actionId: 'numbered', markerLen: 2 };
    default: return null;
  }
}
