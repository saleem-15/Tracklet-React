import { TesterReportCategory, TesterReportSeverity, DiagnosticContext } from '../types';

export type FeedbackIntentId = 'bug' | 'feature_request' | 'account' | 'other';

/**
 * Visual intent configurations for the pill chips.
 */
export interface FeedbackIntentConfig {
  id: FeedbackIntentId;
  key: TesterReportCategory;
  label: string;
  placeholder: string;
}

export const FEEDBACK_INTENTS: FeedbackIntentConfig[] = [
  {
    id: 'bug',
    key: 'bug',
    label: 'Bug Report',
    placeholder:
      'Describe what occurred, what you expected, or any specific actions that triggered the issue...',
  },
  {
    id: 'feature_request',
    key: 'feature_request',
    label: 'Feature Request',
    placeholder:
      'What feature or workflow enhancement would make Tracklet 10x better for your job search? What problem would it solve?',
  },
  {
    id: 'account',
    key: 'other',
    label: 'Account',
    placeholder:
      'Need help with your profile, login, or workspace data? Describe your issue here...',
  },
  {
    id: 'other',
    key: 'other',
    label: 'Other',
    placeholder:
      'How can we help? Share any thoughts, questions, or notes with us...',
  },
];

/**
 * Extracts a concise, high-clarity title from freeform feedback text.
 */
export function extractReportTitle(
  text: string,
  category: TesterReportCategory = 'bug',
  intentId?: FeedbackIntentId
): string {
  const trimmed = text.trim();
  if (!trimmed) {
    if (intentId === 'account') return 'Account Inquiry';
    switch (category) {
      case 'feature_request':
        return 'Feature Suggestion';
      case 'general_feedback':
        return 'User Feedback';
      case 'visual_glitch':
        return 'Visual Glitch';
      case 'other':
        return 'General Inquiry';
      case 'bug':
      default:
        return 'Bug Report';
    }
  }

  // Split by first newline or sentence delimiter (. ! ?)
  const firstSentenceMatch = trimmed.match(/^([^.\n!?]+)/);
  let candidate = firstSentenceMatch ? firstSentenceMatch[1].trim() : trimmed;

  // If candidate is too long (> 65 chars), truncate at word boundary
  const MAX_TITLE_LEN = 65;
  if (candidate.length > MAX_TITLE_LEN) {
    const truncated = candidate.slice(0, MAX_TITLE_LEN);
    const lastSpace = truncated.lastIndexOf(' ');
    candidate = (lastSpace > 25 ? truncated.slice(0, lastSpace) : truncated).trim() + '...';
  }

  // Capitalize first letter
  if (candidate.length > 0) {
    candidate = candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }

  // Prepend prefix for account inquiry if applicable
  if (intentId === 'account' && !candidate.toLowerCase().startsWith('account')) {
    candidate = `[Account] ${candidate}`;
  }

  return candidate;
}

/**
 * Deterministically infers issue severity based on category, user language,
 * and client-captured diagnostic errors without interrogating the user.
 */
export function inferReportSeverity(
  type: TesterReportCategory,
  text: string,
  diagnostics?: Partial<DiagnosticContext>
): TesterReportSeverity {
  // Non-bug feedback is never high or blocker
  if (type === 'feature_request' || type === 'general_feedback' || type === 'other') {
    return 'low';
  }

  const normalized = text.toLowerCase();
  const errors = diagnostics?.recentErrors || [];

  // Critical blocker regex: data loss, blank screens, crashes, total lockouts
  const BLOCKER_REGEX =
    /\b(crash(ed|es|ing)?|white screen|blank page|data loss|lost (all|my)|cannot open|freeze|frozen|stuck forever|locked out|infinite loop|unusable)\b/i;

  // High urgency regex: persistent failures, core CRUD breaks, save errors
  const HIGH_REGEX =
    /\b(fail(ed|s|ing)?|broke(n)?|disappear(ed|s)?|can't save|cannot save|not saving|error occurred|permission denied|won't load|wont load)\b/i;

  // Fatal error signatures in client error buffer
  const hasFatalError = errors.some((err) =>
    /ChunkLoadError|SecurityError|permission-denied|insufficient permissions|unhandledrejection/i.test(err)
  );

  // Blocker condition: fatal exception OR explicit blocker language with errors
  if (hasFatalError || (BLOCKER_REGEX.test(normalized) && errors.length > 0)) {
    return 'blocker';
  }

  // High condition: active unhandled console errors OR high-urgency keywords
  if (errors.length > 0 || HIGH_REGEX.test(normalized) || BLOCKER_REGEX.test(normalized)) {
    return 'high';
  }

  // Default for bugs/glitches without exceptions or panic keywords
  return 'medium';
}
