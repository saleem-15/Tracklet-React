import { describe, it, expect } from 'vitest';
import {
  getCompanyDomain,
  getCompanyLogoUrls,
  getCompanyAvatarColors,
} from '../../src/lib/logoUtils';

describe('logoUtils - Domain and Logo Resolution', () => {
  describe('getCompanyDomain sanitization', () => {
    it('returns customDomain when it is a valid, legitimate company domain', () => {
      expect(getCompanyDomain('Acme Corp', undefined, 'acmecorp.com')).toBe('acmecorp.com');
      expect(getCompanyDomain('Stripe', undefined, 'https://stripe.com')).toBe('stripe.com');
      expect(getCompanyDomain('Linear', undefined, 'linear.app/about')).toBe('linear.app');
    });

    it('ignores customDomain if it matches a job board domain and falls back to dictionary/slug', () => {
      // Prior bug: LinkedIn jobs saved companyDomain: "linkedin.com"
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
      expect(getCompanyDomain('Figma', 'https://boards.greenhouse.io/figma/jobs/999')).toBe('figma.com');
      expect(getCompanyDomain('Random Corp', 'https://jobs.lever.co/randomcorp/999')).toBe('randomcorp.com');
    });

    it('extracts domain from jobLink when it is the company own careers site', () => {
      expect(getCompanyDomain('Unknown', 'https://careers.acme.org/jobs/42')).toBe('careers.acme.org');
    });

    it('resolves known companies from the dictionary', () => {
      expect(getCompanyDomain('Stripe')).toBe('stripe.com');
      expect(getCompanyDomain('Linear')).toBe('linear.app');
      expect(getCompanyDomain('Figma')).toBe('figma.com');
      expect(getCompanyDomain('OpenAI')).toBe('openai.com');
      expect(getCompanyDomain('Anthropic')).toBe('anthropic.com');
    });

    it('falls back to company.com slug if not known', () => {
      expect(getCompanyDomain('Brand New Startup')).toBe('brandnewstartup.com');
    });
  });

  describe('getCompanyLogoUrls sanitization', () => {
    it('preserves valid custom logo URLs for non-job-board domains', () => {
      const customUrl = 'https://acme.org/assets/logo.png';
      const result = getCompanyLogoUrls('Acme', undefined, customUrl);
      expect(result).toEqual([customUrl]);
    });

    it('discards customLogoUrl if it points to a job board logo (e.g. logo.clearbit.com/linkedin.com)', () => {
      const badLinkedInLogo = 'https://logo.clearbit.com/linkedin.com';
      const urls = getCompanyLogoUrls('Stripe', undefined, badLinkedInLogo);
      
      // Should NOT return the LinkedIn logo URL
      expect(urls).not.toContain(badLinkedInLogo);
      // Should resolve to Stripe's favicons based on company name
      expect(urls[0]).toContain('stripe.com');
    });

    it('discards customLogoUrl if it contains an ATS host logo', () => {
      const badGreenhouseLogo = 'https://logo.clearbit.com/boards.greenhouse.io';
      const urls = getCompanyLogoUrls('Stripe', undefined, badGreenhouseLogo);
      expect(urls).not.toContain(badGreenhouseLogo);
      expect(urls[0]).toContain('stripe.com');
    });

    it('generates Google Favicons and Unavatar URLs for resolved domain', () => {
      const urls = getCompanyLogoUrls('Figma');
      expect(urls[0]).toBe('https://www.google.com/s2/favicons?domain=figma.com&sz=128');
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
});
