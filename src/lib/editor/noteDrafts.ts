/**
 * Device-local recovery drafts for in-progress notes.
 *
 * Strategy B-lite (spec FR-016–FR-019 / research R7):
 * - One synchronous localStorage write per edit, keyed per application.
 * - Cleared as soon as content is durably persisted.
 * - Restored only when strictly newer than durable data (stale guard),
 *   never overwriting newer cloud state (last-cloud-write-wins).
 * - All storage access degrades silently when unavailable
 *   (private browsing, quota limits).
 */

export interface NoteDraft {
  markdown: string;
  savedAt: string; // ISO-8601
}

export type DraftResolution =
  | { restore: NoteDraft }
  | { discard: 'stale' | 'identical' | 'none' };

const keyFor = (appId: string) => `tracklet_note_draft_${appId}`;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode / quota exceeded — recovery layer is best-effort by design
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Persists the current note text synchronously at zero cloud cost. */
export function saveNoteDraft(appId: string, markdown: string): void {
  const payload: NoteDraft = { markdown, savedAt: new Date().toISOString() };
  safeSet(keyFor(appId), JSON.stringify(payload));
}

/** Removes the draft once its content has been durably persisted. */
export function clearNoteDraft(appId: string): void {
  safeRemove(keyFor(appId));
}

/** Reads a draft, tolerating missing or corrupted payloads. */
export function readNoteDraft(appId: string): NoteDraft | null {
  const raw = safeGet(keyFor(appId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<NoteDraft>;
    if (typeof parsed.markdown !== 'string' || typeof parsed.savedAt !== 'string') {
      return null;
    }
    return { markdown: parsed.markdown, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

/**
 * Decision table for opening a record:
 * - no draft            -> { discard: 'none' }
 * - identical to stored -> silent discard (draft cleared)
 * - older than durable  -> stale discard, never resurrected (draft cleared)
 * - newer + different   -> restore (caller shows inline chip)
 */
export function resolveDraftOnOpen(
  appId: string,
  storedNotes: string,
  updatedAtIso: string
): DraftResolution {
  const draft = readNoteDraft(appId);
  if (!draft) return { discard: 'none' };

  if (draft.markdown === storedNotes) {
    clearNoteDraft(appId);
    return { discard: 'identical' };
  }

  const draftTime = Date.parse(draft.savedAt);
  const durableTime = Date.parse(updatedAtIso);
  if (!Number.isNaN(draftTime) && !Number.isNaN(durableTime) && draftTime <= durableTime) {
    clearNoteDraft(appId);
    return { discard: 'stale' };
  }

  return { restore: draft };
}
