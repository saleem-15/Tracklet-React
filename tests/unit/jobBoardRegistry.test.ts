import { describe, it, expect } from 'vitest';
import {
  isJobBoardOrAts,
  cleanCompanyDomain,
  normalizeHost,
  JOB_BOARD_HOSTS,
  ATS_HOSTS,
} from '../../src/lib/jobBoardRegistry';

describe('JobBoardRegistry', () => {
  describe('normalizeHost', () => {
    it('normalizes full URLs with protocols, paths, and query parameters', () => {
      expect(normalizeHost('https://www.linkedin.com/jobs/view/123456?ref=share')).toBe('linkedin.com');
      expect(normalizeHost('http://boards.greenhouse.io/stripe/jobs/99')).toBe('boards.greenhouse.io');
      expect(normalizeHost('https://jobs.lever.co/figma')).toBe('jobs.lever.co');
      expect(normalizeHost('STRIPE.COM/ABOUT')).toBe('stripe.com');
    });

    it('handles bare hostnames cleanly', () => {
      expect(normalizeHost('www.example.com')).toBe('example.com');
      expect(normalizeHost('sub.domain.co.uk')).toBe('sub.domain.co.uk');
    });

    it('returns empty string for null, undefined, or empty inputs', () => {
      expect(normalizeHost(null)).toBe('');
      expect(normalizeHost(undefined)).toBe('');
      expect(normalizeHost('')).toBe('');
      expect(normalizeHost('   ')).toBe('');
    });
  });

  describe('isJobBoardOrAts', () => {
    it('identifies exact job board domains and subdomains', () => {
      expect(isJobBoardOrAts('linkedin.com')).toBe(true);
      expect(isJobBoardOrAts('www.linkedin.com')).toBe(true);
      expect(isJobBoardOrAts('https://www.linkedin.com/jobs/view/40001')).toBe(true);
      expect(isJobBoardOrAts('indeed.com')).toBe(true);
      expect(isJobBoardOrAts('glassdoor.com')).toBe(true);
      expect(isJobBoardOrAts('wellfound.com')).toBe(true);
      expect(isJobBoardOrAts('otta.com')).toBe(true);
    });

    it('identifies ATS hosts and client tenant subdomains', () => {
      expect(isJobBoardOrAts('greenhouse.io')).toBe(true);
      expect(isJobBoardOrAts('boards.greenhouse.io')).toBe(true);
      expect(isJobBoardOrAts('https://boards.greenhouse.io/stripe/jobs/1')).toBe(true);
      expect(isJobBoardOrAts('lever.co')).toBe(true);
      expect(isJobBoardOrAts('jobs.lever.co')).toBe(true);
      expect(isJobBoardOrAts('ashbyhq.com')).toBe(true);
      expect(isJobBoardOrAts('jobs.ashbyhq.com')).toBe(true);
      expect(isJobBoardOrAts('workdayjobs.com')).toBe(true);
      expect(isJobBoardOrAts('stripe.workdayjobs.com')).toBe(true);
      expect(isJobBoardOrAts('myworkdayjobs.com')).toBe(true);
      expect(isJobBoardOrAts('acme.myworkdayjobs.com')).toBe(true);
      expect(isJobBoardOrAts('smartrecruiters.com')).toBe(true);
      expect(isJobBoardOrAts('bamboohr.com')).toBe(true);
    });

    it('does NOT flag legitimate company domains', () => {
      expect(isJobBoardOrAts('stripe.com')).toBe(false);
      expect(isJobBoardOrAts('linear.app')).toBe(false);
      expect(isJobBoardOrAts('figma.com')).toBe(false);
      expect(isJobBoardOrAts('google.com')).toBe(false);
      expect(isJobBoardOrAts('airbnb.com')).toBe(false);
      expect(isJobBoardOrAts('https://careers.airbnb.com')).toBe(false);
      expect(isJobBoardOrAts('https://acme.org/jobs')).toBe(false);
    });

    it('returns false for empty or invalid inputs', () => {
      expect(isJobBoardOrAts('')).toBe(false);
      expect(isJobBoardOrAts(null)).toBe(false);
      expect(isJobBoardOrAts(undefined)).toBe(false);
    });
  });

  describe('cleanCompanyDomain', () => {
    it('returns cleaned domain for real company websites', () => {
      expect(cleanCompanyDomain('https://stripe.com/jobs')).toBe('stripe.com');
      expect(cleanCompanyDomain('http://www.figma.com/')).toBe('figma.com');
      expect(cleanCompanyDomain('linear.app')).toBe('linear.app');
    });

    it('returns null for job board or ATS domains', () => {
      expect(cleanCompanyDomain('https://www.linkedin.com/jobs/view/123')).toBeNull();
      expect(cleanCompanyDomain('boards.greenhouse.io')).toBeNull();
      expect(cleanCompanyDomain('jobs.lever.co')).toBeNull();
      expect(cleanCompanyDomain('acme.workdayjobs.com')).toBeNull();
      expect(cleanCompanyDomain('indeed.com')).toBeNull();
    });

    it('returns null for invalid inputs or strings without TLD dot', () => {
      expect(cleanCompanyDomain('localhost')).toBeNull();
      expect(cleanCompanyDomain('invalid')).toBeNull();
      expect(cleanCompanyDomain('')).toBeNull();
      expect(cleanCompanyDomain(null)).toBeNull();
    });
  });

  describe('Registry completeness', () => {
    it('contains major job boards and ATS platforms', () => {
      expect(JOB_BOARD_HOSTS).toContain('linkedin.com');
      expect(JOB_BOARD_HOSTS).toContain('indeed.com');
      expect(JOB_BOARD_HOSTS).toContain('glassdoor.com');
      expect(ATS_HOSTS).toContain('greenhouse.io');
      expect(ATS_HOSTS).toContain('lever.co');
      expect(ATS_HOSTS).toContain('ashbyhq.com');
      expect(ATS_HOSTS).toContain('workdayjobs.com');
    });
  });
});
