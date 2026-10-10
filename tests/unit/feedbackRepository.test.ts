import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackRepository } from '../../src/lib/feedbackRepository';
import { CreateTesterReportInput } from '../../src/types';

describe('feedbackRepository', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const sampleInput: CreateTesterReportInput = {
    type: 'bug',
    title: 'Kanban drag flickers',
    description: 'Moving a card causes a brief visual glitch on column drop.',
    severity: 'medium',
    reporterName: 'Tester Sam',
    reporterEmail: 'sam@test.com',
    diagnostics: {
      appVersion: '1.2.0',
      activeTab: 'pipeline',
      url: 'http://localhost:5173/?tab=pipeline',
      browser: 'Chrome 128',
      os: 'Windows 10/11',
      viewport: '1920x1080',
      devicePixelRatio: 1,
      authMode: 'guest',
      timestamp: '2026-10-07T12:00:00.000Z',
      recentErrors: [],
    },
    attachments: [],
  };

  it('generates a stable report ID and saves to local cache', async () => {
    const report = await FeedbackRepository.saveReport(sampleInput);

    expect(report.id).toMatch(/^TRK-BUG-\d{6}$/);
    expect(report.status).toBe('new');
    expect(report.title).toBe(sampleInput.title);

    const reports = await FeedbackRepository.loadReports();
    expect(reports.length).toBe(1);
    expect(reports[0].id).toBe(report.id);
  }, 15000);

  it('saves, loads, and clears draft in localStorage', () => {
    FeedbackRepository.saveDraft({
      title: 'Unfinished report draft',
      description: 'Typed halfway...',
    });

    const loaded = FeedbackRepository.loadDraft();
    expect(loaded?.title).toBe('Unfinished report draft');
    expect(loaded?.description).toBe('Typed halfway...');

    FeedbackRepository.clearDraft();
    expect(FeedbackRepository.loadDraft()).toBeNull();
  });

  it('formats GitHub Issue markdown with diagnostic table and metadata', () => {
    const markdown = FeedbackRepository.formatGitHubIssueMarkdown({
      ...sampleInput,
      id: 'TRK-BUG-123456',
      status: 'new',
      createdAt: '2026-10-07T12:00:00.000Z',
      updatedAt: '2026-10-07T12:00:00.000Z',
    });

    expect(markdown).toContain('## Description');
    expect(markdown).toContain('Kanban drag flickers');
    expect(markdown).toContain('**Tracking ID:** `TRK-BUG-123456`');
    expect(markdown).toContain('| **Browser** | Chrome 128 |');
    expect(markdown).toContain('| **Operating System** | Windows 10/11 |');
  });

  it('generates a valid pre-filled GitHub issue URL fallback', () => {
    const url = FeedbackRepository.generateGitHubIssueUrl({
      ...sampleInput,
      id: 'TRK-BUG-123456',
      status: 'new',
      createdAt: '2026-10-07T12:00:00.000Z',
      updatedAt: '2026-10-07T12:00:00.000Z',
    }, 'saleem-15/Tracklet-React');

    expect(url).toContain('https://github.com/saleem-15/Tracklet-React/issues/new');
    expect(url).toContain('title=Kanban%20drag%20flickers');
    expect(url).toContain('labels=bug%2Ctester-feedback%2Cseverity%3A%20medium');
  });
});
