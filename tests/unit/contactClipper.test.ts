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
  if (/(?:vp|vice\s+president|director|head\s+of|engineering\s+manager|cto|ceo|coo|cpo|chief|founder|co-founder|tech\s+lead\s+manager)/i.test(clean)) {
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

  const cleanExistingLoc = (existing.location || '').trim().toLowerCase();
  const cleanScrapedLoc = (scraped.location || '').trim().toLowerCase();
  if (cleanScrapedLoc && cleanExistingLoc && cleanExistingLoc !== cleanScrapedLoc) {
    changedFields.push('location');
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

    it('detects location changes', () => {
      const storedWithLoc = { ...stored, location: 'San Francisco, CA' };
      const scraped = {
        role: 'Technical Recruiter',
        organization: 'Stripe',
        location: 'New York, NY',
      };
      const result = diffContact(storedWithLoc, scraped);
      expect(result.hasChanged).toBe(true);
      expect(result.changedFields).toContain('location');
    });
  });

  describe('matchContactMultiIdentifier (US8 / T052)', () => {
    const contacts: Partial<Contact>[] = [
      {
        id: 'c1',
        name: 'Sarah Connor',
        role: 'Technical Recruiter',
        organization: 'Stripe',
        linkedIn: 'https://www.linkedin.com/in/sarah-connor',
        email: 'sarah.connor@stripe.com'
      },
      {
        id: 'c2',
        name: 'John Doe',
        role: 'Engineering Manager',
        organization: 'Google',
        linkedIn: 'https://www.linkedin.com/in/johndoe',
      }
    ];

    it('matches contact by canonical LinkedIn URL', () => {
      const match = matchContactMultiIdentifier(contacts, {
        linkedIn: 'https://www.linkedin.com/in/sarah-connor/'
      });
      expect(match).toBeDefined();
      expect(match?.id).toBe('c1');
    });

    it('matches contact by email address case-insensitively', () => {
      const match = matchContactMultiIdentifier(contacts, {
        email: 'SARAH.CONNOR@stripe.com'
      });
      expect(match).toBeDefined();
      expect(match?.id).toBe('c1');
    });

    it('matches contact by Full Name and organization', () => {
      const match = matchContactMultiIdentifier(contacts, {
        name: 'john doe',
        organization: 'Google'
      });
      expect(match).toBeDefined();
      expect(match?.id).toBe('c2');
    });

    it('returns undefined when no match exists', () => {
      const match = matchContactMultiIdentifier(contacts, {
        name: 'Alex Mercer',
        linkedIn: 'https://www.linkedin.com/in/alex-mercer'
      });
      expect(match).toBeUndefined();
    });
  });

  describe('matchScopedEmailDuplicate (US8 / T051)', () => {
    const existingEmails = [
      {
        emailUrl: 'https://mail.google.com/mail/u/0/#inbox/FMfcgzGsl',
        subject: 'Interview with Stripe',
        date: '2026-10-05'
      }
    ];

    it('matches email by thread URL', () => {
      const match = matchScopedEmailDuplicate(existingEmails, {
        emailUrl: 'https://mail.google.com/mail/u/0/#inbox/FMfcgzGsl'
      });
      expect(match).toBeDefined();
      expect(match?.subject).toBe('Interview with Stripe');
    });

    it('matches email by clean subject and date', () => {
      const match = matchScopedEmailDuplicate(existingEmails, {
        subject: 'interview with stripe',
        date: '2026-10-05'
      });
      expect(match).toBeDefined();
    });

    it('returns undefined for different thread/date', () => {
      const match = matchScopedEmailDuplicate(existingEmails, {
        subject: 'Follow-up regarding application',
        date: '2026-10-07'
      });
      expect(match).toBeUndefined();
    });
  });
});

export function matchContactMultiIdentifier(
  contacts: Partial<Contact>[],
  target: { linkedIn?: string; email?: string; name?: string; organization?: string }
): Partial<Contact> | undefined {
  const normUrl = target.linkedIn?.trim().toLowerCase().replace(/\/+$/, '');
  const searchEmail = target.email?.trim().toLowerCase();
  const normName = target.name?.trim().toLowerCase();
  const normOrg = target.organization?.trim().toLowerCase();

  return contacts.find(c => {
    if (normUrl && c.linkedIn && c.linkedIn.trim().toLowerCase().replace(/\/+$/, '') === normUrl) return true;
    if (searchEmail && c.email && c.email.trim().toLowerCase() === searchEmail) return true;
    if (normName && c.name && c.name.trim().toLowerCase() === normName) {
      if (!normOrg || !c.organization || c.organization.trim().toLowerCase() === normOrg) return true;
    }
    return false;
  });
}

export function matchScopedEmailDuplicate(
  emails: Array<{ emailUrl?: string; subject?: string; date?: string }>,
  target: { emailUrl?: string; subject?: string; date?: string }
): { emailUrl?: string; subject?: string; date?: string } | undefined {
  const targetUrl = target.emailUrl?.trim().toLowerCase();
  const targetSub = target.subject?.trim().toLowerCase();
  const targetDate = target.date?.trim();

  return emails.find(existing => {
    if (targetUrl && existing.emailUrl && existing.emailUrl.trim().toLowerCase() === targetUrl) {
      return true;
    }
    if (targetSub && targetDate && existing.subject && existing.date) {
      if (existing.subject.trim().toLowerCase() === targetSub && existing.date.trim() === targetDate) {
        return true;
      }
    }
    return false;
  });
}
