import { useEffect, type MutableRefObject, type RefObject } from 'react';
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
 * - Echo-backs of our own changes are detected by comparing the incoming
 *   value against the last markdown we emitted (tracked via lastEmittedRef).
 *   This avoids the expensive double-canonicalization in compareCanonical
 *   which could produce false negatives for special characters (zero-width
 *   spaces, non-breaking spaces) left by inline-formatting helpers, causing
 *   unnecessary full DOM rewrites and caret resets.
 * - Real replacements (record switch, draft restore, template insert)
 *   rewrite innerHTML with caret+scroll snapshot/restore.
 * - Empty documents get a seeded <p><br></p> line so downstream pipelines
 *   (slash menu, transforms) always have a block to anchor to.
 */
export function useValueSync(
  editorRef: RefObject<HTMLDivElement | null>,
  value: string,
  hooks?: ValueSyncHooks,
  lastEmittedRef?: MutableRefObject<string | null>
): void {
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    // Fast path: if the incoming value is exactly what we last emitted,
    // it's an echo-back of our own change → skip the DOM rewrite entirely.
    // This avoids the expensive compareCanonical double-roundtrip which can
    // produce false negatives for zero-width / non-breaking space characters.
    const isOwnEcho =
      lastEmittedRef && lastEmittedRef.current !== null
        ? lastEmittedRef.current === value
        : false;

    const needsInitialRender = !el.firstElementChild && value.trim().length > 0;

    if (!needsInitialRender && (isOwnEcho || compareCanonical(htmlToMarkdown(el), value))) {
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
  }, [value, editorRef, hooks, lastEmittedRef]);
}
