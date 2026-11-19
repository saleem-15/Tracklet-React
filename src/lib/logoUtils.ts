/**
 * Helper functions to resolve company domains and logos cleanly.
 */

import {
  cleanCompanyDomain,
  isJobBoardOrAtsLogo,
  KNOWN_COMPANY_DOMAINS,
} from './jobBoardRegistry';

/**
 * Global in-memory logo cache across all components and view transitions.
 * - string: Verified working logo image URL
 * - null: Known missing / failed logo (renders fallback immediately on Frame 0 with ZERO flicker)
 */
export const verifiedLogoCache = new Map<string, string | null>();

export function getCompanyCacheKey(companyName: string, domain?: string): string {
  return `${(companyName || '').trim().toLowerCase()}::${(domain || '').trim().toLowerCase()}`;
}

/**
 * Cleanly extracts a hostname/domain from a company name or job link.
 */
export function getCompanyDomain(companyName: string, jobLink?: string, customDomain?: string): string {
  if (customDomain && customDomain.trim()) {
    const cleaned = cleanCompanyDomain(customDomain);
    if (cleaned) {
      return cleaned;
    }
  }

  // 1. Try extracting domain from jobLink if provided
  if (jobLink && jobLink.trim()) {
    try {
      const url = new URL(jobLink.startsWith('http') ? jobLink : `https://${jobLink}`);
      const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      const cleaned = cleanCompanyDomain(hostname);
      if (cleaned) {
        return cleaned;
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // 2. Lookup in known company dictionary
  const normalizedCompany = companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (KNOWN_COMPANY_DOMAINS[normalizedCompany]) {
    return KNOWN_COMPANY_DOMAINS[normalizedCompany];
  }

  // 3. Fallback: generate company.com slug
  if (normalizedCompany) {
    return `${normalizedCompany}.com`;
  }

  return 'example.com';
}

/**
 * Live-testable logo sources for the Design Variants Lab.
 * - 'google': current production behavior (Google Favicons + Unavatar)
 * - 'brandfetch-symbol': Brandfetch light-surface symbol mark, then Google/Unavatar
 * - 'brandfetch-icon': Brandfetch light-surface icon tile, then Google/Unavatar
 */
export type LogoSourceMode = 'google' | 'brandfetch-symbol' | 'brandfetch-icon';

export const LOGO_SOURCE_STORAGE_KEY = 'tracklet_logo_source_mode';
export const BRANDFETCH_CLIENT_ID_STORAGE_KEY = 'tracklet_lab_brandfetch_client_id';

export const LOGO_SOURCE_MODES = ['google', 'brandfetch-symbol', 'brandfetch-icon'] as const;

export function isLogoSourceMode(value: unknown): value is LogoSourceMode {
  return typeof value === 'string' && (LOGO_SOURCE_MODES as readonly string[]).includes(value);
}

/**
 * Defaults to the production Google source so nothing changes until the lab toggles it.
 */
export function getSavedLogoSource(): LogoSourceMode {
  if (typeof window === 'undefined') return 'google';
  try {
    const val = localStorage.getItem(LOGO_SOURCE_STORAGE_KEY);
    if (isLogoSourceMode(val)) {
      return val;
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return 'google';
}

export function setSavedLogoSource(source: LogoSourceMode): void {
  try {
    localStorage.setItem(LOGO_SOURCE_STORAGE_KEY, source);
    window.dispatchEvent(new CustomEvent('tracklet:logo-source-changed', { detail: source }));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Prefers a lab-entered Client ID in localStorage, then falls back to the build env.
 */
export function getBrandfetchClientId(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(BRANDFETCH_CLIENT_ID_STORAGE_KEY);
      if (stored && stored.trim()) {
        return stored.trim();
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  return (
    (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_BRANDFETCH_CLIENT_ID?.trim() ||
    ''
  );
}

export function setBrandfetchClientId(clientId: string): void {
  const trimmed = clientId.trim();
  try {
    if (trimmed) {
      localStorage.setItem(BRANDFETCH_CLIENT_ID_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(BRANDFETCH_CLIENT_ID_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('tracklet:logo-source-changed'));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export interface CompanyLogoUrlOptions {
  source?: LogoSourceMode;
  brandfetchClientId?: string;
}

/**
 * Returns prioritized Logo URLs.
 *
 * Defaults to the production chain (Google Favicons with default_icon=none -> Unavatar).
 * When a Brandfetch source is selected AND a Client ID exists, the Brandfetch CDN URLs are
 * prepended so the lab can A/B test light-surface logos with a graceful 404 fallback.
 */
export function getCompanyLogoUrls(
  companyName: string,
  jobLink?: string,
  customLogoUrl?: string,
  customDomain?: string,
  options?: CompanyLogoUrlOptions
): string[] {
  const validCustomUrl =
    customLogoUrl && customLogoUrl.trim() && !isJobBoardOrAtsLogo(customLogoUrl.trim())
      ? customLogoUrl.trim()
      : null;

  const domain = getCompanyDomain(companyName, jobLink, customDomain);
  const defaultUrls = [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128&default_icon=none`,
    `https://unavatar.io/${domain}?fallback=false`,
  ];

  const source = options?.source;
  if (source === 'brandfetch-symbol' || source === 'brandfetch-icon') {
    const clientId = (options?.brandfetchClientId || getBrandfetchClientId()).trim();
    if (clientId) {
      const cid = encodeURIComponent(clientId);
      const encDomain = encodeURIComponent(domain);
      // Brandfetch enum: theme/dark = dark-colored logo intended for LIGHT UI backgrounds.
      const symbolUrl = `https://cdn.brandfetch.io/${encDomain}/theme/dark/fallback/404/h/128/w/128/symbol?c=${cid}`;
      const iconUrl = `https://cdn.brandfetch.io/${encDomain}/theme/dark/fallback/404/h/128/w/128/icon?c=${cid}`;
      const fallbackUrls = validCustomUrl ? [validCustomUrl, ...defaultUrls] : defaultUrls;

      return source === 'brandfetch-symbol'
        ? [symbolUrl, iconUrl, ...fallbackUrls]
        : [iconUrl, ...fallbackUrls];
    }
  }

  if (validCustomUrl) {
    return [validCustomUrl];
  }

  return defaultUrls;
}

export interface CorporateIconPalette {
  bg: string;
  icon: string;
  border: string;
}

/**
 * Clean, solid daylight corporate brand tints. Pure solid colors (ZERO gradients).
 * Deterministic based on the company name.
 */
export function getCompanyCorporatePalette(companyName: string): CorporateIconPalette {
  const palettes: CorporateIconPalette[] = [
    {
      bg: 'bg-indigo-50',
      icon: 'text-indigo-600',
      border: 'border-indigo-200/70',
    },
    {
      bg: 'bg-sky-50',
      icon: 'text-sky-600',
      border: 'border-sky-200/70',
    },
    {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      border: 'border-emerald-200/70',
    },
    {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      border: 'border-amber-200/70',
    },
    {
      bg: 'bg-rose-50',
      icon: 'text-rose-600',
      border: 'border-rose-200/70',
    },
    {
      bg: 'bg-violet-50',
      icon: 'text-violet-600',
      border: 'border-violet-200/70',
    },
    {
      bg: 'bg-slate-100',
      icon: 'text-slate-600',
      border: 'border-slate-300/70',
    },
    {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-200/70',
    },
  ];

  const str = (companyName || '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

export function getCompanyAvatarColors(companyName: string): { bg: string; text: string; border: string } {
  const colors = [
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  ];

  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    hash = companyName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}


/**
 * Display modes for company logos (Design Variants Lab):
 * - 'ghost-squircle': Ultra-quiet tinted squircle + microscopic keyline + multiply blend (Linear/Raycast style).
 * - 'pure-borderless': 100% borderless transparent container with soft corner masking + multiply blend.
 * - 'smart-keyline': Borderless transparent container with a subtle inner keyline silhouette.
 * - 'original': Baseline production white tile with border (no blend).
 */
export type LogoPatternMode = 'ghost-squircle' | 'pure-borderless' | 'smart-keyline' | 'original';

export const LOGO_PATTERN_STORAGE_KEY = 'tracklet_logo_display_pattern';

export const LOGO_PATTERN_MODES: readonly LogoPatternMode[] = [
  'ghost-squircle',
  'pure-borderless',
  'smart-keyline',
  'original',
];

export function isLogoPatternMode(value: unknown): value is LogoPatternMode {
  return typeof value === 'string' && (LOGO_PATTERN_MODES as readonly string[]).includes(value);
}

export function getSavedLogoPattern(): LogoPatternMode {
  if (typeof window === 'undefined') return 'ghost-squircle';
  try {
    const val = localStorage.getItem(LOGO_PATTERN_STORAGE_KEY);
    if (isLogoPatternMode(val)) {
      return val;
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return 'ghost-squircle';
}

export function setSavedLogoPattern(mode: LogoPatternMode): void {
  try {
    localStorage.setItem(LOGO_PATTERN_STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent('tracklet:logo-pattern-changed', { detail: mode }));
  } catch {
    // Ignore storage errors in restricted contexts
  }
}
