import { describe, it, expect } from 'vitest';
import { compareSemver, isUpdateAvailable, normalizeVersion } from '../../src/lib/versionUtils';

describe('versionUtils', () => {
  describe('normalizeVersion', () => {
    it('normalizes standard versions', () => {
      expect(normalizeVersion('1.0.0')).toBe('1.0.0');
    });

    it('strips leading v/V', () => {
      expect(normalizeVersion('v1.2.3')).toBe('1.2.3');
      expect(normalizeVersion('V2.0.0')).toBe('2.0.0');
    });

    it('strips prerelease and metadata tags', () => {
      expect(normalizeVersion('1.0.1-beta.1')).toBe('1.0.1');
      expect(normalizeVersion('1.0.0+build.42')).toBe('1.0.0');
    });

    it('handles empty or null inputs gracefully', () => {
      expect(normalizeVersion('')).toBe('0.0.0');
      expect(normalizeVersion(null)).toBe('0.0.0');
      expect(normalizeVersion(undefined)).toBe('0.0.0');
    });
  });

  describe('compareSemver', () => {
    it('returns 0 for identical versions', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('v1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('2.15.3', '2.15.3')).toBe(0);
    });

    it('correctly compares major version differences', () => {
      expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
      expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
    });

    it('correctly compares minor version differences', () => {
      expect(compareSemver('1.2.0', '1.1.9')).toBe(1);
      expect(compareSemver('1.1.0', '1.2.0')).toBe(-1);
    });

    it('correctly compares patch version differences', () => {
      expect(compareSemver('1.0.2', '1.0.1')).toBe(1);
      expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
    });

    it('handles unequal segment lengths', () => {
      expect(compareSemver('1.0', '1.0.0')).toBe(0);
      expect(compareSemver('1.0.0.1', '1.0.0')).toBe(1);
      expect(compareSemver('1.0.0', '1.0.0.1')).toBe(-1);
    });
  });

  describe('isUpdateAvailable', () => {
    it('returns true when installed version is older than latest', () => {
      expect(isUpdateAvailable('1.0.0', '1.0.1')).toBe(true);
      expect(isUpdateAvailable('0.9.0', '1.0.0')).toBe(true);
      expect(isUpdateAvailable('v1.0.0', '1.1.0')).toBe(true);
    });

    it('returns false when installed version is equal to latest', () => {
      expect(isUpdateAvailable('1.0.0', '1.0.0')).toBe(false);
      expect(isUpdateAvailable('v1.0.0', '1.0.0')).toBe(false);
    });

    it('returns false when installed version is newer (developer build)', () => {
      expect(isUpdateAvailable('1.1.0', '1.0.0')).toBe(false);
      expect(isUpdateAvailable('2.0.0', '1.0.0')).toBe(false);
    });

    it('returns false when installed version is null or empty', () => {
      expect(isUpdateAvailable(null, '1.0.0')).toBe(false);
      expect(isUpdateAvailable('', '1.0.0')).toBe(false);
      expect(isUpdateAvailable(undefined, '1.0.0')).toBe(false);
    });
  });
});
