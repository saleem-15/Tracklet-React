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
  LEGAL_PATH_TO_DOC,
  DOC_TO_LEGAL_PATH,
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
});
