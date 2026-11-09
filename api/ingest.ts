/**
 * Platform-Agnostic Serverless Reverse Proxy for PostHog Analytics & Session Replay.
 *
 * Bypasses client-side ad blockers by routing analytics and session recording payloads
 * through the first-party domain rather than directly to third-party *.posthog.com domains.
 *
 * Routing Rules:
 * - Static assets (/static/*, /array/*) -> eu-assets.i.posthog.com (or us-assets.i.posthog.com)
 * - Ingestion events & session replays (/*) -> eu-proxy-direct.i.posthog.com (or us-proxy-direct.i.posthog.com)
 */

export interface IngestProxyOptions {
  env?: Record<string, string | undefined>;
}

export async function handlePosthogProxy(
  request: Request,
  options: IngestProxyOptions = {}
): Promise<Response> {
  const origin = request.headers.get('origin') || request.headers.get('Origin') || '';
  const requestedHeaders =
    request.headers.get('access-control-request-headers') ||
    request.headers.get('Access-Control-Request-Headers') ||
    '*';

  // Handle CORS preflight cleanly
  if (request.method === 'OPTIONS') {
    const preflightHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': requestedHeaders,
      'Access-Control-Max-Age': '86400',
    };

    if (origin && origin !== '*') {
      preflightHeaders['Access-Control-Allow-Credentials'] = 'true';
    }

    return new Response(null, {
      status: 204,
      headers: preflightHeaders,
    });
  }

  const url = new URL(request.url);

  // Normalize path by stripping the leading /ingest prefix
  // e.g., /ingest/e/?ip=1 -> /e/?ip=1
  // e.g., /ingest/static/recorder.js -> /static/recorder.js
  // e.g., /ingest -> /
  let pathname = url.pathname.replace(/^\/ingest(?:\/|$)/, '/');
  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }

  // Determine whether US or EU upstream hosts should be targeted
  const configuredHost =
    options.env?.POSTHOG_HOST ||
    options.env?.VITE_POSTHOG_HOST ||
    'https://eu.i.posthog.com';

  const isUsRegion = configuredHost.includes('us.') || configuredHost.includes('us-');

  const defaultIngestHost = isUsRegion
    ? 'us-proxy-direct.i.posthog.com'
    : 'eu-proxy-direct.i.posthog.com';
  const defaultAssetHost = isUsRegion
    ? 'us-assets.i.posthog.com'
    : 'eu-assets.i.posthog.com';

  const ingestHost = options.env?.POSTHOG_INGEST_HOST || defaultIngestHost;
  const assetHost = options.env?.POSTHOG_ASSET_HOST || defaultAssetHost;

  // Static assets and array configs are served by the asset CDN
  const isStatic = pathname.startsWith('/static/') || pathname.startsWith('/array/');
  const targetHost = isStatic ? assetHost : ingestHost;

  const targetUrl = new URL(pathname + url.search, `https://${targetHost}`);

  // Clone headers and rewrite the Host header
  const headers = new Headers(request.headers);
  headers.set('host', targetHost);
  headers.set('x-forwarded-host', targetHost);

  // Forward client real IP for accurate geo-attribution & session tracking
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  if (clientIp) {
    headers.set('x-forwarded-for', clientIp);
    headers.set('x-real-ip', clientIp);
  }

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'follow',
  });

  try {
    const upstreamResponse = await fetch(proxyRequest);

    const responseHeaders = new Headers(upstreamResponse.headers);

    // Apply CORS response headers so frontend can read the response
    responseHeaders.set('Access-Control-Allow-Origin', origin || '*');
    if (origin && origin !== '*') {
      responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: 'PostHog reverse proxy gateway error',
        message: err?.message || 'Failed connecting to upstream PostHog servers',
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': origin || '*',
        },
      }
    );
  }
}

export default handlePosthogProxy;
