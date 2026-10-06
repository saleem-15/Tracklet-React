import { describe, it, expect } from 'vitest';
import { Contact, ContactCategory } from '../../src/types';

/**
 * Headline category smart-defaulting logic for Contact Clipper.
 * Replicates the inference engine implemented in extension/popup.js.
 */
export function inferContactCategory(headline: string): ContactCategory {
  if (!headline) return 'Other';
  const clean = headline.trim().toLowerCase();

  // 1. Recruiter & Talent Acquisition keywords
  if (/(?:talent|recruiter|recruiting|sourcer|staffing|people\s+ops|technical\s+sourcer)/i.test(clean)) {
    return 'Recruiter';
  }

  // 2. Leadership & Hiring Manager keywords
  if (/(?:vp|vice\s+president|director|head\s+of|engineering\s+manager|cto|founder|co-founder|tech\s+lead\s+manager)/i.test(clean)) {
    return 'Hiring Manager';
  }

  // 3. Mentorship & Advisory keywords
  if (/(?:mentor|advisor|coach|career\s+guide)/i.test(clean)) {
    return 'Mentor';
  }

  // 4. Peer / Alumni keywords
  if (/(?:peer|alumni|fellow|graduate|class\s+of|engineer|developer|designer)/i.test(clean)) {
    return 'Peer / Alumni';
  }

  return 'Other';
}

/**
 * Diffing logic between existing stored contact and newly scraped LinkedIn data.
 */
export function diffContact(
  existing: Partial<Contact>,
  scraped: { role?: string; organization?: string; location?: string }
): { hasChanged: boolean; changedFields: string[] } {
  const changedFields: string[] = [];

  const cleanExistingRole = (existing.role || '').trim().toLowerCase();
  const cleanScrapedRole = (scraped.role || '').trim().toLowerCase();
  if (cleanScrapedRole && cleanExistingRole !== cleanScrapedRole) {
    changedFields.push('role');
  }

  const cleanExistingOrg = (existing.organization || '').trim().toLowerCase();
  const cleanScrapedOrg = (scraped.organization || '').trim().toLowerCase();
  if (cleanScrapedOrg && cleanExistingOrg !== cleanScrapedOrg) {
    changedFields.push('organization');
  }

  return {
    hasChanged: changedFields.length > 0,
    changedFields,
  };
}

describe('contactClipper', () => {
  describe('inferContactCategory', () => {
    it('smart-defaults recruiters and talent acquisition headlines', () => {
      expect(inferContactCategory('Senior Technical Recruiter at Stripe')).toBe('Recruiter');
      expect(inferContactCategory('Lead Talent Acquisition Partner @ Linear')).toBe('Recruiter');
      expect(inferContactCategory('Global Staffing Lead')).toBe('Recruiter');
      expect(inferContactCategory('Sourcer & Recruiting Coordinator')).toBe('Recruiter');
    });

    it('smart-defaults leadership and hiring manager headlines', () => {
      expect(inferContactCategory('Engineering Manager - Infrastructure')).toBe('Hiring Manager');
      expect(inferContactCategory('VP of Engineering @ Datadog')).toBe('Hiring Manager');
      expect(inferContactCategory('Director of Product Design')).toBe('Hiring Manager');
      expect(inferContactCategory('Head of Platform Engineering')).toBe('Hiring Manager');
      expect(inferContactCategory('CTO & Co-Founder')).toBe('Hiring Manager');
    });

    it('smart-defaults mentor and advisor headlines', () => {
      expect(inferContactCategory('Startup Advisor & Engineering Mentor')).toBe('Mentor');
      expect(inferContactCategory('Executive Career Coach')).toBe('Mentor');
    });

    it('smart-defaults peer and alumni headlines', () => {
      expect(inferContactCategory('Senior Software Engineer @ Figma')).toBe('Peer / Alumni');
      expect(inferContactCategory('Product Designer | Alumni Stanford')).toBe('Peer / Alumni');
    });

    it('defaults to Other for unrecognized or ambiguous headlines', () => {
      expect(inferContactCategory('Passionate Creator & Thinker')).toBe('Other');
      expect(inferContactCategory('')).toBe('Other');
    });
  });

  describe('diffContact', () => {
    const stored: Partial<Contact> = {
      name: 'Sarah Connor',
      role: 'Technical Recruiter',
      organization: 'Stripe',
      linkedIn: 'https://www.linkedin.com/in/sarah-connor',
    };

    it('reports no changes when scraped data matches stored contact', () => {
      const scraped = {
        role: 'Technical Recruiter',
        organization: 'Stripe',
      };
      const result = diffContact(stored, scraped);
      expect(result.hasChanged).toBe(false);
      expect(result.changedFields).toHaveLength(0);
    });

    it('detects headline promotions and updates', () => {
      const scraped = {
        role: 'Senior Lead Recruiter',
        organization: 'Stripe',
      };
      const result = diffContact(stored, scraped);
      expect(result.hasChanged).toBe(true);
      expect(result.changedFields).toContain('role');
    });

    it('detects company transitions', () => {
      const scraped = {
        role: 'Technical Recruiter',
        organization: 'Figma',
      };
      const result = diffContact(stored, scraped);
      expect(result.hasChanged).toBe(true);
      expect(result.changedFields).toContain('organization');
    });
  });
});
