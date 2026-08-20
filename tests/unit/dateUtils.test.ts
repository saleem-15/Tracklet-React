import { describe, it, expect } from 'vitest';
import { calculateDaysInStage, formatAppDate, formatTimestamp } from '../../src/lib/dateUtils';

describe('dateUtils', () => {
  describe('calculateDaysInStage', () => {
    it('returns 0 for empty or invalid date strings', () => {
      expect(calculateDaysInStage('')).toBe(0);
      expect(calculateDaysInStage('invalid-date')).toBe(0);
    });

    it('returns accurate days elapsed for past timestamps', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      expect(calculateDaysInStage(fiveDaysAgo)).toBe(5);
    });

    it('returns 0 for future dates rather than negative numbers', () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      expect(calculateDaysInStage(tomorrow)).toBe(0);
    });
  });

  describe('formatAppDate', () => {
    it('returns empty string for empty input', () => {
      expect(formatAppDate('')).toBe('');
    });

    it('formats YYYY-MM-DD cleanly to en-US short format', () => {
      // 2026-07-15 -> "Jul 15"
      const formatted = formatAppDate('2026-07-15');
      expect(formatted).toContain('Jul');
      expect(formatted).toContain('15');
    });

    it('formats ISO timestamps to short date', () => {
      const formatted = formatAppDate('2026-01-20T12:00:00.000Z');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('20');
    });
  });

  describe('formatTimestamp', () => {
    it('returns original string if invalid ISO date provided', () => {
      expect(formatTimestamp('not-a-date')).toBe('not-a-date');
    });

    it('formats valid ISO string to full localized timestamp', () => {
      const result = formatTimestamp('2026-08-15T14:30:00.000Z');
      expect(result).toContain('2026');
      expect(result).toContain('Aug');
    });
  });
});
