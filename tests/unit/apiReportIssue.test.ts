import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../api/report-issue';

describe('api/report-issue handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv, GITHUB_TOKEN: 'test_token', GITHUB_REPO: 'saleem-15/Tracklet-React' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const validPayload = {
    reportId: 'TRK-BUG-123456',
    type: 'bug',
    title: 'Button click triggers 400 error',
    description: 'When clicking the submit button, an unexpected error occurs.',
    severity: 'medium',
    reporterName: 'Test Reporter',
    reporterEmail: 'tester@tracklet.test',
    diagnostics: {
      appVersion: '1.2.0',
      activeTab: 'pipeline',
      url: 'http://localhost:5173/?tab=pipeline',
      browser: 'Chrome 128',
      os: 'Windows 10/11',
      viewport: '1920x1080',
      devicePixelRatio: 1,
      authMode: 'guest',
      timestamp: '2026-10-20T12:00:00.000Z',
      recentErrors: [],
    },
    attachments: [],
  };

  it('handles Web Standard Request (Netlify Functions v2 stream) correctly without 400 rejection', async () => {
    const mockGhFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        number: 47,
        html_url: 'https://github.com/saleem-15/Tracklet-React/issues/47',
      }),
    });
    global.fetch = mockGhFetch;

    // Web Standard Request creates a ReadableStream for body
    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await handler(req);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.issueNumber).toBe(47);
    expect(data.issueUrl).toBe('https://github.com/saleem-15/Tracklet-React/issues/47');

    expect(mockGhFetch).toHaveBeenCalledTimes(1);
    const ghCall = mockGhFetch.mock.calls[0];
    expect(ghCall[0]).toBe('https://api.github.com/repos/saleem-15/Tracklet-React/issues');
    const ghBody = JSON.parse(ghCall[1].body);
    expect(ghBody.title).toBe(validPayload.title);
    expect(ghBody.body).toContain('TRK-BUG-123456');
    expect(ghBody.body).toContain(validPayload.description);
  });

  it('handles Express/Vercel-style parsed req.body objects', async () => {
    const mockGhFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        number: 48,
        html_url: 'https://github.com/saleem-15/Tracklet-React/issues/48',
      }),
    });
    global.fetch = mockGhFetch;

    const req = {
      method: 'POST',
      body: validPayload,
    };

    const response = await handler(req);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.issueNumber).toBe(48);
  });

  it('rejects with 400 when title or description is missing', async () => {
    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        title: '',
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Bad Request');
    expect(data.message).toContain('Missing required fields');
  });

  it('rejects with 400 when diagnostics is missing', async () => {
    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Valid title',
        description: 'Valid description text here',
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.message).toContain('Missing required fields');
  });

  it('returns 405 when non-POST HTTP method is used', async () => {
    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'GET',
    });

    const response = await handler(req);
    expect(response.status).toBe(405);
  });

  it('responds with 200 and CORS headers on OPTIONS preflight', async () => {
    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'OPTIONS',
    });

    const response = await handler(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns 500 when GITHUB_TOKEN is not configured', async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_PAT;

    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await handler(req);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Configuration Missing');
  });

  it('simulates success in local netlify dev when GITHUB_TOKEN is not configured', async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_PAT;
    process.env.NETLIFY_DEV = 'true';

    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await handler(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.devMode).toBe(true);
    expect(data.issueNumber).toBeNull();
  });

  it('simulates success when CONTEXT is dev or NODE_ENV is development without GITHUB_TOKEN', async () => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_PAT;
    delete process.env.NETLIFY_DEV;
    process.env.CONTEXT = 'dev';

    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await handler(req);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.devMode).toBe(true);
  });

  it('retries without custom labels when GitHub returns 422', async () => {
    const mockGhFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => 'Label does not exist',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          number: 49,
          html_url: 'https://github.com/saleem-15/Tracklet-React/issues/49',
        }),
      });
    global.fetch = mockGhFetch;

    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await handler(req);
    expect(response.status).toBe(201);
    expect(mockGhFetch).toHaveBeenCalledTimes(2);

    const secondCallBody = JSON.parse(mockGhFetch.mock.calls[1][1].body);
    expect(secondCallBody.labels).toBeUndefined();
  });

  it('handles Node.js Buffer body without error', async () => {
    const mockGhFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        number: 55,
        html_url: 'https://github.com/saleem-15/Tracklet-React/issues/55',
      }),
    });
    global.fetch = mockGhFetch;

    const req = {
      method: 'POST',
      body: Buffer.from(JSON.stringify(validPayload)),
    };

    const response = await handler(req);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.issueNumber).toBe(55);
  });

  it('handles AWS Lambda / Netlify v1 event object returning plain status and body', async () => {
    const mockGhFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        number: 56,
        html_url: 'https://github.com/saleem-15/Tracklet-React/issues/56',
      }),
    });
    global.fetch = mockGhFetch;

    const lambdaEvent = {
      httpMethod: 'POST',
      isBase64Encoded: true,
      body: Buffer.from(JSON.stringify(validPayload)).toString('base64'),
    };

    const result = await handler(lambdaEvent);
    expect(result.statusCode).toBe(201);
    const parsedBody = JSON.parse(result.body);
    expect(parsedBody.success).toBe(true);
    expect(parsedBody.issueNumber).toBe(56);
  });

  it('truncates body exceeding 60,000 characters to safeguard against GitHub limits', async () => {
    const mockGhFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        number: 57,
        html_url: 'https://github.com/saleem-15/Tracklet-React/issues/57',
      }),
    });
    global.fetch = mockGhFetch;

    const hugeDescription = 'A'.repeat(70000);
    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        description: hugeDescription,
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(201);

    const callBody = JSON.parse(mockGhFetch.mock.calls[0][1].body);
    expect(callBody.body.length).toBeLessThanOrEqual(61000);
    expect(callBody.body).toContain('[Description truncated for length]');
  });

  it('ignores non-http screenshot data URIs from markdown visual evidence', async () => {
    const mockGhFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        number: 58,
        html_url: 'https://github.com/saleem-15/Tracklet-React/issues/58',
      }),
    });
    global.fetch = mockGhFetch;

    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        screenshotUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }),
    });

    const response = await handler(req);
    expect(response.status).toBe(201);

    const callBody = JSON.parse(mockGhFetch.mock.calls[0][1].body);
    // Non-http data URI should not be embedded as markdown image
    expect(callBody.body).not.toContain('![Tester Screenshot](data:');
  });

  it('sanitizes error responses and does not leak raw credentials or GitHub urls', async () => {
    const mockGhFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: 'Bad credentials', documentation_url: 'https://docs.github.com/rest' }),
    });
    global.fetch = mockGhFetch;

    const req = new Request('https://usetracklet.netlify.app/api/report-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await handler(req);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Issue Dispatch Failed');
    expect(data.message).toBe('Upstream error: Bad credentials');
    expect(data.message).not.toContain('https://docs.github.com');
  });
});
