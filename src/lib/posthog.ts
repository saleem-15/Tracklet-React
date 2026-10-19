import posthog from 'posthog-js';
import * as Sentry from '@sentry/react';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

if (!posthogKey || !posthogHost) {
  if (import.meta.env.DEV) {
    console.warn(
      '[Tracklet Analytics] VITE_POSTHOG_KEY or VITE_POSTHOG_HOST is not configured. PostHog tracking is inactive in this session.',
    );
  }
} else {
  posthog.init(posthogKey, {
    api_host: posthogHost,
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
