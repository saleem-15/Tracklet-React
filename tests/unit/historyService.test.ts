import { describe, it, expect } from 'vitest';
import { createStatusHistoryEntry, appendStatusHistory, MAX_STATUS_HISTORY_ENTRIES } from '../../src/lib/historyService';
import { StatusHistoryEntry } from '../../src/types';

describe('historyService', () => {
  it('creates a single status history entry with id and timestamp', () => {
    const entry = createStatusHistoryEntry('Interview', 'Screening', '2026-08-15T12:00:00.000Z');
    expect(entry.id).toBeTruthy();
    expect(entry.toStatus).toBe('Interview');
    expect(entry.fromStatus).toBe('Screening');
    expect(entry.timestamp).toBe('2026-08-15T12:00:00.000Z');
  });

  it('prepends new entries to existing history', () => {
    const initial: StatusHistoryEntry[] = [
      createStatusHistoryEntry('Applied', undefined, '2026-08-01T12:00:00.000Z'),
    ];

    const updated = appendStatusHistory(initial, 'Screening', 'Applied', '2026-08-05T12:00:00.000Z');
    expect(updated).toHaveLength(2);
    expect(updated[0].toStatus).toBe('Screening');
    expect(updated[1].toStatus).toBe('Applied');
  });

  it('caps history length to MAX_STATUS_HISTORY_ENTRIES', () => {
    let history: StatusHistoryEntry[] = [];
    for (let i = 0; i < 60; i++) {
      history = appendStatusHistory(history, 'Interview');
    }

    expect(history.length).toBe(MAX_STATUS_HISTORY_ENTRIES);
  });
});
