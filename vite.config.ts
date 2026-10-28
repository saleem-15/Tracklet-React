import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

export function createDevApiReportIssueMiddleware(env: Record<string, string>) {
  return async (req: any, res: any, next: any) => {
    const rawUrl = req.url || '';
    const urlPath = rawUrl.split('?')[0];

    if (urlPath === '/api/report-issue') {
      if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.end();
        return;
      }

      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Allow', 'POST, OPTIONS');
        res.end(
          JSON.stringify({
            error: 'Method Not Allowed',
            message: 'Only POST requests are supported.',
          })
        );
        return;
      }

      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('error', (err: any) => {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: 'Bad Request',
            message: err?.message || 'Error receiving request stream.',
          })
        );
      });
      req.on('end', async () => {
        try {
          let data: any = {};
          try {
            data = JSON.parse(body || '{}');
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'Bad Request',
                message: 'Malformed JSON payload.',
              })
            );
            return;
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
            attachments,
          } = data || {};

          const trimmedTitle = typeof title === 'string' ? title.trim() : '';
          const trimmedDesc = typeof description === 'string' ? description.trim() : '';

          if (!trimmedTitle || !trimmedDesc || !diagnostics || typeof diagnostics !== 'object') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'Bad Request',
                message: 'Missing required fields: title, description, or diagnostics.',
              })
            );
            return;
          }

          let githubToken = (
            env.GITHUB_TOKEN ||
            process.env.GITHUB_TOKEN ||
            env.GH_TOKEN ||
            process.env.GH_TOKEN ||
            env.GITHUB_PAT ||
            process.env.GITHUB_PAT ||
            ''
          ).trim();

          // Auto-fallback to local GitHub CLI in development if env var is not specified
          if (!githubToken && process.env.NODE_ENV !== 'test') {
            try {
              const { execSync } = await import('child_process');
              const cliToken = execSync('gh auth token', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
              if (cliToken && cliToken.startsWith('gh')) {
                githubToken = cliToken;
                console.log('[dev-api-report-issue] Authenticated with local GitHub CLI (gh auth token).');
              }
            } catch {
              // gh CLI not available or logged in
            }
          }


          const githubRepo = (
            env.GITHUB_REPO ||
            process.env.GITHUB_REPO ||
            'saleem-15/Tracklet-React'
          ).trim();

          if (!githubToken) {
            console.log(
              `[dev-api-report-issue] Local dev: GITHUB_TOKEN not configured. Simulating successful issue dispatch for report "${trimmedTitle}" (${reportId || 'N/A'}).`
            );
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                devMode: true,
                issueNumber: null,
                issueUrl: null,
                message: 'Report logged successfully (local dev simulation: GITHUB_TOKEN not configured).',
              })
            );
            return;
          }

          const labels = ['bug', 'tester-feedback', `severity: ${severity}`];
          if (type === 'visual_glitch') labels.push('ui');
          if (type === 'feature_request') labels.push('enhancement');

          const errorRows =
            diagnostics.recentErrors && Array.isArray(diagnostics.recentErrors) && diagnostics.recentErrors.length > 0
              ? diagnostics.recentErrors.map((e: string) => `\`\`\`text\n${e}\n\`\`\``).join('\n')
              : '_None detected_';

          const rawScreenshot = screenshotUrl || (Array.isArray(attachments) ? attachments[0]?.storageUrl : undefined);
          const effectiveScreenshot =
            typeof rawScreenshot === 'string' && /^https?:\/\//i.test(rawScreenshot)
              ? rawScreenshot
              : undefined;
          const screenshotSection = effectiveScreenshot
            ? `\n### Visual Evidence\n![Tester Screenshot](${effectiveScreenshot})\n`
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

          let issueBody = `## Description\n${safeDesc}\n${screenshotSection}${attachmentList}\n### Reporter\n- **Tracking ID:** \`${reportId || 'N/A'}\`\n- **Name:** ${reporterName || 'Anonymous Tester'}\n- **Email:** ${reporterEmail || 'Not provided'}\n- **Severity:** \`${severity.toUpperCase()}\`\n- **Category:** \`${type}\`\n\n### Diagnostic Environment\n| Attribute | Value |\n| :--- |\n| **Page Route / Tab** | \`${diagnostics.activeTab}\` (\`${diagnostics.url}\`) |\n| **Browser** | ${diagnostics.browser} |\n| **Operating System** | ${diagnostics.os} |\n| **Viewport Size** | ${diagnostics.viewport} (DPR: ${diagnostics.devicePixelRatio}) |\n| **Auth Mode** | ${diagnostics.authMode} |\n| **Timestamp** | ${diagnostics.timestamp} |\n\n### Recent Console Errors\n${errorRows}\n`;

          if (issueBody.length > 60000) {
            issueBody = issueBody.slice(0, 60000) + '\n\n...[Diagnostic content truncated to fit GitHub issue limit]';
          }

          let ghResponse = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
            method: 'POST',
            headers: {
              Accept: 'application/vnd.github+json',
              Authorization: `Bearer ${githubToken}`,
              'X-GitHub-Api-Version': '2022-11-28',
              'Content-Type': 'application/json',
              'User-Agent': 'Tracklet-Bug-Reporter',
            },
            body: JSON.stringify({
              title: trimmedTitle,
              body: issueBody,
              labels,
            }),
          });

          if (!ghResponse.ok && ghResponse.status === 422) {
            ghResponse = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
              method: 'POST',
              headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${githubToken}`,
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
                'User-Agent': 'Tracklet-Bug-Reporter',
              },
              body: JSON.stringify({
                title: trimmedTitle,
                body: issueBody,
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
            res.statusCode = ghResponse.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'Issue Dispatch Failed',
                message: `Upstream error: ${errorSummary}`,
              })
            );
            return;
          }

          const issue = (await ghResponse.json()) as { number: number; html_url: string };
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              issueNumber: issue.number,
              issueUrl: issue.html_url,
              message: `Issue #${issue.number} created successfully.`,
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: 'Internal Server Error',
              message: err?.message || 'Failed connecting to GitHub API.',
            })
          );
        }
      });
      return;
    }
    next();
  };
}

