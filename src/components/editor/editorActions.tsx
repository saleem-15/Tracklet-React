import React from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code2,
  Link2,
  Minus,
} from 'lucide-react';
import {
  BLOCK_STYLES,
  isInsideCodeFence,
} from '../../lib/richTextMarkdownUtils';
import {
  findCaretBlock,
  selectionInside,
  focusEditor,
  placeCaretAtEnd,
  placeCaretAtStart,
  isEmptyBlock,
  ensurePlaceable,
  prepareListExtraction,
} from '../../lib/editorDom';

export type EditorActionId =
  | 'bold'
  | 'italic'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'quote'
  | 'divider'
  | 'code'
  | 'link';

/**
 * Context handed to every action's apply(). `requestLink` lets the pure
 * registry ask the host editor to open its link dialog without coupling
 * the registry to any specific UI implementation.
 */
export interface EditorActionContext {
  editor: HTMLElement;
  requestLink?: () => void;
}

export interface FormattingAction {
  id: EditorActionId;
  label: string;
  icon: React.FC<{ className?: string }>;
  keywords: string[];
  shortcut?: string;
  scope: 'block' | 'inline' | 'selection';
  appliesTo: (ctx: EditorActionContext) => boolean;
  apply: (ctx: EditorActionContext) => void;
}

/* ------------------------------------------------------------------ */
/* Deterministic block transformation engine                           */
/* ------------------------------------------------------------------ */

/** Forces semantic tags (<b>/<i>) instead of inline CSS spans. */
function forceSemanticFormatting(): void {
  try {
    document.execCommand('styleWithCSS', false, 'false');
  } catch {
    /* unsupported â€” Chromium default is already off */
  }
}

function makeElement(tag: string, className?: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

/** Moves children of source into target (in order) and removes source. */
function absorb(source: HTMLElement, target: HTMLElement): void {
  while (source.firstChild) target.appendChild(source.firstChild);
  source.remove();
}

/**
 * Replaces `current` with `newEl`, correctly extracting from lists
 * (splitting trailing siblings into a cloned tail) and coalescing with
 * adjacent same-type lists. Then places the caret in `caretEl`.
 */
function swapBlock(
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
    const split = prepareListExtraction(current);
    split.detach();

    const prev = split.insertAfter.previousElementSibling as HTMLElement | null;
    if (
      prev &&
      prev.tagName === newEl.tagName &&
      prev.className === newEl.className
    ) {
      // Merge into the preceding list of the same kind
      while (newEl.firstChild) prev.appendChild(newEl.firstChild);
      newEl.remove();
      placeCaretAtEnd(caretEl);
      return;
    }
    split.insertAfter.insertAdjacentElement('afterend', newEl);

    const next = newEl.nextElementSibling as HTMLElement | null;
    if (
      next &&
      next.tagName === newEl.tagName &&
      next.className === newEl.className
    ) {
      absorb(next, newEl);
    }
    placeCaretAtEnd(caretEl);
    return;
  }

  current.replaceWith(newEl);

  // Coalesce with an adjacent list of the same kind (bullet -> bullet etc.)
  const prev = newEl.previousElementSibling as HTMLElement | null;
  if (prev && prev.tagName === newEl.tagName && prev.className === newEl.className) {
    absorb(newEl, prev);
    placeCaretAtEnd(caretEl);
    return;
  }
  const next = newEl.nextElementSibling as HTMLElement | null;
  if (next && next.tagName === newEl.tagName && next.className === newEl.className) {
    absorb(next, newEl);
  }
  placeCaretAtEnd(caretEl);
}

interface TransformOptions {
  /** Builds the replacement element; receives inner HTML of current block. */
  build: (innerHtml: string, current: HTMLElement) => HTMLElement;
  /** Element inside the replacement that should receive the caret. */
  caretSelector?: string;
  /** Resolve a different source element than the caret block (e.g., parent quote). */
  resolveSource?: (current: HTMLElement, editor: HTMLElement) => HTMLElement | null;
}

/**
 * Deterministic block transformation at the caret: no execCommand, no
 * browser heuristics â€” identical DOM outcome every time, caret guaranteed
 * inside the freshly created block.
 */
