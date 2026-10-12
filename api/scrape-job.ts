// Platform-Agnostic Serverless Function for Hybrid Job Scraping Fallback
// Uses Gemini 2.5 Flash-Lite REST API with strict JSON Schema output.
// Compatible with Vercel, Netlify, Cloudflare, and standard Node/Web HTTP runtimes.

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
  const forwarded = req?.headers?.['x-forwarded-for'] || (typeof req?.headers?.get === 'function' ? req.headers.get('x-forwarded-for') : '');
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req?.socket?.remoteAddress || req?.ip || 'anonymous';
}

export default async function handler(req: any, res?: any) {
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

  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    return sendCompatResponse(res, 429, {
      fallbackAvailable: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait before making more AI fallback requests.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendCompatResponse(res, 200, {
      fallbackAvailable: false,
      message: 'GEMINI_API_KEY is not configured on the server.',
    });
  }

  let bodyData: any = req?.body;
  if (!bodyData && typeof req?.json === 'function') {
    try {
      bodyData = await req.json();
    } catch {
      bodyData = {};
    }
  } else if (typeof bodyData === 'string') {
    try {
      bodyData = JSON.parse(bodyData);
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

  const prompt = `Extract structured job posting fields from the following webpage content.
Page URL: ${rawUrl}
Page Title: ${rawTitle}

Webpage Visible Text:
${rawText}`;

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
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

  try {
    let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    let geminiRes = await fetchGeminiWithTimeout(endpoint, requestPayload);

    // If the model identifier is not available on the user's API key tier, gracefully try 2.5-flash-lite
    if (!geminiRes.ok && modelName !== fallbackModelName && geminiRes.status === 404) {
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(fallbackModelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      geminiRes = await fetchGeminiWithTimeout(endpoint, requestPayload);
    }

    if (!geminiRes.ok) {
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
    console.error('[scrape-job] Internal error:', err);
    return sendCompatResponse(res, 200, {
      fallbackAvailable: false,
      error: 'Internal Error',
      message: 'Failed to parse job with LLM fallback.',
    });
  }
}
