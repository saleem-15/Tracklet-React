import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportApplicationsToCSV, exportContactsToCSV, exportFollowUpTemplatesToCSV } from '../../src/lib/exportCsv';
import { Application, Contact, FollowUpTemplate } from '../../src/types';

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

  it('exports the full structured schema, including joinable application IDs', async () => {
    const apps: Application[] = [
      {
        id: 'app-77',
        userId: 'u1',
        company: 'Acme',
        role: 'Developer',
        platform: 'LinkedIn',
        dateApplied: '2026-08-01',
        status: 'Applied',
        stageUpdatedAt: '2026-08-05T10:00:00.000Z',
        createdAt: '2026-08-01T09:00:00.000Z',
        updatedAt: '2026-08-02T09:00:00.000Z',
      },
    ];

    exportApplicationsToCSV(apps, 'schema_export');
    const text = await capturedBlob!.text();
    const header = text.split('\n')[0];
    expect(header.startsWith('Id,')).toBe(true);
    expect(header).toContain('Stage Updated At');
    // The Id cell matches what "Linked Application IDs" in the contacts
    // export references — the two files must be joinable.
    expect(text).toContain('"app-77"');
  });

  it('includes Id, Location and audit timestamps in the contacts and templates exports', async () => {
    const contact: Contact = {
      id: 'contact-1',
      name: 'Sarah Chen',
      category: 'Recruiter',
      location: 'Seattle, WA',
      createdAt: '2026-08-01T09:00:00.000Z',
      updatedAt: '2026-08-02T09:00:00.000Z',
    };
    exportContactsToCSV([contact], 'contacts_schema');
    let text = await capturedBlob!.text();
    let header = text.split('\n')[0];
    expect(header.startsWith('Id,')).toBe(true);
    expect(header).toContain('Location');
    expect(header).toContain('Created At');
    expect(header).toContain('Updated At');
    expect(text).toContain('"contact-1"');

    const template: FollowUpTemplate = {
      id: 'tpl-1',
      title: 'Follow up',
      subject: 'Hello',
      body: 'Checking in',
      category: 'Custom',
      createdAt: '2026-08-01T09:00:00.000Z',
      updatedAt: '2026-08-03T09:00:00.000Z',
    };
    exportFollowUpTemplatesToCSV([template], 'templates_schema');
    text = await capturedBlob!.text();
    header = text.split('\n')[0];
    expect(header.startsWith('Id,')).toBe(true);
    expect(header).toContain('Updated At');
  });
});