function transformBlockAtCaret(
  editor: HTMLElement,
  options: TransformOptions
): void {
  const sel = selectionInside(editor);
  if (!sel) return;

  const current = findCaretBlock(editor, sel.startContainer);
  if (!current) return;

  // resolveSource may redirect (e.g., whole parent quote) or return null
  // meaning "operate on the caret block as-is".
  const source =
    (options.resolveSource && options.resolveSource(current, editor)) || current;
  if (!editor.contains(source)) return;

  const newEl = options.build(source.innerHTML, source);

  // Empty content still needs a placeable caret line
  if (isEmptyBlock(newEl)) ensurePlaceable(newEl);

  const caretHost =
    (options.caretSelector ? newEl.querySelector(options.caretSelector) : null) ??
    newEl;

  swapBlock(editor, source, newEl, caretHost as HTMLElement);
  focusEditor(editor);
}

/* ------------------------------------------------------------------ */
/* Shared builders                                                     */
/* ------------------------------------------------------------------ */

function paragraphFrom(innerHtml: string): HTMLElement {
  const p = makeElement('p', BLOCK_STYLES.paragraph);
  p.innerHTML = innerHtml || '<br>';
  return p;
}

function listItemHtmlOf(listTag: 'ul' | 'ol'): HTMLElement {
  const cls =
    listTag === 'ul' ? BLOCK_STYLES.bulletList : BLOCK_STYLES.numberedList;
  const list = makeElement(listTag, `${cls} text-slate-800 text-xs`);
  const li = makeElement('li', 'leading-relaxed');
  li.innerHTML = '<br>';
  list.appendChild(li);
  return list;
}

