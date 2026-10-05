/**
 * Utility functions for normalizing, formatting, and expanding locations and country codes.
 */

const regionDisplay = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

export const ISO3_TO_ISO2: Readonly<Record<string, string>> = {
  USA: 'US', GBR: 'GB', UK: 'GB', CAN: 'CA', DEU: 'DE', FRA: 'FR',
  QAT: 'QA', LBN: 'LB', ARE: 'AE', UAE: 'AE', SAU: 'SA', KSA: 'SA',
  EGY: 'EG', JOR: 'JO', KWT: 'KW', BHR: 'BH', OMN: 'OM', IND: 'IN',
  PAK: 'PK', AUS: 'AU', NZL: 'NZ', SGP: 'SG', MYS: 'MY', NLD: 'NL',
  ESP: 'ES', ITA: 'IT', CHE: 'CH', SWE: 'SE', NOR: 'NO', DNK: 'DK',
  FIN: 'FI', IRL: 'IE', TUR: 'TR', ZAF: 'ZA', BRA: 'BR', MEX: 'MX',
  IRQ: 'IQ', SYR: 'SY', MAR: 'MA', TUN: 'TN', DZA: 'DZ', LBY: 'LY',
  SDN: 'SD', YEM: 'YE', PSE: 'PS', KOR: 'KR', JPN: 'JP', CHN: 'CN',
};

/**
 * Expands a 2-letter or 3-letter country acronym to its full English country name.
 * If already a full name or unrecognized, returns the original trimmed string.
 */
export function expandCountry(codeOrName?: string | null): string {
  if (!codeOrName) return '';
  const trimmed = String(codeOrName).trim();
  const upper = trimmed.toUpperCase();
  const alpha2 = ISO3_TO_ISO2[upper] || (upper.length === 2 && /^[A-Z]{2}$/.test(upper) ? upper : null);
  if (alpha2 && regionDisplay) {
    try {
      const full = regionDisplay.of(alpha2);
      if (full) return full;
    } catch {
      // Fallback
    }
  }
  return trimmed;
}

/**
 * Formats a location from an array of address parts or a comma-separated string:
 * - Expands country acronyms (e.g. 'QA' -> 'Qatar', 'LB' -> 'Lebanon')
 * - Deduplicates repeated city/region components (e.g. 'Doha, Doha, QA' -> 'Doha, Qatar')
 */
export function formatLocation(rawOrParts?: (string | null | undefined)[] | string | null): string {
  if (!rawOrParts) return '';
  let parts: string[] = [];
  if (Array.isArray(rawOrParts)) {
    parts = rawOrParts.map(p => String(p || '').trim()).filter(Boolean);
  } else if (typeof rawOrParts === 'string') {
    parts = rawOrParts.split(',').map(p => p.trim()).filter(Boolean);
  }
  if (parts.length === 0) return '';

  // Expand country in the last part if it is an acronym
  const lastIdx = parts.length - 1;
  parts[lastIdx] = expandCountry(parts[lastIdx]);

  // Deduplicate adjacent identical or redundant parts (case-insensitive)
  const deduped: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const current = parts[i];
    const prev = deduped[deduped.length - 1];
    if (prev && prev.toLowerCase() === current.toLowerCase()) {
      continue;
    }
    deduped.push(current);
  }

  return deduped.join(', ');
}
