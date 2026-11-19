import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BRANDFETCH_CLIENT_ID_STORAGE_KEY,
  LOGO_SOURCE_STORAGE_KEY,
  getBrandfetchClientId,
  getCompanyDomain,
  getCompanyLogoUrls,
  getCompanyAvatarColors,
  getCompanyCorporatePalette,
  getSavedLogoSource,
  isLogoSourceMode,
  setBrandfetchClientId,
  setSavedLogoSource,
} from '../../src/lib/logoUtils';

describe('logoUtils - Domain and Logo Resolution', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

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

    it('defaults to Google Favicons + Unavatar when source is omitted or explicitly "google"', () => {
      const omitted = getCompanyLogoUrls('Figma');
      const explicit = getCompanyLogoUrls('Figma', undefined, undefined, undefined, { source: 'google' });

      expect(omitted).toEqual([
        'https://www.google.com/s2/favicons?domain=figma.com&sz=128&default_icon=none',
        'https://unavatar.io/figma.com?fallback=false',
      ]);
      expect(explicit).toEqual(omitted);
    });

    it('prepends Brandfetch light-surface symbol + icon URLs with encoded Client ID', () => {
      const urls = getCompanyLogoUrls('Figma', undefined, undefined, undefined, {
        source: 'brandfetch-symbol',
        brandfetchClientId: 'client 123/abc',
      });

      expect(urls).toEqual([
        'https://cdn.brandfetch.io/figma.com/theme/dark/fallback/404/h/128/w/128/symbol?c=client%20123%2Fabc',
        'https://cdn.brandfetch.io/figma.com/theme/dark/fallback/404/h/128/w/128/icon?c=client%20123%2Fabc',
        'https://www.google.com/s2/favicons?domain=figma.com&sz=128&default_icon=none',
        'https://unavatar.io/figma.com?fallback=false',
      ]);
    });

    it('prepends only the Brandfetch light-surface icon URL for "brandfetch-icon"', () => {
      const urls = getCompanyLogoUrls('Figma', undefined, undefined, undefined, {
        source: 'brandfetch-icon',
        brandfetchClientId: 'client-123',
      });

      expect(urls).toEqual([
        'https://cdn.brandfetch.io/figma.com/theme/dark/fallback/404/h/128/w/128/icon?c=client-123',
        'https://www.google.com/s2/favicons?domain=figma.com&sz=128&default_icon=none',
        'https://unavatar.io/figma.com?fallback=false',
      ]);
    });

    it('uses a saved Client ID when the caller does not pass one explicitly', () => {
      localStorage.setItem(BRANDFETCH_CLIENT_ID_STORAGE_KEY, 'stored-client');

      const urls = getCompanyLogoUrls('Figma', undefined, undefined, undefined, {
        source: 'brandfetch-symbol',
      });

      expect(urls[0]).toContain('cdn.brandfetch.io/figma.com');
      expect(urls[0]).toContain('?c=stored-client');
    });

    it('falls back gracefully to Google Favicons when a Brandfetch source has no Client ID', () => {
      const symbol = getCompanyLogoUrls('Figma', undefined, undefined, undefined, {
        source: 'brandfetch-symbol',
      });
      const icon = getCompanyLogoUrls('Figma', undefined, undefined, undefined, {
        source: 'brandfetch-icon',
      });

      expect(symbol).toEqual([
        'https://www.google.com/s2/favicons?domain=figma.com&sz=128&default_icon=none',
        'https://unavatar.io/figma.com?fallback=false',
      ]);
      expect(icon).toEqual(symbol);
    });

    it('prioritizes Brandfetch ahead of legacy saved customLogoUrl in lab mode while keeping it as fallback', () => {
      const custom = 'https://cdn.acme.com/logo.png';
      expect(
        getCompanyLogoUrls('Acme', undefined, custom, undefined, { source: 'brandfetch-symbol', brandfetchClientId: 'x' })
      ).toEqual([
        'https://cdn.brandfetch.io/acme.com/theme/dark/fallback/404/h/128/w/128/symbol?c=x',
        'https://cdn.brandfetch.io/acme.com/theme/dark/fallback/404/h/128/w/128/icon?c=x',
        custom,
        'https://www.google.com/s2/favicons?domain=acme.com&sz=128&default_icon=none',
        'https://unavatar.io/acme.com?fallback=false',
      ]);
      expect(
        getCompanyLogoUrls('Acme', undefined, custom, undefined, { source: 'google' })
      ).toEqual([custom]);
    });
  });

  describe('logo source storage helpers', () => {
    it('defaults to "google" and validates known modes', () => {
      expect(getSavedLogoSource()).toBe('google');
      expect(isLogoSourceMode('google')).toBe(true);
      expect(isLogoSourceMode('brandfetch-symbol')).toBe(true);
      expect(isLogoSourceMode('brandfetch-icon')).toBe(true);
      expect(isLogoSourceMode('nonsense')).toBe(false);
      expect(isLogoSourceMode(null)).toBe(false);
    });

    it('persists the source and dispatches a detail-carrying custom event', () => {
      const listener = vi.fn();
      window.addEventListener('tracklet:logo-source-changed', listener);

      setSavedLogoSource('brandfetch-symbol');

      expect(localStorage.getItem(LOGO_SOURCE_STORAGE_KEY)).toBe('brandfetch-symbol');
      expect(getSavedLogoSource()).toBe('brandfetch-symbol');
      expect(listener).toHaveBeenCalledTimes(1);
      expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe('brandfetch-symbol');

      window.removeEventListener('tracklet:logo-source-changed', listener);
    });

    it('trims and persists the Client ID, removing the key when cleared', () => {
      const listener = vi.fn();
      window.addEventListener('tracklet:logo-source-changed', listener);

      setBrandfetchClientId('  free-client-id  ');
      expect(localStorage.getItem(BRANDFETCH_CLIENT_ID_STORAGE_KEY)).toBe('free-client-id');
      expect(getBrandfetchClientId()).toBe('free-client-id');

      setBrandfetchClientId('   ');
      expect(localStorage.getItem(BRANDFETCH_CLIENT_ID_STORAGE_KEY)).toBeNull();
      expect(getBrandfetchClientId()).toBe('');
      expect(listener).toHaveBeenCalledTimes(2);

      window.removeEventListener('tracklet:logo-source-changed', listener);
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
