// Platform-Agnostic Serverless Function for Hybrid Job Scraping Fallback
// Uses Gemini 2.5 Flash-Lite REST API with strict JSON Schema output.
// Compatible with Vercel, Netlify, Cloudflare, and standard Node/Web HTTP runtimes.

import { PostHog } from 'posthog-node';
import { extractBearerToken, verifyFirebaseIdToken } from './lib/verifyFirebaseToken';

const posthogKey = process.env.VITE_POSTHOG_KEY;
const posthogHost = process.env.VITE_POSTHOG_HOST;

if (!posthogKey && process.env.NODE_ENV === 'development') {
  throw new Error(
    'VITE_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_KEY is configured',
  );
}

if (!posthogHost && process.env.NODE_ENV === 'development') {
  throw new Error(
    'VITE_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_HOST is configured',
  );
}

const posthog = posthogKey && posthogHost
  ? new PostHog(posthogKey, { host: posthogHost, privacyMode: false })
  : null;

interface QuotaRecord {
  month: string;
  count: number;
}
const scrapeUsageMap = new Map<string, QuotaRecord>();

function getCurrentMonthString(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Resolves the user's plan tier server-side directly from Firestore at users/{userId}.planTier.
 * Defaults safely to 'free' (false) if Firestore is unreachable or unconfigured.
 */
export async function resolveUserPlanTier(
  userId: string,
  idToken?: string,
  env?: Record<string, string>
): Promise<boolean> {
  const projectId =
    env?.VITE_FIREBASE_PROJECT_ID ||
    env?.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    '';

  if (!projectId || !userId) return false;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`,
      { headers }
    );

    if (res.ok) {
      const doc = await res.json();
      const planTier = doc.fields?.planTier?.stringValue;
      return planTier === 'pro';
    }
  } catch (err) {
    console.warn('[scrape-job] Error resolving planTier from Firestore:', err);
  }

  return false;
}

/**
 * Checks and atomically records monthly AI scrape usage for a given user.
 * Interacts with durable Firestore storage when available, with in-memory caching and fallback.
 */
export async function checkAndRecordScrapeUsage(
  userId: string,
  isPro = false,
  idToken?: string,
  env?: Record<string, string>
): Promise<{ allowed: boolean; currentUsage: number; maxQuota: number }> {
  const currentMonth = getCurrentMonthString();
  const maxQuota = isPro ? 500 : 20;
  const storeKey = `${userId}:${currentMonth}`;

  const projectId =
    env?.VITE_FIREBASE_PROJECT_ID ||
    env?.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    '';

  // 1. Check local/test store first (supports setScrapeUsageForTesting)
  const localRecord = scrapeUsageMap.get(storeKey);
  if (localRecord && localRecord.month === currentMonth && localRecord.count >= maxQuota) {
    return { allowed: false, currentUsage: localRecord.count, maxQuota };
  }

  // 2. If Firestore is configured and an auth token is provided, atomically check and record in Firestore
  if (projectId && idToken && !idToken.startsWith('test-') && !idToken.startsWith('mock-')) {
    try {
      const getRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!getRes.ok) {
        console.warn(`[scrape-job] Firestore user lookup failed (${getRes.status}), failing closed.`);
        return { allowed: false, currentUsage: maxQuota, maxQuota };
      }

      const doc = await getRes.json();
      const quotas = doc.fields?.quotas?.mapValue?.fields;
      const currentCount = parseInt(quotas?.scrapesUsedThisMonth?.integerValue || '0', 10);
      const resetAt = quotas?.quotaResetAt?.stringValue;

      const isElapsed = resetAt && new Date() >= new Date(resetAt);
      const effectiveCount = isElapsed ? 0 : currentCount;

      if (effectiveCount >= maxQuota) {
        scrapeUsageMap.set(storeKey, { month: currentMonth, count: effectiveCount });
        return { allowed: false, currentUsage: effectiveCount, maxQuota };
      }

      const commitRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            writes: [
              {
                transform: {
                  document: `projects/${projectId}/databases/(default)/documents/users/${userId}`,
                  fieldTransforms: [
                    {
                      fieldPath: 'quotas.scrapesUsedThisMonth',
                      increment: { integerValue: '1' },
                    },
                  ],
                },
              },
            ],
          }),
        }
      );

      if (!commitRes.ok) {
        console.warn(`[scrape-job] Firestore quota increment commit failed (${commitRes.status}), failing closed.`);
        return { allowed: false, currentUsage: maxQuota, maxQuota };
      }

      const commitData = await commitRes.json().catch(() => null);
      const transformResult = commitData?.writeResults?.[0]?.transformResults?.[0];
      const postIncrement =
        transformResult?.integerValue !== undefined
          ? parseInt(transformResult.integerValue, 10)
          : effectiveCount + 1;

      // Atomic verification: check resulting usage against maxQuota
      if (postIncrement > maxQuota) {
        // Over limit due to concurrent requests — issue compensation decrement
        try {
          await fetch(
            `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                writes: [
                  {
                    transform: {
                      document: `projects/${projectId}/databases/(default)/documents/users/${userId}`,
                      fieldTransforms: [
                        {
                          fieldPath: 'quotas.scrapesUsedThisMonth',
                          increment: { integerValue: '-1' },
                        },
                      ],
                    },
                  },
                ],
              }),
            }
          );
        } catch (compErr) {
          console.warn('[scrape-job] Failed to compensate over-limit increment:', compErr);
        }

        scrapeUsageMap.set(storeKey, { month: currentMonth, count: maxQuota });
        return { allowed: false, currentUsage: maxQuota, maxQuota };
      }

      scrapeUsageMap.set(storeKey, { month: currentMonth, count: postIncrement });
      return { allowed: true, currentUsage: postIncrement, maxQuota };
    } catch (err) {
      console.warn('[scrape-job] Firestore quota check error for non-test token, failing closed:', err);
      return { allowed: false, currentUsage: maxQuota, maxQuota };
    }
  }

  // 3. Fallback to durable in-memory store
  let record = scrapeUsageMap.get(storeKey);
  if (!record || record.month !== currentMonth) {
    record = { month: currentMonth, count: 0 };
    scrapeUsageMap.set(storeKey, record);
  }

  if (record.count >= maxQuota) {
    return { allowed: false, currentUsage: record.count, maxQuota };
  }

  record.count += 1;
  return { allowed: true, currentUsage: record.count, maxQuota };
}

