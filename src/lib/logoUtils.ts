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
 * Returns prioritized Logo URLs (Google Favicons with default_icon=none -> Unavatar)
 */
export function getCompanyLogoUrls(companyName: string, jobLink?: string, customLogoUrl?: string, customDomain?: string): string[] {
  if (customLogoUrl && customLogoUrl.trim()) {
    const trimmed = customLogoUrl.trim();
    if (!isJobBoardOrAtsLogo(trimmed)) {
      return [trimmed];
    }
  }

  const domain = getCompanyDomain(companyName, jobLink, customDomain);
  
  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128&default_icon=none`,
    `https://unavatar.io/${domain}?fallback=false`,
  ];
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
