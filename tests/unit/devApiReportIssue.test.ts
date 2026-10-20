import { describe, it, expect, vi, beforeEach } from 'vitest';
import { devApiReportIssuePlugin } from '../../vite.config';
import { EventEmitter } from 'events';

describe('devApiReportIssuePlugin (Vite dev & preview server middleware)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createMockMiddleware(env: Record<string, string> = {}) {
    const plugin = devApiReportIssuePlugin(env);
    let middleware: any;
    const mockServer = {
      middlewares: {
        use: vi.fn((fn) => {
          middleware = fn;
        }),
      },
    };
    (plugin as any).configureServer(mockServer);
    return middleware;
  }

  function createMockReqRes(options: {
    method?: string;
    url?: string;
    body?: any;
    rawBody?: string;
  }) {
    const req = new EventEmitter() as any;
    req.method = options.method || 'POST';
    req.url = options.url || '/api/report-issue';

    const headers: Record<string, string> = {};
    const res: any = {
      statusCode: 200,
      setHeader: vi.fn((k, v) => {
        headers[k.toLowerCase()] = v;
      }),
      end: vi.fn(),
      _headers: headers,
    };

    const emitBody = () => {
      if (options.rawBody !== undefined) {
        req.emit('data', options.rawBody);
      } else if (options.body !== undefined) {
        req.emit('data', typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.emit('end');
    };

    return { req, res, emitBody };
  }

  it('passes non-matching URLs through to next()', async () => {
    const middleware = createMockMiddleware({});
    const { req, res } = createMockReqRes({ url: '/api/other' });
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not intercept URL prefixes like /api/report-issues', async () => {
    const middleware = createMockMiddleware({});
    const { req, res } = createMockReqRes({ url: '/api/report-issues' });
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.end).not.toHaveBeenCalled();
  });

  it('handles /api/report-issue with query string correctly', async () => {
    const middleware = createMockMiddleware({});
    const { req, res } = createMockReqRes({ method: 'OPTIONS', url: '/api/report-issue?debug=true' });
    const next = vi.fn();

    await middleware(req, res, next);
    expect(res.statusCode).toBe(200);
    expect(res.end).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('handles OPTIONS preflight requests cleanly with CORS headers', async () => {
    const middleware = createMockMiddleware({});
    const { req, res } = createMockReqRes({ method: 'OPTIONS' });
    const next = vi.fn();

    await middleware(req, res, next);
    expect(res.statusCode).toBe(200);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'POST, OPTIONS');
    expect(res.end).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 405 Method Not Allowed for GET, PUT, DELETE', async () => {
    const middleware = createMockMiddleware({});
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      const { req, res } = createMockReqRes({ method });
      const next = vi.fn();

      await middleware(req, res, next);
      expect(res.statusCode).toBe(405);
      expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST, OPTIONS');
      const parsed = JSON.parse(res.end.mock.calls[0][0]);
      expect(parsed.error).toBe('Method Not Allowed');
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('returns 400 when body is malformed JSON', async () => {
    const middleware = createMockMiddleware({});
    const { req, res, emitBody } = createMockReqRes({ rawBody: '{ not valid json ' });
    const next = vi.fn();

    await middleware(req, res, next);
    emitBody();

    await new Promise((r) => setTimeout(r, 10));

    expect(res.statusCode).toBe(400);
    const parsed = JSON.parse(res.end.mock.calls[0][0]);
    expect(parsed.error).toBe('Bad Request');
    expect(parsed.message).toBe('Malformed JSON payload.');
  });

  it('returns 400 when required fields are missing', async () => {
    const middleware = createMockMiddleware({});
    const { req, res, emitBody } = createMockReqRes({
      body: { title: '', description: 'Some text', diagnostics: {} },
    });
    const next = vi.fn();

    await middleware(req, res, next);
    emitBody();

    await new Promise((r) => setTimeout(r, 10));

    expect(res.statusCode).toBe(400);
    const parsed = JSON.parse(res.end.mock.calls[0][0]);
    expect(parsed.error).toBe('Bad Request');
  });

  it('returns 400 when title or description is only whitespace', async () => {
    const middleware = createMockMiddleware({});
    const { req, res, emitBody } = createMockReqRes({
      body: { title: '   ', description: '   ', diagnostics: { browser: 'Chrome' } },
    });
    const next = vi.fn();

    await middleware(req, res, next);
    emitBody();

    await new Promise((r) => setTimeout(r, 10));

    expect(res.statusCode).toBe(400);
    const parsed = JSON.parse(res.end.mock.calls[0][0]);
    expect(parsed.error).toBe('Bad Request');
  });

  it('simulates success with 200 OK when GITHUB_TOKEN is not configured in local dev', async () => {
    const middleware = createMockMiddleware({});
    const { req, res, emitBody } = createMockReqRes({
      body: {
        reportId: 'TRK-BUG-123456',
        title: 'Valid Bug Title',
        description: 'Reproduction steps for the bug',
        diagnostics: { browser: 'Chrome 128' },
      },
    });
    const next = vi.fn();

    await middleware(req, res, next);
    emitBody();

    await new Promise((r) => setTimeout(r, 10));

    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res.end.mock.calls[0][0]);
    expect(parsed.success).toBe(true);
    expect(parsed.devMode).toBe(true);
    expect(parsed.issueNumber).toBeNull();
    expect(parsed.issueUrl).toBeNull();
    expect(parsed.message).toContain('local dev simulation');
  });

  it('dispatches to GitHub API when GITHUB_TOKEN is configured in local dev', async () => {
    const mockGhFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        number: 88,
        html_url: 'https://github.com/saleem-15/Tracklet-React/issues/88',
      }),
    });
    global.fetch = mockGhFetch;

    const middleware = createMockMiddleware({ GITHUB_TOKEN: 'dev_mock_token' });
    const { req, res, emitBody } = createMockReqRes({
      body: {
        reportId: 'TRK-BUG-654321',
        title: 'Issue With Token',
        description: 'Reproduction steps for the bug with token configured',
        diagnostics: { browser: 'Chrome 128' },
      },
    });
    const next = vi.fn();

    await middleware(req, res, next);
    emitBody();

    await new Promise((r) => setTimeout(r, 10));

    expect(res.statusCode).toBe(201);
    const parsed = JSON.parse(res.end.mock.calls[0][0]);
    expect(parsed.success).toBe(true);
    expect(parsed.issueNumber).toBe(88);
    expect(parsed.issueUrl).toBe('https://github.com/saleem-15/Tracklet-React/issues/88');
    expect(mockGhFetch).toHaveBeenCalledTimes(1);
  });

  it('retries without custom labels when GitHub returns 422', async () => {
    const mockGhFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => 'Label not found',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          number: 90,
          html_url: 'https://github.com/saleem-15/Tracklet-React/issues/90',
        }),
      });
    global.fetch = mockGhFetch;

    const middleware = createMockMiddleware({ GITHUB_TOKEN: 'dev_mock_token' });
    const { req, res, emitBody } = createMockReqRes({
      body: {
        reportId: 'TRK-BUG-900',
        title: 'Retry 422 Bug',
        description: 'Testing label retry logic',
        diagnostics: { browser: 'Chrome 128' },
      },
    });
    const next = vi.fn();

    await middleware(req, res, next);
    emitBody();

    await new Promise((r) => setTimeout(r, 10));

    expect(res.statusCode).toBe(201);
    expect(mockGhFetch).toHaveBeenCalledTimes(2);
  });

  it('attaches middleware to both configureServer and configurePreviewServer', () => {
    const plugin = devApiReportIssuePlugin({});
    const mockDevServer = { middlewares: { use: vi.fn() } };
    const mockPreviewServer = { middlewares: { use: vi.fn() } };

    (plugin as any).configureServer(mockDevServer);
    (plugin as any).configurePreviewServer(mockPreviewServer);

    expect(mockDevServer.middlewares.use).toHaveBeenCalledTimes(1);
    expect(mockPreviewServer.middlewares.use).toHaveBeenCalledTimes(1);
  });
});
