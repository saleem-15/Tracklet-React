import { describe, it, expect } from 'vitest';
import { compactSalaryNumber, formatSalaryCompact } from '../../src/lib/salaryUtils';

describe('salaryUtils - formatSalaryCompact & compactSalaryNumber', () => {
  describe('compactSalaryNumber', () => {
    it('formats single values to compact $Xk', () => {
      expect(compactSalaryNumber('$190,000')).toBe('$190k');
      expect(compactSalaryNumber('190000')).toBe('$190k');
      expect(compactSalaryNumber('$230,000')).toBe('$230k');
      expect(compactSalaryNumber('$215,000')).toBe('$215k');
      expect(compactSalaryNumber('$180k')).toBe('$180k');
      expect(compactSalaryNumber('180k')).toBe('$180k');
    });

    it('formats fractional thousands cleanly', () => {
      expect(compactSalaryNumber('$185,500')).toBe('$185.5k');
      expect(compactSalaryNumber('$80,000')).toBe('$80k');
    });

    it('handles empty input gracefully', () => {
      expect(compactSalaryNumber('')).toBe('');
      expect(compactSalaryNumber('   ')).toBe('');
    });
  });

  describe('formatSalaryCompact', () => {
    it('normalizes single value: $190,000 -> $190k', () => {
      expect(formatSalaryCompact('$190,000')).toBe('$190k');
      expect(formatSalaryCompact('$230,000')).toBe('$230k');
      expect(formatSalaryCompact('$240,000')).toBe('$240k');
      expect(formatSalaryCompact('$300,000')).toBe('$300k');
    });

    it('normalizes range with en-dash: $185,000 - $210,000 -> $185k–$210k', () => {
      expect(formatSalaryCompact('$185,000 - $210,000')).toBe('$185k–$210k');
      expect(formatSalaryCompact('$180k - $210k')).toBe('$180k–$210k');
      expect(formatSalaryCompact('$190k - $225k')).toBe('$190k–$225k');
      expect(formatSalaryCompact('$175k - $205k')).toBe('$175k–$205k');
      expect(formatSalaryCompact('$170k - $195k')).toBe('$170k–$195k');
      expect(formatSalaryCompact('$220k - $250k')).toBe('$220k–$250k');
      expect(formatSalaryCompact('$185,000 to $210,000')).toBe('$185k–$210k');
    });

    it('strips trailing timeframe suffixes (/ year, base, etc.)', () => {
      expect(formatSalaryCompact('$215,000 / year')).toBe('$215k');
      expect(formatSalaryCompact('$215,000/yr')).toBe('$215k');
      expect(formatSalaryCompact('$215,000 base')).toBe('$215k');
      expect(formatSalaryCompact('$180k - $210k / year')).toBe('$180k–$210k');
    });

    it('handles null and undefined safely', () => {
      expect(formatSalaryCompact(null)).toBe('');
      expect(formatSalaryCompact(undefined)).toBe('');
      expect(formatSalaryCompact('')).toBe('');
    });
  });
});
