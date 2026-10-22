import { describe, it, expect, beforeEach, vi } from 'vitest';
import { extractBearerToken, verifyFirebaseIdToken } from '../../api/lib/verifyFirebaseToken';
import scrapeJobHandler, {
  resetScrapeUsageForTesting,
  setScrapeUsageForTesting,
} from '../../api/scrape-job';
import reportIssueHandler from '../../api/report-issue';
import { SAAS_LIMITS } from '../../src/lib/constants';

describe('Serverless API Authentication & Quota Hardening', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetScrapeUsageForTesting();
  });

  describe('extractBearerToken', () => {
    it('extracts token from Web Standard Request headers', () => {
      const req = new Request('https://tracklet.app/api/scrape-job', {
        headers: { Authorization: 'Bearer token_abc_123' },
      });
      expect(extractBearerToken(req)).toBe('token_abc_123');
    });

    it('extracts token from Node / Express headers object', () => {
      const req = {
        headers: { authorization: 'Bearer node_token_456' },
      };
      expect(extractBearerToken(req)).toBe('node_token_456');
    });

    it('returns null when header is missing or does not start with Bearer', () => {
      expect(extractBearerToken(null)).toBeNull();
      expect(extractBearerToken({})).toBeNull();
      expect(extractBearerToken({ headers: {} })).toBeNull();
      expect(extractBearerToken({ headers: { authorization: 'Basic user:pass' } })).toBeNull();
    });
  });

  describe('verifyFirebaseIdToken', () => {
    it('bypasses test tokens in test environments with verified user identity', async () => {
      const user = await verifyFirebaseIdToken('test-token-789');
      expect(user).not.toBeNull();
      expect(user?.uid).toBe('test-user-123');
      expect(user?.email).toBe('tester@tracklet.app');
      expect(user?.emailVerified).toBe(true);
    });

    it('returns null for empty or non-string tokens', async () => {
      expect(await verifyFirebaseIdToken('')).toBeNull();
      expect(await verifyFirebaseIdToken(null as any)).toBeNull();
    });
  });

  describe('POST /api/scrape-job Authentication & Quotas', () => {
    it('returns 401 Unauthorized when request lacks Authorization header', async () => {
      let statusCode = 0;
      let jsonPayload: any = null;
      const mockRes = {
        setHeader: () => {},
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              jsonPayload = data;
              return data;
            },
            end: () => {},
          };
        },
      };

      await scrapeJobHandler(
        {
          method: 'POST',
          body: { url: 'https://company.com/jobs/1', text: 'Job text...' },
        },
        mockRes
      );

      expect(statusCode).toBe(401);
      expect(jsonPayload.error).toBe('Unauthorized');
      expect(jsonPayload.message).toContain('Valid Firebase authentication token required');
    });

    it('returns 429 QUOTA_EXCEEDED when Free user has exhausted 20 monthly scrapes', async () => {
      // Simulate user having already used 20 scrapes
      setScrapeUsageForTesting('test-user-123', SAAS_LIMITS.FREE_MONTHLY_SCRAPES);

      let statusCode = 0;
      let jsonPayload: any = null;
      const mockRes = {
        setHeader: () => {},
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              jsonPayload = data;
              return data;
            },
            end: () => {},
          };
        },
      };

      await scrapeJobHandler(
        {
          method: 'POST',
          headers: { authorization: 'Bearer test-token-123' },
          body: { url: 'https://company.com/jobs/2', text: 'Job text...' },
        },
        mockRes
      );

      expect(statusCode).toBe(429);
      expect(jsonPayload.code).toBe('QUOTA_EXCEEDED');
      expect(jsonPayload.message).toContain('Monthly AI scrape quota exceeded');
    });
  });

  describe('POST /api/report-issue Authentication', () => {
    it('returns 401 Unauthorized when request lacks Bearer token', async () => {
      const req = new Request('https://tracklet.app/api/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Unauthenticated bug',
          description: 'Should fail with 401',
          diagnostics: {},
        }),
      });

      const res = await reportIssueHandler(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toContain('Missing Bearer token');
    });

    it('attaches verified userId and email to the report when token is valid', async () => {
      const mockGhFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          number: 101,
          html_url: 'https://github.com/saleem-15/Tracklet-React/issues/101',
        }),
      });
      global.fetch = mockGhFetch;
      process.env.GITHUB_TOKEN = 'test_token';

      const req = new Request('https://tracklet.app/api/report-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-verified',
        },
        body: JSON.stringify({
          reportId: 'TRK-BUG-999',
          title: 'Authenticated Issue Report',
          description: 'Detailed description of the issue.',
          severity: 'low',
          diagnostics: {
            appVersion: '1.2.8',
            browser: 'Chrome 128',
            os: 'Windows 11',
          },
        }),
      });

      const res = await reportIssueHandler(req);
      expect(res.status).toBe(201);

      expect(mockGhFetch).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(mockGhFetch.mock.calls[0][1].body);
      expect(callBody.body).toContain('**User ID:** `test-user-123`');
      expect(callBody.body).toContain('**Email:** tester@tracklet.app');
    });
  });
});
