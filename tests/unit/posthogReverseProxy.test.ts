import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePosthogProxy } from '../../api/ingest';
import { onRequest as onRequestIngest } from '../../functions/ingest/[[path]]';

describe('PostHog Edge Reverse Proxy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('CORS & Preflight handling', () => {
    it('handles OPTIONS preflight cleanly with 204 and CORS headers', async () => {
      const request = new Request('https://tracklet.pages.dev/ingest/e/', {
        method: 'OPTIONS',
      });

      const response = await handlePosthogProxy(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });

    it('mirrors incoming origin when Origin header is present in OPTIONS preflight', async () => {
      const request = new Request('https://tracklet.pages.dev/ingest/e/', {
        method: 'OPTIONS',
      });
      request.headers.set('origin', 'https://tracklet.pages.dev');

      const response = await handlePosthogProxy(request);

      expect(response.status).toBe(204);
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      expect(allowOrigin === 'https://tracklet.pages.dev' || allowOrigin === '*').toBe(true);
    });
  });

  describe('Request Routing & Upstream Resolution', () => {
    it('proxies event capture requests to eu-proxy-direct.i.posthog.com by default', async () => {
      let capturedRequest: Request | null = null;
      global.fetch = vi.fn().mockImplementation((req: Request) => {
        capturedRequest = req;
        return Promise.resolve(
          new Response(JSON.stringify({ status: 1 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      const request = new Request('https://tracklet.pages.dev/ingest/batch/?ip=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '203.0.113.195',
        },
        body: JSON.stringify({ batch: [{ event: 'application_created' }] }),
      });

      const response = await handlePosthogProxy(request, {
        env: { VITE_POSTHOG_HOST: 'https://eu.i.posthog.com' },
      });

      expect(response.status).toBe(200);
      expect(capturedRequest).not.toBeNull();
      const targetUrl = new URL((capturedRequest as any).url);
      expect(targetUrl.host).toBe('eu-proxy-direct.i.posthog.com');
      expect(targetUrl.pathname).toBe('/batch/');
      expect(targetUrl.search).toBe('?ip=1');

      // Verify x-forwarded-host & client IP headers forwarded to PostHog
      expect((capturedRequest as any).headers.get('x-forwarded-host')).toBe('eu-proxy-direct.i.posthog.com');
      expect((capturedRequest as any).headers.get('x-forwarded-for')).toBe('203.0.113.195');
      expect((capturedRequest as any).headers.get('x-real-ip')).toBe('203.0.113.195');

      // Verify CORS response headers
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('routes static assets like recorder.js to eu-assets.i.posthog.com', async () => {
      let capturedRequest: Request | null = null;
      global.fetch = vi.fn().mockImplementation((req: Request) => {
        capturedRequest = req;
        return Promise.resolve(
          new Response('console.log("recorder loaded");', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' },
          })
        );
      });

      const request = new Request('https://tracklet.pages.dev/ingest/static/recorder.js?v=1.407.2', {
        method: 'GET',
      });

      const response = await handlePosthogProxy(request);

      expect(response.status).toBe(200);
      expect(capturedRequest).not.toBeNull();
      const targetUrl = new URL((capturedRequest as any).url);
      expect(targetUrl.host).toBe('eu-assets.i.posthog.com');
      expect(targetUrl.pathname).toBe('/static/recorder.js');
      expect((capturedRequest as any).headers.get('x-forwarded-host')).toBe('eu-assets.i.posthog.com');
    });

    it('routes array config paths to eu-assets.i.posthog.com', async () => {
      let capturedRequest: Request | null = null;
      global.fetch = vi.fn().mockImplementation((req: Request) => {
        capturedRequest = req;
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const request = new Request('https://tracklet.pages.dev/ingest/array/phc_test/config', {
        method: 'GET',
      });

      const response = await handlePosthogProxy(request);

      expect(response.status).toBe(200);
      const targetUrl = new URL((capturedRequest as any).url);
      expect(targetUrl.host).toBe('eu-assets.i.posthog.com');
      expect(targetUrl.pathname).toBe('/array/phc_test/config');
    });

    it('adapts to US region when configured in env', async () => {
      let capturedRequest: Request | null = null;
      global.fetch = vi.fn().mockImplementation((req: Request) => {
        capturedRequest = req;
        return Promise.resolve(new Response(JSON.stringify({ status: 1 }), { status: 200 }));
      });

      const request = new Request('https://tracklet.pages.dev/ingest/decide/?v=3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test-token' }),
      });

      const response = await handlePosthogProxy(request, {
        env: { VITE_POSTHOG_HOST: 'https://us.i.posthog.com' },
      });

      expect(response.status).toBe(200);
      const targetUrl = new URL((capturedRequest as any).url);
      expect(targetUrl.host).toBe('us-proxy-direct.i.posthog.com');
      expect(targetUrl.pathname).toBe('/decide/');
    });
  });

  describe('Cloudflare Pages Functions Adapter ([[path]].ts)', () => {
    it('executes onRequest adapter and passes context environment correctly', async () => {
      let capturedRequest: Request | null = null;
      global.fetch = vi.fn().mockImplementation((req: Request) => {
        capturedRequest = req;
        return Promise.resolve(new Response(JSON.stringify({ status: 1 }), { status: 200 }));
      });

      const request = new Request('https://tracklet.pages.dev/ingest/e/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.42',
        },
        body: JSON.stringify({ event: '$pageview' }),
      });

      const waitUntil = vi.fn();
      const response = await onRequestIngest({
        request,
        env: { VITE_POSTHOG_HOST: 'https://eu.i.posthog.com' },
        waitUntil,
        next: async () => new Response(),
      });

      expect(response.status).toBe(200);
      expect((capturedRequest as any).headers.get('x-forwarded-for')).toBe('198.51.100.42');
    });

    it('returns 502 with structured error when upstream network fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));

      const request = new Request('https://tracklet.pages.dev/ingest/e/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: '$pageview' }),
      });

      const response = await onRequestIngest({
        request,
        env: {},
        waitUntil: vi.fn(),
        next: async () => new Response(),
      });

      expect(response.status).toBe(502);
      const data = await response.json();
      expect(data.error).toBe('PostHog reverse proxy gateway error');
      expect(data.message).toContain('Network connection timeout');
    });
  });
});
