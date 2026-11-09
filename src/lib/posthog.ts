import posthog from 'posthog-js';
import * as Sentry from '@sentry/react';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

// Host checks: prevent recording on localhost, 127.0.0.1, or legacy vercel.app domains
const isLocalhost =
  typeof window !== 'undefined' &&
  Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.endsWith('.localhost'),
  );

const isLegacyVercelHost =
  typeof window !== 'undefined' &&
  window.location.hostname.includes('vercel.app');

// Disallow telemetry on dev/testing hosts unless explicitly forced via env
const isDisallowedHost =
  (isLocalhost || isLegacyVercelHost) &&
  import.meta.env.VITE_POSTHOG_RECORD_LOCAL !== 'true';

// Reverse proxy configuration:
// In production (or if explicitly configured via VITE_POSTHOG_API_HOST), route via same-origin '/ingest'.
// This avoids ad-blockers silently dropping telemetry events and session recordings.
// In local Vite dev without proxy, fall back directly to posthogHost.
const apiHost =
  import.meta.env.VITE_POSTHOG_API_HOST ||
  (import.meta.env.PROD ? '/ingest' : posthogHost);

// PostHog UI host is used for toolbar, links, and inspector
const isEuRegion = posthogHost ? posthogHost.includes('eu.') : true;
const uiHost = isEuRegion ? 'https://eu.posthog.com' : 'https://us.posthog.com';

if (!posthogKey || !posthogHost) {
  if (import.meta.env.DEV) {
    console.warn(
      '[Tracklet Analytics] VITE_POSTHOG_KEY or VITE_POSTHOG_HOST is not configured. PostHog tracking is inactive in this session.',
    );
  }
} else if (isDisallowedHost) {
  if (import.meta.env.DEV) {
    console.info(
      `[Tracklet Analytics] Ingestion suppressed on ${window.location.hostname} to prevent polluting production analytics. (Set VITE_POSTHOG_RECORD_LOCAL="true" to override).`,
    );
  }
} else {
  posthog.init(posthogKey, {
    api_host: apiHost,
    ui_host: uiHost,
    defaults: '2026-05-30',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
      },
    },
    enable_recording_console_log: true,
    logs: {
      serviceName: 'tracklet-web',
      environment: import.meta.env.MODE,
      serviceVersion: import.meta.env.VITE_APP_VERSION,
    },
    // Sentry handles application error monitoring; avoid duplicate unhandled reporting in PostHog
    capture_exceptions: {
      capture_unhandled_errors: false,
      capture_unhandled_rejections: false,
      capture_console_errors: false,
    },
    loaded: (ph) => {
      if (import.meta.env.DEV) {
        console.log('[Tracklet Analytics] PostHog initialized successfully.', {
          distinctId: ph.get_distinct_id(),
          apiHost,
        });
      }
      // Connect PostHog session replay to Sentry tags
      const sessionId = ph.get_session_id();
      if (sessionId) {
        Sentry.setTag('posthog_session_id', sessionId);
      }
    },
  });
}

export default posthog;
