import { describe, it, expect } from 'vitest';
import {
  parseRawCSV,
  autoDetectFieldMapping,
  normalizeCSVStatus,
  normalizeCSVPlatform,
  normalizeCSVWorkLocation,
  normalizeCSVEmploymentType,
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

    it('detects work location and employment type columns', () => {
      const headers = [
        'Company',
        'Role',
        'Platform',
        'Work Location',
        'Employment Type',
        'Date Applied',
        'Status',
      ];
      const mapping = autoDetectFieldMapping(headers);

      expect(mapping.workLocation).toBe(3);
      expect(mapping.employmentType).toBe(4);
    });

    it('detects alternate header spellings for the new fields', () => {
      expect(autoDetectFieldMapping(['Workplace Type']).workLocation).toBe(0);
      expect(autoDetectFieldMapping(['Work Model']).workLocation).toBe(0);
      expect(autoDetectFieldMapping(['Remote Status']).workLocation).toBe(0);
      expect(autoDetectFieldMapping(['Job Type']).employmentType).toBe(0);
    });

    it('returns -1 for the new fields when no matching headers exist', () => {
      const mapping = autoDetectFieldMapping(['Company', 'Role']);
      expect(mapping.workLocation).toBe(-1);
      expect(mapping.employmentType).toBe(-1);
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
    it('normalizes common workplace variants', () => {
      expect(normalizeCSVWorkLocation('Remote')).toBe('Remote');
      expect(normalizeCSVWorkLocation('WFH')).toBe('Remote');
      expect(normalizeCSVWorkLocation('Fully Remote')).toBe('Remote');
      expect(normalizeCSVWorkLocation('work from home')).toBe('Remote');
      expect(normalizeCSVWorkLocation('Hybrid')).toBe('Hybrid');
      expect(normalizeCSVWorkLocation('Hybrid Remote')).toBe('Hybrid');
      expect(normalizeCSVWorkLocation('Partially Remote')).toBe('Hybrid');
      expect(normalizeCSVWorkLocation('Onsite')).toBe('Onsite');
      expect(normalizeCSVWorkLocation('On-site')).toBe('Onsite');
      expect(normalizeCSVWorkLocation('In Office')).toBe('Onsite');
    });

    it('returns undefined for empty or unrecognized values', () => {
      expect(normalizeCSVWorkLocation('')).toBeUndefined();
      expect(normalizeCSVWorkLocation('   ')).toBeUndefined();
      expect(normalizeCSVWorkLocation('Yes')).toBeUndefined();
      expect(normalizeCSVWorkLocation('New York City')).toBeUndefined();
    });
  });

  describe('normalizeCSVEmploymentType', () => {
    it('normalizes common employment variants', () => {
      expect(normalizeCSVEmploymentType('Full Time')).toBe('Full-time');
      expect(normalizeCSVEmploymentType('full-time')).toBe('Full-time');
      expect(normalizeCSVEmploymentType('FT')).toBe('Full-time');
      expect(normalizeCSVEmploymentType('Permanent')).toBe('Full-time');
      expect(normalizeCSVEmploymentType('Part Time')).toBe('Part-time');
      expect(normalizeCSVEmploymentType('PT')).toBe('Part-time');
      expect(normalizeCSVEmploymentType('Contractor')).toBe('Contract');
      expect(normalizeCSVEmploymentType('Freelance')).toBe('Contract');
      expect(normalizeCSVEmploymentType('C2C')).toBe('Contract');
      expect(normalizeCSVEmploymentType('Temporary')).toBe('Contract');
      expect(normalizeCSVEmploymentType('Internship')).toBe('Internship');
      expect(normalizeCSVEmploymentType('Co-op')).toBe('Internship');
      expect(normalizeCSVEmploymentType('Trainee')).toBe('Internship');
    });

    it('returns undefined for empty or unrecognized values', () => {
      expect(normalizeCSVEmploymentType('')).toBeUndefined();
      expect(normalizeCSVEmploymentType('  ')).toBeUndefined();
      expect(normalizeCSVEmploymentType('Unknown')).toBeUndefined();
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