function makeTaskItemEl(innerHtml: string, checked: boolean): HTMLElement {
  const list = makeElement('ul', `${BLOCK_STYLES.taskList} text-slate-800 text-xs`);
  const li = makeElement('li', `${BLOCK_STYLES.taskItem}${checked ? ' task-checked' : ''}`);
  li.dataset.task = 'true';
  li.dataset.checked = checked ? 'true' : 'false';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.setAttribute('data-task-checkbox', 'true');
  input.setAttribute('aria-label', 'Toggle task item');
  input.className = BLOCK_STYLES.checkbox;

  const span = makeElement('span', 'flex-1 task-text');
  span.innerHTML = innerHtml || '<br>';

  li.appendChild(input);
  li.appendChild(span);
  list.appendChild(li);
  return list;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const EDITOR_ACTIONS: readonly FormattingAction[] = [
  {
    id: 'bold',
    label: 'Bold',
    icon: Bold,
    keywords: ['strong', 'emphasis', 'b'],
    shortcut: 'Ctrl+B',
    scope: 'inline',
    appliesTo: () => true,
    apply: ({ editor }) => {
      focusEditor(editor);
      forceSemanticFormatting();
      document.execCommand('bold', false);
    },
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: Italic,
    keywords: ['em', 'emphasis', 'i'],
    shortcut: 'Ctrl+I',
    scope: 'inline',
    appliesTo: () => true,
    apply: ({ editor }) => {
      focusEditor(editor);
      forceSemanticFormatting();
      document.execCommand('italic', false);
    },
  },
  {
    id: 'h1',
    label: 'Heading 1',
    icon: Heading1,
    keywords: ['title', 'header', '#'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) =>
      transformBlockAtCaret(editor, {
        build: (html, current) =>
          current.tagName === 'H2'
            ? paragraphFrom(html)
            : (() => {
                const h = makeElement('h2', BLOCK_STYLES.h1);
                h.innerHTML = html || '<br>';
                return h;
              })(),
      }),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: Heading2,
    keywords: ['subtitle', 'section', '##'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) =>
      transformBlockAtCaret(editor, {
        build: (html, current) =>
          current.tagName === 'H3'
            ? paragraphFrom(html)
            : (() => {
                const h = makeElement('h3', BLOCK_STYLES.h2);
                h.innerHTML = html || '<br>';
                return h;
              })(),
      }),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: Heading3,
    keywords: ['subheading', '###'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) =>
      transformBlockAtCaret(editor, {
        build: (html, current) =>
          current.tagName === 'H4'
            ? paragraphFrom(html)
            : (() => {
                const h = makeElement('h4', BLOCK_STYLES.h3);
                h.innerHTML = html || '<br>';
                return h;
              })(),
      }),
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    icon: List,
    keywords: ['unordered', 'ul', '-'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) =>
      transformBlockAtCaret(editor, {
        build: (html, current) => {
          const inPlainUl =
            current.parentElement?.tagName === 'UL' &&
            !current.parentElement.classList.contains('task-list');
          if (inPlainUl) return paragraphFrom(html);
          const list = listItemHtmlOf('ul');
          (list.firstElementChild as HTMLElement).innerHTML = html || '<br>';
          return list;
        },
        caretSelector: 'li',
      }),
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    icon: ListOrdered,
    keywords: ['ordered', 'ol', 'steps', '1.'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) =>
      transformBlockAtCaret(editor, {
        build: (html, current) => {
          if (current.parentElement?.tagName === 'OL') return paragraphFrom(html);
          const list = listItemHtmlOf('ol');
          (list.firstElementChild as HTMLElement).innerHTML = html || '<br>';
          return list;
        },
        caretSelector: 'li',
      }),
  },
  {
    id: 'todo',
    label: 'To-do Item',
    icon: ListTodo,
    keywords: ['task', 'checkbox', 'checklist'],
    scope: 'block',
    appliesTo: ({ editor }) =>
      !isInsideCodeFence(window.getSelection()?.anchorNode ?? editor),
    apply: ({ editor }) =>
      transformBlockAtCaret(editor, {
        build: (html, current) => {
          if (current.dataset.task === 'true') return paragraphFrom(html);
          return makeTaskItemEl(html, false);
        },
        caretSelector: '.task-text',
      }),
  },
  {
    id: 'quote',
    label: 'Callout',
    icon: Quote,
    keywords: ['callout', 'blockquote', 'quote', '>'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) =>
      transformBlockAtCaret(editor, {
        // Inside a quote (source resolved to it below): unwrap to paragraph.
        build: (html, source) => {
          if (source.tagName === 'BLOCKQUOTE') return paragraphFrom(html);
          const bq = makeElement('blockquote', BLOCK_STYLES.quote);
          bq.innerHTML = html || '<br>';
          return bq;
        },
        // Toggle OFF: unwrap the WHOLE surrounding quote into one paragraph
        resolveSource: (current) => current.closest('blockquote'),
      }),
  },
  {
    id: 'divider',
    label: 'Divider',
    icon: Minus,
    keywords: ['separator', 'horizontal rule', 'line', 'hr', '---'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) => {
      const sel = selectionInside(editor);
      if (!sel) return;
      const current = findCaretBlock(editor, sel.startContainer);
      if (!current || current.tagName === 'HR') return;

      const hr = makeElement('hr', BLOCK_STYLES.hr);
      const p = makeElement('p', BLOCK_STYLES.paragraph);
      p.innerHTML = '<br>';

      if (
        current.tagName === 'LI' &&
        current.parentElement &&
        current.parentElement !== editor
      ) {
        const split = prepareListExtraction(current);
        split.detach();
        split.insertAfter.insertAdjacentElement('afterend', hr);
      } else {
        current.replaceWith(hr);
      }
      hr.insertAdjacentElement('afterend', p);
      placeCaretAtStart(p);
      focusEditor(editor);
    },
  },
  {
    id: 'code',
    label: 'Code Block',
    icon: Code2,
    keywords: ['snippet', 'pre'],
    shortcut: 'Ctrl+Shift+K',
    scope: 'selection',
    appliesTo: ({ editor }) =>
      !isInsideCodeFence(window.getSelection()?.anchorNode ?? editor),
    apply: ({ editor }) => {
      const sel = window.getSelection();
      const selectedText = sel ? sel.toString() : '';

      transformBlockAtCaret(editor, {
        build: (html) => {
          const pre = makeElement('pre', BLOCK_STYLES.codeBlock);
          const code = makeElement('code');
          code.textContent = selectedText || html.replace(/<br\s*\/?>/gi, '\n') || '// Code snippet here';
          pre.appendChild(code);
          return pre;
        },
      });
    },
  },
  {
    id: 'link',
    label: 'Link',
    icon: Link2,
    keywords: ['url', 'href', 'hyperlink'],
    shortcut: 'Ctrl+K',
    scope: 'selection',
    appliesTo: () => true,
    apply: ({ requestLink }) => requestLink?.(),
  },
] as const;

export function getActionById(id: EditorActionId): FormattingAction | undefined {
  return EDITOR_ACTIONS.find((a) => a.id === id);
}

/** Case-insensitive substring filter over label + keywords + id. */
export function filterActions(query: string): FormattingAction[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...EDITOR_ACTIONS];
  return EDITOR_ACTIONS.filter(
    (a) =>
      a.label.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.keywords.some((k) => k.toLowerCase().includes(q))
  );
}