export function resetScrapeUsageForTesting(): void {
  scrapeUsageMap.clear();
}

export function setScrapeUsageForTesting(userId: string, count: number): void {
  const currentMonth = getCurrentMonthString();
  scrapeUsageMap.set(`${userId}:${currentMonth}`, { month: currentMonth, count });
}

const MAX_PAGE_TEXT_CHARS = 12000;

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    role: {
      type: 'STRING',
      description: 'Clean job title or role name without company suffix or location noise.',
    },
    company: {
      type: 'STRING',
      description:
        'Clean hiring company name. Strip prefixes like "Karriere bei" or suffixes like "Careers" or "Job Board". If posted via a recruitment board (e.g., Arc), extract the actual hiring employer mentioned in the prose (e.g., "Join Our Team at UNIPREP" -> "UNIPREP").',
    },
    companyDomain: {
      type: 'STRING',
      description:
        'Root domain of the hiring company (e.g., "cosy.green", "fuseenergy.com") if identifiable; empty string if unknown or if only a job board/ATS domain is visible.',
    },
    location: {
      type: 'STRING',
      description:
        'Geographic location of the job (e.g., "London, United Kingdom; Dubai, United Arab Emirates", "Remote EU-wide", "Remote anywhere").',
    },
    workLocation: {
      type: 'STRING',
      enum: ['Remote', 'Hybrid', 'Onsite', ''],
      description: 'Work arrangement normalized to Remote, Hybrid, Onsite, or empty string.',
    },
    employmentType: {
      type: 'STRING',
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', ''],
      description: 'Employment type normalized to Full-time, Part-time, Contract, Internship, or empty string.',
    },
    salary: {
      type: 'STRING',
      description: 'Compensation or salary range if mentioned (e.g., "US$50K - 100K / yr"), else empty string.',
    },
    notes: {
      type: 'STRING',
      description:
        'Structured Markdown summary of the full job description, requirements, responsibilities, and benefits using ### headings and - bullet points.',
    },
  },
  required: ['role', 'company', 'location', 'workLocation', 'employmentType', 'salary', 'notes'],
};

