// Platform-Agnostic Serverless Function to dispatch bug reports to GitHub Issues
// Compatible with Netlify Functions (v2 Web API), Vercel, and standard Node/Web HTTP runtimes.

function sendCompatResponse(res: any, statusCode: number, payload: Record<string, unknown>) {
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

  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers,
  });
}

export default async function handler(req: any, res?: any) {
  const method = req?.method || 'GET';

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
  } = bodyData || {};

  if (!title || !description || !diagnostics) {
    return sendCompatResponse(res, 400, { 
      error: 'Bad Request', 
      message: 'Missing required fields: title, description, or diagnostics.' 
    });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO || 'saleem-15/Tracklet-React';

  if (!githubToken) {
    return sendCompatResponse(res, 500, {
      error: 'Configuration Missing',
      message: 'GITHUB_TOKEN environment variable is not configured.',
    });
  }

  // Triage labels: bug, tester-feedback, severity
  const labels = ['bug', 'tester-feedback', `severity: ${severity}`];
  if (type === 'visual_glitch') labels.push('ui');
  if (type === 'feature_request') labels.push('enhancement');

  const errorRows = diagnostics.recentErrors && diagnostics.recentErrors.length > 0
    ? diagnostics.recentErrors.map((e: string) => `\`\`\`text\n${e}\n\`\`\``).join('\n')
    : '_None detected_';

  const screenshotSection = screenshotUrl
    ? `\n### Visual Evidence\n![Tester Screenshot](${screenshotUrl})\n`
    : '';

  const body = `## Description
${description}
${screenshotSection}
### Reporter
- **Tracking ID:** \`${reportId || 'N/A'}\`
- **Name:** ${reporterName || 'Anonymous Tester'}
- **Email:** ${reporterEmail || 'Not provided'}
- **Severity:** \`${severity.toUpperCase()}\`
- **Category:** \`${type}\`

### Diagnostic Environment
| Attribute | Value |
| :--- | :--- |
| **Page Route / Tab** | \`${diagnostics.activeTab}\` (\`${diagnostics.url}\`) |
| **Browser** | ${diagnostics.browser} |
| **Operating System** | ${diagnostics.os} |
| **Viewport Size** | ${diagnostics.viewport} (DPR: ${diagnostics.devicePixelRatio}) |
| **Auth Mode** | ${diagnostics.authMode} |
| **Timestamp** | ${diagnostics.timestamp} |

### Recent Console Errors
${errorRows}
`;

  try {
    const ghResponse = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Tracklet-Bug-Reporter',
      },
      body: JSON.stringify({
        title, // Raw title without extra prefix, per user requirement
        body,
        labels,
      }),
    });

    if (!ghResponse.ok) {
      const errorData = await ghResponse.text();
      return sendCompatResponse(res, ghResponse.status, {
        error: 'GitHub API Error',
        message: errorData,
      });
    }

    const issue = await ghResponse.json();
    return sendCompatResponse(res, 201, {
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      message: `Issue #${issue.number} created successfully.`,
    });
  } catch (err: any) {
    return sendCompatResponse(res, 500, {
      error: 'Internal Server Error',
      message: err.message || 'Failed connecting to GitHub API.',
    });
  }
}
