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

  const ISO3_TO_ISO2 = {
    USA: 'US', GBR: 'GB', UK: 'GB', CAN: 'CA', DEU: 'DE', FRA: 'FR',
    QAT: 'QA', LBN: 'LB', ARE: 'AE', UAE: 'AE', SAU: 'SA', KSA: 'SA',
    EGY: 'EG', JOR: 'JO', KWT: 'KW', BHR: 'BH', OMN: 'OM', IND: 'IN',
    PAK: 'PK', AUS: 'AU', NZL: 'NZ', SGP: 'SG', MYS: 'MY', NLD: 'NL',
    ESP: 'ES', ITA: 'IT', CHE: 'CH', SWE: 'SE', NOR: 'NO', DNK: 'DK',
    FIN: 'FI', IRL: 'IE', TUR: 'TR', ZAF: 'ZA', BRA: 'BR', MEX: 'MX',
    IRQ: 'IQ', SYR: 'SY', MAR: 'MA', TUN: 'TN', DZA: 'DZ', LBY: 'LY',
    SDN: 'SD', YEM: 'YE', PSE: 'PS', KOR: 'KR', JPN: 'JP', CHN: 'CN',
  };

  const regionDisplay = typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

  function expandCountry(codeOrName) {
    if (!codeOrName) return '';
    const trimmed = String(codeOrName).trim();
    const upper = trimmed.toUpperCase();
    const alpha2 = ISO3_TO_ISO2[upper] || (upper.length === 2 && /^[A-Z]{2}$/.test(upper) ? upper : null);
    if (alpha2 && regionDisplay) {
      try {
        const full = regionDisplay.of(alpha2);
        if (full) return full;
      } catch (e) {
        // Fallback
      }
    }
    return trimmed;
  }

  function formatLocation(rawOrParts) {
    if (!rawOrParts) return '';
    let parts = [];
    if (Array.isArray(rawOrParts)) {
      parts = rawOrParts.map(p => String(p || '').trim()).filter(Boolean);
    } else if (typeof rawOrParts === 'string') {
      parts = rawOrParts.split(',').map(p => p.trim()).filter(Boolean);
    }
    if (parts.length === 0) return '';

    const lastIdx = parts.length - 1;
    parts[lastIdx] = expandCountry(parts[lastIdx]);

    const deduped = [];
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

  function htmlToMarkdown(htmlOrNode) {
    if (!htmlOrNode) return '';
    if (typeof htmlOrNode !== 'string') return '';

    let md = htmlOrNode;

    // 1. If HTML tags are escaped as &lt;p&gt; or &lt;b&gt;, unescape tag delimiters first
    if (/&lt;[a-z/][^&]*&gt;/i.test(md)) {
      md = md
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');
    }

    if (!/<[a-z][\s\S]*>/i.test(md)) {
      return md.trim();
    }

    md = md.replace(/\r\n/g, '\n');
    md = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    md = md.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    md = md.replace(/<!--[\s\S]*?-->/g, '');

    // 2. Explicit Headings (strip internal tags so headers stay clean)
    md = md.replace(/<h[12]\b[^>]*>(.*?)<\/h[12]>/gis, function (_match, content) {
      const clean = content.replace(/<[^>]+>/g, '').trim();
      return clean ? '\n\n## ' + clean + '\n\n' : '\n\n';
    });

    md = md.replace(/<h[3-6]\b[^>]*>(.*?)<\/h[3-6]>/gis, function (_match, content) {
      const clean = content.replace(/<[^>]+>/g, '').trim();
      return clean ? '\n\n### ' + clean + '\n\n' : '\n\n';
    });

    // 3. Implicit Headings: Job boards (Bayt, Indeed, LinkedIn, etc.) frequently wrap section titles
    // in <p><b>Heading</b></p>, <div><strong>Heading:</strong></div>, or <b>Heading:</b><br>.
    md = md.replace(/<(?:p|div|section)\b[^>]*>\s*<(?:strong|b)\b[^>]*>([^<]+)<\/(?:strong|b)>\s*<\/(?:p|div|section)>/gi, function (match, text) {
      const clean = text.trim();
      if (clean.length > 0 && clean.length <= 80 && !clean.endsWith('.') && !clean.includes('. ')) {
        return '\n\n### ' + clean + '\n\n';
      }
      return match;
    });

    md = md.replace(/<(?:strong|b)\b[^>]*>([^<]+)<\/(?:strong|b)>\s*(?:<br\s*[\/]?>|\n)+/gi, function (match, text) {
      const clean = text.trim();
      if (clean.length > 0 && clean.length <= 80 && !clean.endsWith('.') && !clean.includes('. ')) {
        return '\n\n### ' + clean + '\n\n';
      }
      return match;
    });

    // 4. Formatting tags
    md = md.replace(/<(?:strong|b)\b[^>]*>(.*?)<\/(?:strong|b)>/gis, ' **$1** ');
    md = md.replace(/<(?:em|i)\b[^>]*>(.*?)<\/(?:em|i)>/gis, ' *$1* ');
    md = md.replace(/<code\b[^>]*>(.*?)<\/code>/gis, ' `$1` ');
    md = md.replace(/<pre\b[^>]*>(.*?)<\/pre>/gis, '\n```\n$1\n```\n');

    // 5. Links
    md = md.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis, '[$2]($1)');

    // 6. Lists
    md = md.replace(/<li\b[^>]*>(.*?)<\/li>/gis, '\n- $1');
    md = md.replace(/<\/(?:ul|ol)>/gis, '\n\n');
    md = md.replace(/<(?:ul|ol)\b[^>]*>/gis, '\n');

    // 7. Structural tags
    md = md.replace(/<p\b[^>]*>(.*?)<\/p>/gis, '\n\n$1\n\n');
    md = md.replace(/<blockquote\b[^>]*>(.*?)<\/blockquote>/gis, '\n> $1\n\n');
    md = md.replace(/<br\s*[\/]?>/gi, '\n');
    md = md.replace(/<hr\s*[\/]?>/gi, '\n\n---\n\n');
    md = md.replace(/<\/?(?:div|section|article|main|header|footer|span)\b[^>]*>/gi, '\n');

    // 8. Strip remaining tags
    md = md.replace(/<[^>]+>/g, '');

    // 9. Decode HTML entities
    md = md
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&bull;/gi, '•')
      .replace(/&ndash;/gi, '–')
      .replace(/&mdash;/gi, '—');

    // 10. Post-process headings
    md = md.replace(/^(\s*)\*\*([^*\n]+)\*\*(\s*)$/gm, function (match, before, text, after) {
      const clean = text.trim();
      if (clean.length > 0 && clean.length <= 80 && !clean.endsWith('.') && !clean.includes('. ')) {
        return before + '### ' + clean + after;
      }
      return match;
    });

    md = md.replace(/^(#{1,6}\s+)\*\*([^*\n]+)\*\*\s*$/gm, '$1$2');
    md = md.replace(/^(#{1,6}\s+)\*([^*\n]+)\*\s*$/gm, '$1$2');

    // 11. Normalize spacing
    md = md
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return md;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseInlineToHtml(line) {
    if (!line) return '';
    let escaped = escapeHtml(line);
    // Links: [text](url)
    escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Bold: **text**
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    escaped = escaped.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
    // Inline code: `text`
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    return escaped;
  }

  function markdownToHtml(markdown) {
    if (!markdown || !markdown.trim()) {
      return '<p><br></p>';
    }

    const lines = markdown.split(/\r?\n/);
    const htmlParts = [];
    let inUl = false;
    let inOl = false;

    function closeLists() {
      if (inUl) {
        htmlParts.push('</ul>');
        inUl = false;
      }
      if (inOl) {
        htmlParts.push('</ol>');
        inOl = false;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        closeLists();
        htmlParts.push('<p><br></p>');
        continue;
      }

      // Headings
      if (trimmed.startsWith('# ')) {
        closeLists();
        htmlParts.push('<h2>' + parseInlineToHtml(trimmed.slice(2)) + '</h2>');
        continue;
      }
      if (trimmed.startsWith('## ')) {
        closeLists();
        htmlParts.push('<h3>' + parseInlineToHtml(trimmed.slice(3)) + '</h3>');
        continue;
      }
      if (trimmed.startsWith('### ')) {
        closeLists();
        htmlParts.push('<h4>' + parseInlineToHtml(trimmed.slice(4)) + '</h4>');
        continue;
      }
      if (trimmed.startsWith('#### ') || trimmed.startsWith('##### ') || trimmed.startsWith('###### ')) {
        closeLists();
        const headerText = trimmed.replace(/^#+\s*/, '');
        htmlParts.push('<h4>' + parseInlineToHtml(headerText) + '</h4>');
        continue;
      }

      // Bullet lists
      const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (bulletMatch) {
        if (inOl) {
          htmlParts.push('</ol>');
          inOl = false;
        }
        if (!inUl) {
          htmlParts.push('<ul>');
          inUl = true;
        }
        htmlParts.push('<li>' + parseInlineToHtml(bulletMatch[1]) + '</li>');
        continue;
      }

      // Numbered lists
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        if (inUl) {
          htmlParts.push('</ul>');
          inUl = false;
        }
        if (!inOl) {
          htmlParts.push('<ol>');
          inOl = true;
        }
        htmlParts.push('<li>' + parseInlineToHtml(numMatch[2]) + '</li>');
        continue;
      }

      // Divider
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        closeLists();
        htmlParts.push('<hr>');
        continue;
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        closeLists();
        htmlParts.push('<blockquote>' + parseInlineToHtml(trimmed.slice(2)) + '</blockquote>');
        continue;
      }

      // Standard paragraph
      closeLists();
      htmlParts.push('<p>' + parseInlineToHtml(trimmed) + '</p>');
    }

    closeLists();
    return htmlParts.join('');
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
    expandCountry,
    formatLocation,
    htmlToMarkdown,
    markdownToHtml,
  };
});
