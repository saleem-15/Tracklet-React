import { useCallback, useRef, useState, type RefObject } from 'react';
import { caretViewportRect } from './useSlashMenu';
import { LINK_CLASS } from './richTextMarkdownUtils';

export interface LinkDialogState {
  open: boolean;
  url: string;
  /** True when invoked on an existing link (offers Update/Remove). */
  editingExisting: boolean;
  /** Viewport anchor for the floating popover. */
  rect: { anchorTop: number; anchorBottom: number; left: number } | null;
}

const EMPTY_LINK: LinkDialogState = {
  open: false,
  url: '',
  editingExisting: false,
  rect: null,
};

/**
 * Floating link popover state: anchor-rect capture (before focus moves),
 * insert vs update/remove flows, and canonical change emission.
 */
function isSafeLinkUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  );
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
}

export function useLinkPopover(
  editorRef: RefObject<HTMLDivElement | null>,
  emitChange: () => void
) {
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>(EMPTY_LINK);
  const savedRangeRef = useRef<Range | null>(null);
  const linkedAnchorRef = useRef<HTMLAnchorElement | null>(null);

  const closeLinkDialog = useCallback(() => {
    setLinkDialog(EMPTY_LINK);
    savedRangeRef.current = null;
    linkedAnchorRef.current = null;
  }, []);

  const openLinkDialog = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;

    const sel = window.getSelection();
    linkedAnchorRef.current = null;
    let prefilled = 'https://';

    // Anchor rect captured BEFORE focus moves.
    let rect: LinkDialogState['rect'] = null;
    if (sel && sel.rangeCount > 0) {
      const liveRange = sel.getRangeAt(0);
      savedRangeRef.current = liveRange.cloneRange();

      rect = caretViewportRect(el, null);

      el.focus();

      const node =
        sel.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? (sel.anchorNode as HTMLElement)
          : sel.anchorNode?.parentElement;
      const anchor = node?.closest('a');
      if (anchor && el.contains(anchor)) {
        linkedAnchorRef.current = anchor as HTMLAnchorElement;
        prefilled = anchor.getAttribute('href') || prefilled;
      }
    } else {
      el.focus();
      rect = caretViewportRect(el, el);
    }

    setLinkDialog({
      open: true,
      url: prefilled,
      editingExisting: linkedAnchorRef.current !== null,
      rect,
    });
  }, [editorRef]);

  const applyLink = useCallback(
    (url: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const cleanUrl = url.trim();

      // Update/remove path for an existing link
      if (linkedAnchorRef.current) {
        const anchor = linkedAnchorRef.current;
        if (!cleanUrl || cleanUrl === 'https://' || cleanUrl === 'http://' || !isSafeLinkUrl(cleanUrl)) {
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

      if (cleanUrl && isSafeLinkUrl(cleanUrl)) {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString() : '';
        if (!selectedText) {
          const safeEscaped = escapeHtml(cleanUrl);
          document.execCommand(
            'insertHTML',
            false,
            `<a href="${safeEscaped}" target="_blank" rel="noopener noreferrer" class="${LINK_CLASS}">${safeEscaped}</a>&nbsp;`
          );
        } else {
          document.execCommand('createLink', false, cleanUrl);
        }
        emitChange();
      }
      closeLinkDialog();
    },
    [closeLinkDialog, emitChange, editorRef]
  );

  return {
    linkDialog,
    openLinkDialog,
    closeLinkDialog,
    setLinkUrl: (url: string) => setLinkDialog((p) => ({ ...p, url })),
    applyLinkFromDialog: (overrideUrl?: string) =>
      applyLink(overrideUrl !== undefined ? overrideUrl : linkDialog.url),
  };
}
