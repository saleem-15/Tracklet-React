// Vercel Serverless Function to dispatch bug reports to GitHub Issues
// 100% Free Tier (Vercel Hobby) - Zero Credit Card Required

export default async function handler(req: any, res: any) {
  // CORS Pre-flight and Headers for cross-origin security
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed', 
      message: 'Only POST requests are supported.' 
    });
  }

  let bodyData = req.body;
  if (typeof bodyData === 'string') {
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
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: 'Missing required fields: title, description, or diagnostics.' 
    });
  }

  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO || 'saleem-15/Tracklet-React';

  if (!githubToken) {
    return res.status(500).json({
      error: 'Configuration Missing',
      message: 'GITHUB_TOKEN environment variable is not configured on Vercel.',
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
      return res.status(ghResponse.status).json({
        error: 'GitHub API Error',
        message: errorData,
      });
    }

    const issue = await ghResponse.json();
    return res.status(201).json({
      success: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      message: `Issue #${issue.number} created successfully.`,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'Failed connecting to GitHub API.',
    });
  }
}