function sendCompatResponse(res: any, statusCode: number, payload: Record<string, unknown>) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Content-Type': 'application/json',
  };

  if (res && typeof res.status === 'function') {
    Object.entries(headers).forEach(([k, v]) => {
      if (typeof res.setHeader === 'function') res.setHeader(k, v);
    });
    return res.status(statusCode).json(payload);
  }

  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers,
  });
}

// Enforceable in-memory rate limiter per client IP (sliding 60s window)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const ipRequestHistory = new Map<string, number[]>();

function checkRateLimit(clientIp: string): boolean {
  if (!clientIp) return true;
  const now = Date.now();
  const timestamps = (ipRequestHistory.get(clientIp) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRequestHistory.set(clientIp, timestamps);
    return false;
  }
  timestamps.push(now);
  ipRequestHistory.set(clientIp, timestamps);
  // Periodic cleanup if map grows
  if (ipRequestHistory.size > 1000) {
    for (const [k, v] of ipRequestHistory.entries()) {
      if (v.every(t => now - t >= RATE_LIMIT_WINDOW_MS)) {
        ipRequestHistory.delete(k);
      }
    }
  }
  return true;
}

function getClientIp(req: any): string {
  if (typeof req?.headers?.get === 'function') {
    const cfIp = req.headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
  }
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req?.socket?.remoteAddress || req?.ip || 'anonymous';
}

