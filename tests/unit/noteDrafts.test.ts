import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveNoteDraft,
  clearNoteDraft,
  readNoteDraft,
  resolveDraftOnOpen,
} from '../../src/lib/editor/noteDrafts';

const APP = 'app-123';

describe('noteDrafts recovery store (FR-016–FR-019)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('saves, reads, and clears a draft under the per-app key', () => {
    saveNoteDraft(APP, '## Hello\n\nWorld');
    const raw = localStorage.getItem('tracklet_note_draft_app-123');
    expect(raw).not.toBeNull();

    const draft = readNoteDraft(APP);
    expect(draft?.markdown).toBe('## Hello\n\nWorld');
    expect(typeof draft?.savedAt).toBe('string');

    clearNoteDraft(APP);
    expect(readNoteDraft(APP)).toBeNull();
    expect(localStorage.getItem('tracklet_note_draft_app-123')).toBeNull();
  });

  it('resolveDraftOnOpen: no draft -> none', () => {
    const result = resolveDraftOnOpen(APP, 'stored notes', '2026-08-24T10:00:00Z');
    expect(result).toEqual({ discard: 'none' });
  });

  it('resolveDraftOnOpen: identical content -> silent discard', () => {
    saveNoteDraft(APP, 'same text');
    const draft = readNoteDraft(APP)!;
    const result = resolveDraftOnOpen(
      APP,
      'same text',
      new Date(Date.parse(draft.savedAt) + 60_000).toISOString()
    );
    expect(result).toEqual({ discard: 'identical' });
    // identical drafts are cleared silently
    expect(readNoteDraft(APP)).toBeNull();
  });

  it('resolveDraftOnOpen: stale draft loses to newer durable data', () => {
    localStorage.setItem(
      'tracklet_note_draft_app-123',
      JSON.stringify({ markdown: 'old device text', savedAt: '2026-08-01T09:00:00Z' })
    );
    const result = resolveDraftOnOpen(APP, 'newer cloud text', '2026-08-24T10:00:00Z');
    expect(result).toEqual({ discard: 'stale' });
    // stale drafts are discarded silently
    expect(readNoteDraft(APP)).toBeNull();
  });

  it('resolveDraftOnOpen: fresher differing draft is restored', () => {
    saveNoteDraft(APP, 'mid-typing recovery text');
    const draft = readNoteDraft(APP)!;
    const olderUpdatedAt = new Date(Date.parse(draft.savedAt) - 60_000).toISOString();
    const result = resolveDraftOnOpen(APP, 'older durable text', olderUpdatedAt);
    expect(result).toEqual({ restore: { markdown: 'mid-typing recovery text', savedAt: draft.savedAt } });
  });

  it('degrades silently when storage writes throw (private mode/quota)', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    try {
      expect(() => saveNoteDraft(APP, 'text')).not.toThrow();
      expect(readNoteDraft(APP)).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it('degrades silently when storage reads throw', () => {
    localStorage.setItem(
      'tracklet_note_draft_app-123',
      JSON.stringify({ markdown: 'x', savedAt: '2026-08-24T10:00:00Z' })
    );
    const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('AccessDenied');
    });
    try {
      expect(readNoteDraft(APP)).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it('tolerates corrupted payloads without throwing', () => {
    localStorage.setItem('tracklet_note_draft_app-123', '{not-json');
    expect(readNoteDraft(APP)).toBeNull();
    const result = resolveDraftOnOpen(APP, 'notes', '2026-08-24T10:00:00Z');
    expect('discard' in result ? result.discard : null).toBe('none');
  });

  it('discards draft as stale when timestamps are invalid or NaN', () => {
    localStorage.setItem(
      'tracklet_note_draft_app-123',
      JSON.stringify({ markdown: 'some text', savedAt: 'invalid-date' })
    );
    const result = resolveDraftOnOpen(APP, 'other notes', '2026-08-24T10:00:00Z');
    expect(result).toEqual({ discard: 'stale' });
    expect(readNoteDraft(APP)).toBeNull();
  });
});
