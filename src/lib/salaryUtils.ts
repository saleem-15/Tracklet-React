/**
 * Utility functions for salary parsing, normalization, and compact formatting.
 */

/**
 * Normalizes an individual salary figure to compact $Xk format.
 * Examples:
 * - '$190,000' -> '$190k'
 * - '190000' -> '$190k'
 * - '$190k' -> '$190k'
 * - '$215,000' -> '$215k'
 * - '$185k' -> '$185k'
 * - '$80,500' -> '$80.5k'
 */
export function compactSalaryNumber(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return '';

  // Already in compact k format: e.g. $190k, 190k, $190.5k
  const kMatch = trimmed.match(/^[$]?\s*(\d+(?:\.\d+)?)\s*[kK]$/);
  if (kMatch) {
    return `$${kMatch[1]}k`;
  }

  // Parse numeric value removing $, commas, spaces
  const cleanDigits = trimmed.replace(/[$]/g, '').replace(/,/g, '').trim();
  const num = parseFloat(cleanDigits);
  if (!isNaN(num)) {
    if (num >= 1000) {
      const thousands = num / 1000;
      const formatted = Number.isInteger(thousands) ? `${thousands}` : `${thousands.toFixed(1)}`;
      return `$${formatted}k`;
    }
    return `$${num}`;
  }

  return trimmed.startsWith('$') ? trimmed : `$${trimmed}`;
}

/**
 * Standardizes salary notation to compact notation:
 * - Single value: '$190,000' -> '$190k'
 * - Range: '$185,000 - $210,000' -> '$185k–$210k' (en-dash '–', no spaces around en-dash)
 * - Trailing timeframes like '/ year', 'base', 'per year' are cleanly stripped.
 */
export function formatSalaryCompact(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return '';
  const text = raw.trim();

  // Strip trailing '/ year', '/ yr', 'per year', 'base', etc.
  const cleaned = text.replace(/(?:\s*(?:\/|\bper\b)\s*(?:year|yr|annum|month|mo)|\s*base)\s*$/i, '');

  // Detect range: min - max (separated by '-', '–', '—', or 'to')
  const rangeMatch = cleaned.match(/^([$]?\s*\d[\d,kK\s.]*?)\s*(?:[-–—]|\bto\b)\s*([$]?\s*\d[\d,kK\s.]*?)$/i);
  if (rangeMatch) {
    const min = compactSalaryNumber(rangeMatch[1]);
    const max = compactSalaryNumber(rangeMatch[2]);
    return `${min}–${max}`;
  }

  // Single value
  const singleMatch = cleaned.match(/^([$]?\s*\d[\d,kK\s.]*?)$/i);
  if (singleMatch) {
    return compactSalaryNumber(singleMatch[1]);
  }

  return cleaned;
}
