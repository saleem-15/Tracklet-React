import { DiagnosticContext, AuthUser } from '../types';

// Circular buffer holding up to 3 recent runtime errors/warnings
const MAX_RECENT_ERRORS = 3;
const recentErrorsBuffer: string[] = [];
let isListenerRegistered = false;

/**
 * Strips email addresses, bearer tokens, or query strings containing sensitive keys from error messages.
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';

  return message
    // Mask email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    // Mask Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    // Mask token / apiKey query parameters
    .replace(/(api_?[kK]ey|token|auth|secret)=([^&\s]+)/gi, '$1=[REDACTED]')
    .trim()
    .slice(0, 300); // cap single error length to 300 chars
}

/**
 * Pushes a runtime error into the buffer for diagnostic inspection.
 */
export function recordRuntimeError(errorOrMessage: unknown): void {
  let text = '';
  if (typeof errorOrMessage === 'string') {
    text = errorOrMessage;
  } else if (errorOrMessage instanceof Error) {
    text = `${errorOrMessage.name}: ${errorOrMessage.message}`;
  } else if (typeof errorOrMessage === 'object' && errorOrMessage !== null) {
    try {
      text = JSON.stringify(errorOrMessage);
    } catch {
      text = String(errorOrMessage);
    }
  } else {
    text = String(errorOrMessage);
  }

  const sanitized = sanitizeErrorMessage(text);
  if (!sanitized) return;

  recentErrorsBuffer.push(sanitized);
  if (recentErrorsBuffer.length > MAX_RECENT_ERRORS) {
    recentErrorsBuffer.shift();
  }
}

/**
 * Initializes global error listeners to safely intercept uncaught errors.
 */
export function initGlobalErrorDiagnostics(): void {
  if (isListenerRegistered || typeof window === 'undefined') return;

  window.addEventListener('error', (event: ErrorEvent) => {
    if (event.error) {
      recordRuntimeError(event.error);
    } else if (event.message) {
      recordRuntimeError(event.message);
    }
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    recordRuntimeError(event.reason || 'Unhandled Promise Rejection');
  });

  isListenerRegistered = true;
}

/**
 * Detects friendly browser and OS names from user agent.
 */
export function detectBrowserAndOS(userAgent = ''): { browser: string; os: string } {
  const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  // Detect Operating System
  let os = 'Unknown OS';
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Detect Browser
  let browser = 'Unknown Browser';
  if (/Edg\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Edg\/([0-9.]+)/i);
    browser = `Edge ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Chrome\/([0-9.]+)/i.test(ua) && !/Chromium|OPR/i.test(ua)) {
    const match = ua.match(/Chrome\/([0-9.]+)/i);
    browser = `Chrome ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([0-9.]+)/i);
    browser = `Firefox ${match ? match[1].split('.')[0] : ''}`.trim();
  } else if (/Safari\/([0-9.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
    const match = ua.match(/Version\/([0-9.]+)/i);
    browser = `Safari ${match ? match[1].split('.')[0] : ''}`.trim();
  }

  return { browser, os };
}

export interface CollectDiagnosticsParams {
  activeTab?: string;
  url?: string;
  user?: AuthUser | null;
}

/**
 * Collects a non-invasive snapshot of client diagnostics.
 */
export function collectDiagnosticContext(params: CollectDiagnosticsParams = {}): DiagnosticContext {
  const hasWindow = typeof window !== 'undefined';
  const width = hasWindow ? window.innerWidth : 1280;
  const height = hasWindow ? window.innerHeight : 800;
  const dpr = hasWindow ? window.devicePixelRatio || 1 : 1;
  const currentUrl = params.url || (hasWindow ? window.location.href : 'http://localhost:5173/');
  const { browser, os } = detectBrowserAndOS();

  return {
    appVersion: '1.2.0',
    activeTab: params.activeTab || 'pipeline',
    url: currentUrl,
    browser,
    os,
    viewport: `${width}x${height}`,
    devicePixelRatio: dpr,
    authMode: params.user?.uid ? 'authenticated' : 'guest',
    userId: params.user?.uid,
    timestamp: new Date().toISOString(),
    recentErrors: [...recentErrorsBuffer],
  };
}

/**
 * Clears buffered errors (primarily used in testing).
 */
export function resetDiagnosticErrors(): void {
  recentErrorsBuffer.length = 0;
}