/**
 * Resolves the primary git repository root if running inside a git worktree.
 */
function resolveGitMainRepoRoot(cwd = process.cwd()): string | null {
  try {
    const gitPath = path.join(cwd, '.git');
    if (fs.existsSync(gitPath) && fs.statSync(gitPath).isFile()) {
      const text = fs.readFileSync(gitPath, 'utf8').trim();
      const match = text.match(/^gitdir:\s*(.+)$/im);
      if (match) {
        const gitDir = path.resolve(cwd, match[1]);
        const mainRoot = path.resolve(gitDir, '../../..');
        if (fs.existsSync(path.join(mainRoot, 'package.json'))) {
          return mainRoot;
        }
      }
    }
  } catch {
    // Ignore resolution errors in non-git or sandboxed environments
  }
  return null;
}

export function devApiReportIssuePlugin(env: Record<string, string>): Plugin {
  const middleware = createDevApiReportIssueMiddleware(env);
  return {
    name: 'dev-api-report-issue',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const cwd = process.cwd();
  const mainRoot = resolveGitMainRepoRoot(cwd);

  // Load environment variables from main repo (if in a worktree), then overlay local worktree env
  const parentEnv = mainRoot ? loadEnv(mode, mainRoot, '') : {};
  const localEnv = loadEnv(mode, cwd, '');
  const env = { ...parentEnv, ...localEnv };

  // Expose VITE_* variables so client code receives them across all worktrees
  const defineViteEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('VITE_')) {
      defineViteEnv[`import.meta.env.${key}`] = JSON.stringify(value);
    }
  }

  return {
    define: defineViteEnv,
    plugins: [react(), tailwindcss(), devApiReportIssuePlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Extract package path after the final node_modules/ segment
              const packagePath = id.split('node_modules/').pop() || '';

              if (packagePath.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (packagePath.includes('@sentry')) {
                return 'vendor-sentry';
              }
              if (packagePath.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (packagePath.includes('motion')) {
                return 'vendor-motion';
              }
              return 'vendor';
            }
          },
        },
      },
    },
  };
});