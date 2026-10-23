import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRequest as onRequestScrapeJob } from '../../functions/api/scrape-job';
import { onRequest as onRequestReportIssue } from '../../functions/api/report-issue';

describe('Cloudflare Pages Functions Entry Points', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('/api/scrape-job Pages Function adapter', () => {
    it('handles OPTIONS preflight requests cleanly', async () => {
      const request = new Request('https://tracklet.app/api/scrape-job', {
        method: 'OPTIONS',
      });
      const waitUntil = vi.fn();
      const response = await onRequestScrapeJob({
        request,
        env: { GEMINI_API_KEY: 'test-key' },
        waitUntil,
        next: async () => new Response(),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('rejects unauthenticated POST requests with 401', async () => {
      const request = new Request('https://tracklet.app/api/scrape-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/job', text: 'Job text' }),
      });
      const waitUntil = vi.fn();
      const response = await onRequestScrapeJob({
        request,
        env: { GEMINI_API_KEY: 'test-key' },
        waitUntil,
        next: async () => new Response(),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('handles authenticated requests using context.env', async () => {
      const request = new Request('https://tracklet.app/api/scrape-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
        body: JSON.stringify({ url: 'https://example.com/job', text: 'Senior Software Engineer' }),
      });
      const waitUntil = vi.fn();

      // Mock Gemini fetch
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('generativelanguage.googleapis.com')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                candidates: [
                  {
                    content: {
                      parts: [
                        {
                          text: JSON.stringify({
                            role: 'Senior Software Engineer',
                            company: 'Acme Corp',
                            companyDomain: 'acme.com',
                            location: 'Remote',
                            workLocation: 'Remote',
                            employmentType: 'Full-time',
                            salary: '$150k',
                            notes: '### Requirements\n- TypeScript',
                          }),
                        },
                      ],
                    },
                  },
                ],
              }),
              { status: 200 }
            )
          );
        }
        if (url.includes('posthog.com')) {
          return Promise.resolve(new Response(JSON.stringify({ status: 1 }), { status: 200 }));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });
      global.fetch = mockFetch;

      const response = await onRequestScrapeJob({
        request,
        env: {
          GEMINI_API_KEY: 'gemini-secret-test-key',
          VITE_POSTHOG_KEY: 'posthog-test-key',
        },
        waitUntil,
        next: async () => new Response(),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.fallbackAvailable).toBe(true);
      expect(data.jobData.role).toBe('Senior Software Engineer');
      expect(data.jobData.company).toBe('Acme Corp');

      // Verify edge PostHog capture was scheduled via context.waitUntil
      expect(waitUntil).toHaveBeenCalled();
    });
  });

  describe('/api/report-issue Pages Function adapter', () => {
    it('handles OPTIONS preflight requests cleanly', async () => {
      const request = new Request('https://tracklet.app/api/report-issue', {
        method: 'OPTIONS',
      });
      const waitUntil = vi.fn();
      const response = await onRequestReportIssue({
        request,
        env: { GITHUB_TOKEN: 'gh-test-token' },
        waitUntil,
        next: async () => new Response(),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('rejects unauthenticated requests with 401', async () => {
      const request = new Request('https://tracklet.app/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Bug', description: 'Desc' }),
      });
      const waitUntil = vi.fn();
      const response = await onRequestReportIssue({
        request,
        env: { GITHUB_TOKEN: 'gh-test-token' },
        waitUntil,
        next: async () => new Response(),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('processes authenticated issue reporting with context.env', async () => {
      const request = new Request('https://tracklet.app/api/report-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
        body: JSON.stringify({
          title: 'UI bug on mobile',
          description: 'Button overlaps header',
          diagnostics: {
            activeTab: 'pipeline',
            url: 'https://tracklet.app/pipeline',
            browser: 'Chrome 130',
            os: 'Windows 11',
            viewport: '390x844',
            devicePixelRatio: 3,
            authMode: 'authenticated',
            timestamp: new Date().toISOString(),
          },
        }),
      });
      const waitUntil = vi.fn();

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('api.github.com')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                number: 42,
                html_url: 'https://github.com/saleem-15/Tracklet-React/issues/42',
              }),
              { status: 201 }
            )
          );
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });
      global.fetch = mockFetch;

      const response = await onRequestReportIssue({
        request,
        env: {
          GITHUB_TOKEN: 'gh-secret-token',
          GITHUB_REPO: 'saleem-15/Tracklet-React',
        },
        waitUntil,
        next: async () => new Response(),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.issueNumber).toBe(42);
      expect(data.issueUrl).toBe('https://github.com/saleem-15/Tracklet-React/issues/42');
    });
  });
});
