import { describe, it, expect } from 'vitest';
import {
  calculateDaysInStage,
  formatAppDate,
  formatTimestamp,
  addBusinessDays,
  formatEmailTime,
  formatEmailDateTime,
} from '../../src/lib/dateUtils';

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

  describe('addBusinessDays', () => {
    it('skips weekends correctly when adding 5 business days', () => {
      // Monday 2026-09-07 + 5 business days -> Monday 2026-09-14 (Tue, Wed, Thu, Fri, Mon)
      expect(addBusinessDays('2026-09-07', 5)).toBe('2026-09-14');
      // Friday 2026-09-04 + 5 business days -> Friday 2026-09-11 (Mon, Tue, Wed, Thu, Fri)
      expect(addBusinessDays('2026-09-04', 5)).toBe('2026-09-11');
    });
  });

  describe('formatEmailTime', () => {
    it('returns formatted 12-hour time from ISO string', () => {
      expect(formatEmailTime('2026-09-26T14:32:00Z')).toBe('2:32 PM');
      expect(formatEmailTime('2026-09-26T09:05:00Z')).toBe('9:05 AM');
    });

    it('returns null for midnight default timestamp or missing string', () => {
      expect(formatEmailTime('2026-09-26T00:00:00Z')).toBeNull();
      expect(formatEmailTime('2026-09-26')).toBeNull();
      expect(formatEmailTime(undefined)).toBeNull();
    });
  });

  describe('formatEmailDateTime', () => {
    it('formats date and time together when timestamp is provided', () => {
      const result = formatEmailDateTime('2026-09-26', '2026-09-26T14:32:00Z');
      expect(result).toBe('Sep 26, 2026 · 2:32 PM');
    });

    it('formats from ISO date string if timestamp is omitted', () => {
      const result = formatEmailDateTime('2026-09-26T10:18:00Z');
      expect(result).toBe('Sep 26, 2026 · 10:18 AM');
    });

    it('formats only date when timestamp has no time component', () => {
      const result = formatEmailDateTime('2026-09-26');
      expect(result).toBe('Sep 26, 2026');
    });
  });
});
