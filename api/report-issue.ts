import { extractBearerToken, verifyFirebaseIdToken } from './lib/verifyFirebaseToken';
// Platform-Agnostic Serverless Function to dispatch bug reports to GitHub Issues
// Compatible with Netlify Functions (v2 Web API), Vercel, and standard Node/Web HTTP runtimes.

function sendCompatResponse(
  res: any,
  statusCode: number,
  payload: Record<string, unknown>,
  req?: any
) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    'Content-Type': 'application/json',
  };

  if (res && typeof res.status === 'function') {
    Object.entries(headers).forEach(([k, v]) => {
      if (typeof res.setHeader === 'function') res.setHeader(k, v);
    });
    return res.status(statusCode).json(payload);
  }

  // AWS Lambda / Netlify Functions v1 compatibility
  const isLambdaV1 = req && typeof req.httpMethod === 'string' && typeof req.json !== 'function';
  if (isLambdaV1) {
    return {
      statusCode,
      headers,
      body: JSON.stringify(payload),
    };
  }

  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers,
  });
}

async function parseRequestBody(req: any): Promise<any> {
  // 1. If body is a Buffer
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(req?.body)) {
    try {
      return JSON.parse(req.body.toString('utf8'));
    } catch {
      return {};
    }
  }

  // 2. If body is already a parsed JS object with properties (e.g. Express, Vercel legacy, or middleware)
  if (
    req?.body &&
    typeof req.body === 'object' &&
    typeof (req.body as any).getReader !== 'function' &&
    typeof (req.body as any).pipe !== 'function' &&
    !(req.body instanceof Uint8Array)
  ) {
    if (Object.keys(req.body).length > 0) {
      return req.body;
    }
  }

  // 3. Web Standard Request API (Netlify Functions v2, Fetch API Request)
  if (typeof req?.json === 'function') {
    try {
      const data = await req.json();
      if (data && typeof data === 'object') return data;
    } catch {
      // Stream could be empty or invalid JSON; fallback below
    }
  }

  // 4. Web Standard Request API text fallback
  if (typeof req?.text === 'function') {
    try {
      const text = await req.text();
      if (text) return JSON.parse(text);
    } catch {
      // continue
    }
  }

  // 5. Raw string in req.body (e.g. Netlify v1 Lambda event, raw Node body)
  if (typeof req?.body === 'string') {
    try {
      const raw =
        req.isBase64Encoded && typeof Buffer !== 'undefined'
          ? Buffer.from(req.body, 'base64').toString('utf8')
          : req.body;
      return JSON.parse(raw);
    } catch {
      // continue
    }
  }

  if (req?.rawBody) {
    try {
      const raw =
        typeof Buffer !== 'undefined' && Buffer.isBuffer(req.rawBody)
          ? req.rawBody.toString('utf8')
          : String(req.rawBody);
      return JSON.parse(raw);
    } catch {
      // continue
    }
  }

  return {};
}

export async function handler(req: any, res?: any) {
  const method = req?.method || req?.httpMethod || 'GET';

  if (method === 'OPTIONS') {
    if (res && typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
      );
      return res.status(200).end();
    }
    const isLambdaV1 = req && typeof req.httpMethod === 'string' && typeof req.json !== 'function';
    if (isLambdaV1) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers':
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
        },
        body: '',
      };
    }
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      },
    });
  }

  if (method !== 'POST') {
    return sendCompatResponse(res, 405, { 
      error: 'Method Not Allowed', 
      message: 'Only POST requests are supported.' 
    }, req);
  }

  // ── Authentication Check (Constitution Principle III) ──
  const token = extractBearerToken(req);
  if (!token) {
    return sendCompatResponse(res, 401, {
      error: 'Unauthorized',
      message: 'Authentication required. Missing Bearer token in Authorization header.',
    }, req);
  }

  const verifiedUser = await verifyFirebaseIdToken(token);
  if (!verifiedUser) {
    return sendCompatResponse(res, 401, {
      error: 'Unauthorized',
      message: 'Authentication failed. Invalid or expired token.',
    }, req);
  }

  const bodyData = await parseRequestBody(req);

  const {
    reportId,
    type,
    title,
    description,
    severity = 'medium',
    reporterName,
    reporterEmail,
    diagnostics,
    screenshotUrl,
    attachments,
  } = bodyData || {};

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const trimmedDesc = typeof description === 'string' ? description.trim() : '';

  if (!trimmedTitle || !trimmedDesc || !diagnostics || typeof diagnostics !== 'object') {
    return sendCompatResponse(res, 400, { 
      error: 'Bad Request', 
      message: 'Missing required fields: title, description, or diagnostics.' 
    }, req);
  }

  const githubToken = (
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_PAT ||
    ''
  ).trim();
  const githubRepo = (
    process.env.GITHUB_REPO ||
    'saleem-15/Tracklet-React'
  ).trim();

  if (!githubToken) {
    const isDev =
      process.env.NETLIFY_DEV === 'true' ||
      process.env.NETLIFY_LOCAL === 'true' ||
      process.env.CONTEXT === 'dev' ||
      process.env.NODE_ENV === 'development';

    if (isDev) {
      console.log(`[report-issue] Local dev: GITHUB_TOKEN not configured. Simulating successful issue creation for "${trimmedTitle}" (${reportId || 'N/A'}).`);
      return sendCompatResponse(res, 200, {
        success: true,
        devMode: true,
        issueNumber: null,
        issueUrl: null,
        message: 'Report logged successfully (local dev simulation: GITHUB_TOKEN not configured).',
      }, req);
    }
    console.warn('[report-issue] GITHUB_TOKEN environment variable is not configured.');
    return sendCompatResponse(res, 500, {
      error: 'Configuration Missing',
      message: 'Automated issue reporter service is temporarily unconfigured.',
    }, req);
  }

  // Triage labels: bug, tester-feedback, severity
  const labels = ['bug', 'tester-feedback', `severity: ${severity}`];
  if (type === 'visual_glitch') labels.push('ui');
  if (type === 'feature_request') labels.push('enhancement');

  const errorRows =
    diagnostics.recentErrors && Array.isArray(diagnostics.recentErrors) && diagnostics.recentErrors.length > 0
      ? diagnostics.recentErrors.map((e: string) => `\`\`\`text\n${e}\n\`\`\``).join('\n')
      : '_None detected_';

  const rawScreenshot = screenshotUrl || (Array.isArray(attachments) && attachments[0]?.storageUrl);
  const effectiveScreenshotUrl =
    typeof rawScreenshot === 'string' && /^https?:\/\//i.test(rawScreenshot)
      ? rawScreenshot
      : undefined;

  const screenshotSection = effectiveScreenshotUrl
    ? `\n### Visual Evidence\n![Tester Screenshot](${effectiveScreenshotUrl})\n`
    : '';

  const attachmentList =
    Array.isArray(attachments) && attachments.length > 0
      ? `\n### Attachments\n${attachments
          .map(
            (a: any) =>
              `- \`${a.fileName || 'file'}\` (${a.mediaType || 'unknown'}, ${Math.round(
                (a.fileSizeBytes || 0) / 1024
              )} KB)`
          )
          .join('\n')}\n`
      : '';

  let safeDesc = trimmedDesc;
  if (safeDesc.length > 25000) {
    safeDesc = safeDesc.slice(0, 25000) + '\n\n...[Description truncated for length]';
  }

  let body = `## Description
