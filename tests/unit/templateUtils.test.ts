import { describe, it, expect } from 'vitest';
import { interpolateTemplate, getSalutationName, encodeMailtoUrl } from '../../src/lib/templateUtils';

describe('templateUtils', () => {
  describe('getSalutationName', () => {
    it('extracts first name from full name', () => {
      expect(getSalutationName('Karla Lindqvist')).toBe('Karla');
      expect(getSalutationName('David Chen')).toBe('David');
    });

    it('returns single name as-is', () => {
      expect(getSalutationName('Karla')).toBe('Karla');
    });

    it('falls back to "Hiring Team" when empty, undefined, or an email address', () => {
      expect(getSalutationName(undefined)).toBe('Hiring Team');
      expect(getSalutationName('')).toBe('Hiring Team');
      expect(getSalutationName('   ')).toBe('Hiring Team');
      expect(getSalutationName('recruiter@company.com')).toBe('Hiring Team');
    });
  });

  describe('interpolateTemplate', () => {
    it('interpolates all variables with complete context', () => {
      const template = 'Hi {contactName},\n\nFollowing up on {role} at {company} applied on {dateApplied}.';
      const result = interpolateTemplate(template, {
        company: 'Linear',
        role: 'Senior Frontend Engineer',
        contactName: 'Karla Lindqvist',
        dateApplied: '2026-07-20',
      });

      expect(result).toBe('Hi Karla,\n\nFollowing up on Senior Frontend Engineer at Linear applied on 2026-07-20.');
    });

    it('handles case-insensitive variable tags like {ROLE} and {Company}', () => {
      const template = 'Regarding {ROLE} at {Company} - {contactname}';
      const result = interpolateTemplate(template, {
        company: 'Stripe',
        role: 'Staff Engineer',
        contactName: 'Alex',
      });

      expect(result).toBe('Regarding Staff Engineer at Stripe - Alex');
    });

    it('applies graceful fallbacks when context values are omitted', () => {
      const template = 'Hi {contactName},\n\nInterested in {role} at {company}.';
      const result = interpolateTemplate(template, {});

      expect(result).toBe('Hi Hiring Team,\n\nInterested in the open position at your company.');
    });

    it('returns empty string if template text is null or empty', () => {
      expect(interpolateTemplate('', { company: 'Linear' })).toBe('');
    });
  });

  describe('encodeMailtoUrl', () => {
    it('encodes email, subject, and body correctly into a mailto URI', () => {
      const url = encodeMailtoUrl(
        'karla@linear.app',
        'Regarding Frontend Role - Linear',
        'Hi Karla,\n\nThank you!'
      );

      expect(url).toBe(
        'mailto:karla@linear.app?subject=Regarding%20Frontend%20Role%20-%20Linear&body=Hi%20Karla%2C%0A%0AThank%20you!'
      );
    });
  });
});
