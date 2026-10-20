import { describe, it, expect } from 'vitest';
import { findDuplicateContact } from '../../src/lib/contactUtils';
import { Contact } from '../../src/types';

describe('Contact Deduplication Suite (Issue #57)', () => {
  const existingContacts: Contact[] = [
    {
      id: 'contact-1',
      userId: 'user-1',
      name: 'Alice Johnson',
      email: 'alice.johnson@stripe.com',
      role: 'Staff Recruiter',
      organization: 'Stripe',
      phone: '+1 (555) 123-4567',
      category: 'Recruiter',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'contact-2',
      userId: 'user-1',
      name: 'Bob Smith',
      organization: 'Google',
      category: 'Hiring Manager',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'contact-3',
      userId: 'user-1',
      name: 'Charlie Brown',
      category: 'Mentor',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  it('matches by exact email (case-insensitive and trimmed)', () => {
    const candidate = {
      name: 'A. Johnson',
      email: '  ALICE.JOHNSON@stripe.com  ',
    };

    const duplicate = findDuplicateContact(candidate, existingContacts);
    expect(duplicate).not.toBeNull();
    expect(duplicate!.id).toBe('contact-1');
  });

  it('matches by name + organization (normalized text)', () => {
    const candidate = {
      name: '  bob   smith ',
      organization: ' GOOGLE ',
    };

    const duplicate = findDuplicateContact(candidate, existingContacts);
    expect(duplicate).not.toBeNull();
    expect(duplicate!.id).toBe('contact-2');
  });

  it('matches by identical name when neither specifies an organization', () => {
    const candidate = {
      name: 'Charlie Brown',
    };

    const duplicate = findDuplicateContact(candidate, existingContacts);
    expect(duplicate).not.toBeNull();
    expect(duplicate!.id).toBe('contact-3');
  });

  it('matches by phone number (>= 7 normalized digits)', () => {
    const candidate = {
      name: 'Alice J.',
      phone: '555-123-4567',
    };

    const duplicate = findDuplicateContact(candidate, existingContacts);
    expect(duplicate).not.toBeNull();
    expect(duplicate!.id).toBe('contact-1');
  });

  it('does NOT match different organizations with the same name', () => {
    const candidate = {
      name: 'Bob Smith',
      organization: 'Meta',
    };

    const duplicate = findDuplicateContact(candidate, existingContacts);
    expect(duplicate).toBeNull();
  });

  it('does NOT match when candidate has organization but existing has none (without email/phone)', () => {
    const candidate = {
      name: 'Charlie Brown',
      organization: 'Peanuts Corp',
    };

    const duplicate = findDuplicateContact(candidate, existingContacts);
    expect(duplicate).toBeNull();
  });

  it('excludes self when excludeContactId is provided (edit mode)', () => {
    const candidate = {
      name: 'Alice Johnson',
      email: 'alice.johnson@stripe.com',
      organization: 'Stripe',
    };

    // Editing contact-1 should not flag contact-1 as duplicate
    const duplicate = findDuplicateContact(candidate, existingContacts, 'contact-1');
    expect(duplicate).toBeNull();
  });
});
