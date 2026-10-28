import { describe, it, expect } from 'vitest';
import { extractReportTitle, inferReportSeverity } from '../../src/lib/feedbackUtils';

describe('feedbackUtils', () => {
  describe('extractReportTitle', () => {
    it('returns default fallback when text is empty or whitespace', () => {
      expect(extractReportTitle('', 'bug')).toBe('Bug Report');
      expect(extractReportTitle('   ', 'feature_request')).toBe('Feature Suggestion');
      expect(extractReportTitle('', 'general_feedback')).toBe('User Feedback');
    });

    it('extracts first sentence cleanly before punctuation', () => {
      const text = 'Dragging card causes freeze. Then the board reloads completely.';
      expect(extractReportTitle(text, 'bug')).toBe('Dragging card causes freeze');
    });

    it('extracts first line cleanly before newline', () => {
      const text = 'Kanban drag fails on mobile\nHere are the reproduction steps:\n1. Open phone';
      expect(extractReportTitle(text, 'bug')).toBe('Kanban drag fails on mobile');
    });

    it('truncates at word boundary if first sentence is overly long (> 65 chars)', () => {
      const longText =
        'This is an exceptionally long first sentence describing a complicated bug where everything breaks unexpectedly on submit';
      const title = extractReportTitle(longText, 'bug');
      expect(title.length).toBeLessThanOrEqual(68);
      expect(title.endsWith('...')).toBe(true);
      expect(title).not.toContain('undefined');
    });

    it('capitalizes the first letter', () => {
      expect(extractReportTitle('salary filter resets on click', 'bug')).toBe(
        'Salary filter resets on click'
      );
    });
  });

  describe('inferReportSeverity', () => {
    it('always assigns low severity to feature requests and general feedback', () => {
      expect(
        inferReportSeverity('feature_request', 'System crashed and completely broken!', {
          recentErrors: ['TypeError: fatal crash'],
        })
      ).toBe('low');

      expect(
        inferReportSeverity('general_feedback', 'I lost all my notes', {
          recentErrors: ['Error: something'],
        })
      ).toBe('low');
    });

    it('assigns blocker when fatal errors are in diagnostic logs', () => {
      expect(
        inferReportSeverity('bug', 'Page failed to open', {
          recentErrors: ['ChunkLoadError: Loading chunk 5 failed'],
        })
      ).toBe('blocker');

      expect(
        inferReportSeverity('bug', 'Cannot save application', {
          recentErrors: ['FirebaseError: Missing or insufficient permissions.'],
        })
      ).toBe('blocker');
    });

    it('assigns blocker when text contains panic keywords AND an error exists', () => {
      expect(
        inferReportSeverity('bug', 'White screen crash when clicking contacts', {
          recentErrors: ['TypeError: Cannot read properties of undefined'],
        })
      ).toBe('blocker');

      expect(
        inferReportSeverity('bug', 'Data loss! Deleted all my applications', {
          recentErrors: ['NetworkError: timeout'],
        })
      ).toBe('blocker');
    });

    it('assigns high when errors exist in logs even without panic keywords', () => {
      expect(
        inferReportSeverity('bug', 'The button did not respond', {
          recentErrors: ['Warning: Failed prop type'],
        })
      ).toBe('high');
    });

    it('assigns high when urgent failure keywords appear in text without errors', () => {
      expect(
        inferReportSeverity('bug', 'Cannot save new job application card', {
          recentErrors: [],
        })
      ).toBe('high');

      expect(
        inferReportSeverity('bug', 'My contacts disappeared after filtering', {
          recentErrors: [],
        })
      ).toBe('high');
    });

    it('assigns medium by default for typical bug reports without errors or urgent keywords', () => {
      expect(
        inferReportSeverity('bug', 'Header padding looks slightly misaligned on tablet', {
          recentErrors: [],
        })
      ).toBe('medium');
    });
  });
});
