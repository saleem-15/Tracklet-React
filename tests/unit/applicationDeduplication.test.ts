import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findDuplicateApplications,
  mergeDuplicateApplications,
  mergeAllDuplicateGroups,
} from '../../src/lib/dedupUtils';
import { broadcastDeletedApplication } from '../../src/lib/extensionSync';
import { ApplicationRepository } from '../../src/lib/applicationRepository';
import { LOCAL_STORAGE_KEYS } from '../../src/lib/constants';
import { Application } from '../../src/types';

describe('Application Deduplication & Safe Deletion Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const everisApplied: Application = {
    id: 'everis-applied-id',
    userId: 'user-1',
    company: 'Everis',
    role: 'Software Engineer',
    platform: 'LinkedIn',
    dateApplied: '2026-09-01',
    status: 'Applied',
    notes: 'job location - Australia, Poland, and etc.',
    contactIds: ['contact-1'],
    tasks: [{ id: 'task-1', title: 'Prepare portfolio', completed: true }],
    emails: [{ id: 'email-1', subject: 'Application Received', sender: 'jobs@everis.com', date: '2026-09-01' }],
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-02T12:00:00Z',
    stageUpdatedAt: '2026-09-01T10:00:00Z',
  };

  const everisSaved1: Application = {
    id: 'everis-saved-id-1',
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

  const everisSaved2: Application = {
    id: 'everis-saved-id-2',
    userId: 'user-1',
    company: 'Everis',
    role: 'Software Engineer',
    platform: 'Other',
    dateApplied: '2026-09-01',
    status: 'Saved',
    notes: '',
    contactIds: [],
    tasks: [],
    emails: [],
    createdAt: '2026-09-01T09:30:00Z',
    updatedAt: '2026-09-01T09:30:00Z',
    stageUpdatedAt: '2026-09-01T09:30:00Z',
  };

  describe('Deduplication & Consolidation', () => {
    it('groups 3 Everis applications into a single duplicate cluster', () => {
      const allApps = [everisSaved1, everisApplied, everisSaved2];
      const duplicateGroups = findDuplicateApplications(allApps);

      expect(duplicateGroups.size).toBe(1);
      const group = Array.from(duplicateGroups.values())[0];
      expect(group.length).toBe(3);
    });

    it('merges Everis duplicates preserving Applied stage and location notes while identifying redundant Saved IDs', () => {
      const allApps = [everisSaved1, everisApplied, everisSaved2];
      const { mergedApplications, purgedAppIds, updatedApplications } = mergeAllDuplicateGroups(allApps);

      // Only 1 consolidated application remains
      expect(mergedApplications.length).toBe(1);
      const survivor = mergedApplications[0];

      // Must have preserved the Applied stage and location notes from everisApplied
      expect(survivor.id).toBe('everis-applied-id');
      expect(survivor.status).toBe('Applied');
      expect(survivor.notes).toBe('job location - Australia, Poland, and etc.');
      expect(survivor.contactIds).toContain('contact-1');
      expect(survivor.tasks?.length).toBe(1);
      expect(survivor.emails?.length).toBe(1);

      // The 2 Saved copies are marked for purging
      expect(purgedAppIds).toHaveLength(2);
      expect(purgedAppIds).toContain('everis-saved-id-1');
      expect(purgedAppIds).toContain('everis-saved-id-2');

      // updatedApplications contains the surviving merged application
      expect(updatedApplications).toHaveLength(1);
      expect(updatedApplications[0].id).toBe('everis-applied-id');
    });

    it('returns original list unmodified when no duplicates exist', () => {
      const app1 = { ...everisApplied, id: '1', company: 'Google', role: 'SWE' };
      const app2 = { ...everisApplied, id: '2', company: 'Meta', role: 'SWE' };
      const { mergedApplications, purgedAppIds } = mergeAllDuplicateGroups([app1, app2]);

      expect(mergedApplications).toHaveLength(2);
      expect(purgedAppIds).toHaveLength(0);
    });
  });

  describe('Extension Deletion Broadcast', () => {
    it('dispatches TRACKLET_EXT_DELETE_APPLICATION via window.postMessage', () => {
      const postMessageSpy = vi.spyOn(window, 'postMessage');
      broadcastDeletedApplication('everis-saved-id-1');

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'TRACKLET_EXT_DELETE_APPLICATION',
          payload: { id: 'everis-saved-id-1' },
        },
        window.location.origin
      );
    });
  });

  describe('Storage Synchronization on Deletion', () => {
    it('purges deleted application from guest localStorage using ApplicationRepository.purgeGuestApplications', () => {
      // Simulate guest cache containing Everis records
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.GUEST_APPS,
        JSON.stringify([everisApplied, everisSaved1, everisSaved2])
      );

      // Verify initial state
      const initialGuestApps = ApplicationRepository.loadGuestApplications();
      expect(initialGuestApps.length).toBe(3);

      // Execute purge logic via helper
      ApplicationRepository.purgeGuestApplications('everis-saved-id-1');

      // Check updated storage
      const updatedGuestApps = ApplicationRepository.loadGuestApplications();
      expect(updatedGuestApps.length).toBe(2);
      expect(updatedGuestApps.map((a) => a.id)).not.toContain('everis-saved-id-1');
      expect(updatedGuestApps.map((a) => a.id)).toContain('everis-applied-id');
      expect(updatedGuestApps.map((a) => a.id)).toContain('everis-saved-id-2');
    });

    it('batch purges multiple duplicate application IDs from guest localStorage via purgeGuestApplications', () => {
      localStorage.setItem(
        LOCAL_STORAGE_KEYS.GUEST_APPS,
        JSON.stringify([everisApplied, everisSaved1, everisSaved2])
      );

      ApplicationRepository.purgeGuestApplications(['everis-saved-id-1', 'everis-saved-id-2']);

      const updatedGuestApps = ApplicationRepository.loadGuestApplications();
      expect(updatedGuestApps.length).toBe(1);
      expect(updatedGuestApps[0].id).toBe('everis-applied-id');
      expect(updatedGuestApps[0].status).toBe('Applied');
      expect(updatedGuestApps[0].notes).toBe('job location - Australia, Poland, and etc.');
    });
  });
});
