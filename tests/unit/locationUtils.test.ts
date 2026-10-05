import { describe, it, expect } from 'vitest';
import { expandCountry, formatLocation } from '../../src/lib/locationUtils';

describe('locationUtils', () => {
  describe('expandCountry', () => {
    it('expands ISO 2-letter country codes to full English names', () => {
      expect(expandCountry('QA')).toBe('Qatar');
      expect(expandCountry('LB')).toBe('Lebanon');
      expect(expandCountry('US')).toBe('United States');
      expect(expandCountry('GB')).toBe('United Kingdom');
      expect(expandCountry('DE')).toBe('Germany');
    });

    it('expands ISO 3-letter country codes or common aliases', () => {
      expect(expandCountry('QAT')).toBe('Qatar');
      expect(expandCountry('LBN')).toBe('Lebanon');
      expect(expandCountry('ARE')).toBe('United Arab Emirates');
      expect(expandCountry('UAE')).toBe('United Arab Emirates');
      expect(expandCountry('USA')).toBe('United States');
      expect(expandCountry('KSA')).toBe('Saudi Arabia');
    });

    it('preserves already full country names or custom values', () => {
      expect(expandCountry('Qatar')).toBe('Qatar');
      expect(expandCountry('Lebanon')).toBe('Lebanon');
      expect(expandCountry('United States')).toBe('United States');
      expect(expandCountry('Unknown Territory')).toBe('Unknown Territory');
    });

    it('handles empty or nullish values gracefully', () => {
      expect(expandCountry('')).toBe('');
      expect(expandCountry(null)).toBe('');
      expect(expandCountry(undefined)).toBe('');
    });
  });

  describe('formatLocation', () => {
    it('deduplicates adjacent duplicate city names and expands country acronyms (string input)', () => {
      expect(formatLocation('Doha, Doha, QA')).toBe('Doha, Qatar');
      expect(formatLocation('Beirut, Beirut, LB')).toBe('Beirut, Lebanon');
      expect(formatLocation('Dubai, Dubai, ARE')).toBe('Dubai, United Arab Emirates');
      expect(formatLocation('Riyadh, Riyadh, KSA')).toBe('Riyadh, Saudi Arabia');
    });

    it('deduplicates adjacent duplicate items and expands country acronyms (array input)', () => {
      expect(formatLocation(['Doha', 'Doha', 'QA'])).toBe('Doha, Qatar');
      expect(formatLocation(['Beirut', 'Beirut', 'LB'])).toBe('Beirut, Lebanon');
      expect(formatLocation(['Cairo', 'Cairo', 'EGY'])).toBe('Cairo, Egypt');
    });

    it('preserves distinct states, provinces, and regions without false deduplication', () => {
      expect(formatLocation('San Francisco, CA, US')).toBe('San Francisco, CA, United States');
      expect(formatLocation(['Austin', 'TX', 'USA'])).toBe('Austin, TX, United States');
      expect(formatLocation('London, Greater London, UK')).toBe('London, Greater London, United Kingdom');
    });

    it('handles single part or already formatted locations', () => {
      expect(formatLocation('Remote')).toBe('Remote');
      expect(formatLocation('Paris, France')).toBe('Paris, France');
      expect(formatLocation('QA')).toBe('Qatar');
    });

    it('handles empty or falsy inputs', () => {
      expect(formatLocation('')).toBe('');
      expect(formatLocation(null)).toBe('');
      expect(formatLocation(undefined)).toBe('');
      expect(formatLocation([])).toBe('');
      expect(formatLocation([null, undefined, ''])).toBe('');
    });
  });
});