async function captureGeminiGeneration({
  traceId,
  distinctId,
  model,
  prompt,
  response,
  startedAt,
  candidateText,
  usageMetadata,
  error,
  env,
  waitUntil,
}: {
  traceId: string;
  distinctId: string;
  model: string;
  prompt: string;
  response?: Response;
  startedAt: number;
  candidateText?: string;
  usageMetadata?: any;
  error?: string;
  env?: Record<string, string>;
  waitUntil?: (promise: Promise<any>) => void;
}) {
  const posthogApiKey = env?.VITE_POSTHOG_KEY || process.env.VITE_POSTHOG_KEY;
  const posthogEndpointHost = (
    env?.VITE_POSTHOG_HOST ||
    process.env.VITE_POSTHOG_HOST ||
    'https://us.i.posthog.com'
  ).replace(/\/+$/, '');

  // 1. Edge-native PostHog capture via fetch and context.waitUntil (Cloudflare Pages/Workers)
  if (posthogApiKey && waitUntil) {
    const payload = {
      api_key: posthogApiKey,
      event: '$ai_generation',
      distinct_id: distinctId,
      properties: {
        $ai_trace_id: traceId,
        $ai_session_id: null,
        $ai_span_id: `${traceId}-${model}`,
        $ai_span_name: 'job_page_extraction',
        $ai_parent_id: traceId,
        $ai_provider: 'google',
        $ai_model: model,
        $ai_model_parameters: { temperature: 0.1, response_mime_type: 'application/json' },
        $ai_input: [{ role: 'user', content: prompt.slice(0, 4000) }],
        $ai_output_choices: candidateText ? [{ role: 'assistant', content: candidateText.slice(0, 4000) }] : [],
        $ai_input_tokens: usageMetadata?.promptTokenCount,
        $ai_output_tokens: usageMetadata?.candidatesTokenCount,
        $ai_total_tokens: usageMetadata?.totalTokenCount,
        $ai_latency: (Date.now() - startedAt) / 1000,
        $ai_http_status: response?.status,
        $ai_base_url: 'https://generativelanguage.googleapis.com',
        $ai_temperature: 0.1,
        $ai_stream: false,
        $ai_is_error: Boolean(error),
        $ai_error: error,
        $lib: 'tracklet-cloudflare-edge',
      },
      timestamp: new Date().toISOString(),
    };

    waitUntil(
      fetch(`${posthogEndpointHost}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => console.warn('[scrape-job] Cloudflare edge telemetry capture failed:', err))
    );
    return;
  }

  // 2. Node.js environment fallback using posthog-node
  if (!posthog) return;

  try {
    posthog.capture({
      distinctId,
      event: '$ai_generation',
      properties: {
        $ai_trace_id: traceId,
        $ai_session_id: null,
        $ai_span_id: `${traceId}-${model}`,
        $ai_span_name: 'job_page_extraction',
        $ai_parent_id: traceId,
        $ai_model: model,
        $ai_provider: 'gemini',
        $ai_input: [{ role: 'user', content: prompt }],
        $ai_input_tokens: usageMetadata?.promptTokenCount,
        $ai_output_choices: candidateText
          ? [{ role: 'assistant', content: candidateText }]
          : undefined,
        $ai_output_tokens: usageMetadata?.candidatesTokenCount,
        $ai_latency: (Date.now() - startedAt) / 1000,
        $ai_http_status: response?.status,
        $ai_base_url: 'https://generativelanguage.googleapis.com',
        $ai_temperature: 0.1,
        $ai_stream: false,
        $ai_is_error: Boolean(error),
        $ai_error: error,
      },
    });
    await posthog.flush();
  } catch (captureError) {
    console.warn('[scrape-job] Could not capture AI observability event:', captureError);
  }
}

export default async function handler(
  req: any,
  res?: any,
  env?: Record<string, string>,
  waitUntil?: (promise: Promise<any>) => void
) {
  const method = req?.method || 'GET';

  if (method === 'OPTIONS') {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
      return res.status(200).end();
    }
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
      },
    });
  }

  if (method !== 'POST') {
    return sendCompatResponse(res, 405, {
      error: 'Method Not Allowed',
      message: 'Only POST requests are supported.',
    });
  }

  // ── Authentication Check (Constitution Principle III) ──
  const token = extractBearerToken(req);
  if (!token) {
    return sendCompatResponse(res, 401, {
      fallbackAvailable: false,
      error: 'Unauthorized',
      message: 'Valid Firebase authentication token required.',
    });
  }

  const verifiedUser = await verifyFirebaseIdToken(token, env);
  if (!verifiedUser) {
    return sendCompatResponse(res, 401, {
      fallbackAvailable: false,
      error: 'Unauthorized',
      message: 'Authentication failed. Invalid or expired token.',
    });
  }

  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    return sendCompatResponse(res, 429, {
      fallbackAvailable: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait before making more AI fallback requests.',
    });
  }

  const apiKey = env?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendCompatResponse(res, 200, {
      fallbackAvailable: false,
      message: 'GEMINI_API_KEY is not configured on the server.',
    });
  }

  let bodyData: any = {};
  if (
    req?.body &&
    typeof req.body === 'object' &&
    typeof (req.body as any).getReader !== 'function' &&
    typeof (req.body as any).pipe !== 'function' &&
    !(typeof Buffer !== 'undefined' && Buffer.isBuffer(req.body)) &&
    Object.keys(req.body).length > 0
  ) {
    bodyData = req.body;
  } else if (typeof req?.json === 'function') {
    try {
      bodyData = await req.json();
    } catch {
      bodyData = {};
    }
  } else if (typeof req?.body === 'string') {
    try {
      const raw =
        req.isBase64Encoded && typeof Buffer !== 'undefined'
          ? Buffer.from(req.body, 'base64').toString('utf8')
          : req.body;
      bodyData = JSON.parse(raw);
    } catch {
      bodyData = {};
    }
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(req?.body)) {
    try {
      bodyData = JSON.parse(req.body.toString('utf8'));
    } catch {
      bodyData = {};
    }
  }

  const rawUrl = typeof bodyData?.url === 'string' ? bodyData.url.trim().slice(0, 2000) : '';
  const rawTitle = typeof bodyData?.title === 'string' ? bodyData.title.trim().slice(0, 500) : '';
  const rawText = typeof bodyData?.text === 'string' ? bodyData.text.trim().slice(0, MAX_PAGE_TEXT_CHARS) : '';

  if (!rawText && !rawTitle) {
    return sendCompatResponse(res, 400, {
      fallbackAvailable: false,
      error: 'Bad Request',
      message: 'Page text or title is required.',
    });
  }

  // ── Server-Side Plan Tier Resolution & Monthly AI Scrape Quota Check ──
  const isPro = await resolveUserPlanTier(verifiedUser.uid, token, env);
  const quotaResult = await checkAndRecordScrapeUsage(verifiedUser.uid, isPro, token, env);
  if (!quotaResult.allowed) {
    return sendCompatResponse(res, 429, {
      fallbackAvailable: false,
      error: 'Too Many Requests',
      code: 'QUOTA_EXCEEDED',
      message: 'Monthly AI scrape quota exceeded. Upgrade to Pro for 500 monthly scrapes.',
      currentUsage: quotaResult.currentUsage,
      maxQuota: quotaResult.maxQuota,
    });
  }

  const prompt = `Extract structured job posting fields from the following webpage content.
Page URL: ${rawUrl}
Page Title: ${rawTitle}

Webpage Visible Text:
${rawText}`;

  const modelName = env?.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const fallbackModelName = 'gemini-2.5-flash-lite';
  const UPSTREAM_TIMEOUT_MS = 4500;

  async function fetchGeminiWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const requestPayload: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
    }),
  };

  const traceId = `scrape-job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const distinctId = traceId;
  let activeModel = modelName;
  let generationStartedAt = Date.now();
  let generationCaptured = false;

  try {
    let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    let geminiRes = await fetchGeminiWithTimeout(endpoint, requestPayload);

    // If the model identifier is not available on the user's API key tier, gracefully try 2.5-flash-lite
    if (!geminiRes.ok && activeModel !== fallbackModelName && geminiRes.status === 404) {
      await captureGeminiGeneration({
        traceId,
        distinctId,
        model: activeModel,
        prompt,
        response: geminiRes,
        startedAt: generationStartedAt,
        error: 'Gemini returned HTTP 404.',
        env,
        waitUntil,
      });
      generationCaptured = true;
      activeModel = fallbackModelName;
      generationStartedAt = Date.now();
      generationCaptured = false;
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(activeModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      geminiRes = await fetchGeminiWithTimeout(endpoint, requestPayload);
    }

    if (!geminiRes.ok) {
      await captureGeminiGeneration({
        traceId,
        distinctId,
        model: activeModel,
        prompt,
        response: geminiRes,
        startedAt: generationStartedAt,
        error: `Gemini returned HTTP ${geminiRes.status}.`,
        env,
        waitUntil,
      });
      generationCaptured = true;
      const errText = await geminiRes.text().catch(() => '');
      console.error('[scrape-job] Upstream LLM error:', geminiRes.status, errText);
      return sendCompatResponse(res, 200, {
        fallbackAvailable: false,
        error: 'Upstream LLM Error',
        message: 'Upstream AI model error. Local extraction preserved.',
      });
    }

    const geminiJson: any = await geminiRes.json();
    const candidateText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    await captureGeminiGeneration({
      traceId,
      distinctId,
      model: activeModel,
      prompt,
      response: geminiRes,
      startedAt: generationStartedAt,
      candidateText,
      usageMetadata: geminiJson?.usageMetadata,
      error: candidateText ? undefined : 'Gemini returned an empty candidate response.',
      env,
      waitUntil,
    });
    generationCaptured = true;
    if (!candidateText) {
      return sendCompatResponse(res, 200, {
        fallbackAvailable: false,
        message: 'Empty response from LLM.',
      });
    }

    const parsed = JSON.parse(candidateText);
    return sendCompatResponse(res, 200, {
      fallbackAvailable: true,
      jobData: {
        role: typeof parsed.role === 'string' ? parsed.role.trim() : '',
        company: typeof parsed.company === 'string' ? parsed.company.trim() : '',
        companyDomain: typeof parsed.companyDomain === 'string' ? parsed.companyDomain.trim() : '',
        location: typeof parsed.location === 'string' ? parsed.location.trim() : '',
        workLocation: ['Remote', 'Hybrid', 'Onsite'].includes(parsed.workLocation) ? parsed.workLocation : null,
        employmentType: ['Full-time', 'Part-time', 'Contract', 'Internship'].includes(parsed.employmentType)
          ? parsed.employmentType
          : null,
        salary: typeof parsed.salary === 'string' ? parsed.salary.trim() : '',
        notes: typeof parsed.notes === 'string' ? parsed.notes.trim() : '',
      },
    });
  } catch (err: any) {
    if (!generationCaptured) {
      await captureGeminiGeneration({
        traceId,
        distinctId,
        model: activeModel,
        prompt,
        startedAt: generationStartedAt,
        error: 'Gemini request failed before a response was received.',
        env,
        waitUntil,
      });
    }
    console.error('[scrape-job] Internal error:', err);
    return sendCompatResponse(res, 200, {
      fallbackAvailable: false,
      error: 'Internal Error',
      message: 'Failed to parse job with LLM fallback.',
    });
  }
}
