import React from 'react';

/**
 * RTL (Right-to-Left) & Bidirectional (BiDi) Text Utilities for Tracklet.
 *
 * Implements Unicode Bidirectional Algorithm (UAX #9) helpers and robust
 * heuristic text-direction detection for mixed LTR/RTL content (e.g. Arabic
 * with embedded English technical terms or English labels).
 */

/** Matches characters from RTL scripts: Arabic, Hebrew, Persian, Urdu, Syriac, Thaana, etc. */
export const RTL_CHAR_REGEX = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

/** Matches strong LTR characters: Latin, Greek, Cyrillic, etc. */
export const LTR_CHAR_REGEX = /[A-Za-z\u00C0-\u024F\u0370-\u052F]/;

/** Global versions for matching and counts */
const RTL_GLOBAL_REGEX = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/g;
const LTR_GLOBAL_REGEX = /[A-Za-z\u00C0-\u024F\u0370-\u052F]/g;

/** Invisible directional marks */
export const LRM = '\u200E'; // Left-to-Right Mark
export const RLM = '\u200F'; // Right-to-Left Mark

/**
 * Returns true if the string contains any characters from an RTL script.
 */
export function hasRtlText(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  return RTL_CHAR_REGEX.test(text);
}

/**
 * Strips leading non-directional markdown and framing syntax (bullets, numbering, hashes, quotes)
 * to evaluate the first meaningful content characters.
 */
function stripLeadingFraming(text: string): string {
  return text
    .replace(/^(\s*[-*•]\s*)+/, '') // leading bullet markers
    .replace(/^(\s*\d+[.)]\s*)+/, '') // leading numbered list markers (e.g. "1." or "1)")
    .replace(/^(\s*#{1,6}\s*)+/, '') // leading markdown headings
    .replace(/^(\s*>\s*)+/, '') // leading blockquotes
    .replace(/^(\s*\[[ xX]\]\s*)+/, '') // leading task checkbox markers
    .trimStart();
}

/**
 * Detects the base paragraph direction ('rtl' or 'ltr') for a string.
 *
 * Unlike naive HTML dir="auto" (which only looks at the very first strong character,
 * failing completely on sentences like "Graphify: لبناء رسم بياني" or "Flutter Developer: مطلوب مطور"),
 * this heuristic:
 * 1. Strips leading non-directional framing (bullets, list numbers, blockquote marks).
 * 2. Checks the first strong character. If it's RTL, immediately returns 'rtl'.
 * 3. If the first strong character is LTR (e.g. an English label or brand prefix),
 *    it checks the ratio of strong RTL vs LTR characters. If RTL characters make up > 30%
 *    of total strong characters, the paragraph is predominantly Arabic/RTL, so it returns 'rtl'.
 * 4. Otherwise, returns 'ltr'.
 */
export function detectTextDirection(text?: string | null): 'rtl' | 'ltr' {
  if (!text || typeof text !== 'string') return 'ltr';

  const cleaned = stripLeadingFraming(text);
  if (!cleaned) return 'ltr';

  // Find the first strong directional character
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (RTL_CHAR_REGEX.test(char)) {
      return 'rtl';
    }
    if (LTR_CHAR_REGEX.test(char)) {
      // First strong character is LTR, but check if there's significant RTL content
      // (e.g. "Graphify: لبناء..." or "Note: هذا إشعار")
      const rtlMatches = cleaned.match(RTL_GLOBAL_REGEX);
      if (!rtlMatches) return 'ltr';

      const rtlCount = rtlMatches.length;
      const ltrMatches = cleaned.match(LTR_GLOBAL_REGEX);
      const ltrCount = ltrMatches ? ltrMatches.length : 0;

      const totalStrong = rtlCount + ltrCount;
      if (totalStrong > 0 && rtlCount / totalStrong >= 0.3) {
        return 'rtl';
      }
      return 'ltr';
    }
  }

  return 'ltr';
}

/**
 * Convenience alias for detectTextDirection.
 */
export const getTextDirection = detectTextDirection;

/**
 * Isolates parenthesized phrases that have opposing directionality to the base direction.
 *
 * For example:
 * - In an RTL Arabic sentence: `(AI-Augmented Engineering)` is isolated with `<bdi dir="ltr">`
 *   to prevent the parentheses from flipping into `)AI-Augmented Engineering(` or scrambling adjacent words.
 * - In an LTR English sentence: `(مطور تطبيقات)` is isolated with `<bdi dir="rtl">`
 *   to ensure the Arabic phrase reads right-to-left without disrupting the surrounding sentence.
 */
export function renderWithBidiIsolation(
  text: string,
  baseDir: 'rtl' | 'ltr',
  keyPrefix: string = 'bidi'
): React.ReactNode[] {
  if (!text) return [];

  // Split on parenthesized segments: ( ... )
  const PAREN_REGEX = /(\([^)]+\))/g;
  const parts = text.split(PAREN_REGEX);

  return parts.map((part, idx) => {
    const key = `${keyPrefix}-iso-${idx}`;
    if (!part) return null;

    if (part.startsWith('(') && part.endsWith(')') && part.length >= 3) {
      const inner = part.slice(1, -1);
      const innerHasRtl = hasRtlText(inner);
      const innerHasLtr = LTR_CHAR_REGEX.test(inner);

      // In an RTL context: parenthesized Latin terms (like "(AI-Augmented Engineering)") must be isolated as LTR
      if (baseDir === 'rtl' && !innerHasRtl && innerHasLtr) {
        return React.createElement('bdi', { key, dir: 'ltr', className: 'inline' }, part);
      }

      // In an LTR context: parenthesized Arabic terms (like "(مطور تطبيقات)") must be isolated as RTL
      if (baseDir === 'ltr' && innerHasRtl) {
        return React.createElement('bdi', { key, dir: 'rtl', className: 'inline' }, part);
      }
    }

    return part;
  });
}
