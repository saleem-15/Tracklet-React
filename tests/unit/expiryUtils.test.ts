import { describe, it, expect } from 'vitest';
import {
  getTaskHoursRemaining,
  formatHoursLeft,
  getExpiringSoonTasks,
  DEFAULT_EXPIRY_SETTINGS,
} from '../../src/lib/expiryUtils';
import { Application } from '../../src/types';

describe('expiryUtils', () => {
  describe('getTaskHoursRemaining', () => {
    it('returns null if no dueDate provided', () => {
      expect(getTaskHoursRemaining(undefined)).toBeNull();
    });

    it('calculates hours remaining accurately relative to now', () => {
      const now = new Date('2026-08-20T12:00:00.000Z');
      const due = '2026-08-21T12:00:00.000Z';
      const hours = getTaskHoursRemaining(due, now);
      expect(hours).toBeCloseTo(24, 0);
    });
  });

  describe('formatHoursLeft', () => {
    it('formats overdue hours and days', () => {
      expect(formatHoursLeft(-5)).toBe('5h overdue');
      expect(formatHoursLeft(-48)).toBe('2d overdue');
    });

    it('formats due in hours and days', () => {
      expect(formatHoursLeft(0.5)).toBe('Due in < 1 hour');
      expect(formatHoursLeft(12)).toBe('Due in 12h');
      expect(formatHoursLeft(48)).toContain('Due in 2d');
    });
  });

  describe('getExpiringSoonTasks', () => {
    it('finds uncompleted tasks due within threshold', () => {
      const now = new Date();
      const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const apps: Application[] = [
        {
          id: 'app-1',
          userId: 'u1',
          company: 'Linear',
          role: 'Frontend',
          platform: 'LinkedIn',
          dateApplied: '2026-08-01',
          status: 'Interview',
          stageUpdatedAt: now.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          tasks: [
            { id: 't-1', title: 'Prepare presentation', completed: false, dueDate: tomorrowStr },
            { id: 't-2', title: 'Done task', completed: true, dueDate: tomorrowStr },
          ],
        },
      ];

      const expiring = getExpiringSoonTasks(apps, 48);
      expect(expiring).toHaveLength(1);
      expect(expiring[0].task.id).toBe('t-1');
    });

    it('ignores tasks for Archived applications', () => {
      const now = new Date();
      const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const apps: Application[] = [
        {
          id: 'app-1',
          userId: 'u1',
          company: 'Linear',
          role: 'Frontend',
          platform: 'LinkedIn',
          dateApplied: '2026-08-01',
          status: 'Archived',
          stageUpdatedAt: now.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          tasks: [{ id: 't-1', title: 'Archived task', completed: false, dueDate: tomorrowStr }],
        },
      ];

      const expiring = getExpiringSoonTasks(apps, 48);
      expect(expiring).toHaveLength(0);
    });
  });
});
