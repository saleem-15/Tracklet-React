import { useCallback, type RefObject } from 'react';
import { markdownToHtml, htmlToMarkdown } from './richTextMarkdownUtils';
import { sanitizePastedHtml } from './editorDom';

export interface ClipboardHandlers {
  handleCopy: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
}

/**
 * Copy OUT as Markdown; paste IN with fidelity:
 * 1. URL over selection → link
 * 2. text/html flavor → sanitized rich insert (structure survives)
 * 3. multi-line plain text → normalized into blocks up front
 */
export function useClipboard(
  editorRef: RefObject<HTMLDivElement | null>,
  onMutate: () => void
): ClipboardHandlers {
  const handleCopy = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      void editorRef;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const fragment = sel.getRangeAt(0).cloneContents();
      const tmp = document.createElement('div');
      tmp.appendChild(fragment);
      const markdown = htmlToMarkdown(tmp);
      if (markdown) {
        e.clipboardData.setData('text/plain', markdown);
        e.clipboardData.setData('text/html', tmp.innerHTML);
        e.preventDefault();
      }
    },
    [editorRef]
  );

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
        onMutate();
        return;
      }

      // Rich paste: honor the HTML flavor (sanitized)
      const htmlFlavor = e.clipboardData.getData('text/html');
      if (htmlFlavor) {
        e.preventDefault();
        try {
          const clean = sanitizePastedHtml(htmlFlavor);
          if (clean) {
            document.execCommand('insertHTML', false, clean);
            onMutate();
            return;
          }
        } catch {
          /* fall through to plain-text normalization */
        }
        document.execCommand('insertText', false, pastedText);
        onMutate();
        return;
      }

      // Multi-line plain text: normalize into proper blocks up front.
      if (pastedText.includes('\n')) {
        e.preventDefault();
        try {
          const html = markdownToHtml(pastedText);
          document.execCommand('insertHTML', false, html);
        } catch {
          document.execCommand('insertText', false, pastedText);
        }
        onMutate();
      }
    },
    [onMutate]
  );

  return { handleCopy, handlePaste };
}
