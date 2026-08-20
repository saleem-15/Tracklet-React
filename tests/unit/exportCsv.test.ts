import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportApplicationsToCSV } from '../../src/lib/exportCsv';
import { Application } from '../../src/types';

describe('exportCsv', () => {
  let createdElements: any[] = [];
  let appendChildSpy: any;
  let removeChildSpy: any;

  beforeEach(() => {
    createdElements = [];
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el: any) => {
      createdElements.push(el);
      return el;
    });
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el: any) => el);
    // Mock URL.createObjectURL / revokeObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when given empty array', () => {
    expect(exportApplicationsToCSV([])).toBe(false);
  });

  it('generates a CSV download link when given applications', () => {
    const apps: Application[] = [
      {
        id: '1',
        userId: 'u1',
        company: 'Linear',
        role: 'Frontend Engineer',
        platform: 'LinkedIn',
        dateApplied: '2026-08-01',
        status: 'Interview',
        stageUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const success = exportApplicationsToCSV(apps, 'test_export');
    expect(success).toBe(true);
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalled();
  });
});
