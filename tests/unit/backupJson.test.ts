import { describe, it, expect } from 'vitest';
import { validateAndParseJSONBackup, exportApplicationsToJSON } from '../../src/lib/backupJson';
import { Application } from '../../src/types';

describe('backupJson', () => {
  it('rejects empty or invalid JSON string', () => {
    expect(validateAndParseJSONBackup('').success).toBe(false);
    expect(validateAndParseJSONBackup('not a json').success).toBe(false);
  });

  it('parses valid enveloped backup structure with contacts, tasks, history, and emails', () => {
    const backupObj = {
      version: '1.0.0',
      exportDate: '2026-08-20T08:00:00.000Z',
      appCount: 1,
      applications: [
        {
          company: 'Linear',
          role: 'Frontend Engineer',
          platform: 'LinkedIn',
          status: 'Interview',
          dateApplied: '2026-08-15',
          notes: 'Great culture',
          contacts: [{ id: 'c-1', name: 'Recruiter Jane', email: 'jane@linear.app' }],
          tasks: [{ id: 't-1', title: 'Tech screen', completed: false }],
          emails: [{ id: 'e-1', subject: 'Interview Invitation', sender: 'jane@linear.app', date: '2026-08-16' }],
          history: [{ id: 'h-1', toStatus: 'Interview', timestamp: '2026-08-16T10:00:00.000Z' }],
        },
      ],
    };

    const result = validateAndParseJSONBackup(JSON.stringify(backupObj));
    expect(result.success).toBe(true);
    expect(result.applications).toHaveLength(1);
    const app = result.applications![0];
    expect(app.company).toBe('Linear');
    expect(app.contacts).toHaveLength(1);
    expect(app.tasks).toHaveLength(1);
    expect(app.emails).toHaveLength(1);
    expect(app.emails![0].subject).toBe('Interview Invitation');
    expect(app.history).toHaveLength(1);
  });

  it('safely filters null or malformed array items in contacts, tasks, and emails', () => {
    const rawData = [
      {
        company: 'Stripe',
        role: 'Backend Engineer',
        contacts: [null, undefined, { name: 'Valid Contact' }],
        tasks: [null, { title: 'Valid Task', completed: true }],
        emails: [null, { subject: 'Valid Email', sender: 'hr@stripe.com' }],
      },
    ];

    const result = validateAndParseJSONBackup(JSON.stringify(rawData));
    expect(result.success).toBe(true);
    expect(result.applications![0].contacts).toHaveLength(1);
    expect(result.applications![0].contacts![0].name).toBe('Valid Contact');
    expect(result.applications![0].tasks).toHaveLength(1);
    expect(result.applications![0].emails).toHaveLength(1);
  });

  it('parses raw array format gracefully', () => {
    const rawArray = [
      { company: 'Stripe', role: 'Full Stack', status: 'Applied', platform: 'Company Site' },
      { company: 'OpenAI', role: 'Research Engineer', status: 'Offer', platform: 'Referral' },
    ];

    const result = validateAndParseJSONBackup(JSON.stringify(rawArray));
    expect(result.success).toBe(true);
    expect(result.applications).toHaveLength(2);
    expect(result.applications![1].status).toBe('Offer');
  });
});
