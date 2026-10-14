import { describe, it, expect } from 'vitest';
import { Contact, Application, EmailLog } from '../../src/types';
import { validateAndParseJSONBackup } from '../../src/lib/backupJson';
import { aggregateContactEmails } from '../../src/lib/emailCounterpartyUtils';

describe('Contact Email Log & Cross-Visibility Domain Logic', () => {
  it('supports direct email logs on standalone mentor contacts', () => {
    const mentorContact: Contact = {
      id: 'c-mentor-1',
      name: 'Dr. Marcus Chen',
      category: 'Mentor',
      email: 'marcus.chen@alumni.edu',
      applicationIds: [],
      emails: [
        {
          id: 'e-1',
          subject: 'Mentorship Strategy Session',
          sender: 'marcus.chen@alumni.edu',
          recipient: 'You',
          date: '2026-10-10',
          direction: 'inbound',
          body: 'Looking forward to reviewing your engineering management portfolio.',
        },
      ],
    };

    expect(mentorContact.emails).toHaveLength(1);
    expect(mentorContact.emails![0].subject).toBe('Mentorship Strategy Session');
    expect(mentorContact.applicationIds).toHaveLength(0);
  });

  it('aggregates emails from linked applications and direct contact logs without duplicating', () => {
    const contact: Contact = {
      id: 'c-recruiter-1',
      name: 'Sarah Jenkins',
      email: 'sarah@stripe.com',
      applicationIds: ['app-stripe-1'],
      emails: [
        {
          id: 'e-direct-1',
          subject: 'Informal coffee chat',
          sender: 'sarah@stripe.com',
          recipient: 'You',
          date: '2026-10-01',
          direction: 'inbound',
        },
      ],
    };

    const stripeApp: Application = {
      id: 'app-stripe-1',
      userId: 'user-1',
      company: 'Stripe',
      role: 'Staff Engineer',
      platform: 'Company Site',
      dateApplied: '2026-10-05',
      status: 'Interview',
      stageUpdatedAt: '2026-10-05',
      createdAt: '2026-10-05',
      updatedAt: '2026-10-05',
      contactIds: ['c-recruiter-1'],
      emails: [
        {
          id: 'e-stripe-interview',
          subject: 'Stripe System Design Interview Invitation',
          sender: 'sarah@stripe.com',
          recipient: 'You',
          date: '2026-10-06',
          contactId: 'c-recruiter-1',
          applicationId: 'app-stripe-1',
          direction: 'inbound',
        },
      ],
    };

    const applications = [stripeApp];

    const combined = aggregateContactEmails(contact, applications);
    expect(combined).toHaveLength(2);
    expect(combined.map((e) => e.subject)).toContain('Informal coffee chat');
    expect(combined.map((e) => e.subject)).toContain('Stripe System Design Interview Invitation');

    // Confirm that the application's email has applicationId for badging
    const stripeEmail = combined.find((e) => e.id === 'e-stripe-interview');
    expect(stripeEmail?.applicationId).toBe('app-stripe-1');
  });

  it('deduplicates emails when the same email ID exists in both contact and application collections', () => {
    const sharedId = 'e-shared-123';
    const contact: Contact = {
      id: 'c-recruiter-2',
      name: 'Sarah Jenkins',
      email: 'sarah@stripe.com',
      applicationIds: ['app-stripe-1'],
      emails: [
        {
          id: sharedId,
          subject: 'Offer Discussion',
          sender: 'sarah@stripe.com',
          recipient: 'You',
          date: '2026-10-08',
          direction: 'inbound',
        },
      ],
    };

    const stripeApp: Application = {
      id: 'app-stripe-1',
      userId: 'user-1',
      company: 'Stripe',
      role: 'Staff Engineer',
      platform: 'Company Site',
      dateApplied: '2026-10-05',
      status: 'Offer',
      stageUpdatedAt: '2026-10-05',
      createdAt: '2026-10-05',
      updatedAt: '2026-10-05',
      contactIds: ['c-recruiter-2'],
      emails: [
        {
          id: sharedId,
          subject: 'Offer Discussion',
          sender: 'sarah@stripe.com',
          recipient: 'You',
          date: '2026-10-08',
          contactId: 'c-recruiter-2',
          applicationId: 'app-stripe-1',
          direction: 'inbound',
        },
      ],
    };

    const aggregated = aggregateContactEmails(contact, [stripeApp]);
    expect(aggregated).toHaveLength(1);
    expect(aggregated[0].id).toBe(sharedId);
  });

  it('preserves source contactId including when absent on application emails', () => {
    const contact: Contact = {
      id: 'c-recruiter-3',
      name: 'Alex Rivera',
      email: 'alex@acme.corp',
      applicationIds: ['app-acme-1'],
      emails: [],
    };

    const acmeApp: Application = {
      id: 'app-acme-1',
      userId: 'user-1',
      company: 'Acme Corp',
      role: 'Frontend Architect',
      platform: 'LinkedIn',
      dateApplied: '2026-10-01',
      status: 'Interview',
      stageUpdatedAt: '2026-10-01',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
      contactIds: ['c-recruiter-3'],
      emails: [
        {
          id: 'e-no-contact-id',
          subject: 'Technical Screen with Alex <alex@acme.corp>',
          sender: 'Alex Rivera <alex@acme.corp>',
          recipient: 'You',
          date: '2026-10-02',
          direction: 'inbound',
          // Note: contactId is intentionally absent
        },
      ],
    };

    const aggregated = aggregateContactEmails(contact, [acmeApp]);
    expect(aggregated).toHaveLength(1);
    expect(aggregated[0].contactId).toBeUndefined();
  });

  it('keeps standalone mentor emails isolated from job application email logs', () => {
    const mentorContact: Contact = {
      id: 'c-mentor-2',
      name: 'Elena Rostova',
      category: 'Mentor',
      email: 'elena@mentor.dev',
      applicationIds: [],
      emails: [
        {
          id: 'e-confidential',
          subject: 'Private Salary Negotiation Coaching',
          sender: 'elena@mentor.dev',
          recipient: 'You',
          date: '2026-10-12',
          direction: 'inbound',
        },
      ],
    };

    const googleApp: Application = {
      id: 'app-google',
      userId: 'user-1',
      company: 'Google',
      role: 'Senior Software Engineer',
      platform: 'Referral',
      dateApplied: '2026-10-11',
      status: 'Applied',
      stageUpdatedAt: '2026-10-11',
      createdAt: '2026-10-11',
      updatedAt: '2026-10-11',
      emails: [],
    };

    // Google app email log must only contain its own emails
    expect(googleApp.emails).toHaveLength(0);
    expect((googleApp.emails || []).some((e) => e.id === 'e-confidential')).toBe(false);
  });

  it('round-trips contact emails in JSON backup format without data loss', () => {
    const rawBackup = JSON.stringify({
      version: '1.0.0',
      exportDate: '2026-10-13T10:00:00Z',
      appCount: 1,
      applications: [
        {
          company: 'Acme Corp',
          role: 'Full Stack Engineer',
          platform: 'LinkedIn',
          status: 'Interview',
          dateApplied: '2026-10-01',
          contacts: [
            {
              id: 'c-test',
              name: 'Jane Doe',
              email: 'jane@acme.corp',
              emails: [
                {
                  id: 'e-sub',
                  subject: 'Interview Prep',
                  sender: 'jane@acme.corp',
                  recipient: 'You',
                  date: '2026-10-02',
                  direction: 'inbound',
                },
              ],
            },
          ],
        },
      ],
    });

    const result = validateAndParseJSONBackup(rawBackup);
    expect(result.success).toBe(true);
    expect(result.applications).toHaveLength(1);
    const parsedContact = result.applications![0].contacts![0];
    expect(parsedContact.emails).toBeDefined();
    expect(parsedContact.emails).toHaveLength(1);
    expect(parsedContact.emails![0].subject).toBe('Interview Prep');
  });
});
