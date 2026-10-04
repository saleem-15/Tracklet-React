/**
 * Tracklet Extension — Mirrored Job Board & ATS Registry
 * Vanilla ES2020 JavaScript module for MV3 extension context (content script, popup, service worker).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JobBoardRegistry = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const JOB_BOARD_HOSTS = [
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
  ];

  const ATS_HOSTS = [
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

  const KNOWN_COMPANY_DOMAINS = {
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

  function normalizeHost(hostnameOrUrl) {
    if (!hostnameOrUrl) return '';
    const trimmed = String(hostnameOrUrl).trim().toLowerCase();
    if (!trimmed) return '';

    try {
      const urlString = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
      const parsed = new URL(urlString);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return trimmed
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .split(':')[0]
        .split('?')[0];
    }
  }

  function isJobBoardOrAts(hostnameOrUrl) {
    const host = normalizeHost(hostnameOrUrl);
    if (!host) return false;

    for (let i = 0; i < JOB_BOARD_HOSTS.length; i++) {
      const board = JOB_BOARD_HOSTS[i];
      if (host === board || host.endsWith('.' + board)) {
        return true;
      }
    }

    for (let i = 0; i < ATS_HOSTS.length; i++) {
      const ats = ATS_HOSTS[i];
      if (host === ats || host.endsWith('.' + ats)) {
        return true;
      }
    }

    return false;
  }

  function isJobBoardOrAtsLogo(url) {
    if (!url) return false;
    const trimmed = String(url).trim().toLowerCase();
    if (!trimmed) return false;

    if (isJobBoardOrAts(trimmed)) {
      return true;
    }

    const clearbitMatch = trimmed.match(/logo\.clearbit\.com\/([^/?#]+)/i);
    if (clearbitMatch && isJobBoardOrAts(clearbitMatch[1])) {
      return true;
    }

    const domainParamMatch = trimmed.match(/[?&]domain=([^&#]+)/i);
    if (domainParamMatch && isJobBoardOrAts(domainParamMatch[1])) {
      return true;
    }

    const unavatarMatch = trimmed.match(/unavatar\.io\/([^/?#]+)/i);
    if (unavatarMatch && isJobBoardOrAts(unavatarMatch[1])) {
      return true;
    }

    return false;
  }

  function cleanCompanyDomain(urlOrHost) {
    const host = normalizeHost(urlOrHost);
    if (!host || !host.includes('.')) return null;
    if (isJobBoardOrAts(host)) return null;
    return host;
  }

  return {
    JOB_BOARD_HOSTS,
    ATS_HOSTS,
    KNOWN_COMPANY_DOMAINS,
    normalizeHost,
    isJobBoardOrAts,
    isJobBoardOrAtsLogo,
    cleanCompanyDomain,
  };
});
