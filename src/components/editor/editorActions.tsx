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
} from 'lucide-react';
import { isInsideCodeFence } from '../../lib/richTextMarkdownUtils';

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
/* DOM helpers                                                         */
/* ------------------------------------------------------------------ */

export function ensureSelection(editor: HTMLElement): Selection | null {
  const sel = window.getSelection();
  if (!sel) return null;
  if (sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) {
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  return sel;
}

function currentBlockTag(editor: HTMLElement): string {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode) return '';
  const node =
    sel.anchorNode.nodeType === Node.ELEMENT_NODE
      ? (sel.anchorNode as HTMLElement)
      : sel.anchorNode.parentElement;
  if (!node || !editor.contains(node)) return '';
  let cur: HTMLElement | null = node;
  while (cur && cur !== editor) {
    const t = cur.tagName.toLowerCase();
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(t)) {
      return t;
    }
    cur = cur.parentElement;
  }
  return '';
}

function formatBlockToggle(
  editor: HTMLElement,
  target: string,
  toggleOffTag?: string
): void {
  ensureSelection(editor);
  const current = currentBlockTag(editor);
  if (toggleOffTag && current === toggleOffTag) {
    document.execCommand('formatBlock', false, '<p>');
  } else {
    document.execCommand('formatBlock', false, `<${target}>`);
  }
}

/** Direct child of the editor that contains the caret (the "line" block). */
function getCaretBlock(editor: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.getRangeAt(0).startContainer;
  while (node && editor.contains(node)) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).parentElement === editor) {
      return node as HTMLElement;
    }
    node = node.parentNode;
  }
  return null;
}

const TASK_LIST_CLASSES = 'task-list list-none pl-1 space-y-0.5 my-1 text-slate-800 text-xs';
const TASK_ITEM_CLASSES = 'task-item flex items-start gap-2 py-0.5';
const CODE_PRE_CLASSES = 'my-2.5 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 selection:bg-blue-500/40';

function makeTaskItem(text: string, checked: boolean): HTMLLIElement {
  const li = document.createElement('li');
  li.className = TASK_ITEM_CLASSES + (checked ? ' task-checked' : '');
  li.dataset.task = 'true';
  li.dataset.checked = checked ? 'true' : 'false';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.setAttribute('data-task-checkbox', 'true');
  input.setAttribute('aria-label', 'Toggle task item');
  input.className = 'mt-0.5 w-3 h-3 accent-blue-600 cursor-pointer shrink-0';

  const span = document.createElement('span');
  span.className = 'flex-1 task-text' + (checked ? ' line-through text-slate-400' : '');
  span.textContent = text;

  li.appendChild(input);
  li.appendChild(span);
  return li;
}

function placeCaretAtEnd(el: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function convertLineToTask(editor: HTMLElement): void {
  const sel = ensureSelection(editor);
  if (!sel || sel.rangeCount === 0) return;

  // Already a task item? Convert back to a plain paragraph.
  let node: Node | null = sel.getRangeAt(0).startContainer;
  while (node && editor.contains(node)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.dataset?.task === 'true') {
        const p = document.createElement('p');
        p.className = 'text-slate-800 text-xs leading-relaxed my-1';
        p.textContent = el.querySelector('.task-text')?.textContent || '';
        el.parentElement?.parentElement?.replaceChild(
          p,
          el.parentElement?.tagName === 'UL' && (el.parentElement as HTMLElement).children.length === 1
            ? el.parentElement
            : el
        );
        placeCaretAtEnd(p);
        return;
      }
    }
    node = node.parentNode;
  }

  // Plain line -> task item
  let block = getCaretBlock(editor);
  if (!block) {
    document.execCommand('formatBlock', false, '<p>');
    block = getCaretBlock(editor);
  }
  if (!block) return;

  const text = block.textContent || '';
  const li = makeTaskItem(text, false);

  if (block.tagName === 'LI' && block.parentElement) {
    block.parentElement.replaceChild(li, block);
  } else {
    const ul = document.createElement('ul');
    ul.className = TASK_LIST_CLASSES;
    ul.appendChild(li);
    block.replaceWith(ul);
  }
  placeCaretAtEnd(li.querySelector('.task-text') as HTMLElement);
}

function insertCodeBlock(editor: HTMLElement): void {
  const sel = ensureSelection(editor);
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const selectedText = range.toString();

  const pre = document.createElement('pre');
  pre.className = CODE_PRE_CLASSES;
  const code = document.createElement('code');
  code.textContent = selectedText || '// Code snippet here';
  pre.appendChild(code);

  if (selectedText) {
    range.deleteContents();
    range.insertNode(pre);
  } else {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    range.insertNode(p);
    range.insertNode(pre);
  }
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
      ensureSelection(editor);
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
      ensureSelection(editor);
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
    apply: ({ editor }) => formatBlockToggle(editor, 'h2', 'h2'),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: Heading2,
    keywords: ['subtitle', 'section', '##'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) => formatBlockToggle(editor, 'h3', 'h3'),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: Heading3,
    keywords: ['subheading', '###'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) => formatBlockToggle(editor, 'h4', 'h4'),
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    icon: List,
    keywords: ['unordered', 'ul', '-'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) => {
      ensureSelection(editor);
      document.execCommand('insertUnorderedList', false);
    },
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    icon: ListOrdered,
    keywords: ['ordered', 'ol', 'steps', '1.'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) => {
      ensureSelection(editor);
      document.execCommand('insertOrderedList', false);
    },
  },
  {
    id: 'todo',
    label: 'To-do Item',
    icon: ListTodo,
    keywords: ['task', 'checkbox', 'checklist', '- []'],
    scope: 'block',
    appliesTo: ({ editor }) => !isInsideCodeFence(window.getSelection()?.anchorNode ?? editor),
    apply: ({ editor }) => convertLineToTask(editor),
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: Quote,
    keywords: ['callout', 'blockquote', '>'],
    scope: 'block',
    appliesTo: () => true,
    apply: ({ editor }) => formatBlockToggle(editor, 'blockquote', 'blockquote'),
  },
  {
    id: 'code',
    label: 'Code Block',
    icon: Code2,
    keywords: ['snippet', 'pre', '```'],
    shortcut: 'Ctrl+Shift+K',
    scope: 'selection',
    appliesTo: ({ editor }) => !isInsideCodeFence(window.getSelection()?.anchorNode ?? editor),
    apply: ({ editor }) => insertCodeBlock(editor),
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
