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
      // Connect PostHog session replay to Sentry tags
      const sessionId = ph.get_session_id();
      if (sessionId) {
        Sentry.setTag('posthog_session_id', sessionId);
      }
    },
  });
}

export default posthog;
