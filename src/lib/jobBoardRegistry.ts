/**
 * Canonical Job Board and ATS (Applicant Tracking System) Registry.
 * Single source of truth for identifying job boards, aggregators, and ATS hosts
 * that should never be recorded or displayed as a hiring company's own domain or logo.
 */

export const JOB_BOARD_HOSTS: readonly string[] = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'ziprecruiter.com',
  'monster.com',
  'simplyhired.com',
  'otta.com',
  'wellfound.com',
  'angel.co',
  'dice.com',
  'careerbuilder.com',
  'jobserve.com',
  'totaljobs.com',
  'reed.co.uk',
  'cwjobs.co.uk',
  'snagajob.com',
  'hired.com',
  'themuse.com',
  'builtin.com',
  'remoteok.com',
  'weworkremotely.com',
  'internshala.com',
  'bayt.com',
  'naukri.com',
  'licdn.com',
  'indeed.net',
  'arc.dev',
  'himalayas.app',
  'remotive.com',
  'jobright.ai',
  'trueup.io',
  'workatastartup.com',
  'techstars.com',
];

export const ATS_HOSTS: readonly string[] = [
  'greenhouse.io',
  'lever.co',
  'ashbyhq.com',
  'workdayjobs.com',
  'myworkdayjobs.com',
  'smartrecruiters.com',
  'jobvite.com',
  'recruitee.com',
  'rippling-ats.com',
  'bamboohr.com',
  'icims.com',
  'jazzhr.com',
  'workable.com',
  'breezy.hr',
  'pinpointhq.com',
  'teamtailor.com',
  'applytojob.com',
  'personio.com',
  'personio.de',
];

export const KNOWN_COMPANY_DOMAINS: Readonly<Record<string, string>> = {
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
 * Normalizes any URL or hostname candidate to a lowercased host string.
 */
export function normalizeHost(hostnameOrUrl?: string | null): string {
  if (!hostnameOrUrl) return '';
  const trimmed = hostnameOrUrl.trim().toLowerCase();
  if (!trimmed) return '';

  try {
    const urlString = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(urlString);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    // If URL parsing fails, strip protocol manually and any path/port
    return trimmed
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split(':')[0]
      .split('?')[0];
  }
}

/**
 * Returns true if the given URL, hostname, or domain matches a known job board or ATS.
 */
export function isJobBoardOrAts(hostnameOrUrl?: string | null): boolean {
  const host = normalizeHost(hostnameOrUrl);
  if (!host) return false;

  // Exact match or sub-domain check against job boards
  for (const board of JOB_BOARD_HOSTS) {
    if (host === board || host.endsWith(`.${board}`)) {
      return true;
    }
  }

  // Exact match or sub-domain check against ATS hosts
  for (const ats of ATS_HOSTS) {
    if (host === ats || host.endsWith(`.${ats}`)) {
      return true;
    }
  }

  return false;
}

/**
 * Cleans a company domain candidate.
 * Returns null if the domain is invalid, empty, or is a known job board or ATS.
 */
export function cleanCompanyDomain(urlOrHost?: string | null): string | null {
  const host = normalizeHost(urlOrHost);
  if (!host || !host.includes('.')) return null;
  if (isJobBoardOrAts(host)) return null;
  return host;
}

/**
 * Checks if a logo URL points directly to a job board / ATS host or is a proxy/favicon
 * service (Clearbit, Google Favicons, Unavatar) requesting a job board / ATS domain.
 */
export function isJobBoardOrAtsLogo(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;

  // Direct host match (e.g. https://media.licdn.com/...)
  if (isJobBoardOrAts(trimmed)) {
    return true;
  }

  // Clearbit logo proxy: https://logo.clearbit.com/{domain}
  const clearbitMatch = trimmed.match(/logo\.clearbit\.com\/([^/?#]+)/i);
  if (clearbitMatch && isJobBoardOrAts(clearbitMatch[1])) {
    return true;
  }

  // Favicon proxy with domain query param: e.g. domain=linkedin.com
  const domainParamMatch = trimmed.match(/[?&]domain=([^&#]+)/i);
  if (domainParamMatch && isJobBoardOrAts(domainParamMatch[1])) {
    return true;
  }

  // Unavatar proxy: https://unavatar.io/{domain}
  const unavatarMatch = trimmed.match(/unavatar\.io\/([^/?#]+)/i);
  if (unavatarMatch && isJobBoardOrAts(unavatarMatch[1])) {
    return true;
  }

  return false;
}

