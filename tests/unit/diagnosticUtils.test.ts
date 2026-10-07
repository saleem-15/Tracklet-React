import { describe, it, expect, beforeEach } from 'vitest';
import { 
  sanitizeErrorMessage, 
  detectBrowserAndOS, 
  recordRuntimeError, 
  collectDiagnosticContext, 
  resetDiagnosticErrors 
} from '../../src/lib/diagnosticUtils';

describe('diagnosticUtils', () => {
  beforeEach(() => {
    resetDiagnosticErrors();
  });

  describe('sanitizeErrorMessage', () => {
    it('redacts email addresses', () => {
      const msg = 'User test.user@example.com failed to authenticate on server';
      expect(sanitizeErrorMessage(msg)).toBe('User [REDACTED_EMAIL] failed to authenticate on server');
    });

    it('redacts Bearer tokens', () => {
      const msg = 'Request with Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 failed with 401';
      expect(sanitizeErrorMessage(msg)).toBe('Request with Authorization: Bearer [REDACTED_TOKEN] failed with 401');
    });

    it('redacts sensitive query parameters', () => {
      const msg = 'Failed fetching https://api.com/data?token=secret123&apiKey=xyz999';
      expect(sanitizeErrorMessage(msg)).toBe('Failed fetching https://api.com/data?token=[REDACTED]&apiKey=[REDACTED]');
    });

    it('handles empty or non-string inputs safely', () => {
      expect(sanitizeErrorMessage('')).toBe('');
      expect(sanitizeErrorMessage(null as unknown as string)).toBe('');
    });
  });

  describe('detectBrowserAndOS', () => {
    it('detects Chrome on Windows', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
      const result = detectBrowserAndOS(ua);
      expect(result.os).toBe('Windows 10/11');
      expect(result.browser).toBe('Chrome 128');
    });

    it('detects Safari on macOS', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
      const result = detectBrowserAndOS(ua);
      expect(result.os).toBe('macOS');
      expect(result.browser).toBe('Safari 17');
    });

    it('detects Edge browser', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2739.42';
      const result = detectBrowserAndOS(ua);
      expect(result.browser).toBe('Edge 128');
    });

    it('detects Firefox browser', () => {
      const ua = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0';
      const result = detectBrowserAndOS(ua);
      expect(result.os).toBe('Linux');
      expect(result.browser).toBe('Firefox 129');
    });
  });

  describe('collectDiagnosticContext', () => {
    it('collects current runtime environment and maintains buffer of last 3 errors', () => {
      recordRuntimeError(new Error('First test error'));
      recordRuntimeError('Second error at recruiter@domain.com');
      recordRuntimeError(new Error('Third test error'));
      recordRuntimeError(new Error('Fourth overflow error'));

      const diag = collectDiagnosticContext({
        activeTab: 'contacts',
        url: 'http://localhost:5173/?tab=contacts',
        user: { uid: 'user_123', email: 'u@test.com', displayName: 'Tester', photoURL: null, providerId: 'google.com', emailVerified: true },
      });

      expect(diag.activeTab).toBe('contacts');
      expect(diag.authMode).toBe('authenticated');
      expect(diag.userId).toBe('user_123');
      expect(diag.recentErrors.length).toBe(3);
      expect(diag.recentErrors[0]).toContain('Second error at [REDACTED_EMAIL]');
      expect(diag.recentErrors[2]).toContain('Fourth overflow error');
    });

    it('defaults to guest mode when no user is passed', () => {
      const diag = collectDiagnosticContext();
      expect(diag.authMode).toBe('guest');
      expect(diag.userId).toBeUndefined();
    });
  });
});
