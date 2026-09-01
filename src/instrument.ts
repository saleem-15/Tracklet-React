import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;
const isProd = import.meta.env.PROD;

// Sentry telemetry is strictly enabled ONLY in production builds when a valid DSN is provided.
// In development, Sentry is completely disabled to avoid quota consumption and telemetry noise.
const isSentryActive = Boolean(dsn) && isProd;

if (isProd && !dsn) {
  console.warn('[Tracklet Telemetry] VITE_SENTRY_DSN is not configured. Production error tracking is inactive.');
}

Sentry.init({
  dsn: dsn || undefined,
  enabled: isSentryActive,
  environment: import.meta.env.MODE || (isProd ? 'production' : 'development'),
  release: import.meta.env.VITE_APP_VERSION,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Performance Tracing (Production sample rate)
  tracesSampleRate: 0.2,
  tracePropagationTargets: ['localhost', /^https:\/\/.*\.vercel\.app/, /^https:\/\/tracklet/],

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: false,
});

