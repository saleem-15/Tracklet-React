/**
 * Helper functions to resolve company domains and logos cleanly.
 */

// Known company name to domain mappings for accurate resolution
const KNOWN_COMPANY_DOMAINS: Record<string, string> = {
  linear: 'linear.app',
  stripe: 'stripe.com',
  vercel: 'vercel.com',
  figma: 'figma.com',
  datadog: 'datadoghq.com',
  notion: 'notion.so',
  github: 'github.com',
  retool: 'retool.com',
  supabase: 'supabase.com',
  doordash: 'doordash.com',
  uber: 'uber.com',
  shopify: 'shopify.com',
  snowflake: 'snowflake.com',
  openai: 'openai.com',
  anthropic: 'anthropic.com',
  airbnb: 'airbnb.com',
  meta: 'meta.com',
  facebook: 'meta.com',
  google: 'google.com',
  apple: 'apple.com',
  microsoft: 'microsoft.com',
  amazon: 'amazon.com',
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  slack: 'slack.com',
  atlassian: 'atlassian.com',
  canva: 'canva.com',
  cloudflare: 'cloudflare.com',
  palantir: 'palantir.com',
  roblox: 'roblox.com',
  coinbase: 'coinbase.com',
  robinhood: 'robinhood.com',
  zoom: 'zoom.us',
};

/**
 * Cleanly extracts a hostname/domain from a company name or job link.
 */
export function getCompanyDomain(companyName: string, jobLink?: string, customDomain?: string): string {
  if (customDomain && customDomain.trim()) {
    return customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }

  // 1. Try extracting domain from jobLink if provided
  if (jobLink && jobLink.trim()) {
    try {
      const url = new URL(jobLink.startsWith('http') ? jobLink : `https://${jobLink}`);
      let hostname = url.hostname.toLowerCase().replace(/^www\./, '');
      
      // Ignore common job board domains (e.g., linkedin.com, indeed.com, greenhouse.io)
      const isJobBoard = /linkedin|indeed|greenhouse|lever|workday|otta|wellfound|ashbyhq|glassdoor|ziprecruiter|monster/.test(hostname);
      if (!isJobBoard && hostname.includes('.')) {
        return hostname;
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
    return [customLogoUrl.trim()];
  }

  const domain = getCompanyDomain(companyName, jobLink, customDomain);
  
  return [
    `https://logo.clearbit.com/${domain}`,
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
