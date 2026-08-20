import { describe, it, expect } from 'vitest';
import { validateAndParseJSONBackup } from '../../src/lib/backupJson';
import { Application } from '../../src/types';

describe('backupJson', () => {
  it('rejects empty or invalid JSON string', () => {
    expect(validateAndParseJSONBackup('').success).toBe(false);
    expect(validateAndParseJSONBackup('not a json').success).toBe(false);
  });

  it('parses valid enveloped backup structure', () => {
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
        },
      ],
    };

    const result = validateAndParseJSONBackup(JSON.stringify(backupObj));
    expect(result.success).toBe(true);
    expect(result.applications).toHaveLength(1);
    expect(result.applications![0].company).toBe('Linear');
    expect(result.applications![0].contacts).toHaveLength(1);
    expect(result.applications![0].tasks).toHaveLength(1);
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
