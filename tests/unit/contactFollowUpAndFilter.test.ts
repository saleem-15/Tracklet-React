import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  filterContacts,
  getContactsFollowUpDueSoon,
  getContactFollowUpHoursRemaining,
} from '../../src/lib/contactUtils';
import { Contact } from '../../src/types';

describe('Contact Follow-up & Filtering Suite (Issue #59)', () => {
  const baseNow = new Date('2026-10-20T12:00:00Z');

  // Contact overdue by 47 days (~1128h ago)
  const contact47dOverdue: Contact = {
    id: 'contact-47d',
    userId: 'user-1',
    name: 'Sarah Connor',
    role: 'Lead Recruiter',
    organization: 'Cyberdyne',
    category: 'Recruiter',
    nextFollowUpDate: '2026-09-03',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  // Contact overdue by 44 days (~1056h ago)
  const contact44dOverdue: Contact = {
    id: 'contact-44d',
    userId: 'user-1',
    name: 'Miles Dyson',
    role: 'Director of Engineering',
    organization: 'Cyberdyne',
    category: 'Hiring Manager',
    nextFollowUpDate: '2026-09-06',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  // Contact overdue by 41 days (~984h ago)
  const contact41dOverdue: Contact = {
    id: 'contact-41d',
    userId: 'user-1',
    name: 'Kyle Reese',
    role: 'Senior Engineer',
    organization: 'Resistance',
    category: 'Peer / Alumni',
    nextFollowUpDate: '2026-09-09',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  // Contact overdue by 7 days (~168h ago)
  const contact7dOverdue: Contact = {
    id: 'contact-7d',
    userId: 'user-1',
    name: 'Marcus Wright',
    role: 'Talent Partner',
    organization: 'Skynet',
    category: 'Recruiter',
    nextFollowUpDate: '2026-10-13',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  // Contact due today (~12h left)
  const contactDueToday: Contact = {
    id: 'contact-today',
    userId: 'user-1',
    name: 'John Connor',
    role: 'General',
    organization: 'Tech Com',
    category: 'Mentor',
    nextFollowUpDate: '2026-10-20',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  // Contact due in future (+30 days)
  const contactDueFuture: Contact = {
    id: 'contact-future',
    userId: 'user-1',
    name: 'Kate Brewster',
    role: 'Staff Vet',
    organization: 'Clinic',
    category: 'Other',
    nextFollowUpDate: '2026-11-20',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  // Contact with no follow-up date
  const contactNoFollowUp: Contact = {
    id: 'contact-none',
    userId: 'user-1',
    name: 'T-800',
    role: 'Security',
    organization: 'Cyberdyne',
    category: 'Other',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const allContacts = [
    contact47dOverdue,
    contact44dOverdue,
    contact41dOverdue,
    contact7dOverdue,
    contactDueToday,
    contactDueFuture,
    contactNoFollowUp,
  ];

  describe('getContactsFollowUpDueSoon', () => {
    it('includes all contacts overdue 7+ and 40+ days without the old -120h cutoff', () => {
      const dueSoon = getContactsFollowUpDueSoon(allContacts, 48, baseNow);

      // Must include 47d, 44d, 41d, 7d, and today (5 contacts total)
      expect(dueSoon.length).toBe(5);

      const contactIds = dueSoon.map((item) => item.contact.id);
      expect(contactIds).toContain('contact-47d');
      expect(contactIds).toContain('contact-44d');
      expect(contactIds).toContain('contact-41d');
      expect(contactIds).toContain('contact-7d');
      expect(contactIds).toContain('contact-today');

      // Must exclude future follow-up and contact without follow-up
      expect(contactIds).not.toContain('contact-future');
      expect(contactIds).not.toContain('contact-none');
    });

    it('sorts contacts by urgency with the most overdue contacts first', () => {
      const dueSoon = getContactsFollowUpDueSoon(allContacts, 48, baseNow);

      // Most overdue (lowest hoursLeft) should be first
      expect(dueSoon[0].contact.id).toBe('contact-47d');
      expect(dueSoon[1].contact.id).toBe('contact-44d');
      expect(dueSoon[2].contact.id).toBe('contact-41d');
      expect(dueSoon[3].contact.id).toBe('contact-7d');
      expect(dueSoon[4].contact.id).toBe('contact-today');
    });
  });

  describe('filterContacts', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(baseNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns overdue contacts when onlyFollowUpDue is true instead of empty list', () => {
      const filtered = filterContacts(allContacts, '', 'All', true, 48);

      // All 5 due/overdue contacts must be returned
      expect(filtered.length).toBe(5);
      const filteredIds = filtered.map((c) => c.id);
      expect(filteredIds).toEqual(
        expect.arrayContaining([
          'contact-47d',
          'contact-44d',
          'contact-41d',
          'contact-7d',
          'contact-today',
        ])
      );
      expect(filteredIds).not.toContain('contact-future');
      expect(filteredIds).not.toContain('contact-none');
    });

    it('allows combining onlyFollowUpDue with text search', () => {
      const filtered = filterContacts(allContacts, 'Miles', 'All', true, 48);

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('contact-44d');
      expect(filtered[0].name).toBe('Miles Dyson');
    });

    it('allows combining onlyFollowUpDue with category filtering', () => {
      const filtered = filterContacts(allContacts, '', 'Recruiter', true, 48);

      expect(filtered.length).toBe(2);
      const ids = filtered.map((c) => c.id);
      expect(ids).toContain('contact-47d');
      expect(ids).toContain('contact-7d');
    });
  });
});
