import { describe, it, expect } from 'vitest';
import {
  getCompanyDomain,
  getCompanyLogoUrls,
  getCompanyAvatarColors,
  getCompanyCorporatePalette,
} from '../../src/lib/logoUtils';

describe('logoUtils - Domain and Logo Resolution', () => {
  describe('getCompanyDomain sanitization', () => {
    it('returns customDomain when it is a valid, legitimate company domain', () => {
      expect(getCompanyDomain('Acme Corp', undefined, 'acmecorp.com')).toBe('acmecorp.com');
      expect(getCompanyDomain('Stripe', undefined, 'https://stripe.com')).toBe('stripe.com');
      expect(getCompanyDomain('Linear', undefined, 'linear.app/about')).toBe('linear.app');
    });

    it('ignores customDomain if it matches a job board domain and falls back to dictionary/slug', () => {
      expect(getCompanyDomain('Stripe', 'https://www.linkedin.com/jobs/view/123', 'linkedin.com')).toBe('stripe.com');
      expect(getCompanyDomain('Figma', undefined, 'https://www.linkedin.com')).toBe('figma.com');
      expect(getCompanyDomain('Custom Company', undefined, 'indeed.com')).toBe('customcompany.com');
      expect(getCompanyDomain('Acme', undefined, 'glassdoor.com')).toBe('acme.com');
    });

    it('ignores customDomain if it matches an ATS host and falls back to dictionary/slug', () => {
      expect(getCompanyDomain('Stripe', 'https://boards.greenhouse.io/stripe/jobs/1', 'boards.greenhouse.io')).toBe('stripe.com');
      expect(getCompanyDomain('Notion', undefined, 'jobs.lever.co')).toBe('notion.so');
      expect(getCompanyDomain('Acme', undefined, 'acme.workdayjobs.com')).toBe('acme.com');
    });

    it('ignores jobLink if it is a job board or ATS URL', () => {
      expect(getCompanyDomain('Stripe', 'https://www.linkedin.com/jobs/view/999')).toBe('stripe.com');
      expect(getCompanyDomain('GitHub', 'https://github.greenhouse.io/jobs/123')).toBe('github.com');
    });

    it('extracts domain from jobLink when it is the company own careers site', () => {
      expect(getCompanyDomain('Vercel', 'https://vercel.com/careers/frontend')).toBe('vercel.com');
      expect(getCompanyDomain('Acme', 'https://careers.acme.co/apply')).toBe('careers.acme.co');
    });

    it('resolves known companies from the dictionary', () => {
      expect(getCompanyDomain('Google')).toBe('google.com');
      expect(getCompanyDomain('Meta')).toBe('meta.com');
      expect(getCompanyDomain('Amazon')).toBe('amazon.com');
      expect(getCompanyDomain('Microsoft')).toBe('microsoft.com');
      expect(getCompanyDomain('Apple')).toBe('apple.com');
      expect(getCompanyDomain('Netflix')).toBe('netflix.com');
      expect(getCompanyDomain('Stripe')).toBe('stripe.com');
    });

    it('falls back to company.com slug if not known', () => {
      expect(getCompanyDomain('Random Tech Corp')).toBe('randomtechcorp.com');
    });
  });

  describe('getCompanyLogoUrls sanitization', () => {
    it('preserves valid custom logo URLs for non-job-board domains', () => {
      const urls = getCompanyLogoUrls('Acme', undefined, 'https://cdn.acme.com/logo.png');
      expect(urls).toEqual(['https://cdn.acme.com/logo.png']);
    });

    it('discards customLogoUrl if it points to a job board logo (e.g. logo.clearbit.com/linkedin.com)', () => {
      const urls = getCompanyLogoUrls('Stripe', undefined, 'https://media.licdn.com/dms/image/company-logo');
      expect(urls[0]).toContain('google.com/s2/favicons');
      expect(urls[0]).toContain('domain=stripe.com');
      expect(urls[1]).toContain('unavatar.io/stripe.com');
    });

    it('discards customLogoUrl if it contains an ATS host logo', () => {
      const urls = getCompanyLogoUrls('Retool', undefined, 'https://greenhouse.io/retool.png');
      expect(urls[0]).toContain('domain=retool.com');
    });

    it('generates Google Favicons and Unavatar URLs for resolved domain', () => {
      const urls = getCompanyLogoUrls('Figma');
      expect(urls[0]).toBe('https://www.google.com/s2/favicons?domain=figma.com&sz=128&default_icon=none');
      expect(urls[1]).toBe('https://unavatar.io/figma.com?fallback=false');
    });
  });

  describe('getCompanyAvatarColors', () => {
    it('returns consistent pastel palette deterministically', () => {
      const colors1 = getCompanyAvatarColors('Stripe');
      const colors2 = getCompanyAvatarColors('Stripe');
      expect(colors1).toEqual(colors2);
      expect(colors1).toHaveProperty('bg');
      expect(colors1).toHaveProperty('text');
      expect(colors1).toHaveProperty('border');
    });
  });

  describe('getCompanyCorporatePalette', () => {
    it('returns consistent corporate palette deterministically without gradients', () => {
      const p1 = getCompanyCorporatePalette('Stripe');
      const p2 = getCompanyCorporatePalette('Stripe');
      expect(p1).toEqual(p2);
      expect(p1.bg).not.toContain('gradient');
      expect(p1).toHaveProperty('bg');
      expect(p1).toHaveProperty('icon');
      expect(p1).toHaveProperty('border');
    });
  });
});
