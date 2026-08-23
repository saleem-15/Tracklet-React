import { useRef, useEffect, useCallback, useState } from 'react';
import {
  markdownToHtml,
  htmlToMarkdown,
} from './richTextMarkdownUtils';

export interface UseRichTextNotesEditorOptions {
  notes: string;
  onNotesChange: (val: string) => void;
}

/**
 * Custom React hook powering the unified live-rendered WYSIWYG Markdown editor.
 * Features:
 * - Direct in-place editing in contentEditable surface (rendered typography, zero raw syntax).
 * - Caret stability: avoids resetting innerHTML while user is actively typing.
 * - Toolbar actions (Bold, Italic, Heading, Bullet List, Numbered List, Link, Code Block).
 * - Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+Shift+K).
 * - Smart URL paste: pasting a URL over highlighted text converts it into a link.
 * - Markdown triggers: typing `# `, `## `, `### `, `- `, `* `, `1. ` at start of line auto-morphs into styled block.
 * - Ctrl+Click on links inside the editor opens them in a new tab.
 */
export function useRichTextNotesEditor({
  notes,
  onNotesChange,
}: UseRichTextNotesEditorOptions) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastMarkdownRef = useRef<string>(notes || '');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const savedSelectionRangeRef = useRef<Range | null>(null);

  // Sync external notes updates (e.g. switching cards) to innerHTML
  useEffect(() => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;

    const normalizedNotes = notes || '';
    if (normalizedNotes !== lastMarkdownRef.current) {
      lastMarkdownRef.current = normalizedNotes;
      const html = markdownToHtml(normalizedNotes);
      currentEditor.innerHTML = html;
    }
  }, [notes]);

  // Initial mount load
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = markdownToHtml(notes || '');
      lastMarkdownRef.current = notes || '';
    }
  }, [notes]);

  // Triggered whenever the DOM content changes inside contentEditable
  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;

    const md = htmlToMarkdown(el);
    lastMarkdownRef.current = md;
    onNotesChange(md);
  }, [onNotesChange]);

  // Toolbar action: Bold
  const formatBold = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('bold', false);
    handleInput();
  }, [handleInput]);

  // Toolbar action: Italic
  const formatItalic = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('italic', false);
    handleInput();
  }, [handleInput]);

  // Toolbar action: Heading
  const formatHeading = useCallback((level: 'h3' | 'h4' = 'h3') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    // Toggle heading or paragraph
    const selection = window.getSelection();
    let currentTag = '';
    if (selection && selection.anchorNode) {
      const parentEl =
        selection.anchorNode.nodeType === Node.ELEMENT_NODE
          ? (selection.anchorNode as HTMLElement)
          : selection.anchorNode.parentElement;
      currentTag = parentEl?.tagName.toLowerCase() || '';
    }

    if (currentTag === level || currentTag === 'h2' || currentTag === 'h3' || currentTag === 'h4') {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, `<${level}>`);
    }
    handleInput();
  }, [handleInput]);

  // Toolbar action: Bullet List
  const formatBulletList = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('insertUnorderedList', false);
    handleInput();
  }, [handleInput]);

  // Toolbar action: Numbered List
  const formatNumberedList = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('insertOrderedList', false);
    handleInput();
  }, [handleInput]);

  // Toolbar action: Code Block
  const formatCodeBlock = useCallback(() => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      if (selectedText) {
        const pre = document.createElement('pre');
        pre.className =
          'my-2.5 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 selection:bg-blue-500/40';
        const code = document.createElement('code');
        code.textContent = selectedText;
        pre.appendChild(code);

        range.deleteContents();
        range.insertNode(pre);
      } else {
        const pre = document.createElement('pre');
        pre.className =
          'my-2.5 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 selection:bg-blue-500/40';
        const code = document.createElement('code');
        code.textContent = '// Code snippet here';
        pre.appendChild(code);

        const p = document.createElement('p');
        p.innerHTML = '<br>';

        range.insertNode(p);
        range.insertNode(pre);
      }
      handleInput();
    }
  }, [handleInput]);

  // Link dialog openers and submitters
  const openLinkDialog = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
    setLinkUrlInput('https://');
    setIsLinkModalOpen(true);
  }, []);

  const closeLinkDialog = useCallback(() => {
    setIsLinkModalOpen(false);
    setLinkUrlInput('');
    savedSelectionRangeRef.current = null;
  }, []);

  const applyLink = useCallback(
    (url: string) => {
      if (!editorRef.current) return;
      editorRef.current.focus();

      if (savedSelectionRangeRef.current) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedSelectionRangeRef.current);
        }
      }

      if (url && url.trim() && url !== 'https://' && url !== 'http://') {
        const cleanUrl = url.trim();
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString() : '';

        if (!selectedText) {
          // If no text was highlighted, insert link with domain as label
          document.execCommand(
            'insertHTML',
            false,
            `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium cursor-pointer">${cleanUrl}</a>&nbsp;`
          );
        } else {
          document.execCommand('createLink', false, cleanUrl);
        }
        handleInput();
      }
      closeLinkDialog();
    },
    [closeLinkDialog, handleInput]
  );

  // Smart URL Paste handler
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const pastedText = e.clipboardData.getData('text/plain');
      if (!pastedText) return;

      const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
      const isUrl = urlRegex.test(pastedText.trim());

      const selection = window.getSelection();
      const hasSelection = selection && !selection.isCollapsed && selection.toString().length > 0;

      if (isUrl && hasSelection) {
        e.preventDefault();
        document.execCommand('createLink', false, pastedText.trim());
        handleInput();
      }
    },
    [handleInput]
  );

  // Keyboard Shortcuts & Typing Triggers
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Ctrl+B -> Bold
      if (isCmdOrCtrl && !e.shiftKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        formatBold();
        return;
      }

      // Ctrl+I -> Italic
      if (isCmdOrCtrl && !e.shiftKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        formatItalic();
        return;
      }

      // Ctrl+Shift+K -> Code Block
      if (isCmdOrCtrl && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        formatCodeBlock();
        return;
      }

      // Ctrl+K -> Link Dialog
      if (isCmdOrCtrl && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        openLinkDialog();
        return;
      }

      // Markdown shorthand triggers on Space (# -> H3, - / * -> Bullet List, 1. -> Numbered List)
      if (e.key === ' ') {
        const selection = window.getSelection();
        if (selection && selection.isCollapsed && selection.anchorNode) {
          const textNode = selection.anchorNode;
          if (textNode.nodeType === Node.TEXT_NODE) {
            const textContent = textNode.nodeValue || '';
            const offset = selection.anchorOffset;
            const textBeforeCaret = textContent.slice(0, offset);

            if (textBeforeCaret === '###' || textBeforeCaret === '##' || textBeforeCaret === '#') {
              e.preventDefault();
              textNode.nodeValue = textContent.slice(offset);
              document.execCommand('formatBlock', false, '<h3>');
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
    [
      formatBold,
      formatItalic,
      formatCodeBlock,
      openLinkDialog,
      handleInput,
    ]
  );

  // Click handler on editor to support Ctrl+Click to open links
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const href = anchor.getAttribute('href');
      if (href) {
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  }, []);

  return {
    editorRef,
    handleInput,
    handleKeyDown,
    handlePaste,
    handleClick,
    formatBold,
    formatItalic,
    formatHeading,
    formatBulletList,
    formatNumberedList,
    formatCodeBlock,
    formatLink: openLinkDialog,
    isLinkModalOpen,
    linkUrlInput,
    setLinkUrlInput,
    closeLinkDialog,
    applyLink,
  };
}
