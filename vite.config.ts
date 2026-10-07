import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function devApiReportIssuePlugin(env: Record<string, string>): Plugin {
  return {
    name: 'dev-api-report-issue',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/report-issue') && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const {
                type,
                title,
                description,
                severity = 'medium',
                reporterName,
                reporterEmail,
                diagnostics,
                screenshotUrl,
              } = data;

              if (!title || !description || !diagnostics) {
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

              const githubToken = env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
              const githubRepo = env.GITHUB_REPO || process.env.GITHUB_REPO || 'saleem-15/Tracklet-React';

              if (!githubToken) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error: 'Configuration Missing',
                    message: 'GITHUB_TOKEN environment variable is not configured in .env.local.',
                  })
                );
                return;
              }

              const labels = ['bug', 'tester-feedback', `severity: ${severity}`];
              if (type === 'visual_glitch') labels.push('ui');
              if (type === 'feature_request') labels.push('enhancement');

              const errorRows =
                diagnostics.recentErrors && diagnostics.recentErrors.length > 0
                  ? diagnostics.recentErrors.map((e: string) => `\`\`\`text\n${e}\n\`\`\``).join('\n')
                  : '_None detected_';

              const screenshotSection = screenshotUrl
                ? `\n### Visual Evidence\n![Tester Screenshot](${screenshotUrl})\n`
                : '';

              const issueBody = `## Description\n${description}\n${screenshotSection}\n### Reporter\n- **Name:** ${reporterName || 'Anonymous Tester'}\n- **Email:** ${reporterEmail || 'Not provided'}\n- **Severity:** \`${severity.toUpperCase()}\`\n- **Category:** \`${type}\`\n\n### Diagnostic Environment\n| Attribute | Value |\n| :--- |\n| **Page Route / Tab** | \`${diagnostics.activeTab}\` (\`${diagnostics.url}\`) |\n| **Browser** | ${diagnostics.browser} |\n| **Operating System** | ${diagnostics.os} |\n| **Viewport Size** | ${diagnostics.viewport} (DPR: ${diagnostics.devicePixelRatio}) |\n| **Auth Mode** | ${diagnostics.authMode} |\n| **Timestamp** | ${diagnostics.timestamp} |\n\n### Recent Console Errors\n${errorRows}\n`;

              const ghResponse = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
                method: 'POST',
                headers: {
                  Accept: 'application/vnd.github+json',
                  Authorization: `Bearer ${githubToken}`,
                  'X-GitHub-Api-Version': '2022-11-28',
                  'Content-Type': 'application/json',
                  'User-Agent': 'Tracklet-Bug-Reporter',
                },
                body: JSON.stringify({
                  title,
                  body: issueBody,
                  labels,
                }),
              });

              if (!ghResponse.ok) {
                const errorData = await ghResponse.text();
                res.statusCode = ghResponse.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error: 'GitHub API Error',
                    message: errorData,
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
                  message: err.message || 'Failed connecting to GitHub API.',
                })
              );
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
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