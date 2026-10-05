/**
 * Helper functions to resolve company domains and logos cleanly.
 */

import {
  cleanCompanyDomain,
  isJobBoardOrAts,
  isJobBoardOrAtsLogo,
  KNOWN_COMPANY_DOMAINS,
} from './jobBoardRegistry';

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
 * Returns prioritized Logo URLs (Clearbit -> Google Favicons -> Unavatar)
 */
export function getCompanyLogoUrls(companyName: string, jobLink?: string, customLogoUrl?: string, customDomain?: string): string[] {
  if (customLogoUrl && customLogoUrl.trim()) {
    const trimmed = customLogoUrl.trim();
    // Do not use the customLogoUrl if it points to a job board or ATS host logo (e.g. logo.clearbit.com/linkedin.com)
    if (!isJobBoardOrAtsLogo(trimmed)) {
      return [trimmed];
    }
  }

  const domain = getCompanyDomain(companyName, jobLink, customDomain);
  
  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://unavatar.io/${domain}?fallback=false`,
  ];
}

/**
 * Generates a deterministic pastel background color and text color from company name
 */
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
