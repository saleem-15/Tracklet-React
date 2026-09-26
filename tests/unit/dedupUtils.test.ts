import { describe, it, expect } from 'vitest';
import {
  findDuplicateApplications,
  mergeDuplicateApplications,
  mergeAllDuplicateGroups,
  getApplicationDedupKey,
  STAGE_PRIORITY
} from '../../src/lib/dedupUtils';
import { Application } from '../../src/types';

describe('Deduplication Utilities (dedupUtils)', () => {
  const baseApp: Application = {
    id: 'app-applied',
    userId: 'user-1',
    company: 'Everis',
    role: 'Software Engineer',
    platform: 'LinkedIn',
    dateApplied: '2026-09-01',
    status: 'Applied',
    notes: 'job location - Australia, Poland, and etc.',
    contactIds: ['c1'],
    tasks: [{ id: 't1', title: 'Prepare CV', completed: true }],
    emails: [{ id: 'e1', subject: 'Interview Invitation', sender: 'recruiter@everis.com', date: '2026-09-02' }],
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-02T12:00:00Z',
    stageUpdatedAt: '2026-09-01T10:00:00Z',
  };

  const duplicateSaved1: Application = {
    id: 'app-saved-1',
    userId: 'user-1',
    company: 'Everis',
    role: 'Software Engineer',
    platform: 'LinkedIn',
    dateApplied: '2026-09-01',
    status: 'Saved',
    notes: '',
    contactIds: [],
    tasks: [],
    emails: [],
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-01T09:00:00Z',
    stageUpdatedAt: '2026-09-01T09:00:00Z',
  };

  const duplicateSaved2: Application = {
    id: 'app-saved-2',
    userId: 'user-1',
    company: 'everis ', // casing/whitespace variation
    role: ' software engineer',
    platform: 'Other',
    dateApplied: '2026-09-01',
    status: 'Saved',
    notes: '',
    contactIds: [],
    tasks: [],
    emails: [],
    createdAt: '2026-09-01T09:05:00Z',
    updatedAt: '2026-09-01T09:05:00Z',
    stageUpdatedAt: '2026-09-01T09:05:00Z',
  };

  it('detects duplicate groups by company and role case-insensitively', () => {
    const list = [baseApp, duplicateSaved1, duplicateSaved2];
    const duplicates = findDuplicateApplications(list);

    expect(duplicates.size).toBe(1);
    const group = Array.from(duplicates.values())[0];
    expect(group.length).toBe(3);
  });

  it('correctly consolidates Everis records, preserving the Applied stage and location notes', () => {
    const list = [duplicateSaved1, duplicateSaved2, baseApp]; // regardless of input order
    const { mergedApp, redundantIds } = mergeDuplicateApplications(list);

    // Primary record must retain Applied stage and location notes
    expect(mergedApp.id).toBe('app-applied');
    expect(mergedApp.status).toBe('Applied');
    expect(mergedApp.notes).toBe('job location - Australia, Poland, and etc.');
    expect(mergedApp.contactIds).toContain('c1');
    expect(mergedApp.tasks?.length).toBe(1);
    expect(mergedApp.emails?.length).toBe(1);

    // Redundant IDs must be identified for deletion
    expect(redundantIds).toEqual(expect.arrayContaining(['app-saved-1', 'app-saved-2']));
    expect(redundantIds.length).toBe(2);
    expect(redundantIds).not.toContain('app-applied');
  });

  it('merges complementary data across duplicates', () => {
    const appA: Application = {
      ...baseApp,
      id: 'app-a',
      notes: 'Initial notes',
      jobLink: undefined,
      contactIds: ['c1'],
    };

    const appB: Application = {
      ...duplicateSaved1,
      id: 'app-b',
      notes: 'Secondary notes',
      jobLink: 'https://everis.com/jobs/123?utm_source=linkedin',
      contactIds: ['c2'],
    };

    const { mergedApp, redundantIds } = mergeDuplicateApplications([appA, appB]);

    expect(mergedApp.id).toBe('app-a');
    expect(mergedApp.jobLink).toBe('https://everis.com/jobs/123?utm_source=linkedin');
    expect(mergedApp.contactIds).toEqual(['c1', 'c2']);
    expect(mergedApp.notes).toContain('Initial notes');
    expect(mergedApp.notes).toContain('Secondary notes');
    expect(redundantIds).toEqual(['app-b']);
  });

  it('ranks higher stages (Offer > Interview > Screening > Applied > Saved)', () => {
    expect(STAGE_PRIORITY['Offer']).toBeGreaterThan(STAGE_PRIORITY['Interview']);
    expect(STAGE_PRIORITY['Interview']).toBeGreaterThan(STAGE_PRIORITY['Screening']);
    expect(STAGE_PRIORITY['Screening']).toBeGreaterThan(STAGE_PRIORITY['Applied']);
    expect(STAGE_PRIORITY['Applied']).toBeGreaterThan(STAGE_PRIORITY['Saved']);
  });

  it('mergeAllDuplicateGroups processes entire pipeline, filtering redundant IDs and updating primary records', () => {
    const uniqueApp: Application = {
      ...baseApp,
      id: 'app-unique',
      company: 'Google',
      role: 'Frontend Engineer',
    };

    const fullPipeline = [duplicateSaved1, uniqueApp, duplicateSaved2, baseApp];
    const { mergedApplications, purgedAppIds, updatedApplications } = mergeAllDuplicateGroups(fullPipeline);

    expect(mergedApplications.length).toBe(2);
    expect(mergedApplications.map((a) => a.id)).toEqual(expect.arrayContaining(['app-applied', 'app-unique']));
    expect(purgedAppIds).toEqual(expect.arrayContaining(['app-saved-1', 'app-saved-2']));
    expect(purgedAppIds.length).toBe(2);
    expect(updatedApplications.length).toBe(1);
    expect(updatedApplications[0].id).toBe('app-applied');
    expect(updatedApplications[0].status).toBe('Applied');
    expect(updatedApplications[0].notes).toBe('job location - Australia, Poland, and etc.');
  });
});
