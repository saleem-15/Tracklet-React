import { describe, it, expect } from 'vitest';
import {
  calculateStageDwellTimes,
  deleteStatusHistoryEntry,
  updateStatusHistoryEntry,
  addStatusHistoryEntry,
  formatDwellDuration,
  formatRelativeTime,
} from '../../src/lib/statusHistoryUtils';
import { mockAccidentalMisclickApp } from './statusHistoryTestFixtures';
import { StatusHistoryEntry } from '../../src/types';

describe('statusHistoryUtils', () => {
  describe('formatRelativeTime & formatDwellDuration', () => {
    it('formats relative times correctly', () => {
      const now = Date.now();
      expect(formatRelativeTime(new Date(now - 10000).toISOString())).toBe('Just now');
      expect(formatRelativeTime(new Date(now - 10 * 60 * 1000).toISOString())).toBe('10 mins ago');
      expect(formatRelativeTime(new Date(now - 2 * 60 * 60 * 1000).toISOString())).toBe('2 hours ago');
      expect(formatRelativeTime(new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString())).toBe('3 days ago');
    });

    it('formats dwell duration durations accurately', () => {
      expect(formatDwellDuration(30 * 60 * 1000)).toBe('30 mins');
      expect(formatDwellDuration(5 * 60 * 60 * 1000)).toBe('5 hours');
      expect(formatDwellDuration(12 * 24 * 60 * 60 * 1000)).toBe('12 days');
      expect(formatDwellDuration(24 * 60 * 60 * 1000)).toBe('1 day');
    });
  });

  describe('calculateStageDwellTimes', () => {
    it('returns empty array when history is empty', () => {
      expect(calculateStageDwellTimes([])).toEqual([]);
    });

    it('calculates chronological stage dwell times and flags current stage', () => {
      const history: StatusHistoryEntry[] = [
        {
          id: '1',
          fromStatus: 'Saved',
          toStatus: 'Applied',
          timestamp: '2026-09-01T10:00:00.000Z',
        },
        {
          id: '2',
          fromStatus: 'Applied',
          toStatus: 'Screening',
          timestamp: '2026-09-11T10:00:00.000Z', // 10 days in Applied
        },
        {
          id: '3',
          fromStatus: 'Screening',
          toStatus: 'Interview',
          timestamp: '2026-09-16T10:00:00.000Z', // 5 days in Screening
        },
      ];

      const enriched = calculateStageDwellTimes(history, '2026-09-01T10:00:00.000Z', '2026-09-16T10:00:00.000Z');

      expect(enriched).toHaveLength(3);
      // Returned descending by default
      const latest = enriched[0];
      const middle = enriched[1];
      const oldest = enriched[2];

      expect(latest.id).toBe('3');
      expect(latest.isCurrent).toBe(true);
      expect(latest.dwellLabel).toMatch(/^Active for/);

      expect(middle.id).toBe('2');
      expect(middle.isCurrent).toBe(false);
      expect(middle.dwellDays).toBe(10);
      expect(middle.dwellLabel).toBe('Spent 10 days in Applied');

      expect(oldest.id).toBe('1');
      expect(oldest.isCurrent).toBe(false);
    });
  });

  describe('deleteStatusHistoryEntry & rollback', () => {
    it('rolls back status when deleting the latest entry (misclick recovery)', () => {
      const history: StatusHistoryEntry[] = [
        {
          id: 'e1',
          fromStatus: 'Saved',
          toStatus: 'Applied',
          timestamp: '2026-09-01T10:00:00.000Z',
        },
        {
          id: 'e2',
          fromStatus: 'Applied',
          toStatus: 'Interview',
          timestamp: '2026-09-10T10:00:00.000Z',
        },
        {
          id: 'e3',
          fromStatus: 'Interview',
          toStatus: 'Rejected',
          timestamp: '2026-09-11T10:00:00.000Z',
        },
      ];

      const result = deleteStatusHistoryEntry(history, 'e3', 'Rejected');

      expect(result.updatedHistory).toHaveLength(2);
      expect(result.updatedHistory.map((e) => e.id)).toEqual(['e1', 'e2']);
      expect(result.rolledBackStatus).toBe('Interview');
      expect(result.rolledBackStageUpdatedAt).toBe('2026-09-10T10:00:00.000Z');
    });

    it('does not trigger rollback when deleting an older intermediate entry', () => {
      const history: StatusHistoryEntry[] = [
        {
          id: 'e1',
          fromStatus: 'Saved',
          toStatus: 'Applied',
          timestamp: '2026-09-01T10:00:00.000Z',
        },
        {
          id: 'e2',
          fromStatus: 'Applied',
          toStatus: 'Screening',
          timestamp: '2026-09-05T10:00:00.000Z',
        },
        {
          id: 'e3',
          fromStatus: 'Screening',
          toStatus: 'Interview',
          timestamp: '2026-09-10T10:00:00.000Z',
        },
      ];

      const result = deleteStatusHistoryEntry(history, 'e2', 'Interview');

      expect(result.updatedHistory).toHaveLength(2);
      expect(result.rolledBackStatus).toBeUndefined();
      expect(result.rolledBackStageUpdatedAt).toBeUndefined();
    });

    it('reverts to fromStatus when deleting the sole remaining entry', () => {
      const history: StatusHistoryEntry[] = [
        {
          id: 'e1',
          fromStatus: 'Saved',
          toStatus: 'Applied',
          timestamp: '2026-09-01T10:00:00.000Z',
        },
      ];

      const result = deleteStatusHistoryEntry(history, 'e1', 'Applied');
      expect(result.updatedHistory).toHaveLength(0);
      expect(result.rolledBackStatus).toBe('Saved');
    });

    it('correctly removes Offer and reverts to Interview when deleting the latest stage', () => {
      const history: StatusHistoryEntry[] = [
        { id: '1', fromStatus: 'Saved', toStatus: 'Screening', timestamp: '2026-09-01T10:00:00.000Z' },
        { id: '2', fromStatus: 'Screening', toStatus: 'Interview', timestamp: '2026-09-10T10:00:00.000Z' },
        { id: '3', fromStatus: 'Interview', toStatus: 'Offer', timestamp: '2026-09-20T10:00:00.000Z' },
      ];

      const result = deleteStatusHistoryEntry(history, '3', 'Offer');
      expect(result.updatedHistory).toHaveLength(2);
      expect(result.updatedHistory.map((h) => h.toStatus)).toEqual(['Screening', 'Interview']);
      expect(result.rolledBackStatus).toBe('Interview');
      expect(result.rolledBackStageUpdatedAt).toBe('2026-09-10T10:00:00.000Z');
      expect(result.updatedHistory.find((h) => h.id === '3')).toBeUndefined();
    });
  });

  describe('updateStatusHistoryEntry & addStatusHistoryEntry', () => {
    it('updates an entry note or status', () => {
      const history: StatusHistoryEntry[] = [
        {
          id: 'e1',
          fromStatus: 'Applied',
          toStatus: 'Interview',
          timestamp: '2026-09-01T10:00:00.000Z',
          note: 'Initial note',
        },
      ];

      const updated = updateStatusHistoryEntry(history, 'e1', {
        note: 'Updated interview note',
      });

      expect(updated[0].note).toBe('Updated interview note');
      expect(updated[0].toStatus).toBe('Interview');
    });

    it('deletes an entry note when note is set to empty string or whitespace', () => {
      const history: StatusHistoryEntry[] = [
        {
          id: 'e1',
          fromStatus: 'Applied',
          toStatus: 'Interview',
          timestamp: '2026-09-01T10:00:00.000Z',
          note: 'Old note that should be deleted',
        },
      ];

      const updated = updateStatusHistoryEntry(history, 'e1', {
        note: '',
      });

      expect(updated[0].note).toBeUndefined();
      expect('note' in updated[0]).toBe(false);

      const updatedWhitespace = updateStatusHistoryEntry(history, 'e1', {
        note: '   ',
      });
      expect(updatedWhitespace[0].note).toBeUndefined();
      expect('note' in updatedWhitespace[0]).toBe(false);
    });

    it('deletes an entry note when note is explicitly passed as null or undefined in updates', () => {
      const history: StatusHistoryEntry[] = [
        {
          id: 'e1',
          fromStatus: 'Applied',
          toStatus: 'Interview',
          timestamp: '2026-09-01T10:00:00.000Z',
          note: 'Old note that should be deleted',
        },
      ];

      const updatedWithUndefined = updateStatusHistoryEntry(history, 'e1', {
        note: undefined,
      });
      expect(updatedWithUndefined[0].note).toBeUndefined();
      expect('note' in updatedWithUndefined[0]).toBe(false);

      const updatedWithNull = updateStatusHistoryEntry(history, 'e1', {
        note: null,
      });
      expect(updatedWithNull[0].note).toBeUndefined();
      expect('note' in updatedWithNull[0]).toBe(false);
    });

    it('preserves existing note when updates does not include a note field', () => {
      const history: StatusHistoryEntry[] = [
        {
          id: 'e1',
          fromStatus: 'Applied',
          toStatus: 'Interview',
          timestamp: '2026-09-01T10:00:00.000Z',
          note: 'Existing important note',
        },
      ];

      const updated = updateStatusHistoryEntry(history, 'e1', {
        toStatus: 'Offer',
      });

      expect(updated[0].toStatus).toBe('Offer');
      expect(updated[0].note).toBe('Existing important note');
    });

    it('adds a new entry with generated ID', () => {
      const initial: StatusHistoryEntry[] = [];
      const updated = addStatusHistoryEntry(initial, 'Interview', 'Screening', 'Passed phone screen');

      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBeTruthy();
      expect(updated[0].toStatus).toBe('Interview');
      expect(updated[0].fromStatus).toBe('Screening');
      expect(updated[0].note).toBe('Passed phone screen');
    });
  });

  describe('Misclick rollback verification', () => {
    it('verifies rollback on accidental misclick restores Interview stage', () => {
      const lastEntry = mockAccidentalMisclickApp.history![mockAccidentalMisclickApp.history!.length - 1];
      const result = deleteStatusHistoryEntry(
        mockAccidentalMisclickApp.history!,
        lastEntry.id,
        mockAccidentalMisclickApp.status
      );

      expect(result.rolledBackStatus).toBe('Interview');
    });
  });
});
