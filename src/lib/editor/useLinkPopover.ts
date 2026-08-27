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

  const openLinkDialog = useCallback(
    (explicitAnchor?: HTMLAnchorElement) => {
      const el = editorRef.current;
      if (!el) return;

      linkedAnchorRef.current = null;
      let prefilled = 'https://';
      let rect: LinkDialogState['rect'] = null;

      if (explicitAnchor && el.contains(explicitAnchor)) {
        linkedAnchorRef.current = explicitAnchor;
        prefilled = explicitAnchor.getAttribute('href') || prefilled;
        const bRect = explicitAnchor.getBoundingClientRect();
        rect = {
          anchorTop: bRect.top,
          anchorBottom: bRect.bottom,
          left: bRect.left,
        };
        const range = document.createRange();
        range.selectNodeContents(explicitAnchor);
        savedRangeRef.current = range;
      } else {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const liveRange = sel.getRangeAt(0);
          savedRangeRef.current = liveRange.cloneRange();

          rect = caretViewportRect(el, null);

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
          rect = caretViewportRect(el, el);
        }
      }

      setLinkDialog({
        open: true,
        url: prefilled,
        editingExisting: linkedAnchorRef.current !== null,
        rect,
      });
    },
    [editorRef]
  );

  const applyLink = useCallback(
    (url: string) => {
      const el = editorRef.current;
      if (!el) return;
      const cleanUrl = url.trim();

      // Update/remove path for an existing link
      if (linkedAnchorRef.current && el.contains(linkedAnchorRef.current)) {
        const anchor = linkedAnchorRef.current;
        if (!cleanUrl || cleanUrl === 'https://' || cleanUrl === 'http://' || !isSafeLinkUrl(cleanUrl)) {
          const parent = anchor.parentNode;
          if (parent) {
            let lastNode: Node | null = null;
            while (anchor.firstChild) {
              lastNode = anchor.firstChild;
              parent.insertBefore(anchor.firstChild, anchor);
            }
            parent.removeChild(anchor);

            closeLinkDialog();
            emitChange();

            requestAnimationFrame(() => {
              const currentEl = editorRef.current;
              if (!currentEl) return;
              currentEl.focus();
              const sel = window.getSelection();
              if (sel) {
                const r = document.createRange();
                if (lastNode && lastNode.nodeType === Node.TEXT_NODE) {
                  r.setStart(lastNode, (lastNode as Text).length);
                } else if (lastNode && lastNode.parentNode) {
                  const pad = document.createTextNode('\u200B');
                  lastNode.parentNode.insertBefore(pad, lastNode.nextSibling);
                  r.setStart(pad, pad.length);
                } else if (parent && parent.parentNode) {
                  r.selectNodeContents(parent);
                }
                r.collapse(true);
                sel.removeAllRanges();
                sel.addRange(r);
              }
            });
            linkedAnchorRef.current = null;
            savedRangeRef.current = null;
            return;
          }
        } else {
          anchor.setAttribute('href', cleanUrl);
          anchor.className = LINK_CLASS;
          anchor.setAttribute('target', '_blank');
          anchor.setAttribute('rel', 'noopener noreferrer');

          closeLinkDialog();
          emitChange();

          requestAnimationFrame(() => {
            const currentEl = editorRef.current;
            if (!currentEl) return;
            currentEl.focus();
            const sel = window.getSelection();
            if (sel) {
              const r = document.createRange();
              const nextSibling = anchor.nextSibling;
              if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE) {
                r.setStart(nextSibling, 0);
              } else {
                const pad = document.createTextNode('\u200B');
                anchor.parentNode?.insertBefore(pad, anchor.nextSibling);
                r.setStart(pad, pad.length);
              }
              r.collapse(true);
              sel.removeAllRanges();
              sel.addRange(r);
            }
          });
          linkedAnchorRef.current = null;
          savedRangeRef.current = null;
          return;
        }
      }

      if (savedRangeRef.current) {
        el.focus();
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
          const anchors = el.querySelectorAll<HTMLAnchorElement>(`a[href="${cleanUrl}"]`);
          anchors.forEach((a) => {
            if (!a.className) a.className = LINK_CLASS;
            if (!a.getAttribute('target')) a.setAttribute('target', '_blank');
            if (!a.getAttribute('rel')) a.setAttribute('rel', 'noopener noreferrer');
          });
        }
        closeLinkDialog();
        emitChange();

        requestAnimationFrame(() => {
          const currentEl = editorRef.current;
          if (!currentEl) return;
          currentEl.focus();
        });
      } else {
        closeLinkDialog();
        if (savedRangeRef.current) {
          requestAnimationFrame(() => {
            const currentEl = editorRef.current;
            if (!currentEl || !savedRangeRef.current) return;
            currentEl.focus();
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(savedRangeRef.current);
          });
        }
      }
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
