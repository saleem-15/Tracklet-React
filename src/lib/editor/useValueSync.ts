import { useEffect, type RefObject } from 'react';
import {
  compareCanonical,
  htmlToMarkdown,
  markdownToHtml,
} from './richTextMarkdownUtils';
import { snapshotCaret, restoreCaret } from './editorDom';

export interface ValueSyncHooks {
  /** Called right before a drift-forced innerHTML rewrite. */
  beforeReplace?: () => void;
  /** Called right after the rewrite + caret restore. */
  afterReplace?: () => void;
}

/**
 * Caret-safe value↔DOM synchronization (research R2):
 * - Echo-backs of our own changes are detected via canonical comparison
 *   and never touch the DOM.
 * - Real replacements (record switch, draft restore, template insert)
 *   rewrite innerHTML with caret+scroll snapshot/restore.
 * - Empty documents get a seeded <p><br></p> line so downstream pipelines
 *   (slash menu, transforms) always have a block to anchor to.
 */
export function useValueSync(
  editorRef: RefObject<HTMLDivElement | null>,
  value: string,
  hooks?: ValueSyncHooks
): void {
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    if (compareCanonical(htmlToMarkdown(el), value)) {
      // No-op for content — but keep an empty surface caret-able
      if (!el.firstElementChild && !(el.textContent ?? '').length) {
        el.innerHTML = '<p><br></p>';
      }
      return;
    }

    const snap = snapshotCaret(el);
    hooks?.beforeReplace?.();
    el.innerHTML = markdownToHtml(value || '');
    restoreCaret(el, snap);
    hooks?.afterReplace?.();
  }, [value, editorRef, hooks]);
}
