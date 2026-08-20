import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportApplicationsToCSV } from '../../src/lib/exportCsv';
import { Application } from '../../src/types';

describe('exportCsv', () => {
  let createdElements: any[] = [];
  let appendChildSpy: any;
  let removeChildSpy: any;
  let capturedBlob: Blob | null = null;

  beforeEach(() => {
    createdElements = [];
    capturedBlob = null;
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el: any) => {
      createdElements.push(el);
      return el;
    });
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el: any) => el);
    // Mock URL.createObjectURL / revokeObjectURL and capture Blob
    global.URL.createObjectURL = vi.fn().mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    });
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when given empty array', () => {
    expect(exportApplicationsToCSV([])).toBe(false);
  });

  it('generates a CSV download link and escapes formula trigger characters', async () => {
    const apps: Application[] = [
      {
        id: '1',
        userId: 'u1',
        company: '=SUM(1,1)',
        role: '@AdminRole',
        platform: 'LinkedIn',
        dateApplied: '2026-08-01',
        status: 'Interview',
        notes: '+DangerousFormula',
        stageUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const success = exportApplicationsToCSV(apps, 'test_export');
    expect(success).toBe(true);
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(capturedBlob).not.toBeNull();

    // Verify Blob content sanitizes formula trigger characters with leading single quote
    const text = await capturedBlob!.text();
    expect(text).toContain(`"'=SUM(1,1)"`);
    expect(text).toContain(`"'@AdminRole"`);
    expect(text).toContain(`"'+DangerousFormula"`);
  });
});
