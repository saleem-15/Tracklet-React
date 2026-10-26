import { describe, it, expect } from 'vitest';
import {
  isLegalPath,
  getLegalDocFromPath,
  getPathForLegalDoc,
  isAuthPath,
  getAuthModeFromPath,
  getPathForAuthMode,
  getTabFromPath,
  getPathForTab,
  isKnownRoute,
  getLandingPageUrl,
  canSafelyGoBack,
  LEGAL_PATH_TO_DOC,
  DOC_TO_LEGAL_PATH,
  navigateToRoute,
} from '../../src/lib/routeUtils';

describe('routeUtils - Legal & Trust Routes', () => {
  it('correctly identifies legal paths', () => {
    expect(isLegalPath('/privacy')).toBe(true);
    expect(isLegalPath('/privacy/')).toBe(true);
    expect(isLegalPath('/privacy-policy')).toBe(true);
    expect(isLegalPath('/privacy-policy/')).toBe(true);
    expect(isLegalPath('/terms')).toBe(true);
    expect(isLegalPath('/terms/')).toBe(true);
    expect(isLegalPath('/terms-of-service')).toBe(true);
    expect(isLegalPath('/terms-of-service/')).toBe(true);
    expect(isLegalPath('/tos')).toBe(true);
    expect(isLegalPath('/legal')).toBe(true);
  });

  it('rejects non-legal paths', () => {
    expect(isLegalPath('/')).toBe(false);
    expect(isLegalPath('/login')).toBe(false);
    expect(isLegalPath('/signup')).toBe(false);
    expect(isLegalPath('/applications')).toBe(false);
    expect(isLegalPath('/pipeline')).toBe(false);
    expect(isLegalPath('/contacts')).toBe(false);
    expect(isLegalPath('/settings')).toBe(false);
    expect(isLegalPath('/unknown')).toBe(false);
  });

  it('resolves the correct document type from paths', () => {
    expect(getLegalDocFromPath('/privacy')).toBe('privacy');
    expect(getLegalDocFromPath('/privacy/')).toBe('privacy');
    expect(getLegalDocFromPath('/privacy-policy')).toBe('privacy');
    expect(getLegalDocFromPath('/legal')).toBe('privacy');

    expect(getLegalDocFromPath('/terms')).toBe('terms');
    expect(getLegalDocFromPath('/terms/')).toBe('terms');
    expect(getLegalDocFromPath('/terms-of-service')).toBe('terms');
    expect(getLegalDocFromPath('/tos')).toBe('terms');
  });

  it('defaults to privacy for unrecognized paths passed to getLegalDocFromPath', () => {
    expect(getLegalDocFromPath('/unknown-doc')).toBe('privacy');
  });

  it('returns canonical path for legal documents', () => {
    expect(getPathForLegalDoc('privacy')).toBe('/privacy');
    expect(getPathForLegalDoc('terms')).toBe('/terms');
  });

  it('preserves existing auth and tab routing functions', () => {
    expect(isAuthPath('/login')).toBe(true);
    expect(isAuthPath('/signup')).toBe(true);
    expect(isAuthPath('/privacy')).toBe(false);
    expect(getAuthModeFromPath('/login')).toBe('signin');
    expect(getPathForAuthMode('signup')).toBe('/signup');
    expect(getTabFromPath('/pipeline')).toBe('pipeline');
    expect(getPathForTab('pipeline')).toBe('/pipeline');
  });

  it('updates window.location.pathname and dispatches popstate event on navigateToRoute', () => {
    let popstateFired = false;
    const listener = () => {
      popstateFired = true;
    };
    window.addEventListener('popstate', listener);

    navigateToRoute('/privacy');
    expect(window.location.pathname).toBe('/privacy');
    expect(popstateFired).toBe(true);

    popstateFired = false;
    navigateToRoute('/terms', true);
    expect(window.location.pathname).toBe('/terms');
    expect(popstateFired).toBe(true);

    window.removeEventListener('popstate', listener);
  });

  describe('isKnownRoute', () => {
    it('recognizes valid workspace tab routes', () => {
      expect(isKnownRoute('/')).toBe(true);
      expect(isKnownRoute('/applications')).toBe(true);
      expect(isKnownRoute('/applications/')).toBe(true);
      expect(isKnownRoute('/pipeline')).toBe(true);
      expect(isKnownRoute('/contacts')).toBe(true);
      expect(isKnownRoute('/analytics')).toBe(true);
      expect(isKnownRoute('/stats')).toBe(true);
      expect(isKnownRoute('/settings')).toBe(true);
    });

    it('recognizes valid auth and verification routes', () => {
      expect(isKnownRoute('/login')).toBe(true);
      expect(isKnownRoute('/signin')).toBe(true);
      expect(isKnownRoute('/signup')).toBe(true);
      expect(isKnownRoute('/register')).toBe(true);
      expect(isKnownRoute('/forgot-password')).toBe(true);
      expect(isKnownRoute('/reset-password')).toBe(true);
      expect(isKnownRoute('/verify-email')).toBe(true);
    });

    it('recognizes valid legal routes', () => {
      expect(isKnownRoute('/privacy')).toBe(true);
      expect(isKnownRoute('/privacy-policy')).toBe(true);
      expect(isKnownRoute('/terms')).toBe(true);
      expect(isKnownRoute('/terms-of-service')).toBe(true);
      expect(isKnownRoute('/tos')).toBe(true);
      expect(isKnownRoute('/legal')).toBe(true);
    });

    it('identifies unknown paths as not found', () => {
      expect(isKnownRoute('/404')).toBe(false);
      expect(isKnownRoute('/not-found')).toBe(false);
      expect(isKnownRoute('/random-slug')).toBe(false);
      expect(isKnownRoute('/applications/123')).toBe(false);
      expect(isKnownRoute('/pipeline/details')).toBe(false);
    });
  });

  describe('getLandingPageUrl', () => {
    it('returns a valid string fallback for landing page', () => {
      const url = getLandingPageUrl();
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });
  });

  describe('canSafelyGoBack', () => {
    it('returns false when referrer is empty or external', () => {
      // In vitest jsdom, document.referrer defaults to empty string
      Object.defineProperty(document, 'referrer', { value: '', configurable: true });
      expect(canSafelyGoBack()).toBe(false);

      Object.defineProperty(document, 'referrer', { value: 'https://google.com', configurable: true });
      expect(canSafelyGoBack()).toBe(false);
    });

    it('returns true only when referrer matches window origin and history length > 1', () => {
      Object.defineProperty(document, 'referrer', { value: `${window.location.origin}/applications`, configurable: true });
      window.history.pushState(null, '', '/applications');
      window.history.pushState(null, '', '/unknown');
      expect(canSafelyGoBack()).toBe(true);
    });
  });
});
