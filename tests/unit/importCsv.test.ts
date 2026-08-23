import { describe, it, expect } from 'vitest';
import {
  parseRawCSV,
  autoDetectFieldMapping,
  normalizeCSVStatus,
  normalizeCSVPlatform,
  normalizeCSVWorkLocation,
  normalizeCSVDate,
} from '../../src/lib/importCsv';

describe('importCsv', () => {
  describe('parseRawCSV', () => {
    it('parses standard comma-separated rows', () => {
      const csv = `Company,Role,Status\nLinear,Frontend,Interview\nStripe,Backend,Applied`;
      const result = parseRawCSV(csv);
      expect(result).toHaveLength(3);
      expect(result[1]).toEqual(['Linear', 'Frontend', 'Interview']);
    });

    it('handles commas inside double quotes correctly', () => {
      const csv = `Company,Notes\nLinear,"Excited about team, product, and mission"\nStripe,"Salary: $150,000"`;
      const result = parseRawCSV(csv);
      expect(result[1][1]).toBe('Excited about team, product, and mission');
      expect(result[2][1]).toBe('Salary: $150,000');
    });

    it('handles escaped quotes ("")', () => {
      const csv = `Company,Notes\nLinear,"Mentioned ""Next.js"" experience in interview"`;
      const result = parseRawCSV(csv);
      expect(result[1][1]).toBe('Mentioned "Next.js" experience in interview');
    });

    it('handles multiline strings inside quotes', () => {
      const csv = `Company,Notes\nLinear,"Line 1\nLine 2"`;
      const result = parseRawCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[1][1]).toBe('Line 1\nLine 2');
    });
  });

  describe('autoDetectFieldMapping', () => {
    it('maps common CSV header names to their respective column indices', () => {
      const headers = ['Employer Name', 'Position Title', 'Application Date', 'Stage', 'Source Platform', 'Notes'];
      const mapping = autoDetectFieldMapping(headers);

      expect(mapping.company).toBe(0);
      expect(mapping.role).toBe(1);
      expect(mapping.dateApplied).toBe(2);
      expect(mapping.status).toBe(3);
      expect(mapping.platform).toBe(4);
      expect(mapping.notes).toBe(5);
    });
  });

  describe('normalizeCSVStatus', () => {
    it('normalizes common variants into standard ApplicationStatus values', () => {
      expect(normalizeCSVStatus('Phone Screen')).toBe('Screening');
      expect(normalizeCSVStatus('Technical Round 1')).toBe('Interview');
      expect(normalizeCSVStatus('Job Offer Received')).toBe('Offer');
      expect(normalizeCSVStatus('Declined / Passed')).toBe('Rejected');
      expect(normalizeCSVStatus('Archived / Inactive')).toBe('Archived');
      expect(normalizeCSVStatus('Random Unrecognized')).toBe('Applied');
    });
  });

  describe('normalizeCSVPlatform', () => {
    it('normalizes platform names correctly', () => {
      expect(normalizeCSVPlatform('LinkedIn Jobs')).toBe('LinkedIn');
      expect(normalizeCSVPlatform('indeed.com')).toBe('Indeed');
      expect(normalizeCSVPlatform('Greenhouse Board')).toBe('Greenhouse');
      expect(normalizeCSVPlatform('Lever.co')).toBe('Lever');
      expect(normalizeCSVPlatform('Referred by Friend')).toBe('Referral');
      expect(normalizeCSVPlatform('Unknown Site')).toBe('Other');
    });
  });

  describe('normalizeCSVWorkLocation', () => {
    it('normalizes valid remote workplace values', () => {
      expect(normalizeCSVWorkLocation('Remote')).toBe('Remote');
      expect(normalizeCSVWorkLocation('fully remote')).toBe('Remote');
      expect(normalizeCSVWorkLocation('100% remote')).toBe('Remote');
      expect(normalizeCSVWorkLocation('WFH')).toBe('Remote');
      expect(normalizeCSVWorkLocation('Work From Home')).toBe('Remote');
      expect(normalizeCSVWorkLocation('home office')).toBe('Remote');
      expect(normalizeCSVWorkLocation('anywhere')).toBe('Remote');
    });

    it('rejects negated remote phrases and returns undefined', () => {
      expect(normalizeCSVWorkLocation('not remote')).toBeUndefined();
      expect(normalizeCSVWorkLocation('no longer remote')).toBeUndefined();
      expect(normalizeCSVWorkLocation('Not Remote')).toBeUndefined();
      expect(normalizeCSVWorkLocation('No longer remote')).toBeUndefined();
      expect(normalizeCSVWorkLocation('not-remote')).toBeUndefined();
      expect(normalizeCSVWorkLocation('non-remote')).toBeUndefined();
    });

    it('normalizes hybrid and onsite workplace values', () => {
      expect(normalizeCSVWorkLocation('Hybrid')).toBe('Hybrid');
      expect(normalizeCSVWorkLocation('Hybrid Remote')).toBe('Hybrid');
      expect(normalizeCSVWorkLocation('Partially Remote')).toBe('Hybrid');
      expect(normalizeCSVWorkLocation('Mostly Remote')).toBe('Hybrid');
      expect(normalizeCSVWorkLocation('Onsite')).toBe('Onsite');
      expect(normalizeCSVWorkLocation('in-office')).toBe('Onsite');
      expect(normalizeCSVWorkLocation('In Person')).toBe('Onsite');
    });

    it('returns undefined for empty or unrecognized values', () => {
      expect(normalizeCSVWorkLocation('')).toBeUndefined();
      expect(normalizeCSVWorkLocation('   ')).toBeUndefined();
      expect(normalizeCSVWorkLocation('Random Workplace')).toBeUndefined();
    });
  });

  describe('normalizeCSVDate', () => {
    it('preserves valid YYYY-MM-DD dates', () => {
      expect(normalizeCSVDate('2026-07-20')).toBe('2026-07-20');
    });

    it('converts JS parseable date strings to YYYY-MM-DD', () => {
      const date = normalizeCSVDate('July 20, 2026');
      expect(date).toBe('2026-07-20');
    });
  });
});
