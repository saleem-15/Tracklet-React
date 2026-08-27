import React from 'react';
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, ListTodo, Quote, Code2, Link2, Minus } from 'lucide-react';
import { BLOCK_STYLES, isInsideCodeFence } from './richTextMarkdownUtils';
import {
  transformBlockAtCaret,
  forceSemanticFormatting,
  makeElement,
  paragraphFrom,
  makeTaskItemEl,
  type EditorActionContext,
} from './editorBlocks';
import { focusEditor } from './editorDom';

export type EditorActionId =
  | 'bold' | 'italic' | 'h1' | 'h2' | 'h3'
  | 'bullet' | 'numbered' | 'todo' | 'quote' | 'divider'
  | 'code' | 'link';

export interface FormattingAction {
  id: EditorActionId;
  label: string;
  icon: React.FC<{ className?: string }>;
  keywords: string[];
  shortcut?: string;
  scope: 'block' | 'inline' | 'selection';
  appliesTo: (ctx: EditorActionContext) => boolean;
  apply: (ctx: EditorActionContext) => void;
  /**
   * When false, the action stays available via shortcuts and the selection
   * bubble but is hidden from the "/" command dialog.
   */
  inSlashMenu?: boolean;
}

function ensureSelection(editor: HTMLElement): Selection | null {
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

function currentTagIs(editor: HTMLElement, tag: string): boolean {
  const sel = window.getSelection();
  if (!sel || !sel.anchorNode || !editor.contains(sel.anchorNode)) return false;
  const node =
    sel.anchorNode.nodeType === Node.ELEMENT_NODE
      ? (sel.anchorNode as HTMLElement)
      : sel.anchorNode.parentElement;
  return !!node?.closest?.(tag);
}

const CODE_PRE_CLASSES = BLOCK_STYLES.codeBlock;

function insertCodeBlock(editor: HTMLElement): void {
  const sel = ensureSelection(editor);
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const selectedText = range.toString();

  const pre = makeElement('pre', CODE_PRE_CLASSES);
  const code = makeElement('code');
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

export const EDITOR_ACTIONS: readonly FormattingAction[] = [
  {
    id: 'bold',
    label: 'Bold',
    icon: Bold,
    keywords: ['strong', 'emphasis', 'b'],
    shortcut: 'Ctrl+B',
    scope: 'inline',
    inSlashMenu: false,
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
    inSlashMenu: false,
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
        build: (html, source) => {
          if (source.tagName === 'H2') return paragraphFrom(html);
          const h = makeElement('h2', BLOCK_STYLES.h1);
          h.innerHTML = html || '<br>';
          return h;
        },
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
        build: (html, source) => {
          if (source.tagName === 'H3') return paragraphFrom(html);
          const h = makeElement('h3', BLOCK_STYLES.h2);
          h.innerHTML = html || '<br>';
          return h;
        },
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
        build: (html, source) => {
          if (source.tagName === 'H4') return paragraphFrom(html);
          const h = makeElement('h4', BLOCK_STYLES.h3);
          h.innerHTML = html || '<br>';
          return h;
        },
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
        build: (html, source) => {
          const inPlainUl =
            source.parentElement?.tagName === 'UL' &&
            !source.parentElement.classList.contains('task-list');
          if (inPlainUl) return paragraphFrom(html);
          const list = makeElement('ul', `${BLOCK_STYLES.bulletList} text-slate-800 text-xs`);
          const li = makeElement('li', 'leading-relaxed');
          li.innerHTML = html || '<br>';
          list.appendChild(li);
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
        build: (html, source) => {
          if (source.parentElement?.tagName === 'OL') return paragraphFrom(html);
          const list = makeElement('ol', `${BLOCK_STYLES.numberedList} text-slate-800 text-xs`);
          const li = makeElement('li', 'leading-relaxed');
          li.innerHTML = html || '<br>';
          list.appendChild(li);
          return list;
        },
        caretSelector: 'li',
      }),
  },
  {
    id: 'todo',
    label: 'To-do list',
    icon: ListTodo,
    keywords: ['todo', 'to-do', 'task', 'checkbox', 'checklist', 'list'],
    scope: 'block',
    appliesTo: ({ editor }) =>
      !isInsideCodeFence(window.getSelection()?.anchorNode ?? editor),
    apply: ({ editor }) =>
      transformBlockAtCaret(editor, {
        build: (html, source) => {
          if (source.dataset.task === 'true') return paragraphFrom(html);
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
        build: (html, source) => {
          if (source.tagName === 'BLOCKQUOTE') return paragraphFrom(html);
          const bq = makeElement('blockquote', BLOCK_STYLES.quote);
          bq.innerHTML = html || '<br>';
          return bq;
        },
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
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      const current =
        anchor?.nodeType === Node.ELEMENT_NODE
          ? (anchor as HTMLElement)
          : anchor?.parentElement;
      const block = current?.closest('p, h1, h2, h3, h4, li, blockquote');
      if (!block || !editor.contains(block) || block.tagName === 'HR') return;

      const hr = makeElement('hr', BLOCK_STYLES.hr);
      const p = makeElement('p', BLOCK_STYLES.paragraph);
      p.innerHTML = '<br>';

      if (
        block.tagName === 'LI' &&
        block.parentElement &&
        block.parentElement !== editor
      ) {
        // Reuse list extraction for safe removal
        const list = block.parentElement;
        const siblings = Array.from(list.children);
        const index = siblings.indexOf(block);
        const after = siblings.slice(index + 1);
        if (after.length > 0) {
          const tail = list.cloneNode(false) as HTMLElement;
          after.forEach((c) => tail.appendChild(c));
          list.insertAdjacentElement('afterend', tail);
        }
        list.removeChild(block);
        if (list.children.length === 0) list.remove();
        list.insertAdjacentElement('afterend', hr);
      } else {
        block.replaceWith(hr);
      }
      hr.insertAdjacentElement('afterend', p);
      const r = document.createRange();
      r.selectNodeContents(p);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      focusEditor(editor);
    },
  },
  {
    id: 'code',
    label: 'Code Block',
    icon: Code2,
    keywords: ['snippet', 'pre', '```'],
    shortcut: 'Ctrl+Shift+K',
    scope: 'selection',
    appliesTo: ({ editor }) =>
      !isInsideCodeFence(window.getSelection()?.anchorNode ?? editor),
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

/**
 * Actions offered by the "/" dialog: filtered + menu-visibility aware.
 * Bold/Italic stay reachable via shortcuts and the selection bubble but
 * are intentionally absent from the menu.
 */
export function menuActions(query: string): FormattingAction[] {
  return filterActions(query).filter((a) => a.inSlashMenu !== false);
}
