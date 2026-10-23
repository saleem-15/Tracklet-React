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
      authMode: 'unauthenticated',
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

  it('dispatches report to API successfully and updates cache with issue details', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        issueNumber: 42,
        issueUrl: 'https://github.com/saleem-15/Tracklet-React/issues/42',
      }),
    });
    global.fetch = mockFetch;

    const report = await FeedbackRepository.saveReport(sampleInput);
    const result = await FeedbackRepository.dispatchToApi(report);

    expect(result.success).toBe(true);
    expect(result.issueNumber).toBe(42);
    expect(result.issueUrl).toBe('https://github.com/saleem-15/Tracklet-React/issues/42');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.reportId).toBe(report.id);
    expect(callBody.title).toBe(sampleInput.title);
    expect(callBody.attachments).toEqual([]);
  });

  it('handles dev simulation response when GITHUB_TOKEN is not configured', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        devMode: true,
        issueNumber: null,
        issueUrl: null,
        message: 'Report logged successfully (local dev simulation: GITHUB_TOKEN not configured).',
      }),
    });
    global.fetch = mockFetch;

    const report = await FeedbackRepository.saveReport(sampleInput);
    const result = await FeedbackRepository.dispatchToApi(report);

    expect(result.success).toBe(true);
    expect(result.issueNumber).toBeUndefined();
    expect(result.issueUrl).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it('handles API error without returning fallback URL or falsely marking success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'Bad Request',
        message: 'Missing required fields: title, description, or diagnostics.',
      }),
    });
    global.fetch = mockFetch;

    const report = await FeedbackRepository.saveReport(sampleInput);
    const result = await FeedbackRepository.dispatchToApi(report);

    expect(result.success).toBe(false);
    expect(result.issueNumber).toBeUndefined();
    expect(result.error).toContain('Missing required fields');
    expect(result.fallbackUrl).toBeUndefined();
  });

  it('handles API error when server returns non-JSON plain text or HTML error cleanly', async () => {
    // When a server error like 502 Bad Gateway or 500 HTML is returned, response.text() resolves with string
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => '502 Bad Gateway: Upstream connection timeout',
    });
    global.fetch = mockFetch;

    const report = await FeedbackRepository.saveReport(sampleInput);
    const result = await FeedbackRepository.dispatchToApi(report);

    expect(result.success).toBe(false);
    expect(result.error).toBe('502 Bad Gateway: Upstream connection timeout');
    // Ensure it did not crash with 'Body is unusable: Body has already been read'
    expect(result.error).not.toContain('Body is unusable');
  });
});
