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

  it('includes work location, employment type, and job location columns in the header and rows', async () => {
    const apps: Application[] = [
      {
        id: '1',
        userId: 'u1',
        company: 'Linear',
        role: 'Frontend Engineer',
        platform: 'LinkedIn',
        workLocation: 'Remote',
        employmentType: 'Full-time',
        location: 'San Francisco, CA',
        dateApplied: '2026-08-01',
        status: 'Interview',
        stageUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        userId: 'u1',
        company: 'Stripe',
        role: 'Backend Engineer',
        platform: 'Referral',
        dateApplied: '2026-08-02',
        status: 'Applied',
        stageUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    exportApplicationsToCSV(apps, 'test_export');
    const text = await capturedBlob!.text();
    const lines = text.split('\n');

    expect(lines[0]).toBe(
      'Company,Role,Platform,Work Location,Employment Type,Job Location,Date Applied,Status,Days In Stage,Job Listing URL,Notes'
    );
    // Row with all three fields populated
    expect(lines[1]).toContain('"Remote"');
    expect(lines[1]).toContain('"Full-time"');
    expect(lines[1]).toContain('"San Francisco, CA"');
    // Row without the fields exports three adjacent empty quoted cells
    expect(lines[2]).toContain('"Referral","","",""');
  });
});