${safeDesc}
${screenshotSection}${attachmentList}
### Reporter
- **Tracking ID:** \`${reportId || 'N/A'}\`
- **User ID:** \`${verifiedUser.uid}\`
- **Name:** ${reporterName || 'Tracklet User'}
- **Email:** ${verifiedUser.email || reporterEmail || 'Not provided'}
- **Severity:** \`${String(severity).toUpperCase()}\`
- **Category:** \`${type || 'bug'}\`

### Diagnostic Environment
| Attribute | Value |
| :--- | :--- |
| **Page Route / Tab** | \`${diagnostics.activeTab || 'N/A'}\` (\`${diagnostics.url || 'N/A'}\`) |
| **Browser** | ${diagnostics.browser || 'Unknown'} |
| **Operating System** | ${diagnostics.os || 'Unknown'} |
| **Viewport Size** | ${diagnostics.viewport || 'Unknown'} (DPR: ${diagnostics.devicePixelRatio || 1}) |
| **Auth Mode** | ${diagnostics.authMode || 'guest'} |
| **Timestamp** | ${diagnostics.timestamp || new Date().toISOString()} |

### Recent Console Errors
${errorRows}
`;

  // Protect against GitHub 65,536 char limit on issue bodies
  if (body.length > 60000) {
    body = body.slice(0, 60000) + '\n\n...[Diagnostic content truncated to fit GitHub issue limit]';
  }

  try {
    let ghResponse = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Tracklet-Bug-Reporter',
      },
      body: JSON.stringify({
        title: trimmedTitle,
        body,
        labels,
      }),
    });

    // If GitHub rejects with 422 (e.g., custom label does not exist on target repo), retry without custom labels
    if (!ghResponse.ok && ghResponse.status === 422) {
      ghResponse = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${githubToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'Tracklet-Bug-Reporter',
        },
        body: JSON.stringify({
          title: trimmedTitle,
          body,
        }),
      });
    }

    if (!ghResponse.ok) {
      const errorData = await ghResponse.text();
      let errorSummary = 'Issue creation rejected upstream.';
      try {
        const parsed = JSON.parse(errorData);
        if (parsed?.message) {
          errorSummary = parsed.message;
        }
      } catch {
        if (errorData) errorSummary = errorData.slice(0, 200);
      }
      console.warn(`[report-issue] GitHub API error (${ghResponse.status}):`, errorData);
      return sendCompatResponse(res, ghResponse.status, {
        error: 'Issue Dispatch Failed',
        message: `Upstream error: ${errorSummary}`,
      }, req);
    }

    const issue = await ghResponse.json();
    return sendCompatResponse(res, 201, {
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      message: `Issue #${issue.number} created successfully.`,
    }, req);
  } catch (err: any) {
    console.error('[report-issue] Internal error:', err);
    return sendCompatResponse(res, 500, {
      error: 'Internal Server Error',
      message: err?.message || 'Failed connecting to issue reporter service.',
    }, req);
  }
}

export default handler;
