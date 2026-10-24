/**
 * Tracklet Content Script — Page Extraction Engine
 * Parses job postings using JSON-LD, site-specific DOM selectors, and universal meta fallbacks.
 */

// Helper to sanitize text
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

// Strip career prefixes/suffixes from extracted company names (e.g. "Karriere bei cosy.green" -> "cosy.green")
function cleanCompanyName(company) {
  if (!company) return '';
  let cleaned = cleanText(company);
  cleaned = cleaned
    .replace(/^(?:karriere\s+(?:bei|at)|jobs?\s+(?:bei|at|chez)|arbeiten\s+bei|careers?\s+(?:at|with)|join\s+(?:us\s+at|our\s+team\s+at)?|work\s+(?:at|with)|emplois?\s+chez|trabaja\s+en|vacatures\s+bij)\s+/i, '')
    .replace(/\s*[-–—|•·:]\s*(?:careers?|jobs?|karriere|stellenangebote|open\s+positions?|job\s+board|hiring|recruiting|portal)$/i, '')
    .replace(/\s+(?:careers|job\s+board|career\s+portal)$/i, '')
    .trim();
  return cleaned || cleanText(company);
}

// Strip company name suffixes, career prefixes, and board noise from extracted role titles
function cleanRoleTitle(title, company) {
  if (!title) return '';
  let cleaned = cleanText(title);
  cleaned = cleaned.replace(/^(?:job\s+opening|open\s+role|position|vacancy|now\s+hiring|hiring)\s*:\s*/i, '').trim();

  const candidates = [cleanText(company), cleanCompanyName(company)].filter(Boolean);
  for (const comp of candidates) {
    if (comp.length < 2) continue;
    const escaped = comp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned
      .replace(new RegExp(`\\s*(?:[-–—|•·]|\\bat\\b|@)\\s*(?:karriere\\s+bei\\s+|careers?\\s+at\\s+|jobs?\\s+at\\s+)?${escaped}\\s*$`, 'i'), '')
      .trim();
  }

  cleaned = cleaned
    .replace(/\s*[-–—|•·]\s*(?:karriere(?:\s+bei\s+[^|\-–—•·]+)?|careers?(?:\s+at\s+[^|\-–—•·]+)?|jobs?(?:\s+at\s+[^|\-–—•·]+)?|apply\s+now)$/i, '')
    .trim();

  return cleaned || cleanText(title);
}


// Deduplicate accessibility-doubled strings (e.g. "Senior Flutter DeveloperSenior Flutter Developer" or "Almaty, Kazakhstan Almaty, Kazakhstan")
function dedupeDoubledString(str) {
  if (!str) return '';
  const trimmed = str.replace(/\s+/g, ' ').trim();
  if (trimmed.length < 4) return trimmed;

  // Check exact half-split without space ("TextText")
  if (trimmed.length % 2 === 0) {
    const half = trimmed.length / 2;
    const first = trimmed.slice(0, half);
    const second = trimmed.slice(half);
    if (first.toLowerCase() === second.toLowerCase()) {
      return first.trim();
    }
  }

  // Check half-split with space ("Text Text")
  const words = trimmed.split(' ');
  if (words.length >= 2 && words.length % 2 === 0) {
    const halfWords = words.length / 2;
    const firstHalf = words.slice(0, halfWords).join(' ');
    const secondHalf = words.slice(halfWords).join(' ');
    if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
      return firstHalf;
    }
  }

  return trimmed;
}

// Remove screen-reader-only nodes and LinkedIn SDUI obfuscated screen-reader twin spans from a cloned DOM subtree
function stripScreenReaderDuplicates(clone) {
  if (!clone) return;
  const hiddenNodes = clone.querySelectorAll(
    '.visually-hidden, .sr-only, [class*="visually-hidden"], [class*="sr-only"], style, script, noscript, svg'
  );
  hiddenNodes.forEach(n => n.remove());

  // LinkedIn SDUI pattern: a parent element contains <span aria-hidden="true">Visible</span> followed by
  // a sibling <span> without aria-hidden="true" holding the screen-reader duplicate text.
  const ariaSpans = Array.from(clone.querySelectorAll('span[aria-hidden="true"]'));
  for (const ariaSpan of ariaSpans) {
    const parent = ariaSpan.parentElement;
    if (!parent) continue;
    const ariaTxt = cleanText(ariaSpan.textContent);
    if (!ariaTxt || /^[·•|,\-–—]+$/.test(ariaTxt)) continue;

    const children = Array.from(parent.children);
    if (children.length === 2 && children[0] === ariaSpan && children[1].tagName === 'SPAN' && !children[1].hasAttribute('aria-hidden')) {
      const siblingTxt = cleanText(children[1].textContent);
      // If sibling is identical, case-insensitively equal, or an accessibility expansion of the first span, remove it
      if (
        siblingTxt &&
        (siblingTxt.toLowerCase() === ariaTxt.toLowerCase() ||
          siblingTxt.toLowerCase().startsWith(ariaTxt.slice(0, Math.min(8, ariaTxt.length)).toLowerCase()) ||
          ariaTxt.includes(' - ') ||
          ariaTxt.includes('·'))
      ) {
        children[1].remove();
      }
    }
  }
}

// Extract clean visible text from an element while stripping .visually-hidden / .sr-only / scripts
function getCleanElementText(el) {
  if (!el) return '';
  try {
    const clone = el.cloneNode(true);
    stripScreenReaderDuplicates(clone);
    return dedupeDoubledString(cleanText(clone.textContent));
  } catch {
    return dedupeDoubledString(cleanText(el.textContent));
  }
}

function extractCleanLines(container) {
  if (!container) return [];
  const lines = [];

  function addLine(raw) {
    const cleaned = dedupeDoubledString(cleanText(raw));
    if (!cleaned || /^[·•|,\-–—]+$/.test(cleaned)) return;
    if (lines.length > 0 && lines[lines.length - 1].toLowerCase() === cleaned.toLowerCase()) return;
    lines.push(cleaned);
  }

  try {
    const clone = container.cloneNode(true);
    stripScreenReaderDuplicates(clone);

    // Remove navs and pure action buttons, but preserve buttons that wrap headings or profile/company names
    clone.querySelectorAll('nav').forEach(n => n.remove());
    clone.querySelectorAll('button').forEach(btn => {
      if (btn.querySelector('h1, h2, h3, [role="heading"]')) return;
      const btnTxt = cleanText(btn.textContent);
      if (/^(?:connect|message|more|follow|following|pending|view\s+my\s+services|view\s+services|open\s+to|add\s+profile\s+section|enhance\s+profile|resources|edit\s+profile|show\s+all.*|see\s+more|…see\s+more|\.\.\.see\s+more|like|comment|repost|send|share|save|apply|easy\s+apply)$/i.test(btnTxt)) {
        btn.remove();
      }
    });

    const INLINE_CONTEXT_SELECTOR = 'h1, h2, h3, h4, h5, h6, p, button, [role="heading"]';
    const PURE_SEPARATOR_REGEX = /^[·•|,\-–—]+$/;
    const INLINE_DEGREE_OR_SEP_REGEX = /^(?:[·•|,\-–—]+|[·•]\s*(?:1st|2nd|3rd|Following)|1st|2nd|3rd|Following)$/i;

    // Insert line breaks after block & semantic elements and standalone line-atom spans
    clone.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, br, tr, section, article, button, [role="heading"], span').forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (tag !== 'span' || el.getAttribute('role') === 'heading') {
        el.appendChild(document.createTextNode('\n'));
        return;
      }

      // Never split spans inside headings, paragraphs, or buttons ( checking parentElement so a span[role="heading"] itself still breaks above )
      if (el.parentElement && el.parentElement.closest(INLINE_CONTEXT_SELECTOR)) return;
      // Skip wrapper spans that contain nested block/heading/span elements (their inner elements will handle breaks),
      // but DO process spans that only wrap inline formatting tags like <strong>, <b>, <em>, <i>, <a>, <time>
      if (el.querySelector('div, p, li, h1, h2, h3, h4, h5, h6, section, article, [role="heading"], span')) return;

      const txt = cleanText(el.textContent);
      if (!txt) return;
      if (PURE_SEPARATOR_REGEX.test(txt)) {
        // Ensure pure separator spans (e.g. <span>·</span>) have surrounding spaces so adjacent spans stay separated on the same line
        el.textContent = ` ${txt} `;
        return;
      }

      // Check if parent has inline separator text nodes (e.g. " - " or " · ") or separator/degree sibling spans
      const parent = el.parentElement;
      if (parent) {
        const hasDirectSeparatorText = Array.from(parent.childNodes).some(
          n => n.nodeType === 3 && /[·•|\-–—,]/.test(n.textContent || '')
        );
        if (hasDirectSeparatorText) {
          // If this is the very last element in the inline group, still emit a line break at the end of the group
          if (!el.nextElementSibling) {
            el.appendChild(document.createTextNode('\n'));
          }
          return;
        }

        const nextSib = el.nextElementSibling;
        if (nextSib && (nextSib.tagName === 'SPAN' || nextSib.tagName === 'A')) {
          const nextTxt = cleanText(nextSib.textContent);
          if (/^[·•|\-–—,]/.test(nextTxt) || INLINE_DEGREE_OR_SEP_REGEX.test(nextTxt) || /[·•|\-–—,]\s*$/.test(el.textContent || '')) {
            return;
          }
        }
      }

      el.appendChild(document.createTextNode('\n'));
    });

    const rawLines = (clone.textContent || '').split(/\n+/);
    for (const r of rawLines) {
      addLine(r);
    }
  } catch {
    const fallbackLines = (container.innerText || container.textContent || '').split(/\n+/);
    for (const r of fallbackLines) {
      addLine(r);
    }
  }

  return lines;
}


// Extract domain from URL
function getDomainFromUrl(url) {
  try {
    const parsed = new URL(url);
    let host = parsed.hostname.replace(/^www\./, '');
    return host;
  } catch (e) {
    return '';
  }
}

// Resolve expanded external destination URL from tracking shortlinks (e.g. t.co, lnkd.in) via title attribute, visible text, or redirect parameters
function resolveExpandedUrl(anchor) {
  if (!anchor) return '';
  const rawHref = (anchor.href || anchor.getAttribute('href') || '').trim();
  if (!rawHref) return '';

  try {
    const parsed = new URL(rawHref);
    if (parsed.searchParams.has('url')) {
      const target = parsed.searchParams.get('url');
      if (target && /^https?:\/\//i.test(target)) return target.trim();
    }
    if (parsed.searchParams.has('dest')) {
      const target = parsed.searchParams.get('dest');
      if (target && /^https?:\/\//i.test(target)) return target.trim();
    }
  } catch {}

  const titleAttr = (anchor.getAttribute('title') || '').trim();
  if (/^https?:\/\//i.test(titleAttr) && !titleAttr.includes('t.co') && !titleAttr.includes('lnkd.in')) {
    return titleAttr;
  }

  const text = (anchor.innerText || anchor.textContent || '').trim();
  if (/^https?:\/\//i.test(text) && !text.includes('t.co') && !text.includes('lnkd.in')) {
    return text;
  }

  return rawHref;
}

// Extract human-friendly domain or company name fallback
function getDomainName(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.replace(/^www\./, '');
    const cleanHost = host.replace(/^(?:careers|jobs|apply|recruiting|hire|join)\./i, '');

    // If host is an ATS or job platform where the company is in the pathname (e.g. jobs.lever.co/linear/...)
    const atsDomains = ['lever.co', 'workable.com', 'greenhouse.io', 'ashbyhq.com', 'smartrecruiters.com', 'recruitee.com', 'breezy.hr', 'rippling.com'];
    if (atsDomains.some(d => cleanHost.toLowerCase().includes(d))) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && !['jobs', 'apply', 'careers', 'job', 'view'].includes(parts[0].toLowerCase())) {
        const comp = parts[0];
        return comp.charAt(0).toUpperCase() + comp.slice(1);
      }
    }

    const name = cleanHost.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch (e) {
    return 'Company';
  }
}

// Check whether a hostname belongs to a known job board, ATS, or social platform rather than a direct employer domain
function isJobBoardHost(hostname) {
  if (!hostname) return false;
  const host = String(hostname).toLowerCase().replace(/^www\./, '');
  const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
  if (registry && registry.isJobBoardOrAts && registry.isJobBoardOrAts(host)) {
    return true;
  }
  if (
    host.includes('linkedin.') ||
    host.includes('indeed.') ||
    host.includes('glassdoor.') ||
    host.includes('bayt.') ||
    host.includes('workdayjobs.')
  ) {
    return true;
  }
  const knownBoardsAndAts = [
    'lever.co', 'greenhouse.io', 'otta.com', 'wellfound.com', 'angel.co',
    'workable.com', 'ashbyhq.com', 'bamboohr.com', 'personio.de', 'personio.com',
    'teamtailor.com', 'smartrecruiters.com', 'recruitee.com', 'breezy.hr',
    'jobvite.com', 'icims.com', 'jazzhr.com', 'pinpointhq.com', 'applytojob.com',
    'rippling-ats.com', 'rippling.com', 'arc.dev', 'himalayas.app', 'remotive.com',
    'remoteok.com', 'weworkremotely.com', 'builtin.com', 'monster.com', 'dice.com',
    'ziprecruiter.com', 'x.com', 'twitter.com', 'github.com', 'peerlist.io'
  ];
  return knownBoardsAndAts.some(d => host === d || host.endsWith('.' + d));
}

// Detect job platform from hostname
function detectPlatform(hostname) {
  const host = hostname.toLowerCase();
  if (host.includes('linkedin.')) return 'LinkedIn';
  if (host.includes('indeed.')) return 'Indeed';
  if (host.includes('bayt.')) return 'Bayt';
  if (host.includes('lever.co')) return 'Lever';
  if (host.includes('greenhouse.io')) return 'Greenhouse';
  if (host.includes('otta.com')) return 'Otta';
  if (host.includes('wellfound.com') || host.includes('angel.co')) return 'Wellfound';
  if (host.includes('glassdoor.')) return 'Other';
  if (host.includes('workdayjobs.')) return 'Company Site';

  // If host is a known job board or third-party ATS from the registry, label it 'Other'
  const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
  if (registry && registry.isJobBoardOrAts && registry.isJobBoardOrAts(host)) {
    return 'Other';
  }

  const otherAtsOrBoardHosts = [
    'workable.com', 'ashbyhq.com', 'bamboohr.com', 'personio.de', 'personio.com',
    'teamtailor.com', 'smartrecruiters.com', 'recruitee.com', 'breezy.hr',
    'jobvite.com', 'icims.com', 'jazzhr.com', 'pinpointhq.com', 'applytojob.com',
    'rippling-ats.com', 'arc.dev', 'himalayas.app', 'remotive.com', 'remoteok.com',
    'weworkremotely.com', 'builtin.com', 'monster.com', 'dice.com', 'ziprecruiter.com'
  ];
  if (otherAtsOrBoardHosts.some(d => host === d || host.endsWith('.' + d))) {
    return 'Other';
  }

  return 'Company Site';
}

// Helper to recursively locate target Schema.org entities across root, arrays, and @graph
function findJsonLdEntity(data, targetType) {
  if (!data) return null;
  const isTarget = (type) => {
    if (!type) return false;
    if (Array.isArray(type)) return type.some(t => isTarget(t));
    const str = String(type).toLowerCase();
    const cleanTarget = targetType.toLowerCase();
    return str === cleanTarget || str.endsWith('/' + cleanTarget) || str.endsWith(':' + cleanTarget);
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findJsonLdEntity(item, targetType);
      if (found) return found;
    }
    return null;
  }

  if (typeof data === 'object') {
    if (data['@type'] && isTarget(data['@type'])) {
      return data;
    }
    if (Array.isArray(data['@graph'])) {
      for (const item of data['@graph']) {
        const found = findJsonLdEntity(item, targetType);
        if (found) return found;
      }
    }
  }
  return null;
}

// Parse JSON-LD structured data (@type: JobPosting)
function parseJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const item = findJsonLdEntity(data, 'JobPosting');
      if (item) {
        let company = '';
        let companyUrl = '';
        const sameAs = [];

        if (typeof item.hiringOrganization === 'string') {
          company = item.hiringOrganization;
        } else if (item.hiringOrganization && typeof item.hiringOrganization === 'object') {
          company = item.hiringOrganization.name || '';
          if (item.hiringOrganization.url) {
            companyUrl = item.hiringOrganization.url;
          }
          if (item.hiringOrganization.sameAs) {
            if (Array.isArray(item.hiringOrganization.sameAs)) {
              sameAs.push(...item.hiringOrganization.sameAs);
            } else if (typeof item.hiringOrganization.sameAs === 'string') {
              sameAs.push(item.hiringOrganization.sameAs);
            }
          }
        }

        // Location extraction with multi-location support, applicantLocationRequirements, & country expansion
        const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
        const locStrings = [];
        if (item.jobLocation) {
          const locs = Array.isArray(item.jobLocation) ? item.jobLocation : [item.jobLocation];
          for (const loc of locs) {
            if (!loc) continue;
            if (typeof loc === 'string') {
              const fmt = (registry && registry.formatLocation) ? registry.formatLocation(loc) : cleanText(loc);
              if (fmt && !locStrings.includes(fmt)) locStrings.push(fmt);
            } else if (loc.address) {
              const a = loc.address;
              if (typeof a === 'string') {
                const fmt = (registry && registry.formatLocation) ? registry.formatLocation(a) : cleanText(a);
                if (fmt && !locStrings.includes(fmt)) locStrings.push(fmt);
              } else {
                const parts = [a.addressLocality, a.addressRegion, a.addressCountry].filter(Boolean);
                if (parts.length > 0) {
                  const fmt = (registry && registry.formatLocation) ? registry.formatLocation(parts) : parts.join(', ');
                  if (fmt && !locStrings.includes(fmt)) locStrings.push(fmt);
                }
              }
            } else if (loc.name) {
              const fmt = (registry && registry.formatLocation) ? registry.formatLocation(loc.name) : cleanText(loc.name);
              if (fmt && !locStrings.includes(fmt)) locStrings.push(fmt);
            }
          }
        }

        if (locStrings.length === 0 && item.applicantLocationRequirements) {
          const reqs = Array.isArray(item.applicantLocationRequirements)
            ? item.applicantLocationRequirements
            : [item.applicantLocationRequirements];
          for (const req of reqs) {
            if (!req) continue;
            const rawName = typeof req === 'string' ? req : (req.name || req.addressCountry || '');
            if (rawName) {
              const fmt = (registry && registry.formatLocation) ? registry.formatLocation(rawName) : cleanText(rawName);
              if (fmt && !locStrings.includes(fmt)) locStrings.push(fmt);
            }
          }
        }

        const location = locStrings.join('; ');

        // Work arrangement (Remote / Hybrid / Onsite)
        let workLocation = null;
        const locType = String(item.jobLocationType || '').toUpperCase();
        const descText = String(item.description || '').toLowerCase();
        if (
          locType === 'TELECOMMUTE' ||
          locType.includes('REMOTE') ||
          Boolean(item.applicantLocationRequirements && locType) ||
          descText.includes('100% remote') ||
          descText.includes('fully remote') ||
          descText.includes('remote anywhere') ||
          descText.includes('work from anywhere')
        ) {
          workLocation = 'Remote';
        } else if (descText.includes('hybrid')) {
          workLocation = 'Hybrid';
        } else if (location) {
          workLocation = 'Onsite';
        }

        // Employment type (supports "FULL_TIME", "FULLTIME", "Full time", "Full-time", arrays)
        let employmentType = null;
        const rawEmp = Array.isArray(item.employmentType)
          ? item.employmentType.join(' ')
          : String(item.employmentType || '');
        if (/FULL[\s\-_]*TIME|VOLLZEIT/i.test(rawEmp)) employmentType = 'Full-time';
        else if (/PART[\s\-_]*TIME|TEILZEIT/i.test(rawEmp)) employmentType = 'Part-time';
        else if (/CONTRACT|TEMPORARY|FREELANCE|CONTRACTOR/i.test(rawEmp)) employmentType = 'Contract';
        else if (/INTERN|PRAKTIKUM/i.test(rawEmp)) employmentType = 'Internship';

        const cleanedCompany = cleanCompanyName(company);
        return {
          title: cleanRoleTitle(cleanText(item.title), cleanedCompany),
          company: cleanedCompany,
          companyUrl,
          sameAs,
          location: cleanText(location),
          workLocation,
          employmentType,
          descriptionHtml: typeof item.description === 'string' ? item.description : '',
        };
      }
    } catch (e) {
      // Continue looking
    }
  }
  return null;
}

// Site-specific DOM extraction rules
function parseSiteSpecific() {
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  const GENERIC_BOARD_HEADINGS = /^(?:jobs|remote\s+jobs|remote\s+developer\s+jobs|find\s+remote\s+jobs|startup\s+jobs|browse\s+jobs|search\s+jobs|all\s+jobs|open\s+roles|careers|arc\s+jobs|wellfound\s+jobs)$/i;

  // LinkedIn (only on /jobs paths — never on /in/, /pub/, /feed/, or /posts/)
  if (host.includes('linkedin.') && path.startsWith('/jobs')) {
    const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24, h1');
    const companyAnchor = document.querySelector('.job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name a, .jobs-unified-top-card__subtitle-primary-grouping a');
    const companyEl = companyAnchor || document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name');
    const descEl = document.querySelector('.jobs-description__content, .jobs-box__html, #job-details, .job-details');
    const descriptionHtml = descEl ? (descEl.innerHTML || descEl.textContent) : '';

    let companySlug = '';
    if (companyAnchor && companyAnchor.href) {
      const match = companyAnchor.href.match(/\/company\/([a-zA-Z0-9_-]+)/);
      if (match) companySlug = match[1].toLowerCase();
    }

    // Work arrangement & employment type from pills
    let location = '';
    let workLocation = null;
    let employmentType = null;

    const insightItems = document.querySelectorAll(
      '.job-details-jobs-unified-top-card__primary-description-container span, ' +
      '.jobs-unified-top-card__job-insight span, ' +
      '.job-details-jobs-unified-top-card__bullet, ' +
      '.ui-label'
    );

    insightItems.forEach(el => {
      const txt = cleanText(el.textContent);
      if (!txt) return;
      const lower = txt.toLowerCase();

      if (lower === 'remote') workLocation = 'Remote';
      else if (lower === 'hybrid') workLocation = 'Hybrid';
      else if (lower === 'on-site' || lower === 'onsite') workLocation = 'Onsite';
      else if (lower === 'full-time' || lower === 'full time') employmentType = 'Full-time';
      else if (lower === 'part-time' || lower === 'part time') employmentType = 'Part-time';
      else if (lower === 'contract') employmentType = 'Contract';
      else if (lower === 'internship') employmentType = 'Internship';
      else if (txt.includes(',') && !location && !lower.includes('applicant') && !lower.includes('ago')) {
        const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
        location = (registry && registry.formatLocation) ? registry.formatLocation(txt) : txt;
      }
    });

    // Detect hiring contact / recruiter (US3)
    let contact = null;
    const hirerCard = document.querySelector(
      '.job-details-jobs-unified-top-card__job-poster, ' +
      '.hirer-card__hirer-information, ' +
      '[data-view-name="job-details-hiring-team"], ' +
      '.hiring-team__member, ' +
      '.jobs-poster__name, ' +
      '.jobs-box__html--with-bottom-action, ' +
      '.jobs-details-job-summary__hiring-team'
    );
    if (hirerCard) {
      const nameEl = hirerCard.querySelector('.jobs-poster__name, strong, a[href*="/in/"], .hiring-team__member-name, [class*="member-name"]');
      const titleEl = hirerCard.querySelector('.jobs-poster__job-title, .hirer-card__job-title, .hiring-team__member-title, span.t-14, [class*="job-title"]');
      const profileAnchor = hirerCard.querySelector('a[href*="/in/"]');
      const avatarImg = hirerCard.querySelector('img[src*="profile"], img.presence-entity__image, img[alt*="profile"]');

      let name = cleanText(nameEl ? nameEl.textContent : '');
      name = name.replace(/^(?:Message|Connect|Follow)\s*/i, '').replace(/\s*(?:•\s*)?(?:1st|2nd|3rd)\s*$/i, '').trim();

      if (name && name.length >= 2 && !name.toLowerCase().includes('message')) {
        const role = cleanText(titleEl ? titleEl.textContent : 'Recruiter');
        let linkedIn = profileAnchor ? profileAnchor.href : '';
        if (linkedIn) {
          linkedIn = linkedIn.split('?')[0].replace(/\/+$/, '');
        }
        const avatarUrl = avatarImg ? avatarImg.src : '';
        const isHiringManager = /(?:manager|director|lead|head|vp|vice\s+president|founder|cto|partner)/i.test(role);
        contact = {
          name,
          role,
          linkedIn,
          avatarUrl,
          category: isHiringManager ? 'Hiring Manager' : 'Recruiter',
        };
      }
    }

    const rawTitle = cleanText(titleEl ? titleEl.textContent : '');
    return {
      title: GENERIC_BOARD_HEADINGS.test(rawTitle) ? '' : rawTitle,
      company: cleanText(companyEl ? companyEl.textContent : ''),
      companySlug,
      location,
      workLocation,
      employmentType,
      contact,
      descriptionHtml,
    };
  }

  // Bayt
  if (host.includes('bayt.')) {
    const titleEl = document.querySelector('h1.is-m, h1, .jb-title, [data-js-view="job-title"], .t-large');
    const companyAnchor = document.querySelector('.company-name a, [data-js-view="company-name"] a, a[href*="/company/"]');
    const companyEl = companyAnchor || document.querySelector('.company-name, [data-js-view="company-name"]');
    const locationEl = document.querySelector('.jb-loc, [data-js-view="job-location"], .u-bullet');
    const descEl = document.querySelector('#job_description, .job-description, [data-js-view="job-description"], .t-small');
    const descriptionHtml = descEl ? (descEl.innerHTML || descEl.textContent) : '';

    let companySlug = '';
    if (companyAnchor && companyAnchor.href) {
      const match = companyAnchor.href.match(/\/company\/([a-zA-Z0-9_-]+)/);
      if (match) companySlug = match[1].toLowerCase();
    }

    let workLocation = null;
    let employmentType = null;
    const textAll = cleanText(document.body.innerText).toLowerCase();
    if (textAll.includes('remote') || textAll.includes('work from home')) workLocation = 'Remote';
    else if (textAll.includes('hybrid')) workLocation = 'Hybrid';

    if (textAll.includes('full-time') || textAll.includes('full time')) employmentType = 'Full-time';
    else if (textAll.includes('part-time')) employmentType = 'Part-time';
    else if (textAll.includes('contract')) employmentType = 'Contract';
    else if (textAll.includes('internship')) employmentType = 'Internship';

    const rawLoc = cleanText(locationEl ? locationEl.textContent : '');
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    const location = (registry && registry.formatLocation) ? registry.formatLocation(rawLoc) : rawLoc;

    return {
      title: cleanText(titleEl ? titleEl.textContent : ''),
      company: cleanText(companyEl ? companyEl.textContent : ''),
      companySlug,
      location,
      workLocation,
      employmentType,
      descriptionHtml,
    };
  }

  // Indeed
  if (host.includes('indeed.')) {
    const titleEl = document.querySelector('h1.jobsearch-JobInfoHeader-title, .jobsearch-JobInfoHeader-title');
    const companyEl = document.querySelector('[data-company-name="true"], .jobsearch-CompanyReview--heading');
    const locationEl = document.querySelector('[data-testid="inlineHeader-companyLocation"], .jobsearch-JobInfoHeader-companyLocation');
    const descEl = document.querySelector('#jobDescriptionText, .jobsearch-jobDescriptionText');
    const descriptionHtml = descEl ? (descEl.innerHTML || descEl.textContent) : '';
    
    let workLocation = null;
    let employmentType = null;
    const textAll = cleanText(document.body.innerText).toLowerCase();
    if (textAll.includes('remote') || textAll.includes('work from home')) workLocation = 'Remote';
    else if (textAll.includes('hybrid')) workLocation = 'Hybrid';
    
    if (textAll.includes('full-time') || textAll.includes('full time')) employmentType = 'Full-time';
    else if (textAll.includes('part-time')) employmentType = 'Part-time';
    else if (textAll.includes('contract')) employmentType = 'Contract';

    const rawLoc = cleanText(locationEl ? locationEl.textContent : '');
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    const location = (registry && registry.formatLocation) ? registry.formatLocation(rawLoc) : rawLoc;

    return {
      title: cleanText(titleEl ? titleEl.textContent : ''),
      company: cleanText(companyEl ? companyEl.textContent : ''),
      location,
      workLocation,
      employmentType,
      descriptionHtml,
    };
  }

  // Greenhouse
  if (host.includes('greenhouse.io')) {
    const titleEl = document.querySelector('#header h1.app-title, .job-title, h1');
    const companyEl = document.querySelector('.company-name, #header .company-name');
    const locationEl = document.querySelector('.location, .job-location, [class*="location"]');
    const descEl = document.querySelector('#content, .body, #app_body');
    const descriptionHtml = descEl ? (descEl.innerHTML || descEl.textContent) : '';
    
    // Extract ATS company slug: boards.greenhouse.io/{slug} or /embed/job_board/{slug}
    let atsSlug = '';
    const match = window.location.pathname.match(/^\/(?:embed\/job_board\/|boards\/|job-boards\/)?([a-z0-9-]+)/i);
    if (match && !['jobs', 'search', 'embed'].includes(match[1])) {
      atsSlug = match[1].toLowerCase();
    }

    const rawLoc = cleanText(locationEl ? locationEl.textContent : '');
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    const location = (registry && registry.formatLocation) ? registry.formatLocation(rawLoc) : rawLoc;

    // Detect hiring contact / recruiter if present
    let contact = null;
    const ghContact = document.querySelector('.recruiter-info, .hiring-team, [class*="contact-person"], [data-qa="recruiter-info"]');
    if (ghContact) {
      const nameEl = ghContact.querySelector('strong, h3, h4, [class*="name"]');
      const titleEl = ghContact.querySelector('p, span, [class*="title"], [class*="role"]');
      const mailto = ghContact.querySelector('a[href^="mailto:"]');
      const cName = cleanText(nameEl ? nameEl.textContent : '');
      if (cName && cName.length >= 2) {
        contact = {
          name: cName,
          role: cleanText(titleEl ? titleEl.textContent : 'Recruiter'),
          email: mailto ? mailto.href.replace(/^mailto:/i, '').split('?')[0].trim() : '',
          category: 'Recruiter'
        };
      }
    }

    return {
      title: cleanText(titleEl ? titleEl.textContent : ''),
      company: cleanText(companyEl ? companyEl.textContent : ''),
      location,
      atsSlug,
      contact,
      descriptionHtml,
    };
  }

  // Lever
  if (host.includes('lever.co')) {
    const titleEl = document.querySelector('.posting-header h2, h2');
    const companyEl = document.querySelector('.main-header-text, .posting-header .company-name');
    const locationEl = document.querySelector('.posting-categories .location');
    const workplaceEl = document.querySelector('.posting-categories .workplace-type');
    const commitmentEl = document.querySelector('.posting-categories .commitment');
    const descEl = document.querySelector('.posting-description, [data-qa="job-description"]');
    const descriptionHtml = descEl ? (descEl.innerHTML || descEl.textContent) : '';

    let atsSlug = '';
    const match = window.location.pathname.match(/^\/([a-z0-9-]+)/i);
    if (match && !['jobs', 'apply'].includes(match[1])) {
      atsSlug = match[1].toLowerCase();
    }

    let workLocation = null;
    if (workplaceEl) {
      const wt = cleanText(workplaceEl.textContent).toLowerCase();
      if (wt.includes('remote')) workLocation = 'Remote';
      else if (wt.includes('hybrid')) workLocation = 'Hybrid';
      else if (wt.includes('on-site') || wt.includes('onsite')) workLocation = 'Onsite';
    }

    let employmentType = null;
    if (commitmentEl) {
      const ct = cleanText(commitmentEl.textContent).toLowerCase();
      if (ct.includes('full-time') || ct.includes('full time')) employmentType = 'Full-time';
      else if (ct.includes('part-time')) employmentType = 'Part-time';
      else if (ct.includes('contract')) employmentType = 'Contract';
      else if (ct.includes('intern')) employmentType = 'Internship';
    }

    const rawLoc = cleanText(locationEl ? locationEl.textContent : '');
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    const location = (registry && registry.formatLocation) ? registry.formatLocation(rawLoc) : rawLoc;

    let contact = null;
    const leverContact = document.querySelector('.posting-headline .recruiter, .posting-contact, [class*="contact-person"]');
    if (leverContact) {
      const nameEl = leverContact.querySelector('strong, h3, h4, [class*="name"]');
      const titleEl = leverContact.querySelector('p, span, [class*="title"], [class*="role"]');
      const mailto = leverContact.querySelector('a[href^="mailto:"]');
      const cName = cleanText(nameEl ? nameEl.textContent : '');
      if (cName && cName.length >= 2) {
        contact = {
          name: cName,
          role: cleanText(titleEl ? titleEl.textContent : 'Recruiter'),
          email: mailto ? mailto.href.replace(/^mailto:/i, '').split('?')[0].trim() : '',
          category: 'Recruiter'
        };
      }
    }

    return {
      title: cleanText(titleEl ? titleEl.textContent : ''),
      company: cleanText(companyEl ? companyEl.textContent : ''),
      location,
      workLocation,
      employmentType,
      atsSlug,
      contact,
      descriptionHtml,
    };
  }

  // Wellfound (skip /u/ profile pages)
  if ((host.includes('wellfound.com') || host.includes('angel.co')) && !path.startsWith('/u/')) {
    const titleEl = document.querySelector('[class*="jobTitle"], [data-testid*="job-title" i], h1');
    const companyEl = document.querySelector('[class*="companyName"], [data-testid*="company" i], h2');
    const rawTitle = cleanText(titleEl ? titleEl.textContent : '');
    return {
      title: GENERIC_BOARD_HEADINGS.test(rawTitle) ? '' : rawTitle,
      company: cleanCompanyName(cleanText(companyEl ? companyEl.textContent : '')),
    };
  }

  // Workable (apply.workable.com/{company}/j/{shortcode})
  if (host.includes('workable.com')) {
    const titleEl = document.querySelector('[data-ui="job-title"], [data-ui="overview-title"], main h1, h1');
    const companyEl = document.querySelector(
      '[data-ui="company-name"], [data-ui="company-logo"] img, [class*="company-name" i], header a[aria-label], header img[alt], [class*="header" i] img[alt], [class*="company" i] img[alt], a[href*="http"]:not([href*="workable.com"]) img[alt]'
    );
    let company = '';
    if (companyEl) {
      company = cleanText(companyEl.getAttribute('alt') || companyEl.getAttribute('aria-label') || companyEl.textContent || '');
    }
    if (!company && document.title) {
      const titleParts = document.title.split(/\s+(?:[-–—|•·])\s+/).map(cleanText).filter(Boolean);
      if (titleParts.length >= 2) {
        const candidate = cleanCompanyName(titleParts[titleParts.length - 1]);
        if (candidate && !/^workable$/i.test(candidate)) {
          company = candidate;
        }
      }
    }
    if (!company) {
      company = extractProseCompany(document, '');
    }
    let atsSlug = '';
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0 && !['j', 'jobs', 'api', 'careers', 'view'].includes(pathParts[0].toLowerCase())) {
      atsSlug = pathParts[0].toLowerCase();
      if (!company) {
        company = pathParts[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    const locEls = Array.from(
      document.querySelectorAll('[data-ui="job-location"], [data-ui="locations"], [class*="job-location" i], [class*="locations" i]')
    );
    const locParts = [];
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    for (const el of locEls) {
      const lines = extractCleanLines(el);
      const candidates = lines.length > 0 ? lines : [getCleanElementText(el)];
      for (const rawLine of candidates) {
        const txt = cleanText(rawLine);
        if (txt && txt.length >= 2 && txt.length <= 120) {
          const fmt = (registry && registry.formatLocation) ? registry.formatLocation(txt) : txt;
          if (fmt && !locParts.includes(fmt)) locParts.push(fmt);
        }
      }
    }
    const location = locParts.join('; ');

    const remoteEl = document.querySelector('[data-ui="job-remote"], [data-ui="workplace"], [class*="workplace" i], [class*="remote" i]');
    const headerContextText = cleanText(
      (remoteEl ? remoteEl.textContent : '') + ' ' +
      (titleEl && titleEl.parentElement ? titleEl.parentElement.textContent : '')
    ).toLowerCase();
    let workLocation = null;
    if (headerContextText.includes('remote') || headerContextText.includes('telecommute')) workLocation = 'Remote';
    else if (headerContextText.includes('hybrid')) workLocation = 'Hybrid';
    else if (headerContextText.includes('on-site') || headerContextText.includes('onsite')) workLocation = 'Onsite';

    const typeEl = document.querySelector('[data-ui="job-type"], [data-ui="employment-type"]');
    const typeTxt = cleanText(
      (typeEl ? typeEl.textContent : '') + ' ' +
      (titleEl && titleEl.parentElement ? titleEl.parentElement.textContent : '')
    );
    let employmentType = null;
    if (/full[\s\-_]*time/i.test(typeTxt)) employmentType = 'Full-time';
    else if (/part[\s\-_]*time/i.test(typeTxt)) employmentType = 'Part-time';
    else if (/contract|temporary|freelance/i.test(typeTxt)) employmentType = 'Contract';
    else if (/intern/i.test(typeTxt)) employmentType = 'Internship';

    const descriptionHtml = extractBestDescriptionHtml(document);
    const cleanedComp = cleanCompanyName(company);

    return {
      title: cleanRoleTitle(getCleanElementText(titleEl), cleanedComp),
      company: cleanedComp,
      atsSlug,
      location,
      workLocation,
      employmentType,
      descriptionHtml,
    };
  }

  // Arc.dev
  if (host.includes('arc.dev')) {
    const ARC_GENERIC_HEADINGS = /^(?:jobs|remote\s+jobs|remote\s+developer\s+jobs|find\s+remote\s+jobs|startup\s+jobs|browse\s+jobs|search\s+jobs|all\s+jobs|open\s+roles|careers|arc\s+jobs|wellfound\s+jobs|verified\s+jobs|dashboard|recommended\s+jobs|arc\s+exclusive)$/i;
    const titleCandidates = Array.from(document.querySelectorAll('.job-title, [data-testid="job-title"], .job-header h1, [class*="JobHeader"] h1, h1, h2, h3'));
    const titleEl = titleCandidates.find(el => {
      const t = getCleanElementText(el);
      return t && t.length >= 3 && !ARC_GENERIC_HEADINGS.test(t) && !PROSE_SECTION_HEADING_RE.test(t);
    }) || null;
    const companyAnchor = document.querySelector('[data-testid="company-name"] a, .company-name a, a[href*="/@"], .company-info a');
    const companyEl = companyAnchor || document.querySelector('[data-testid="company-name"], .company-name');
    const locEl = document.querySelector('[data-testid="job-location"], .job-location, .remote-badge');
    const salaryEl = document.querySelector('[data-testid="salary"], [class*="salary" i], [class*="compensation" i]');

    let companySlug = '';
    if (companyAnchor && companyAnchor.href) {
      const match = companyAnchor.href.match(/@([a-zA-Z0-9_-]+)/);
      if (match) companySlug = match[1].toLowerCase();
    }

    const siblingMeta = extractSiblingMetadata(document);
    let company = cleanCompanyName(getCleanElementText(companyEl));
    company = extractProseCompany(document, company) || company;

    const rawLoc = getCleanElementText(locEl) || siblingMeta.location || '';
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    const location = (registry && registry.formatLocation && !/remote/i.test(rawLoc)) ? registry.formatLocation(rawLoc) : rawLoc;
    const salary = getCleanElementText(salaryEl) || siblingMeta.salary || '';
    const workLocation = siblingMeta.workLocation || 'Remote';
    const employmentType = siblingMeta.employmentType || 'Full-time';
    const descriptionHtml = extractBestDescriptionHtml(document);

    return {
      title: cleanRoleTitle(getCleanElementText(titleEl), company),
      company,
      companySlug,
      location,
      workLocation,
      employmentType,
      salary,
      descriptionHtml,
    };
  }

  return null;
}

// Section headings inside job descriptions that must NEVER be mistaken for the job role title
var PROSE_SECTION_HEADING_RE = /^(?:join\s+(?:our|the)\s+team\b.*|about\s+(?:the\s+role|us|the\s+company|the\s+team|the\s+position|the\s+job|this\s+role)\b.*|role\s+overview|job\s+overview|position\s+overview|company\s+overview|overview|the\s+role|the\s+opportunity|job\s+description|description|what\s+you(?:'ll|\s+will)\s+do|what\s+you\s+bring|who\s+you\s+are|who\s+we\s+are|what\s+we\s+offer|why\s+join\b.*|requirements|key\s+requirements|minimum\s+qualifications|qualifications|responsibilities|key\s+responsibilities|your\s+tasks|your\s+profile|benefits|perks|compensation|required\s+skills|min\.?\s+experience|actively\s+recruiting\b.*|deine\s+aufgaben|dein\s+profil|was\s+wir\s+bieten|was\s+dich\s+erwartet|was\s+du\s+mitbringst|über\s+uns)$/i;

// Extract salary from unstructured text only when it has clear salary markers (thousands, k, range, or time unit)
// and is NOT a startup funding/investment figure (e.g. "$200M", "Invest now from €100")
function extractFreeTextSalary(text) {
  if (!text) return '';
  const fundingOrPromoNoise = /(?:raised(?:\s+over)?|funding|valuation|series\s+[a-f]|invest(?:\s+now)?(?:\s+from)?)\s+(?:US|CA|AU|NZ|SG|HK)?[$€£]\s*[0-9]/i;
  const regex = /(?:(?:US|CA|AU|NZ|SG|HK)?[$€£]\s*[0-9]{1,3}(?:(?:[.,][0-9]{3})+|\s*k\b)(?:\s*[-–—]\s*(?:(?:US|CA|AU|NZ|SG|HK)?[$€£])?\s*[0-9]{1,3}(?:[.,][0-9]{3})*(?:\s*k\b)?)?(?:\s*(?:\/\s*(?:yr|year|mo|month|hr|hour)|per\s+(?:year|month|hour|annum)|p\.?a\.?))?|(?:(?:US|CA|AU|NZ|SG|HK)?[$€£]\s*[0-9]{2,3}\s*[-–—]\s*(?:(?:US|CA|AU|NZ|SG|HK)?[$€£])?\s*[0-9]{2,3}\s*(?:k\b|\/\s*(?:yr|year|mo|month|hr|hour)|per\s+(?:year|month|hour))))(?![0-9.,]*\s*(?:m|b|t|million|billion|trillion)\b)/gi;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const candidate = cleanText(match[0]);
    const prefix = text.slice(Math.max(0, match.index - 35), match.index + candidate.length);
    if (fundingOrPromoNoise.test(prefix)) continue;
    return candidate;
  }
  return '';
}

// Validate that a prose-captured company name starts with an uppercase letter and is not a lowercase phrase
function isValidProseCompanyCandidate(rawCandidate, stopWords, genericPlaceholders) {
  if (!rawCandidate) return false;
  const candidate = dedupeDoubledString(cleanCompanyName(rawCandidate)).replace(/[.,!;:|]+$/, '').trim();
  if (!candidate || candidate.length < 2 || candidate.length > 35) return false;
  if (!/^[A-Z0-9]/.test(candidate)) return false;
  if (stopWords.test(candidate) || genericPlaceholders.test(candidate)) return false;
  if (PROSE_SECTION_HEADING_RE.test(candidate)) return false;

  const words = candidate.split(/\s+/);
  if (words.length > 4) return false;
  const CONNECTORS = /^(?:&|and|of|for|the|in|at|de|van|von|du|la|le)$/i;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (stopWords.test(w) && words.length === 1) return false;
    if (i === 0 && !/^[A-Z0-9]/.test(w)) return false;
    if (i > 0 && !/^[A-Z0-9]/.test(w) && !CONNECTORS.test(w) && !/\.[a-z]{2,}$/i.test(w)) {
      return false;
    }
  }
  return true;
}

// Extract true hiring company name from prose headings/intro when page is hosted on a generic board/agency (e.g. "Join Our Team at UNIPREP")
function extractProseCompany(rootEl, currentCompany) {
  const GENERIC_PLACEHOLDERS = /^(?:arc|arc\.dev|arc\s+exclusive|arc\s+verified|wellfound|angel\.?co|linkedin|indeed|glassdoor|otta|workable|lever|greenhouse|ashby|company|unknown|careers|karriere|jobs|remote)$/i;
  const trimmedCurrent = cleanText(currentCompany);
  if (trimmedCurrent && !GENERIC_PLACEHOLDERS.test(trimmedCurrent)) {
    return trimmedCurrent;
  }

  const scope = rootEl || document;
  const candidateNodes = Array.from(scope.querySelectorAll('h1, h2, h3, h4, strong, b, p, div'));
  const STOP_WORDS = /^(?:the|our|this|a|an|us|you|your|arc|remote|company|team|role|position|opportunity|startup|client|global|world|home|scale|night|work|office|any|all|here|now|today)$/i;

  const patterns = [
    // 1. "Join Our Team at UNIPREP", "Working at Acme", "Life at Acme", "Welcome to Acme"
    /(?:[Jj]oin\s+(?:[Oo]ur|[Tt]he)\s+[Tt]eam\s+[Aa]t|[Ww]orking\s+[Aa]t|[Ll]ife\s+[Aa]t|[Ww]elcome\s+[Tt]o|[Aa]bout\s+[Uu]s\s*[-–—:]\s*|[Aa]bout\s+[Tt]he\s+[Cc]ompany\s*[-–—:]\s*)\s*([A-Z0-9][A-Za-z0-9&.\- ]{1,35}?)(?=[.!,\n|—–:]|$|\s+(?:is|are|we|where|and|to\b|in\b|as\b|you\b))/,
    // 2. "About UNIPREP" in headings
    /^[Aa]bout\s+([A-Z0-9][A-Za-z0-9&.\- ]{1,30})$/,
    // 3. "At UNIPREP, we are dedicated..."
    /(?:^|[.!?]\s+)[Aa]t\s+([A-Z0-9][A-Za-z0-9&.\- ]{1,30}?),\s+we\s+(?:are|build|believe|help|empower|strive|create|work|develop|offer|combine|provide)\b/,
    // 4. "UNIPREP is committed to...", "UNIPREP is an innovative..."
    /\b([A-Z0-9][A-Za-z0-9&.\-]{1,25})\s+is\s+(?:committed\s+to|dedicated\s+to|a\s+leading|an?\s+innovative|a\s+fast-growing|on\s+a\s+mission\s+to|seeking\s+a|looking\s+for\s+a|hiring\s+a)\b/,
    // 5. "As a Junior Full-Stack Developer at UNIPREP, you will..."
    /\b[Aa]s\s+an?\s+[A-Za-z0-9 /#+.\-]{3,45}?\s+at\s+([A-Z0-9][A-Za-z0-9&.\- ]{1,30}?)(?:,\s+you\s+will|\s+you\s+will)\b/,
  ];

  for (const node of candidateNodes) {
    if (node.children && node.children.length > 6) continue;
    if (node.tagName === 'DIV' && node.querySelector && node.querySelector('h1, h2, h3, h4, p, div, ul, section')) continue;
    const txt = cleanText(node.textContent || '');
    if (!txt || txt.length < 6 || txt.length > 450) continue;

    for (const rx of patterns) {
      const m = txt.match(rx);
      if (m && m[1]) {
        const cleaned = dedupeDoubledString(cleanCompanyName(m[1])).replace(/[.,!;:|]+$/, '').trim();
        if (isValidProseCompanyCandidate(cleaned, STOP_WORDS, GENERIC_PLACEHOLDERS)) {
          return cleaned;
        }
      }
    }
  }

  return '';
}

// Extract structured metadata from label-value sibling pairs (e.g., <div>Location</div><div>Remote anywhere</div>)
function extractSiblingMetadata(rootEl) {
  const result = {
    location: '',
    workLocation: null,
    employmentType: null,
    salary: '',
  };
  if (!rootEl) return result;

  const LOCATION_LABEL = /^(?:location|locations|office|based\s+in|work\s+location|region|country|standort|arbeitsort)\s*:?$/i;
  const SALARY_LABEL = /^(?:salary|compensation|pay|annual\s+salary|salary\s+range|rate|remuneration|gehalt|vergütung)\s*:?$/i;
  const TYPE_LABEL = /^(?:job\s+type|employment\s+type|contract\s+type|commitment|schedule|type|anstellungsart|vertragsart)\s*:?$/i;
  const WORKPLACE_LABEL = /^(?:workplace|workplace\s+type|remote\s+policy|work\s+arrangement|work\s+model|environment)\s*:?$/i;

  const elements = Array.from(rootEl.querySelectorAll('div, span, dt, th, p, strong, b, label, li'));
  for (const el of elements) {
    if (el.children && el.children.length > 2) continue;
    const labelTxt = getCleanElementText(el);
    if (!labelTxt || labelTxt.length > 35) continue;

    const isLoc = LOCATION_LABEL.test(labelTxt);
    const isSal = SALARY_LABEL.test(labelTxt);
    const isType = TYPE_LABEL.test(labelTxt);
    const isWp = WORKPLACE_LABEL.test(labelTxt);
    if (!isLoc && !isSal && !isType && !isWp) continue;

    let valEl = el.nextElementSibling;
    if (!valEl && el.parentElement && el.parentElement.children.length === 1) {
      valEl = el.parentElement.nextElementSibling;
    }
    if (!valEl) continue;

    const valTxt = getCleanElementText(valEl);
    if (!valTxt || valTxt.length > 120 || valTxt.toLowerCase() === labelTxt.toLowerCase()) continue;

    if (isLoc && !result.location) {
      result.location = valTxt;
      if (/\b(?:remote|anywhere|worldwide|eu-wide|work from home)\b/i.test(valTxt)) {
        result.workLocation = 'Remote';
      } else if (/\bhybrid\b/i.test(valTxt)) {
        result.workLocation = 'Hybrid';
      }
    } else if (isSal && !result.salary) {
      result.salary = valTxt;
    } else if (isType && !result.employmentType) {
      if (/full[\s\-_]*time|vollzeit/i.test(valTxt)) result.employmentType = 'Full-time';
      else if (/part[\s\-_]*time|teilzeit/i.test(valTxt)) result.employmentType = 'Part-time';
      else if (/contract|freelance|temporary/i.test(valTxt)) result.employmentType = 'Contract';
      else if (/intern|praktikum/i.test(valTxt)) result.employmentType = 'Internship';
    } else if (isWp && !result.workLocation) {
      if (/remote|anywhere|telecommute/i.test(valTxt)) result.workLocation = 'Remote';
      else if (/hybrid/i.test(valTxt)) result.workLocation = 'Hybrid';
      else if (/on[\s\-_]*site|office/i.test(valTxt)) result.workLocation = 'Onsite';
    }
  }

  return result;
}

// Readability-style description HTML extractor with Workable multi-section & semantic density scoring
function extractBestDescriptionHtml(rootEl) {
  const scope = rootEl || document;

  // 1. Workable multi-section containers ([data-ui="job-description"], [data-ui="job-requirements"], [data-ui="job-benefits"])
  const workableSections = Array.from(
    scope.querySelectorAll('[data-ui="job-description"], [data-ui="job-requirements"], [data-ui="job-benefits"]')
  );
  if (workableSections.length > 0) {
    const combined = workableSections
      .map(sec => sec.innerHTML || sec.textContent || '')
      .filter(Boolean)
      .join('\n');
    if (cleanText(combined).length >= 30) {
      return combined;
    }
  }

  // 2. Explicit high-confidence job description selectors (deduplicating nested matches and picking best/longest)
  const explicitSelectors = [
    '[data-automation-id="jobPostingDescription"]',
    '[data-testid="job-description"]',
    '[data-testid*="job-description" i]',
    '#job-description',
    '#job_description',
    '.job-description',
    '.jobsearch-jobDescriptionText',
    '.jobs-description__content',
    '.posting-description',
    '[data-qa="job-description"]',
    '[itemprop="description"]',
    '.prose',
    '[class*="job-prose" i]',
    '[class*="prose" i]',
    '.w-richtext',
    '[class*="job-description" i]',
    '[class*="jobDescription" i]',
  ];
  for (const sel of explicitSelectors) {
    try {
      const rawMatches = Array.from(scope.querySelectorAll(sel));
      if (rawMatches.length > 0) {
        // Filter out outer wrapper matches if an inner match exists, or filter out inner matches to prevent duplication
        const topMatches = rawMatches.filter(m => !rawMatches.some(other => other !== m && m.contains(other)));
        const candidates = topMatches.length > 0 ? topMatches : rawMatches;
        let longestHtml = '';
        let longestLen = 0;
        for (const m of candidates) {
          const h = m.innerHTML || m.textContent || '';
          const len = cleanText(h.replace(/<[^>]*>/g, '')).length;
          if (len > longestLen) {
            longestLen = len;
            longestHtml = h;
          }
        }
        if (longestLen >= 60) {
          return longestHtml;
        }
      }
    } catch {}
  }

  // 3. Readability-style paragraph, list, and job-keyword density scoring
  const JOB_SECTION_KEYWORDS = [
    /\b(?:responsibilities|what you(?:'ll|\s+will)\s+do|your\s+role|your\s+tasks|aufgaben|deine\s+aufgaben|was\s+dich\s+erwartet)\b/i,
    /\b(?:requirements|qualifications|what\s+you\s+bring|who\s+you\s+are|skills|experience|anforderungen|dein\s+profil|was\s+du\s+mitbringst)\b/i,
    /\b(?:benefits|perks|what\s+we\s+offer|why\s+join|compensation|wir\s+bieten|was\s+wir\s+bieten|vorteile)\b/i,
    /\b(?:about\s+the\s+role|about\s+us|the\s+opportunity|job\s+summary|role\s+overview|overview|über\s+uns)\b/i,
  ];

  const candidateEls = Array.from(
    scope.querySelectorAll('article, [role="main"], main, .job-details, #content, [class*="description" i], [class*="content" i], [class*="details" i], section, div')
  );
  if (scope !== document && scope !== document.body && scope.nodeType === 1 && !candidateEls.includes(scope)) {
    candidateEls.unshift(scope);
  }

  let bestEl = null;
  let bestScore = 0;
  const scoredCandidates = [];

  for (const el of candidateEls) {
    if (!el || el.tagName === 'BODY' || el.tagName === 'HTML') continue;
    if (el.closest('nav, header, footer, form, script, style, noscript, svg')) continue;

    const text = cleanText(el.textContent || '');
    if (text.length < 80) continue;

    const pCount = el.querySelectorAll('p').length;
    const liCount = el.querySelectorAll('li').length;
    const headingCount = el.querySelectorAll('h2, h3, h4').length;
    if (pCount === 0 && liCount === 0 && text.length < 200) continue;

    let keywordMatches = 0;
    for (const rx of JOB_SECTION_KEYWORDS) {
      if (rx.test(text)) keywordMatches++;
    }

    // Check link density to avoid navbars/job-list indexes
    const linkTextLen = Array.from(el.querySelectorAll('a'))
      .reduce((acc, a) => acc + cleanText(a.textContent || '').length, 0);
    const linkDensity = text.length > 0 ? linkTextLen / text.length : 0;
    if (linkDensity > 0.45) continue;

    // Bonus for containers that directly hold <p>, <ul>/<ol>, or <h2>-<h4> children rather than outer layout wrappers
    const directProseChildren = Array.from(el.children || []).filter(c =>
      /^(?:P|UL|OL|H2|H3|H4)$/.test(c.tagName)
    ).length;
    const directProseBonus = Math.min(directProseChildren, 6) * 25;

    const tag = el.tagName.toLowerCase();
    const semanticBonus = (tag === 'article' || tag === 'section') ? 45 : ((tag === 'main' || el.getAttribute('role') === 'main') ? 25 : 0);
    const score =
      Math.min(text.length, 6000) * 0.08 +
      pCount * 28 +
      liCount * 20 +
      headingCount * 22 +
      keywordMatches * 90 +
      directProseBonus +
      semanticBonus;

    scoredCandidates.push({ el, score, pCount, liCount, textLen: text.length });
    if (score > bestScore) {
      bestScore = score;
      bestEl = el;
    }
  }

  // Drill down from outer layout/modal wrappers (<main>, outer modal div) to the tightest child container
  // that retains >= 75% of the prose elements (<p> + <li>) and >= 65% of text length without hero/metadata noise.
  if (bestEl) {
    let current = scoredCandidates.find(c => c.el === bestEl);
    let drilled = true;
    while (drilled && current) {
      drilled = false;
      const totalProseUnits = current.pCount + current.liCount;
      const childCandidates = scoredCandidates.filter(
        c => c.el !== current.el && current.el.contains(c.el)
      );
      for (const child of childCandidates) {
        const childUnits = child.pCount + child.liCount;
        const unitRatio = totalProseUnits > 0 ? childUnits / totalProseUnits : 1;
        const lenRatio = current.textLen > 0 ? child.textLen / current.textLen : 1;
        if (unitRatio >= 0.75 && lenRatio >= 0.60 && child.score >= current.score * 0.75) {
          current = child;
          bestEl = child.el;
          drilled = true;
          break;
        }
      }
    }
  }

  if (bestEl) {
    try {
      const clone = bestEl.cloneNode(true);
      clone.querySelectorAll('nav, header, footer, form, script, style, noscript, svg, iframe, button, [class*="apply-btn" i], .hero, [class*="meta-grid" i]').forEach(n => n.remove());
      return clone.innerHTML || clone.textContent || '';
    } catch {
      return bestEl.innerHTML || bestEl.textContent || '';
    }
  }

  return '';
}

// Universal heuristic fallback parser
function parseUniversalFallback() {
  let title = '';
  let company = '';
  let location = '';
  let workLocation = null;
  let employmentType = null;
  let salary = '';

  const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
  const currentHost = window.location.hostname.toLowerCase();
  const isBoardOrAts = registry && registry.isJobBoardOrAts ? registry.isJobBoardOrAts(currentHost) : false;
  const GENERIC_SITE_NAMES = /^(?:linkedin|indeed|glassdoor|wellfound|angel\.?co|otta|arc|arc\.dev|arc\s+exclusive|peerlist|monster|dice|ziprecruiter|bayt|workday|greenhouse|lever|ashby|workable|smartrecruiters|bamboohr|jobvite|recruitee|rippling|breezy|remotive|himalayas|weworkremotely|remoteok|y combinator|work at a startup|x|twitter|github)$/i;
  const GENERIC_HEADINGS = /^(?:careers|career|jobs|openings|open\s+positions?|open\s+roles?|job\s+openings?|current\s+openings|position|vacancy|vacancies|join\s+us|join\s+our\s+team|work\s+with\s+us|explore\s+opportunities|remote\s+jobs|remote\s+developer\s+jobs|find\s+remote\s+jobs|verified\s+jobs|karriere|stellenangebote|stellenanzeige|offene\s+stellen|jobs\s+&\s+karriere|job\s+details|role\s+overview)$/i;

  // 1. Prioritize visible non-generic H1 heading for role title (prevents og:title suffix/slogan pollution)
  let primaryH1El = null;
  const headings = Array.from(document.querySelectorAll('main h1, article h1, [role="main"] h1, [class*="job-title" i], [data-testid*="job-title" i], h1'));
  for (const h of headings) {
    if (h.closest('nav, footer')) continue;
    const txt = getCleanElementText(h);
    if (txt && txt.length >= 2 && txt.length <= 120 && !GENERIC_HEADINGS.test(txt) && !PROSE_SECTION_HEADING_RE.test(txt)) {
      title = txt;
      primaryH1El = h;
      break;
    }
  }

  // 2. Check OpenGraph tags for company name (and fallback title if H1 was missing/generic)
  const ogTitle = document.querySelector('meta[property="og:title"], meta[name="twitter:title"]');
  const ogSiteName = document.querySelector('meta[property="og:site_name"], meta[name="application-name"]');

  if (ogTitle && ogTitle.content) {
    const content = cleanText(ogTitle.content);
    const atMatch = content.match(/^(.+?)\s+(?:at|@|bei)\s+([^|\-–•]+)(?:\s*[|\-–•]\s*(.+))?$/i);
    if (atMatch) {
      if (!title) title = cleanText(atMatch[1]);
      const candComp = cleanCompanyName(atMatch[2]);
      if (candComp && !GENERIC_SITE_NAMES.test(candComp)) company = candComp;
    } else {
      const delimiters = [' – ', ' - ', ' | ', ' — ', ' • ', ' · '];
      let matchedDelim = false;
      for (const delim of delimiters) {
        if (content.includes(delim)) {
          const parts = content.split(delim).map(cleanText).filter(Boolean);
          if (!title && parts[0] && !GENERIC_HEADINGS.test(parts[0])) title = parts[0];
          if (parts[1]) {
            const candComp = cleanCompanyName(parts[1]);
            if (candComp && !GENERIC_SITE_NAMES.test(candComp)) company = candComp;
          }
          matchedDelim = true;
          break;
        }
      }
      if (!matchedDelim && !title && !GENERIC_HEADINGS.test(content)) {
        title = content;
      }
    }
  }

  if (!company && ogSiteName && ogSiteName.content) {
    const siteName = cleanCompanyName(ogSiteName.content);
    if (siteName && !GENERIC_SITE_NAMES.test(siteName)) {
      company = siteName;
    }
  }

  // 3. Check document.title if company or title still missing
  if (!company || !title) {
    const docTitle = document.title;
    if (docTitle) {
      const atMatch = docTitle.match(/^(.+?)\s+(?:at|@|bei)\s+([^|\-–•]+)(?:\s*[|\-–•]\s*(.+))?$/i);
      if (atMatch) {
        if (!title) title = cleanText(atMatch[1]);
        const candComp = cleanCompanyName(atMatch[2]);
        if (!company && candComp && !GENERIC_SITE_NAMES.test(candComp)) company = candComp;
      } else {
        const delimiters = [' – ', ' - ', ' | ', ' — ', ' • ', ' · '];
        for (const delim of delimiters) {
          if (docTitle.includes(delim)) {
            const parts = docTitle.split(delim).map(cleanText).filter(Boolean);
            if (!title && parts[0] && !GENERIC_HEADINGS.test(parts[0])) title = parts[0];
            if (!company && parts[1]) {
              const candComp = cleanCompanyName(parts[1]);
              if (candComp && !GENERIC_SITE_NAMES.test(candComp)) company = candComp;
            }
            break;
          }
        }
      }
      if (!title && !GENERIC_HEADINGS.test(cleanText(docTitle))) {
        title = cleanText(docTitle);
      }
    }
  }

  // 4. If on a company's own website and company is still missing, derive from header logo alt or domain
  if (!company && !isBoardOrAts) {
    const logoImg = document.querySelector('header img[alt], nav img[alt], [class*="header"] img[alt], [class*="logo"] img[alt]');
    if (logoImg) {
      const alt = cleanCompanyName(cleanText(logoImg.getAttribute('alt') || '').replace(/\s*(?:logo|home|icon|careers)\s*$/i, '').trim());
      if (alt && alt.length >= 2 && alt.length <= 40 && !GENERIC_SITE_NAMES.test(alt)) {
        company = alt;
      }
    }
    if (!company && window.location.hostname) {
      company = getDomainName(window.location.href);
    }
  }

  const mainEl = document.querySelector('main, article, [role="main"], .job-details, #content') || document.body;

  // 4B. Check prose employer extraction if company is still empty or a generic job board name
  if (!company || GENERIC_SITE_NAMES.test(company)) {
    const proseComp = extractProseCompany(mainEl, company);
    if (proseComp) company = proseComp;
  }

  // 5. Extract location, workLocation, employmentType, and salary from sibling metadata, H1 subtitles, and badges
  const siblingMeta = extractSiblingMetadata(mainEl);
  if (siblingMeta.location) location = siblingMeta.location;
  if (siblingMeta.workLocation) workLocation = siblingMeta.workLocation;
  if (siblingMeta.employmentType) employmentType = siblingMeta.employmentType;
  if (siblingMeta.salary) salary = siblingMeta.salary;

  if (!location) {
    const locEl = document.querySelector(
      '[data-testid*="location" i], [class*="job-location" i], [class*="jobLocation" i], ' +
      'main [class*="location" i]:not(nav *):not(footer *), article [class*="location" i]'
    );
    if (locEl) {
      const rawLoc = getCleanElementText(locEl).replace(/^(?:location|standort)\s*:\s*/i, '').trim();
      if (rawLoc && rawLoc.length >= 2 && rawLoc.length <= 80) {
        location = rawLoc;
      }
    }
  }

  // Check subtitle / metadata elements near H1 (e.g. "Remote EU-wide · Full-time" on cosy.green)
  if (primaryH1El) {
    const nearEls = [];
    if (primaryH1El.nextElementSibling) nearEls.push(primaryH1El.nextElementSibling);
    if (primaryH1El.parentElement) {
      Array.from(primaryH1El.parentElement.children).forEach(child => {
        if (child !== primaryH1El && !nearEls.includes(child)) nearEls.push(child);
      });
      if (primaryH1El.parentElement.nextElementSibling) {
        nearEls.push(primaryH1El.parentElement.nextElementSibling);
      }
    }
    for (const near of nearEls.slice(0, 5)) {
      const nearTxt = getCleanElementText(near);
      if (!nearTxt || nearTxt.length > 140) continue;
      if (/[·•|—–]/.test(nearTxt) || /\b(?:remote|hybrid|full-time|part-time|vollzeit|teilzeit|eu-wide|worldwide|anywhere)\b/i.test(nearTxt)) {
        const tokens = nearTxt.split(/\s*[·•|—–]\s*/).map(cleanText).filter(Boolean);
        for (const tok of tokens) {
          if (/^(?:full[\s\-_]*time|vollzeit)$/i.test(tok)) {
            if (!employmentType) employmentType = 'Full-time';
          } else if (/^(?:part[\s\-_]*time|teilzeit)$/i.test(tok)) {
            if (!employmentType) employmentType = 'Part-time';
          } else if (/^(?:contract|freelance|temporary)$/i.test(tok)) {
            if (!employmentType) employmentType = 'Contract';
          } else if (/^(?:internship|intern|praktikum)$/i.test(tok)) {
            if (!employmentType) employmentType = 'Internship';
          } else if (!location && tok.length >= 2 && tok.length <= 65 && !/^(?:apply|jetzt\s+bewerben|save|share)$/i.test(tok)) {
            location = tok;
          }
        }
      }
    }
  }

  const mainText = cleanText(mainEl ? (mainEl.innerText || mainEl.textContent || '') : '').slice(0, 4000);
  const lowerMain = mainText.toLowerCase();
  if (!workLocation) {
    if (/\b(?:remote|work from home|telecommute|distributed|remote\s+eu-wide|remote\s+anywhere)\b/i.test(lowerMain) || /\bremote\b/i.test(location)) {
      workLocation = 'Remote';
    } else if (/\bhybrid\b/i.test(lowerMain) || /\bhybrid\b/i.test(location)) {
      workLocation = 'Hybrid';
    } else if (/\b(?:on-site|onsite|in-office)\b/i.test(lowerMain)) {
      workLocation = 'Onsite';
    }
  }

  if (!employmentType) {
    if (/\b(?:full-time|full time|vollzeit)\b/i.test(lowerMain)) employmentType = 'Full-time';
    else if (/\b(?:part-time|part time|teilzeit)\b/i.test(lowerMain)) employmentType = 'Part-time';
    else if (/\b(?:contract|freelance)\b/i.test(lowerMain)) employmentType = 'Contract';
    else if (/\b(?:internship|intern|praktikum)\b/i.test(lowerMain)) employmentType = 'Internship';
  }

  if (!salary) {
    salary = extractFreeTextSalary(mainText);
  }

  const cleanedCompany = cleanCompanyName(company);
  return {
    title: cleanRoleTitle(cleanText(title), cleanedCompany),
    company: cleanedCompany,
    location,
    workLocation,
    employmentType,
    salary
  };
}

// Prioritized Company Domain Resolver (never assigns a job board or ATS domain)
function resolveCompanyDomain(companyName, jsonLdData, siteData) {
  const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;

  // 1. Check JSON-LD sameAs links and companyUrl
  if (jsonLdData) {
    const candidates = [jsonLdData.companyUrl, ...(jsonLdData.sameAs || [])].filter(Boolean);
    for (const c of candidates) {
      if (registry && registry.cleanCompanyDomain) {
        const cleaned = registry.cleanCompanyDomain(c);
        if (cleaned) return cleaned;
      }
    }
  }

  // 2. Check siteData companySlug or atsSlug in KNOWN_COMPANY_DOMAINS
  const knownDict = registry && registry.KNOWN_COMPANY_DOMAINS ? registry.KNOWN_COMPANY_DOMAINS : {};
  const slug = (siteData && (siteData.companySlug || siteData.atsSlug)) ? (siteData.companySlug || siteData.atsSlug).toLowerCase() : '';
  if (slug && knownDict[slug]) {
    return knownDict[slug];
  }

  // 3. Check if hosted directly on company's own careers website (not a job board / ATS)
  const currentHost = window.location.hostname.toLowerCase();
  const isBoardOrAts = registry && registry.isJobBoardOrAts ? registry.isJobBoardOrAts(currentHost) : true;
  if (!isBoardOrAts) {
    // Strip subdomains like careers., jobs., apply., recruiting.
    const stripped = currentHost
      .replace(/^www\./, '')
      .replace(/^(?:careers|jobs|apply|recruiting|hire|join)\./, '');
    if (registry && registry.cleanCompanyDomain) {
      const cleaned = registry.cleanCompanyDomain(stripped);
      if (cleaned) return cleaned;
    }
  }

  // 4. Lookup normalized company name in known company dictionary
  const normalizedCompany = (companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalizedCompany && knownDict[normalizedCompany]) {
    return knownDict[normalizedCompany];
  }

  // 4B. Inspect outbound company website links on ATS / job board pages (e.g. Workable/Greenhouse company header link)
  if (registry && registry.cleanCompanyDomain) {
    const NON_COMPANY_HOSTS = /(?:linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com|github\.com|medium\.com|google\.com|apple\.com|glassdoor\.com|indeed\.com|workable\.com|lever\.co|greenhouse\.io|ashbyhq\.com|arc\.dev|wellfound\.com|angel\.co|mailto:|tel:|javascript:)/i;
    const outboundAnchors = Array.from(
      document.querySelectorAll('[data-ui="company-url"], [data-testid*="company" i] a[href^="http"], header a[href^="http"], main a[href^="http"]')
    );
    for (const a of outboundAnchors) {
      const href = a.getAttribute('href') || '';
      if (!href || NON_COMPANY_HOSTS.test(href)) continue;
      const candDom = registry.cleanCompanyDomain(href);
      if (!candDom) continue;
      const domBase = candDom.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const isExplicitCompanyLink = a.matches('[data-ui="company-url"], [data-testid*="company" i] a, header a') || /\b(?:website|company\s+site|visit\s+website)\b/i.test(cleanText(a.textContent || ''));
      if (
        isExplicitCompanyLink ||
        (normalizedCompany && normalizedCompany.length >= 3 && (domBase === normalizedCompany || domBase.includes(normalizedCompany) || normalizedCompany.includes(domBase))) ||
        (slug && slug.length >= 3 && (domBase === slug.replace(/[^a-z0-9]/g, '') || domBase.includes(slug.replace(/[^a-z0-9]/g, ''))))
      ) {
        return candDom;
      }
    }
  }

  // 5. If we are on a job board or ATS, NEVER use the job board domain!
  if (isBoardOrAts) {
    return '';
  }

  // If on direct company site, return cleaned root host
  if (registry && registry.cleanCompanyDomain) {
    return registry.cleanCompanyDomain(currentHost) || '';
  }

  return '';
}

// Check if current page is an application confirmation/submitted page
function isApplicationSubmittedPage() {
  const url = window.location.href.toLowerCase();
  const title = (document.title || '').toLowerCase();
  const patterns = /(?:confirmation|applied|thank-you|thank_you|thankyou|success|submitted|application-complete|application_complete)/i;
  return patterns.test(url) || patterns.test(title);
}

// Helper: Check if an element is currently visible on screen
function isElementVisible(el) {
  if (!el) return false;
  try {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = el.getBoundingClientRect();
    // In JSDOM unit tests getBoundingClientRect() returns 0x0; treat 0x0 as visible if not display:none/hidden
    if (rect.width === 0 && rect.height === 0) {
      return !el.hidden && !el.closest('[hidden], [aria-hidden="true"]');
    }
    return rect.width > 50 && rect.height > 50;
  } catch {
    return false;
  }
}

// Track last clicked element so feed post and split-pane selection knows which item the user interacted with
var lastUserClickedElement = typeof lastUserClickedElement !== 'undefined' ? lastUserClickedElement : null;
try {
  document.addEventListener('click', (e) => {
    if (e && e.target && e.target.nodeType === 1) {
      lastUserClickedElement = e.target;
    }
  }, true);
} catch {}

// Scrape job information from open modals, side panels, slide-overs, drawers, or React portal overlays
function extractJobFromActiveModalOrDrawer() {
  // Never treat profile pages or webmail as job modals
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  if (host.includes('mail.google.com') || host.includes('outlook.')) return null;
  if (host.includes('linkedin.com') && (path.includes('/in/') || path.includes('/pub/'))) return null;

  const OVERLAY_SELECTORS = [
    'dialog[open]',
    '[role="dialog"]:not([aria-hidden="true"])',
    '[role="alertdialog"]:not([aria-hidden="true"])',
    '[aria-modal="true"]:not([aria-hidden="true"])',
    '[data-state="open"][role="dialog"]',
    '[data-headlessui-state="open"]',
    '.modal.show, .modal.open, .modal.active, .modal--open, .modal-visible, .modal-open .modal, .is-open[class*="modal"]',
    'aside.drawer, aside[class*="drawer" i], aside[class*="modal" i], aside[class*="slideover" i]',
    '.drawer.open, .drawer.show, .drawer.active, [class*="drawer"][class*="open"], [class*="drawer"][class*="active"]',
    '[class*="job-drawer" i], [class*="jobDrawer" i], [class*="job-detail-drawer" i], [class*="jobDetailDrawer" i], [class*="JobModal" i]',
    '[class*="sidepanel"][class*="open"], [class*="side-panel"][class*="open"], [class*="flyout"][class*="open"]',
    '[class*="offcanvas"].show, [class*="offcanvas"].open',
    '[data-state="open"][data-side]',
    '.slideover.open, .slideover.show, [class*="slideover"][class*="open"], [class*="slide-over"][class*="open"]',
    'div[class*="fixed"][class*="right-0"]:not(nav):not(header)',
    '[data-testid*="job-details"], [data-testid*="job-preview"], [data-testid*="job-drawer"], [data-testid*="selected-job"]',
    '[id*="portal" i] > div, [id*="modal-root" i] > div, [id*="drawer-root" i] > div',
    '[class*="modal-content" i], [class*="modalContent" i], [class*="drawer-content" i], [class*="drawerContent" i]'
  ];

  const candidateContainers = [];
  const seenContainers = new Set();

  for (const selector of OVERLAY_SELECTORS) {
    try {
      const found = Array.from(document.querySelectorAll(selector));
      for (const el of found) {
        if (!seenContainers.has(el)) {
          seenContainers.add(el);
          candidateContainers.push(el);
        }
      }
    } catch {}
  }

  // Heuristic discovery for non-ARIA React/Next.js portal overlays (e.g., arc.dev fixed z-index overlay containers)
  try {
    const portalCandidates = Array.from(
      document.querySelectorAll(
        'body > div, body > div > div, #__next div, #root div, #app div, ' +
        '[id*="portal" i] div, [class*="fixed" i], [style*="fixed" i], ' +
        '[class*="modal" i], [class*="drawer" i], [class*="overlay" i], [class*="slideover" i]'
      )
    );
    for (const el of portalCandidates) {
      if (seenContainers.has(el)) continue;
      if (el.tagName === 'NAV' || el.tagName === 'HEADER' || el.tagName === 'FOOTER') continue;
      if (el.id === 'root' || el.id === '__next' || el.id === 'app') continue;
      if (el.querySelector('main')) continue; // Never treat an app root that wraps <main> as a modal
      const cls = String(el.className || '');
      const inlineStyle = String(el.getAttribute('style') || '');
      let isFixedOrOverlay = /\b(?:fixed|modal|drawer|slideover|overlay|job-overlay)\b/i.test(cls) || /position\s*:\s*fixed/i.test(inlineStyle);
      if (!isFixedOrOverlay) {
        try {
          const cs = window.getComputedStyle(el);
          if (cs.position === 'fixed' && (parseInt(cs.zIndex, 10) >= 10 || cs.zIndex === 'auto')) {
            isFixedOrOverlay = true;
          }
        } catch {}
      }
      if (isFixedOrOverlay) {
        try {
          const rect = el.getBoundingClientRect();
          // Reject narrow/short sticky promo bars or navbars in live browsers (when rect > 0)
          if ((rect.width > 0 || rect.height > 0) && (rect.width < 300 || rect.height < 200)) {
            continue;
          }
        } catch {}
        seenContainers.add(el);
        candidateContainers.push(el);
      }
    }
  } catch {}

  const GENERIC_MODAL_HEADINGS = /^(?:sign in|log in|filter|search|settings|cookie|privacy|share|subscribe|menu|navigation|notifications|messages|people also viewed|linkedin news|who to follow|edit profile|contact info|verified\s+jobs|remote\s+jobs|remote\s+developer\s+jobs|dashboard|arc\s+exclusive)$/i;
  const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
  const isBoardOrAts = registry && registry.isJobBoardOrAts ? registry.isJobBoardOrAts(host) : false;

  for (const container of candidateContainers) {
    if (!isElementVisible(container)) continue;

    // Skip LinkedIn/X post modals so the dedicated post job scrapers handle them
    if (container.querySelector('.feed-shared-update-v2, [data-urn*="activity"], article[data-testid="tweet"]')) {
      continue;
    }

    // Sibling metadata (Location, Salary, Job type, Workplace)
    const siblingMeta = extractSiblingMetadata(container);

    // Heading / role title inside container
    const titleCandidates = Array.from(
      container.querySelectorAll(
        '[class*="job-title" i], [class*="jobTitle" i], [class*="role-title" i], ' +
        '[data-testid*="job-title" i], [data-testid*="title" i], ' +
        '[class*="posting-header"] h2, h1, h2, h3, [role="heading"]'
      )
    );
    let title = '';
    for (const tEl of titleCandidates) {
      const cand = getCleanElementText(tEl);
      if (
        cand &&
        cand.length >= 2 &&
        cand.length <= 120 &&
        !GENERIC_MODAL_HEADINGS.test(cand) &&
        !PROSE_SECTION_HEADING_RE.test(cand)
      ) {
        title = cand;
        break;
      }
    }

    // Fallback for split-pane modals where the job title is rendered in a styled <div>/<p> instead of h1-h3 (e.g. above "Location" or below "Arc Exclusive")
    if (!title) {
      const cleanModalLines = extractCleanLines(container).slice(0, 12);
      for (const line of cleanModalLines) {
        if (
          line.length >= 4 &&
          line.length <= 95 &&
          !GENERIC_MODAL_HEADINGS.test(line) &&
          !PROSE_SECTION_HEADING_RE.test(line) &&
          !/^(?:location|salary|min\.?\s+experience|required\s+skills|save|fast\s+apply|apply|actively\s+recruiting)/i.test(line) &&
          POST_ROLE_TITLE_REGEX.test(line)
        ) {
          title = line;
          break;
        }
      }
    }
    if (!title) continue;

    // Verify container has at least one job signal (explicit job class/testid, location, company, salary, apply button/text, or role keyword)
    const hasExplicitJobTitleAttr = Boolean(container.querySelector('[class*="job-title" i], [class*="jobTitle" i], [class*="role-title" i], [data-testid*="job-title" i], [class*="company-name" i], [data-testid*="company" i], [class*="location" i], [data-testid*="location" i]'));
    const hasApplySelector = Boolean(container.querySelector('a[href*="apply" i], button[class*="apply" i], a[class*="apply" i], a.btn-apply, iframe[src*="greenhouse.io"], iframe[src*="lever.co"], iframe[src*="ashbyhq.com"]'));
    const hasApplyButtonText = Array.from(container.querySelectorAll('button, a')).some(btn => /\b(?:apply|apply\s+now|fast\s+apply|easy\s+apply|quick\s+apply|submit\s+application|jetzt\s+bewerben)\b/i.test(cleanText(btn.textContent || '')));
    const hasRoleKeyword = /\b(?:engineer|developer|designer|architect|manager|director|lead|specialist|scientist|analyst|consultant|intern|coordinator|recruiter|head|vp|officer|administrator|producer|writer|editor|counsel|account|sales|marketing|operations|support|technician|instructor)\b/i.test(title);
    const hasSiblingJobMeta = Boolean(siblingMeta.location || siblingMeta.salary || siblingMeta.employmentType);
    if (!hasExplicitJobTitleAttr && !hasApplySelector && !hasApplyButtonText && !hasRoleKeyword && !hasSiblingJobMeta) {
      continue;
    }

    // Company name inside container, prose fallback, or page fallback
    const companyEl = container.querySelector(
      '[class*="company-name" i], [class*="companyName" i], [class*="employer" i], ' +
      'a[href*="/company/"], [data-testid*="company" i], [class*="organization" i]'
    );
    let company = cleanCompanyName(getCleanElementText(companyEl));
    company = extractProseCompany(container, company) || company;

    if (!company && !isBoardOrAts) {
      const pageCompanyEl = document.querySelector('[data-testid="company-name"], .company-name, [class*="header"] [class*="logo"] img[alt], [class*="navbar"] img[alt]');
      if (pageCompanyEl) {
        company = cleanCompanyName(cleanText(pageCompanyEl.getAttribute('alt') || pageCompanyEl.textContent || ''));
      }
      if (!company) {
        company = getDomainName(window.location.href);
      }
    }

    // Location inside container
    const locEl = container.querySelector(
      '[class*="location" i], [class*="workplace" i], [data-testid*="location" i], ' +
      '[class*="city" i], [class*="region" i]'
    );
    let location = getCleanElementText(locEl) || siblingMeta.location || '';

    // Work arrangement & employment type
    let workLocation = siblingMeta.workLocation || null;
    let employmentType = siblingMeta.employmentType || null;
    const rawContainerText = cleanText(container.innerText || container.textContent || '');
    const containerText = rawContainerText.toLowerCase();
    if (!workLocation) {
      if (containerText.includes('remote') || containerText.includes('work from home') || containerText.includes('telecommute')) {
        workLocation = 'Remote';
      } else if (containerText.includes('hybrid')) {
        workLocation = 'Hybrid';
      } else if (location) {
        workLocation = 'Onsite';
      }
    }

    if (!employmentType) {
      if (containerText.includes('full-time') || containerText.includes('full time')) employmentType = 'Full-time';
      else if (containerText.includes('part-time') || containerText.includes('part time')) employmentType = 'Part-time';
      else if (containerText.includes('contract')) employmentType = 'Contract';
      else if (containerText.includes('internship') || containerText.includes('intern')) employmentType = 'Internship';
    }

    // Salary inside container (sibling metadata or validated free-text salary regex)
    let salary = siblingMeta.salary || extractFreeTextSalary(rawContainerText);

    // Description inside container
    let descriptionHtml = extractBestDescriptionHtml(container);
    if (!descriptionHtml) {
      const descEl = container.querySelector(
        '[class*="description" i], [class*="content" i], [class*="details" i], ' +
        'article, section, [data-testid*="description" i]'
      );
      descriptionHtml = descEl ? (descEl.innerHTML || descEl.textContent) : '';
    }

    // Apply link inside container or embedded iframe
    const applyAnchor = container.querySelector('a[href*="apply" i], a[class*="apply" i], a.btn-apply, a[data-testid*="apply" i]');
    let jobLink = applyAnchor ? applyAnchor.href : window.location.href;

    const iframeAts = container.querySelector('iframe[src*="greenhouse.io"], iframe[src*="lever.co"], iframe[src*="ashbyhq.com"], iframe[src*="workable.com"]') ||
                      document.querySelector('iframe[src*="greenhouse.io"], iframe[src*="lever.co"], iframe[src*="ashbyhq.com"], iframe[src*="workable.com"]');
    if (iframeAts && iframeAts.src && (!applyAnchor || jobLink === window.location.href)) {
      jobLink = iframeAts.src;
    }

    const hasJobSignal = Boolean(
      hasExplicitJobTitleAttr ||
      hasApplySelector ||
      hasApplyButtonText ||
      location ||
      salary ||
      siblingMeta.location ||
      siblingMeta.salary ||
      siblingMeta.employmentType ||
      container.querySelector('[class*="location" i], [data-testid*="location" i], [class*="salary" i], [data-testid*="salary" i], a[href*="apply" i], button[class*="apply" i]')
    );
    if (!hasJobSignal) continue;

    return {
      title: cleanRoleTitle(title, company),
      company,
      location,
      workLocation,
      employmentType,
      salary,
      descriptionHtml,
      jobLink,
      inModal: true,
      container,
    };
  }

  return null;
}

// Return the DOM Element of the active job modal/drawer/portal overlay (including non-ARIA overlays) if one is open
function findActiveJobModalContainer() {
  try {
    const modalJob = extractJobFromActiveModalOrDrawer();
    if (modalJob && modalJob.container) return modalJob.container;
  } catch {}
  try {
    return document.querySelector(
      'dialog[open], [role="dialog"]:not([aria-hidden="true"]), [aria-modal="true"]:not([aria-hidden="true"]), [data-state="open"][role="dialog"]'
    );
  } catch {
    return null;
  }
}

// Shared regex & parser for extracting Role, Company, Location, WorkLocation, and Salary from social hiring post text
var HIRING_POST_INTENT_REGEX = /(?:we(?:'re|\s+are)\s+hiring|i(?:'m|\s+am)\s+hiring|\b(?:is|are)\s+hiring\b|my\s+team\s+(?:at\s+[A-Za-z0-9&.\-_ ]+\s+)?is\s+hiring|join\s+(?:our|my|the)\s+team|looking\s+for\s+(?:a|an)\s+|seeking\s+(?:a|an)\s+|now\s+hiring|open\s+role[s]?|job\s+opening[s]?|apply\s+(?:here|at|below|now)|dm\s+(?:me\s+)?if\s+interested|we\s+have\s+an?\s+opening|hiring\s+alert|excited\s+to\s+announce\s+we(?:'re|\s+are)\s+hiring|\bhiring\s+(?:a|an|for|senior|staff|lead|principal|founding|junior|remote|frontend|backend|fullstack|full-stack|mobile|flutter|react|ios|android|python|go|rust|ai|ml|data|product|design|devops)\b|#(?:hiring|nowhiring|jobopening|wearehiring|jobsearch|techjobs)\b|\b(?:send|drop|share)\s+(?:me\s+)?your\s+(?:cv|resume|portfolio)\b|(?:role|position|vacancy)\s*:)/i;

var POST_ROLE_TITLE_REGEX = /\b((?:(?:Senior|Sr\.?|Junior|Jr\.?|Lead|Principal|Staff|Founding|Head\s+of|VP\s+of|Director\s+of|Chief)\s+)*(?:(?:Software|Frontend|Front[- ]?End|Backend|Back[- ]?End|Full[- ]?Stack|Mobile|iOS|Android|Flutter|React(?:\s+Native)?|Angular|Vue|Node(?:\.js)?|Python|Go|Golang|Rust|Java|Kotlin|Swift|TypeScript|JavaScript|C\+\+|C#|\.NET|Ruby|Rails|PHP|Scala|Elixir|DevOps|Site\s+Reliability|SRE|Platform|Infrastructure|Cloud|Data|Machine\s+Learning|ML|AI|GenAI|LLM|Product|Growth|UX|UI|UI\/UX|System|Systems|Embedded|Firmware|Security|Cybersecurity|QA|Quality\s+Assurance|Automation|Test|Solutions|Support|Sales|Technical|Engineering|Design|Research|Marketing|Operations)\s+)+(?:Engineer|Developer|Designer|Architect|Manager|Lead|Specialist|Scientist|Consultant|Analyst|Researcher|Officer|Director|Intern|Instructor|Advocate|Evangelist|Associate)|(?:Engineering\s+Manager|Product\s+Manager|Project\s+Manager|Program\s+Manager|Technical\s+Program\s+Manager|Scrum\s+Master|Data\s+Scientist|Product\s+Designer|UX\s+Designer|UI\s+Designer|UX\s+Researcher|DevOps\s+Engineer|Site\s+Reliability\s+Engineer|Solutions\s+Architect|Mobile\s+Architect|Software\s+Architect|Security\s+Engineer|QA\s+Engineer|Data\s+Engineer|ML\s+Engineer|AI\s+Engineer))\b/i;

function extractRoleAndMetaFromPostText(rawText) {
  if (!rawText) return null;
  const normalizedLines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const multiLineText = normalizedLines.join('\n');
  const flatText = cleanText(rawText);

  // 1. Role Extraction
  let role = '';
  const explicitMatch = multiLineText.match(/(?:^|\n)\s*(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF•·\-*]+\s*)?(?:Role|Position|Job(?:\s+Title)?|Opening|Title|Vacancy)\s*:\s*([A-Za-z0-9 /#+.\-()]+?)(?:\s*(?:\n|$|\||•|·))/iu);
  if (explicitMatch && explicitMatch[1]) {
    role = cleanText(explicitMatch[1]).replace(/\s*[-–—|]\s*(?:remote|hybrid|onsite|full[- ]?time|part[- ]?time).*$/i, '').trim();
  }

  if (!role) {
    const lookingMatch = flatText.match(/(?:looking\s+for\s+(?:a|an)\s+|seeking\s+(?:a|an)\s+|hiring\s+(?:a|an)\s+|hire\s+(?:a|an)\s+)([A-Z][A-Za-z0-9 /#+.\-]{1,45}?\b(?:Engineer|Developer|Designer|Architect|Manager|Lead|Specialist|Scientist|Consultant|Analyst|Intern|Director|Head|VP|Instructor|Advocate))\b/i);
    if (lookingMatch && lookingMatch[1]) {
      role = cleanText(lookingMatch[1]);
    }
  }

  if (!role) {
    const regexMatch = flatText.match(POST_ROLE_TITLE_REGEX);
    if (regexMatch && regexMatch[1]) {
      role = cleanText(regexMatch[1]);
    }
  }

  // 2. Company Extraction from post text
  let company = '';
  const explicitCompMatch = multiLineText.match(/(?:^|\n)\s*(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF•·\-*]+\s*)?(?:Company|Organization|Employer|Team)\s*:\s*([A-Za-z0-9 &.,\-_]+?)(?:\s*(?:\n|$|\||•|·))/iu);
  if (explicitCompMatch && explicitCompMatch[1]) {
    company = cleanText(explicitCompMatch[1]);
  }
  if (!company) {
    const teamAtMatch = flatText.match(/(?:my\s+team\s+at|our\s+team\s+at|hiring\s+at|opening\s+at|join\s+us\s+at|working\s+at)\s+([A-Z][A-Za-z0-9&.\-_]+(?:\s+[A-Z][A-Za-z0-9&.\-_]+)?)/);
    if (teamAtMatch && teamAtMatch[1]) {
      company = cleanText(teamAtMatch[1]).replace(/\s+(?:is|are|to|for|in|as)\b.*$/i, '').trim();
    }
  }
  if (!company) {
    const compIsHiringMatch = flatText.match(/(?:^|[.!?\n]\s*)([A-Z][A-Za-z0-9&.\-_]+(?:\s+[A-Z][A-Za-z0-9&.\-_]+)?)\s+is\s+hiring\b/);
    if (compIsHiringMatch && compIsHiringMatch[1]) {
      const candComp = cleanText(compIsHiringMatch[1]);
      if (!/^(?:we|who|he|she|it|this|that|team|my\s+team|our\s+team|company|my\s+company|our\s+company|client|our\s+client|everyone|someone)$/i.test(candComp)) {
        company = candComp;
      }
    }
  }
  if (!company && role) {
    const escapedRole = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const roleAtComp = flatText.match(new RegExp(escapedRole + '\\s+(?:at|@)\\s+([A-Z][A-Za-z0-9&.\\-_]+)', 'i'));
    if (roleAtComp && roleAtComp[1]) {
      company = cleanText(roleAtComp[1]).replace(/[.,!;]+$/, '');
    }
  }

  // 3. Location & Work Location
  let workLocation = null;
  const lowerText = flatText.toLowerCase();
  if (lowerText.includes('remote') || lowerText.includes('wfh') || lowerText.includes('work from home') || lowerText.includes('anywhere')) {
    workLocation = 'Remote';
  } else if (lowerText.includes('hybrid')) {
    workLocation = 'Hybrid';
  } else if (lowerText.includes('on-site') || lowerText.includes('onsite') || lowerText.includes('in-office')) {
    workLocation = 'Onsite';
  }

  let location = '';
  const locMatch = multiLineText.match(/(?:^|\n|\b)(?:Location|Based in|Office|City)\s*:\s*([A-Za-z0-9, /()-]+?)(?:\.|\n|\||•|$)/i);
  if (locMatch && locMatch[1]) {
    location = cleanText(locMatch[1]).replace(/\s*\b(?:remote|hybrid|onsite|on-site)\b\s*/gi, '').replace(/^[(),\s-]+|[(),\s-]+$/g, '').trim();
  }

  // 4. Employment Type
  let employmentType = 'Full-time';
  if (/\b(?:part-time|part time)\b/i.test(lowerText)) employmentType = 'Part-time';
  else if (/\b(?:contract|contractor|freelance)\b/i.test(lowerText)) employmentType = 'Contract';
  else if (/\b(?:internship|intern)\b/i.test(lowerText)) employmentType = 'Internship';

  // 5. Salary
  let salary = '';
  const salMatch = flatText.match(/(?:[$€£]\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?(?:\s*[-–]\s*[$€£]?\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?)?(?:\s*(?:\/\s*yr|\/\s*year|\/\s*mo|\/\s*hr|per\s+year|per\s+month|per\s+hour))?)/i);
  if (salMatch) {
    salary = cleanText(salMatch[0]);
  }

  return {
    role,
    company,
    location,
    workLocation,
    employmentType,
    salary,
    flatText,
    multiLineText
  };
}

// Scrape job details directly from a LinkedIn post / update card
function extractLinkedInPostJobData() {
  const host = window.location.hostname.toLowerCase();
  const href = window.location.href;
  if (!host.includes('linkedin.')) return null;

  const isDedicatedPostPage = href.includes('/feed/update/') || href.includes('/posts/');
  const hasOpenPostModal = Boolean(document.querySelector(
    '.artdeco-modal [data-urn*="activity"], ' +
    '[role="dialog"] .feed-shared-update-v2, ' +
    '[role="dialog"] [data-view-name*="feed-"]'
  ));
  const isPostUrl = isDedicatedPostPage || href.includes('/search/results/content') || href.includes('/recent-activity') || (href.includes('/feed') && hasOpenPostModal);
  if (!isPostUrl) return null;
  const POST_CONTAINER_SELECTOR =
    'div[data-urn*="activity:"], div[data-id*="urn:li:activity"], ' +
    '.feed-shared-update-v2, article.feed-shared-update-v2, ' +
    '[data-view-name="feed-update"], [data-view-name="feed-full-update"]';
  const POST_TEXT_SELECTOR =
    '.update-components-text, .feed-shared-update-v2__description, ' +
    '.feed-shared-inline-show-more-text, .feed-shared-text-view, ' +
    '.feed-shared-update-v2__commentary, span.attributed-text-segment-list__content, ' +
    '[data-test-id*="commentary"], [data-view-name="feed-commentary"]';

  // 1. Locate best candidate post container (modal > clicked post > viewport-visible hiring post > first post)
  let postContainer = document.querySelector(
    '.artdeco-modal [data-urn*="activity"], ' +
    '[role="dialog"] .feed-shared-update-v2, ' +
    '[role="dialog"] [data-view-name*="feed-"]'
  );

  if (!postContainer && lastUserClickedElement) {
    const clickedPost = lastUserClickedElement.closest(POST_CONTAINER_SELECTOR);
    if (clickedPost && document.contains(clickedPost)) {
      postContainer = clickedPost;
    }
  }

  if (!postContainer) {
    const allPosts = Array.from(document.querySelectorAll(POST_CONTAINER_SELECTOR));
    if (allPosts.length > 1) {
      // Prefer a post currently in the viewport that has hiring intent
      const viewportPosts = allPosts.filter(el => {
        try {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return true;
          return r.bottom > 80 && r.top < (window.innerHeight || 900) * 0.85;
        } catch {
          return true;
        }
      });
      const candidatePool = viewportPosts.length > 0 ? viewportPosts : allPosts;
      postContainer = candidatePool.find(el => {
        const tEl = el.querySelector(POST_TEXT_SELECTOR) || el;
        return HIRING_POST_INTENT_REGEX.test(tEl.textContent || '');
      }) || (isDedicatedPostPage ? candidatePool[0] : null);
    } else if (allPosts.length === 1) {
      postContainer = allPosts[0];
    }
  }

  const textEl = (postContainer || document).querySelector(POST_TEXT_SELECTOR);
  const rawPostText = textEl ? (textEl.innerText || textEl.textContent || '') : '';
  const postText = cleanText(rawPostText);
  if (!postText) return null;

  const hasHiringIntent = HIRING_POST_INTENT_REGEX.test(postText);
  if (!hasHiringIntent && !isDedicatedPostPage) {
    return null;
  }

  const parsedMeta = extractRoleAndMetaFromPostText(rawPostText);
  if (!parsedMeta) return null;

  // 2. Author / Poster Info (supports both Artdeco classes and SDUI anchor structure)
  const actorContainer = postContainer || document;
  const nameEl = actorContainer.querySelector(
    '.update-components-actor__name, .feed-shared-actor__name, ' +
    'a[href*="/in/"] span[dir="ltr"], .update-components-actor__title'
  );
  const headlineEl = actorContainer.querySelector(
    '.update-components-actor__description, .feed-shared-actor__description, ' +
    '.update-components-actor__sub-description'
  );
  const profileAnchor = actorContainer.querySelector('a.update-components-actor__image[href*="/in/"], a.update-components-actor__meta-link[href*="/in/"], a[href*="/in/"]');
  const avatarImg = actorContainer.querySelector('img.update-components-actor__avatar-image, img.feed-shared-actor__avatar-image, a[href*="/in/"] img');

  let authorName = '';
  if (nameEl) {
    authorName = getCleanElementText(nameEl);
  } else if (profileAnchor) {
    const anchorLines = extractCleanLines(profileAnchor);
    if (anchorLines.length > 0) authorName = anchorLines[0];
  }
  authorName = authorName
    .replace(/^(?:Message|Connect|Follow)\s*/i, '')
    .replace(/\s*(?:•\s*)?(?:1st|2nd|3rd|Following)\b.*$/i, '')
    .replace(/\s*View\s+.*?profile.*$/i, '')
    .trim();

  let authorHeadline = headlineEl ? getCleanElementText(headlineEl) : '';
  if (!authorHeadline && profileAnchor) {
    const anchorLines = extractCleanLines(profileAnchor);
    const nonDegreeLines = anchorLines.filter(l => l !== authorName && !/^(?:1st|2nd|3rd|Following|•|\d+[hdwmy]|Edited)\b/i.test(l));
    if (nonDegreeLines.length > 0) authorHeadline = nonDegreeLines[0];
  }

  let authorLinkedIn = profileAnchor ? profileAnchor.href.split('?')[0].replace(/\/+$/, '') : '';
  if (authorLinkedIn && profileAnchor) {
    const rawHref = profileAnchor.getAttribute('href') || '';
    if (rawHref.endsWith('/') && !authorLinkedIn.endsWith('/')) {
      authorLinkedIn += '/';
    }
  }
  const authorAvatar = avatarImg ? avatarImg.src : '';

  // 3. Company Name Extraction
  let company = parsedMeta.company || '';
  if (!company && authorHeadline) {
    const atMatch = authorHeadline.match(/(?:\bat\b|@)\s+([^,|•·\n]+)/i);
    if (atMatch && atMatch[1]) {
      company = cleanText(atMatch[1]);
    }
  }

  if (!company) {
    const compAnchor = actorContainer.querySelector('a[href*="/company/"]');
    if (compAnchor) {
      company = getCleanElementText(compAnchor);
    }
  }

  // 4. Role / Job Title
  let role = parsedMeta.role;
  if (!role && hasHiringIntent) {
    role = 'Open Role';
  }
  if (!role) return null;

  // 5. External Apply Link or Post Permalink
  const outboundAnchor = actorContainer.querySelector(
    'a.update-components-article__link, a[data-tracking-control-name="feed_link_click"], ' +
    '.feed-shared-article__link, a[href*="http"]:not([href*="linkedin.com"])'
  );
  let jobLink = outboundAnchor ? resolveExpandedUrl(outboundAnchor) : href;
  if (!outboundAnchor && postContainer) {
    const urn = postContainer.getAttribute('data-urn') || postContainer.getAttribute('data-id') || '';
    if (urn && urn.includes('urn:li:activity:') && !isDedicatedPostPage) {
      jobLink = `https://www.linkedin.com/feed/update/${urn}/`;
    }
  }

  if (!company && outboundAnchor) {
    const expandedUrl = resolveExpandedUrl(outboundAnchor);
    const extHost = getDomainFromUrl(expandedUrl);
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    if (registry && registry.cleanCompanyDomain) {
      const cleaned = registry.cleanCompanyDomain(extHost);
      if (cleaned && !registry.isJobBoardOrAts(extHost)) {
        const compName = cleaned.split('.')[0];
        company = compName.charAt(0).toUpperCase() + compName.slice(1);
      }
    }
  }

  // 6. Poster Contact
  let contact = null;
  if (authorName) {
    contact = {
      name: authorName,
      role: authorHeadline || 'Hiring Team',
      linkedIn: authorLinkedIn,
      avatarUrl: authorAvatar,
      category: /(?:manager|director|lead|head|founder|cto|vp|chief)/i.test(authorHeadline) ? 'Hiring Manager' : 'Recruiter',
    };
  }

  return {
    title: role,
    company: company || (authorName ? `${authorName}'s Team` : 'LinkedIn Network'),
    location: parsedMeta.location,
    workLocation: parsedMeta.workLocation,
    employmentType: parsedMeta.employmentType,
    salary: parsedMeta.salary,
    descriptionHtml: `<p>${postText}</p>`,
    jobLink,
    contact,
    isPostJob: true,
  };
}

// Master extraction function
function extractPageData() {
  const jsonLdData = parseJsonLd();
  const siteData = parseSiteSpecific();
  const modalData = extractJobFromActiveModalOrDrawer();
  const postData = extractLinkedInPostJobData();
  const fallbackData = parseUniversalFallback();

  const domain = getDomainFromUrl(window.location.href);
  const platform = detectPlatform(domain);
  const isWebmail = isWebmailUrl(window.location.href);

  // Active modal/drawer or open LinkedIn post takes precedence over background page
  const prioritizedJob = (modalData && modalData.title)
    ? modalData
    : ((postData && postData.title) ? postData : null);

  // Combine extracted results by priority
  let rawCompany = (prioritizedJob && prioritizedJob.company) || (jsonLdData && jsonLdData.company) || (siteData && siteData.company) || fallbackData.company || '';
  rawCompany = cleanCompanyName(rawCompany);
  rawCompany = extractProseCompany(document.body, rawCompany) || rawCompany;
  const company = cleanCompanyName(rawCompany);

  const rawRole = (prioritizedJob && prioritizedJob.title) || (jsonLdData && jsonLdData.title) || (siteData && siteData.title) || fallbackData.title || '';
  const role = cleanRoleTitle(rawRole, company);

  // Resolve sanitized company domain (NEVER job board or ATS)
  const companyDomain = resolveCompanyDomain(company, jsonLdData, siteData);

  // Additional fields
  const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
  const rawLocation = (prioritizedJob && prioritizedJob.location) || (siteData && siteData.location) || (jsonLdData && jsonLdData.location) || fallbackData.location || '';
  const location = (registry && registry.formatLocation)
    ? (rawLocation.includes(';')
        ? rawLocation.split(';').map(s => registry.formatLocation(s.trim())).filter(Boolean).join('; ')
        : registry.formatLocation(rawLocation))
    : rawLocation;
  const workLocation = (prioritizedJob && prioritizedJob.workLocation) || (siteData && siteData.workLocation) || (jsonLdData && jsonLdData.workLocation) || fallbackData.workLocation || null;
  const employmentType = (prioritizedJob && prioritizedJob.employmentType) || (siteData && siteData.employmentType) || (jsonLdData && jsonLdData.employmentType) || fallbackData.employmentType || null;
  const contact = (prioritizedJob && prioritizedJob.contact) || (siteData && siteData.contact) || null;
  const salary = (prioritizedJob && prioritizedJob.salary) || (siteData && siteData.salary) || fallbackData.salary || null;
  const jobLink = (prioritizedJob && prioritizedJob.jobLink) || window.location.href;

  // Notes: highlighted text wins; otherwise full description formatted cleanly as Markdown
  const rawSelection = window.getSelection() ? window.getSelection().toString().trim() : '';
  let notes = rawSelection ? rawSelection.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n') : '';
  if (!notes) {
    let rawDesc = (prioritizedJob && prioritizedJob.descriptionHtml) || (jsonLdData && jsonLdData.descriptionHtml) || (siteData && siteData.descriptionHtml) || '';
    if (!rawDesc || cleanText(rawDesc.replace(/<[^>]*>/g, '')).length < 60) {
      const bestHtml = extractBestDescriptionHtml(document);
      if (bestHtml && cleanText(bestHtml.replace(/<[^>]*>/g, '')).length > cleanText(rawDesc.replace(/<[^>]*>/g, '')).length) {
        rawDesc = bestHtml;
      }
    }
    if (rawDesc) {
      notes = (registry && registry.htmlToMarkdown) ? registry.htmlToMarkdown(rawDesc) : rawDesc.replace(/<[^>]*>/g, '').trim();
    }
  }

  // Suggested stage: Applied if confirmation page, else Saved
  const suggestedStage = isApplicationSubmittedPage() ? 'Applied' : 'Saved';

  // Favicon URL: High-res Google Favicon for companyDomain if available
  let faviconUrl = '';
  if (companyDomain) {
    faviconUrl = `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=128`;
  }

  return {
    isWebmail,
    role,
    company,
    platform,
    jobLink: jobLink || window.location.href,
    domain: companyDomain, // Clean hiring company domain
    companyDomain,
    location,
    workLocation,
    employmentType,
    salary: salary || undefined,
    notes,
    suggestedStage,
    contact,
    faviconUrl,
    pageTitle: document.title,
  };
}

// --- Webmail Detection & Extraction Engine ---

var ATS_DOMAINS = [
  'greenhouse.io', 'greenhouse-mail.io', 'gh-mail.io',
  'lever.co', 'hire.lever.co',
  'ashbyhq.com', 'ashby-mail.com',
  'smartrecruiters.com',
  'workday.com', 'myworkday.com', 'workdayjobs.com',
  'jobvite.com', 'recruitee.com',
  'rippling.com', 'bamboohr.com',
  'breezy.hr', 'pinpointhq.com',
  'jazzhr.com', 'icims.com'
];

// Checks whether a bare domain string (no path, no @) belongs to an ATS.
// Uses exact equality or dot-bounded suffix so "notgreenhouse.io" does not match.
function isAtsHost(host) {
  if (!host) return false;
  const h = host.toLowerCase().trim();
  return ATS_DOMAINS.some(ats => h === ats || h.endsWith('.' + ats));
}

// Extract the ATS host from an email address string (the part after @).
function domainFromEmail(emailStr) {
  if (!emailStr || !emailStr.includes('@')) return '';
  return emailStr.split('@')[1].toLowerCase().trim();
}

function isWebmailUrl(urlStr) {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    return host.includes('mail.google.com') ||
      host.includes('outlook.live.com') ||
      host.includes('outlook.office.com') ||
      host.includes('outlook.office365.com');
  } catch {
    return false;
  }
}

var MONTH_MAP = {
  jan: 1, january: 1, janv: 1,
  feb: 2, february: 2, fevr: 2, febuary: 2,
  mar: 3, march: 3, mars: 3, marz: 3,
  apr: 4, april: 4, avril: 4,
  may: 5, mai: 5,
  jun: 6, june: 6, juin: 6,
  jul: 7, july: 7, juil: 7,
  aug: 8, august: 8, aout: 8,
  sep: 9, sept: 9, september: 9, septembre: 9,
  oct: 10, october: 10, octobre: 10,
  nov: 11, november: 11, novembre: 11,
  dec: 12, december: 12, decembre: 12,
  // Standard & Egyptian Arabic
  'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12,
  // Levant & Mesopotamian Arabic (Jordan, Palestine, Syria, Lebanon, Iraq)
  'كانون الثاني': 1, 'شباط': 2, 'آذار': 3, 'اذار': 3, 'نيسان': 4, 'أيار': 5, 'ايار': 5, 'حزيران': 6, 'تموز': 7, 'آب': 8, 'اب': 8, 'أيلول': 9, 'ايلول': 9, 'تشرين الأول': 10, 'تشرين الاول': 10, 'تشرين الثاني': 11, 'كانون الأول': 12, 'كانون الاول': 12,
  // North African Arabic
  'جانفي': 1, 'فيفري': 2, 'أفريل': 4, 'افريل': 4, 'ماي': 5, 'جوان': 6, 'جويلية': 7, 'أوت': 8, 'اوت': 8
};

var ARABIC_WEEKDAYS = {
  'الأحد': 0, 'الاحد': 0,
  'الاثنين': 1, 'الإثنين': 1,
  'الثلاثاء': 2,
  'الأربعاء': 3, 'الاربعاء': 3,
  'الخميس': 4,
  'الجمعة': 5,
  'السبت': 6
};

function normalizeNumerals(str) {
  if (!str) return '';
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str)
    .replace(/[٠-٩]/g, d => easternDigits.indexOf(d))
    .replace(/[۰-۹]/g, d => persianDigits.indexOf(d));
}

function formatDateParts(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Returns a full ISO 8601 string with local UTC offset when time info is known,
// e.g. "2026-09-25T14:35:10+03:00". This preserves the represented instant when
// the string is parsed in a different timezone. When only a date is known the
// offset is still appended so the format stays consistent.
function formatIsoWithTime(d, hasTime = false) {
  // Build ±HH:MM offset string from the host's local timezone
  const offsetMin = -d.getTimezoneOffset(); // getTimezoneOffset returns minutes WEST, negate for ±
  const sign = offsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  const offH = String(Math.floor(absMin / 60)).padStart(2, '0');
  const offM = String(absMin % 60).padStart(2, '0');
  const offset = `${sign}${offH}:${offM}`;

  if (!hasTime) {
    return `${formatDateParts(d)}T00:00:00${offset}`;
  }
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${formatDateParts(d)}T${hh}:${mm}:${ss}${offset}`;
}

// Validates whether an attribute or text string looks like an email timestamp rather than a button tooltip
function looksLikeDate(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim();
  if (!s || s.length < 2) return false;

  // Reject UI button labels, tooltips, or actions in English and Arabic
  if (/^(show details|reply|forward|more|details|star|not starred|labels|archive|delete|snooze|print|unread|mark as|to:|from:|cc:|bcc:|رد|إعادة توجيه|اعادة توجيه|المزيد|تفاصيل|حذف|طباعة|أرشفة|ارشيف)/i.test(s)) {
    return false;
  }

  const norm = normalizeNumerals(s.toLowerCase());

  // 1. Explicit 4-digit year (e.g. 2024..2035) or YYYY/MM/DD
  if (/\b20\d{2}\b/.test(norm)) return true;

  // 2. Month keywords (English, French, Arabic Standard, Levant, North African)
  if (/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|كانون|شباط|آذار|اذار|نيسان|أيار|ايار|حزيران|تموز|آب|اب|أيلول|ايلول|تشرين|جانفي|فيفري|أفريل|افريل|ماي|جوان|جويلية|أوت|اوت)/i.test(norm)) {
    return true;
  }

  // 3. Numeric calendar format: DD/MM/YYYY, MM/DD/YYYY, DD.MM.YYYY, YYYY-MM-DD, YYYY/MM/DD
  if (/\b(?:\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|20\d{2}[./-]\d{1,2}[./-]\d{1,2})\b/.test(norm)) return true;

  // 4. Relative expressions: "2 weeks ago", "25 days ago", "yesterday", "today", "أمس", "اليوم", "منذ"
  if (/\b(\d+)\s*(days?|weeks?|months?|hours?|mins?|minutes?)\s*ago\b/i.test(norm) || /\b(yesterday|today|أمس|امس|اليوم|منذ)\b/i.test(norm)) {
    return true;
  }

  // 5. Weekday tokens: "Mon", "Tuesday", Arabic weekdays
  if (/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/i.test(norm) || /(الأحد|الاحد|الاثنين|الإثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|السبت)/i.test(norm)) {
    return true;
  }

  // 6. Time tokens: "10:15 AM", "14:30", "3:55 م", "3:55 ص"
  if (/(?:(?<![a-zA-Z\u0600-\u06FF])(pm|am|\b[ap]\.?m\.?|صباحاً|صباحا|صباح|مساءً|مساء|ص|م)\s*)?\b\d{1,2}:\d{2}(?::\d{2})?(?:\s*(pm|am|\b[ap]\.?m\.?|صباحاً|صباحا|صباح|مساءً|مساء|ص|م)(?![a-zA-Z\u0600-\u06FF]))?/i.test(norm)) return true;

  return false;
}

// Safely extracts date string candidate from an element
function extractDateStringFromElement(el) {
  if (!el) return '';

  // 1. Check data-timestamp attribute (Unix epoch ms or sec)
  const tsAttr = el.getAttribute('data-timestamp') || el.getAttribute('data-time');
  if (tsAttr && /^\d{10,13}$/.test(tsAttr.trim())) {
    return tsAttr.trim();
  }

  // 2. Check datetime attribute (HTML5 <time datetime="...">)
  const dtAttr = el.getAttribute('datetime');
  if (dtAttr && looksLikeDate(dtAttr)) {
    return dtAttr.trim();
  }

  // 3. Check title attribute (must validate with looksLikeDate)
  const titleAttr = el.getAttribute('title');
  if (titleAttr && looksLikeDate(titleAttr)) {
    return titleAttr.trim();
  }

  // 4. Check alt attribute
  const altAttr = el.getAttribute('alt');
  if (altAttr && looksLikeDate(altAttr)) {
    return altAttr.trim();
  }

  // 5. Check aria-label attribute
  const ariaAttr = el.getAttribute('aria-label');
  if (ariaAttr && looksLikeDate(ariaAttr)) {
    return ariaAttr.trim();
  }

  // 6. Check visible text content
  const text = (el.textContent || '').trim();
  if (text && looksLikeDate(text)) {
    return text;
  }

  return '';
}

// Convert various webmail date formats into a { date: 'YYYY-MM-DD', timestamp: 'YYYY-MM-DDTHH:MM:SS+HH:MM' } object.
// `date` preserves backward compatibility; `timestamp` carries full precision for analytics.
function parseDateToIso(dateStr, refDate = new Date()) {
  const fallback = { date: formatDateParts(refDate), timestamp: formatIsoWithTime(refDate, true) };
  if (!dateStr) return fallback;

  // 1. Sanitize: normalize Eastern/Persian digits, strip invisible bidi Unicode marks, normalize Arabic comma
  let raw = normalizeNumerals(
    String(dateStr)
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u061C]/g, '')
      .replace(/[\u00A0\u202F\u2000-\u200A]/g, ' ')
      .replace(/\u060C/g, ', ')
  ).trim();
  if (!raw) return fallback;

  // 2. Unix numeric timestamp (10-digit seconds or 13-digit milliseconds) — always has full time
  if (/^\d{10,13}$/.test(raw)) {
    const ts = Number(raw.length === 10 ? raw + '000' : raw);
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, true) };
    }
  }

  // 3. Clean string: strip parenthesized annotations, prefixes, and conjunctions
  let clean = raw
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Extract time component (English AM/PM or Arabic م / ص / مساءً / صباحاً)
  // Handles '3:55 م', '3:55 PM', '15:55', 'م 3:55', '3:55م', 'في 3:55 م'
  // Longer patterns appear before single letters; lookaround assertions prevent prefix matching inside words.
  const timeRegex = /(?:(?<![a-zA-Z\u0600-\u06FF])(pm|am|\b[ap]\.?m\.?|صباحاً|صباحا|صباح|مساءً|مساء|ص|م)\s*)?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(pm|am|\b[ap]\.?m\.?|صباحاً|صباحا|صباح|مساءً|مساء|ص|م)(?![a-zA-Z\u0600-\u06FF]))?/i;
  const timeMatch = clean.match(timeRegex);
  let timeH = 0, timeM = 0, timeS = 0, hasTimeInStr = false;
  let datePartStr = clean;

  if (timeMatch) {
    const mer = (timeMatch[5] || timeMatch[1] || '').toLowerCase().trim();
    timeH = parseInt(timeMatch[2], 10);
    timeM = parseInt(timeMatch[3], 10);
    timeS = parseInt(timeMatch[4] || '0', 10);
    const isPm = mer === 'pm' || mer === 'م' || mer.startsWith('مساء') || mer.startsWith('p');
    const isAm = mer === 'am' || mer === 'ص' || mer.startsWith('صباح') || mer.startsWith('a');
    if (isPm && timeH < 12) timeH += 12;
    if (isAm && timeH === 12) timeH = 0;
    hasTimeInStr = true;

    // Strip time portion to leave only the date part
    datePartStr = clean.replace(timeRegex, ' ')
      .replace(/\s+(?:at|في|الساعة|بتاريخ|on)\s+/gi, ' ')
      .replace(/^[,\s]+|[,\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 5. Try native Date.parse for standard RFC/ISO/weekday formats (e.g. 'Thu, 25 Sep 2026')
  // Skip native parsing whenever the date part contains numeric D/M/Y tokens to keep DMY day-first semantics consistent
  const hasExplicitYear = /\b20\d{2}\b/.test(clean);
  const hasNumericDmy = /\b\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}\b/.test(datePartStr);
  if (hasExplicitYear && !hasNumericDmy) {
    const nativeParse = new Date(clean);
    if (!isNaN(nativeParse.getTime())) {
      const yr = nativeParse.getFullYear();
      if (yr >= 2000 && yr <= 2100) {
        return { date: formatDateParts(nativeParse), timestamp: formatIsoWithTime(nativeParse, hasTimeInStr) };
      }
    }
  }

  // If no date remains (e.g. '3:55 م' or '10:15 AM' received today), date is refDate
  if (!datePartStr || datePartStr === 'today' || datePartStr === 'اليوم') {
    const d = new Date(refDate);
    d.setHours(timeH, timeM, timeS, 0);
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
  }

  const lowerDate = datePartStr.toLowerCase();

  // 6. Relative day keywords (yesterday, days ago, weeks ago, months ago, أمس, منذ ...)
  if (lowerDate.startsWith('yesterday') || lowerDate === 'أمس' || lowerDate === 'امس') {
    const d = new Date(refDate.getTime() - 86400000);
    d.setHours(timeH, timeM, timeS, 0);
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
  }
  const daysAgoEn = lowerDate.match(/^(\d+)\s+days?\s+ago/);
  const daysAgoAr = lowerDate.match(/^(?:منذ\s+)?(\d+)\s+(?:أيام|ايام|يوم|يوما)/);
  const daysAgoMatch = daysAgoEn || daysAgoAr;
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    const d = new Date(refDate.getTime() - days * 86400000);
    d.setHours(timeH, timeM, timeS, 0);
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
  }
  const weeksAgoMatch = lowerDate.match(/^(\d+)\s+weeks?\s+ago/);
  if (weeksAgoMatch) {
    const d = new Date(refDate.getTime() - parseInt(weeksAgoMatch[1], 10) * 7 * 86400000);
    d.setHours(timeH, timeM, timeS, 0);
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
  }
  const monthsAgoMatch = lowerDate.match(/^(\d+)\s+months?\s+ago/);
  if (monthsAgoMatch) {
    const d = new Date(refDate.getTime() - parseInt(monthsAgoMatch[1], 10) * 30 * 86400000);
    d.setHours(timeH, timeM, timeS, 0);
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
  }

  // 6. Weekdays (English & Arabic)
  const weekdayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  let targetDay = null;
  const enWeekdayMatch = lowerDate.match(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*/i);
  if (enWeekdayMatch) {
    targetDay = weekdayMap[enWeekdayMatch[1].toLowerCase().slice(0, 3)];
  } else {
    for (const [arDay, dayIdx] of Object.entries(ARABIC_WEEKDAYS)) {
      if (datePartStr.includes(arDay)) {
        targetDay = dayIdx;
        break;
      }
    }
  }
  if (targetDay !== null) {
    const hasYear = /\b20\d{2}\b/.test(datePartStr);
    const hasMonthWord = Object.keys(MONTH_MAP).some(m => datePartStr.toLowerCase().includes(m));
    if (!hasYear && !hasMonthWord) {
      let diff = refDate.getDay() - targetDay;
      if (diff <= 0) diff += 7;
      const d = new Date(refDate.getTime() - diff * 86400000);
      d.setHours(timeH, timeM, timeS, 0);
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
    }
  }

  // 7. Explicit YYYY/MM/DD or YYYY-MM-DD (e.g. '2026/09/08', '2026-09-08')
  const ymdMatch = datePartStr.match(/(?:^|\D)(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\D|$)/);
  if (ymdMatch) {
    const yr = parseInt(ymdMatch[1], 10);
    const mo = parseInt(ymdMatch[2], 10);
    const dy = parseInt(ymdMatch[3], 10);
    if (yr >= 2000 && yr <= 2100 && mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
      const d = new Date(yr, mo - 1, dy, timeH, timeM, timeS);
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
    }
  }

  // 8. Named months (Arabic, English, French)
  const explicitYearMatch = datePartStr.match(/\b(20\d{2})\b/);
  const explicitYear = explicitYearMatch ? parseInt(explicitYearMatch[1], 10) : null;

  // Month word then day: 'Sep 8, 2026', 'أيلول 8', 'سبتمبر 8'
  const m1 = datePartStr.match(/(?:^|\s)([a-zA-Z\u0600-\u06FF\s]+?)[.,]?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*|\s+|$)/i);
  if (m1) {
    const key = m1[1].trim().toLowerCase();
    const month = MONTH_MAP[key] || MONTH_MAP[key.slice(0, 3)];
    if (month) {
      const day = parseInt(m1[2], 10);
      let year = explicitYear || refDate.getFullYear();
      if (!explicitYear) {
        const testD = new Date(year, month - 1, day);
        if (testD.getTime() > refDate.getTime() + 86400000 * 2) year -= 1;
      }
      const d = new Date(year, month - 1, day, timeH, timeM, timeS);
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
    }
  }

  // Day then month word: '8 Sep 2026', '8 أيلول 2026', '8 سبتمبر 2026'
  const m2 = datePartStr.match(/(?:^|\s)(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z\u0600-\u06FF\s]+?)[.,]?(?:\s*,\s*|\s+|$)/i);
  if (m2) {
    const key = m2[2].trim().toLowerCase();
    const month = MONTH_MAP[key] || MONTH_MAP[key.slice(0, 3)];
    if (month) {
      const day = parseInt(m2[1], 10);
      let year = explicitYear || refDate.getFullYear();
      if (!explicitYear) {
        const testD = new Date(year, month - 1, day);
        if (testD.getTime() > refDate.getTime() + 86400000 * 2) year -= 1;
      }
      const d = new Date(year, month - 1, day, timeH, timeM, timeS);
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
    }
  }

  // 9. Slash/Dot calendar formats: DD/MM/YYYY, DD.MM.YYYY
  const dmyMatch = datePartStr.match(/(?:^|\D)(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})(?:\D|$)/);
  if (dmyMatch) {
    let p1 = parseInt(dmyMatch[1], 10);
    let p2 = parseInt(dmyMatch[2], 10);
    let yr = parseInt(dmyMatch[3], 10);
    if (yr < 100) yr += 2000;
    let day = null, month = null;
    if (p1 > 12) { day = p1; month = p2; }
    else if (p2 > 12) { month = p1; day = p2; }
    else if (targetDay !== null) {
      // Disambiguate via weekday token if present (e.g. 'Thu 9/10/2026')
      const d1 = new Date(yr, p2 - 1, p1);
      const d2 = new Date(yr, p1 - 1, p2);
      if (d1.getDay() === targetDay) { day = p1; month = p2; }
      else if (d2.getDay() === targetDay) { day = p2; month = p1; }
      else { day = p1; month = p2; }
    } else {
      day = p1; month = p2; // Default international day-first
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && yr >= 2000 && yr <= 2100) {
      const d = new Date(yr, month - 1, day, timeH, timeM, timeS);
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
    }
  }

  // 10. Native Date fallback (only for strings with an explicit 4-digit year)
  if (hasExplicitYear) {
    const nativeParse = new Date(clean);
    if (!isNaN(nativeParse.getTime())) {
      const yr = nativeParse.getFullYear();
      if (yr >= 2000 && yr <= 2100) {
        return { date: formatDateParts(nativeParse), timestamp: formatIsoWithTime(nativeParse, hasTimeInStr) };
      }
    }
  }

  return fallback;
}

// Extract email address inside angle brackets or quotes
function extractEmailAddress(rawStr) {
  if (!rawStr) return '';
  const match = rawStr.match(/<([^>]+)>/) || rawStr.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].trim() : rawStr.trim();
}

// Clean HTML message body: strips quotes, scripts, hidden trackers, signatures
function cleanEmailBody(bodyNode) {
  if (!bodyNode) return { body: '', snippet: '' };
  const clone = bodyNode.cloneNode(true);

  // Remove quote trees
  const quoteSelectors = [
    '.gmail_quote', 'blockquote', '.gmail_extra',
    'div[id*="divRplyFwdMsg"]', '.divRplyFwdMsg', '#appendonsend',
    'div[data-smartmail="gmail_signature"]', '.gmail_signature'
  ];
  quoteSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Remove tracking pixels and scripts/styles
  clone.querySelectorAll('script, style, link, meta').forEach(el => el.remove());
  clone.querySelectorAll('img').forEach(img => {
    const w = img.getAttribute('width');
    const h = img.getAttribute('height');
    const style = img.getAttribute('style') || '';
    if (w === '1' || h === '1' || style.includes('display: none') || style.includes('display:none')) {
      img.remove();
    }
  });

  // Preserve hyperlinks before innerText strips them
  clone.querySelectorAll('a[href]').forEach(a => {
    const href = (a.getAttribute('href') || '').trim();
    const label = (a.innerText || a.textContent || '').trim();
    if (!label) return;

    if (/^https?:\/\//i.test(href)) {
      if (label === href) {
        a.replaceWith(document.createTextNode(href));
      } else {
        a.replaceWith(document.createTextNode(`[${label}](${href})`));
      }
    } else if (/^mailto:/i.test(href)) {
      a.replaceWith(document.createTextNode(href.replace(/^mailto:/i, '')));
    } else {
      // Leave unsupported-scheme anchors as their plain text labels
      a.replaceWith(document.createTextNode(label));
    }
  });

  // Preserve bold formatting
  clone.querySelectorAll('strong, b').forEach(el => {
    const boldText = (el.innerText || el.textContent || '').trim();
    if (boldText) {
      el.replaceWith(document.createTextNode(`**${boldText}**`));
    }
  });

  // Convert line breaks and paragraph spacing
  let text = clone.innerText || clone.textContent || '';
  // Normalize whitespace
  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // Generate snippet (strip markdown markers for clean snippet)
  const snippet = text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .slice(0, 200)
    .replace(/\s+/g, ' ')
    .trim();
  return { body: text, snippet };
}

// Detect the active user's email address directly from the webmail DOM/environment
function detectWebmailAccountEmail() {
  const host = window.location.hostname.toLowerCase();

  if (host.includes('mail.google.com')) {
    // 1. From document.title: e.g. "Sent Mail - user@gmail.com - Gmail" or "Subject - user@gmail.com - Gmail"
    const titleMatch = (document.title || '').match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*-\s*Gmail/i);
    if (titleMatch) return titleMatch[1].toLowerCase().trim();

    // 2. From top-right Google Account button / profile badge
    const accountSelectors = [
      'header a[aria-label*="@"]',
      'header div[aria-label*="@"]',
      'a[href*="SignOutOptions"]',
      '[aria-label*="Google Account"]',
      '.gb_A[aria-label*="@"]',
      '.gb_d[aria-label*="@"]',
      'div[data-ogpc] [aria-label*="@"]'
    ];
    for (const sel of accountSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '');
        const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (match) return match[1].toLowerCase().trim();
      }
    }
  } else if (host.includes('outlook.')) {
    const outlookSelectors = [
      'header button[aria-label*="@"]',
      'header [data-testid="persona"]',
      '#O365_MainLink_Me[aria-label*="@"]',
      '#mectrl_main_trigger',
      '#meControl'
    ];
    for (const sel of outlookSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '';
        const match = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (match) return match[1].toLowerCase().trim();
      }
    }
  }

  return '';
}

// Robust recipient extraction for Gmail messages
function extractGmailRecipient(activeMessage, senderEmail, userEmail) {
  let recipientName = '';
  let recipientEmail = '';

  const excluded = [senderEmail, userEmail].filter(Boolean).map(e => e.toLowerCase().trim());

  // Priority 1: Check known Gmail recipient elements inside active message
  const selectors = [
    '.g2[email]',
    '.g2',
    '.qu[email]',
    '.qu',
    '.gI [email]',
    '.gI [data-hovercard-id]',
    '.gI',
    '.hb span[email]',
    '.hb span[data-hovercard-id]',
    'span[email]:not(.gD)',
    'span[data-hovercard-id]:not(.gD)',
    'td.eV span[email]',
    'table.cf.gJ tr span[email]'
  ];

  for (const sel of selectors) {
    const el = activeMessage ? activeMessage.querySelector(sel) : null;
    if (el) {
      const em = el.getAttribute('email') || el.getAttribute('data-hovercard-id') || extractEmailAddress(el.getAttribute('title') || el.textContent);
      if (em && !excluded.includes(em.toLowerCase().trim())) {
        recipientEmail = em.trim();
        recipientName = cleanText(el.getAttribute('name') || el.textContent.replace(/<[^>]+>/g, '') || '');
        break;
      } else if (!recipientName && el.textContent) {
        const cleaned = cleanText(el.textContent.replace(/<[^>]+>/g, ''));
        if (cleaned && cleaned.toLowerCase() !== 'me' && !cleaned.toLowerCase().startsWith('to me')) {
          recipientName = cleaned.replace(/^to\s+/i, '').trim();
        }
      }
    }
  }

  // Priority 2: Check any element in activeMessage with email/hovercard that isn't the sender
  if (!recipientEmail && activeMessage) {
    const candidates = Array.from(activeMessage.querySelectorAll('[email], [data-hovercard-id]'));
    for (const el of candidates) {
      if (el.classList.contains('gD')) continue;
      const em = el.getAttribute('email') || el.getAttribute('data-hovercard-id') || extractEmailAddress(el.textContent);
      if (em && !excluded.includes(em.toLowerCase().trim())) {
        recipientEmail = em.trim();
        if (!recipientName) {
          recipientName = cleanText(el.getAttribute('name') || el.textContent.replace(/<[^>]+>/g, '') || '');
        }
        break;
      }
    }
  }

  // Priority 3: Details table rows (To:)
  if (!recipientEmail && activeMessage) {
    const rows = Array.from(activeMessage.querySelectorAll('table.cf.gJ tr, table[role="presentation"] tr'));
    for (const tr of rows) {
      const text = tr.textContent.trim().toLowerCase();
      if (text.startsWith('to:') || text.startsWith('to ') || tr.querySelector('td[id*=":to"]')) {
        const emEl = tr.querySelector('[email], [data-hovercard-id]');
        if (emEl) {
          const em = emEl.getAttribute('email') || emEl.getAttribute('data-hovercard-id') || extractEmailAddress(emEl.textContent);
          if (em && !excluded.includes(em.toLowerCase().trim())) {
            recipientEmail = em.trim();
            if (!recipientName) recipientName = cleanText(emEl.getAttribute('name') || emEl.textContent.replace(/<[^>]+>/g, '') || '');
            break;
          }
        }
        const rawEm = extractEmailAddress(tr.textContent);
        if (rawEm && !excluded.includes(rawEm.toLowerCase().trim())) {
          recipientEmail = rawEm.trim();
          break;
        }
      }
    }
  }

  // Priority 4: Search for any email address in the message header area (.gE, .adn, .ajA) that isn't the user's
  if (!recipientEmail && activeMessage) {
    const headerEl = activeMessage.querySelector('.gE, .adn, .ajA');
    if (headerEl) {
      const match = (headerEl.innerText || headerEl.textContent || '').match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
      if (match) {
        for (const em of match) {
          if (!excluded.includes(em.toLowerCase().trim())) {
            recipientEmail = em.trim();
            break;
          }
        }
      }
    }
  }

  // Clean up recipientName if it has "to " prefix
  recipientName = recipientName.replace(/^to\s+/i, '').trim();

  return { recipientName, recipientEmail };
}

// Parse active Gmail email thread
function parseGmailThread(currentUserEmail) {
  const detectedUserEmail = detectWebmailAccountEmail();
  const effectiveUserEmail = (currentUserEmail || detectedUserEmail || '').toLowerCase().trim();

  // 1. Subject extraction
  let subject = '';
  const subjectEl = document.querySelector('h2.hP, h2[data-thread-perm-id], div[role="main"] h2');
  if (subjectEl) {
    subject = cleanText(subjectEl.textContent);
  }
  if (!subject) {
    // Gmail document title format: "[Subject] - [User Email] - Gmail" or "[Subject] - Gmail"
    const docTitle = document.title || '';
    const cleanTitle = docTitle.replace(/\s*-\s*[^@\s]+@[^@\s]+\s*-\s*Gmail$/i, '').replace(/\s*-\s*Gmail$/i, '').trim();
    if (cleanTitle && !cleanTitle.toLowerCase().includes('inbox') && !cleanTitle.toLowerCase().includes('gmail')) {
      subject = cleanTitle;
    }
  }

  // 2. Identify all messages in thread; target the latest open/expanded message
  const bodyEls = Array.from(document.querySelectorAll('div[role="main"] .a3s.aiL, div[role="main"] .a3s'));
  const lastBody = bodyEls.length > 0 ? bodyEls[bodyEls.length - 1] : null;
  const messages = Array.from(document.querySelectorAll('div[role="main"] .adn.ads, div[role="main"] .gE.iv.gt, div[role="main"] div[data-message-id]'));
  const activeMessage = (lastBody && (lastBody.closest('.adn, .gE, div[data-message-id]') || lastBody.closest('[role="listitem"]'))) ||
                        messages[messages.length - 1] || 
                        document.querySelector('div[role="main"]');

  let senderName = '';
  let senderEmail = '';
  let rawDate = '';
  let bodyText = '';
  let snippetText = '';

  if (activeMessage) {
    const senderEl = activeMessage.querySelector('.gD') || document.querySelector('div[role="main"] span.gD');
    if (senderEl) {
      senderEmail = senderEl.getAttribute('email') || senderEl.getAttribute('data-hovercard-id') || extractEmailAddress(senderEl.textContent);
      senderName = senderEl.getAttribute('name') || cleanText(senderEl.textContent.replace(/<[^>]+>/g, ''));
    }

    // Extract date string candidate
    const candidateDateSelectors = [
      'td.gH span.g3',
      'td.gH [title]',
      'td.gH .gK span',
      'td.gH span',
      '.gK span.g3',
      'span.g3',
      'span.bi4',
      'span.mI',
      '[data-timestamp]',
      'time',
      '[datetime]',
      'table.cf.gJ td.gH *',
      '.gE [title]',
      '.adn [title]'
    ];

    for (const sel of candidateDateSelectors) {
      const el = activeMessage ? activeMessage.querySelector(sel) : null;
      const extracted = extractDateStringFromElement(el);
      if (extracted) {
        rawDate = extracted;
        break;
      }
    }

    // Fallback across document if activeMessage didn't yield a valid date
    if (!rawDate) {
      const globalSelectors = [
        'div[role="main"] td.gH span[title]',
        'div[role="main"] td.gH span',
        'div[role="main"] span.g3',
        'div[role="main"] span.bi4',
        'div[role="main"] [data-timestamp]',
        'div[role="main"] time'
      ];
      for (const sel of globalSelectors) {
        const els = Array.from(document.querySelectorAll(sel));
        for (let i = els.length - 1; i >= 0; i--) {
          const extracted = extractDateStringFromElement(els[i]);
          if (extracted) {
            rawDate = extracted;
            break;
          }
        }
        if (rawDate) break;
      }
    }

    const bodyEl = lastBody || activeMessage.querySelector('.a3s.aiL, .a3s');
    if (bodyEl) {
      const cleaned = cleanEmailBody(bodyEl);
      bodyText = cleaned.body;
      snippetText = cleaned.snippet;
    }
  }

  // Extract Recipient robustly
  const { recipientName, recipientEmail } = extractGmailRecipient(activeMessage, senderEmail, effectiveUserEmail);

  // Direction: Outbound vs Inbound
  const urlHash = (window.location.hash || '').toLowerCase();
  const urlPath = (window.location.pathname || '').toLowerCase();
  const isSentFolder = /^#sent(?:\/|$)/.test(urlHash) || 
                       /(?:^|\/)sentitems(?:\/|$)/.test(urlPath);

  const isSenderMe = senderName.toLowerCase() === 'me' || 
                     senderEmail.toLowerCase() === 'me' ||
                     /^me$/i.test(senderName.trim()) ||
                     senderName.toLowerCase().startsWith('me,');

  const isSenderUser = Boolean(
    effectiveUserEmail && 
    senderEmail && 
    senderEmail.toLowerCase().trim() === effectiveUserEmail
  );

  const isSenderExternal = Boolean(
    effectiveUserEmail &&
    senderEmail &&
    senderEmail.toLowerCase().trim() !== effectiveUserEmail
  );

  const isOutbound = (isSenderMe || isSenderUser) || (isSentFolder && !isSenderExternal);
  const direction = isOutbound ? 'outbound' : 'inbound';

  // For outbound emails the counterparty is strictly the recipient, never the sender
  let counterparty = '';
  let counterpartyName = '';
  let counterpartyEmail = '';

  if (isOutbound) {
    counterpartyEmail = recipientEmail || '';
    counterpartyName = recipientName || '';
    counterparty = recipientEmail || recipientName || '';

    // Safety guard: if counterpartyEmail matches user or sender, discard it!
    const userEmails = [effectiveUserEmail, senderEmail].filter(Boolean).map(e => e.toLowerCase().trim());
    if (userEmails.includes((counterpartyEmail || '').toLowerCase().trim())) {
      counterpartyEmail = '';
      counterparty = recipientName || '';
    }
  } else {
    counterpartyEmail = senderEmail || '';
    counterpartyName = senderName || '';
    counterparty = senderEmail || senderName || '';
  }

  // Extract counterparty domain
  let counterpartyDomain = '';
  if (counterpartyEmail && counterpartyEmail.includes('@')) {
    counterpartyDomain = counterpartyEmail.split('@')[1].toLowerCase().trim();
  }

  // ATS Disambiguation: exact-domain or dot-suffix matching via isAtsHost
  const isAts = isAtsHost(counterpartyDomain) ||
    isAtsHost(domainFromEmail(senderEmail)) ||
    isAtsHost(domainFromEmail(recipientEmail));

  return {
    provider: 'gmail',
    subject: subject || 'Email Message',
    sender: senderName ? `${senderName} <${senderEmail}>` : senderEmail,
    senderEmail,
    senderName,
    recipient: recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail,
    recipientEmail,
    recipientName,
    counterparty,
    counterpartyName,
    counterpartyEmail,
    counterpartyDomain,
    isAts,
    ...(() => { const p = parseDateToIso(rawDate); return { date: p.date, timestamp: p.timestamp }; })(),
    direction,
    body: bodyText,
    snippet: snippetText,
    emailUrl: window.location.href,
  };
}

// Parse active Outlook Web email thread
function parseOutlookThread(currentUserEmail) {
  const detectedUserEmail = detectWebmailAccountEmail();
  const effectiveUserEmail = (currentUserEmail || detectedUserEmail || '').toLowerCase().trim();

  // 1. Subject extraction
  let subject = '';
  const subjectEl = document.querySelector('div[role="heading"][aria-level="2"], div[aria-label*="Subject"]');
  if (subjectEl) {
    subject = cleanText(subjectEl.textContent);
  }
  if (!subject) {
    const docTitle = document.title || '';
    const cleanTitle = docTitle.replace(/\s*-\s*Outlook$/i, '').trim();
    if (cleanTitle && !cleanTitle.toLowerCase().includes('inbox')) {
      subject = cleanTitle;
    }
  }

  // 2. Sender and Recipient
  let senderName = '';
  let senderEmail = '';
  const senderEl = document.querySelector('div[aria-label*="From"] button, .personaTitle');
  if (senderEl) {
    senderName = cleanText(senderEl.textContent);
    senderEmail = extractEmailAddress(senderEl.getAttribute('title') || senderEl.textContent);
  }

  let recipientName = '';
  let recipientEmail = '';
  const recipientEl = document.querySelector('div[aria-label*="To"] button, div[aria-label*="To"] span, .personaTitle:not(:first-child)');
  if (recipientEl) {
    recipientName = cleanText(recipientEl.textContent);
    recipientEmail = extractEmailAddress(recipientEl.getAttribute('title') || recipientEl.textContent);
  }

  // 3. Date
  let rawDate = '';
  const outlookDateSelectors = [
    'div[role="main"] time',
    'div[data-testid="readingPane"] time',
    'time',
    'div[role="main"] [aria-label*="Received"]',
    'div[role="main"] [aria-label*="Date"]',
    'div[role="main"] span[title*="202"]',
    'div[data-testid="readingPane"] span[title*="202"]',
    '[datetime]'
  ];

  for (const sel of outlookDateSelectors) {
    const el = document.querySelector(sel);
    const extracted = extractDateStringFromElement(el);
    if (extracted) {
      rawDate = extracted;
      break;
    }
  }

  // 4. Body
  let bodyText = '';
  let snippetText = '';
  const bodyEl = document.querySelector('div[aria-label="Message body"], .allowTextSelection');
  if (bodyEl) {
    const cleaned = cleanEmailBody(bodyEl);
    bodyText = cleaned.body;
    snippetText = cleaned.snippet;
  }

  const isSentFolder = /(?:^|\/)sentitems(?:\/|$)/.test(window.location.pathname.toLowerCase()) ||
                       window.location.hash.toLowerCase().includes('sentitems');
  const isSenderMe = senderName.toLowerCase() === 'me' || (senderName === '' && senderEmail.toLowerCase() === 'me');
  const isSenderUser = Boolean(
    effectiveUserEmail && 
    senderEmail && 
    senderEmail.toLowerCase().trim() === effectiveUserEmail
  );
  const isSenderExternal = Boolean(
    effectiveUserEmail &&
    senderEmail &&
    senderEmail.toLowerCase().trim() !== effectiveUserEmail
  );
  const isOutbound = (isSenderMe || isSenderUser) || (isSentFolder && !isSenderExternal);
  const direction = isOutbound ? 'outbound' : 'inbound';

  let counterparty = '';
  let counterpartyName = '';
  let counterpartyEmail = '';

  if (isOutbound) {
    counterpartyEmail = recipientEmail || '';
    counterpartyName = recipientName || '';
    counterparty = recipientEmail || recipientName || '';

    const userEmails = [effectiveUserEmail, senderEmail].filter(Boolean).map(e => e.toLowerCase().trim());
    if (userEmails.includes((counterpartyEmail || '').toLowerCase().trim())) {
      counterpartyEmail = '';
      counterparty = recipientName || '';
    }
  } else {
    counterpartyEmail = senderEmail || '';
    counterpartyName = senderName || '';
    counterparty = senderEmail || senderName || '';
  }

  let counterpartyDomain = '';
  if (counterpartyEmail && counterpartyEmail.includes('@')) {
    counterpartyDomain = counterpartyEmail.split('@')[1].toLowerCase().trim();
  }
  const isAts = isAtsHost(counterpartyDomain) ||
    isAtsHost(domainFromEmail(senderEmail)) ||
    isAtsHost(domainFromEmail(recipientEmail));

  return {
    provider: 'outlook',
    subject: subject || 'Email Message',
    sender: senderName ? `${senderName} <${senderEmail}>` : senderEmail,
    senderEmail,
    senderName,
    recipient: recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail,
    recipientEmail,
    recipientName,
    counterparty,
    counterpartyName,
    counterpartyEmail,
    counterpartyDomain,
    isAts,
    ...(() => { const p = parseDateToIso(rawDate); return { date: p.date, timestamp: p.timestamp }; })(),
    direction,
    body: bodyText,
    snippet: snippetText,
    emailUrl: window.location.href,
  };
}


function extractEmailData(currentUserEmail) {
  const host = window.location.hostname.toLowerCase();
  if (host.includes('mail.google.com')) {
    return parseGmailThread(currentUserEmail);
  } else if (host.includes('outlook.')) {
    return parseOutlookThread(currentUserEmail);
  }
  return null;
}

// --- Side Panel Messaging Protocol & Extraction Handlers ---

function ensureTransientHighlightStyles() {
  if (document.getElementById('tracklet-transient-highlight-style')) return;
  const style = document.createElement('style');
  style.id = 'tracklet-transient-highlight-style';
  style.textContent = `
    .tracklet-transient-highlight {
      outline: 2px solid #2563eb !important;
      outline-offset: 2px !important;
      transition: outline 0.2s ease, box-shadow 0.2s ease !important;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25) !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function detectAtsForm() {
  const host = window.location.hostname.toLowerCase();
  let ats = null;
  let formSelector = '';
  let formElementFound = false;

  if (host.includes('greenhouse.io') || document.querySelector('#application_form, form[action*="greenhouse"]')) {
    ats = 'greenhouse';
    formSelector = '#application_form, form[action*="greenhouse"], form#apply_form';
  } else if (host.includes('lever.co') || document.querySelector('.application-form, form#application-form')) {
    ats = 'lever';
    formSelector = '.application-form, form#application-form';
  } else if (host.includes('workdayjobs.com') || host.includes('myworkday.com') || document.querySelector('form[data-automation-id*="application"]')) {
    ats = 'workday';
    formSelector = 'form[data-automation-id*="application"], form[data-automation-id="applicationForm"]';
  } else {
    const genericForm = document.querySelector('form:has(input[type="email"]), form:has(input[autocomplete*="name"])');
    if (genericForm) {
      ats = 'generic';
      formSelector = 'form';
    }
  }

  let formEl = formSelector ? document.querySelector(formSelector) : null;
  if (!formEl && ats) {
    formEl = document.querySelector('form');
  }
  formElementFound = Boolean(formEl);

  const fieldsMatched = [];
  const unmatchedFields = [];

  const fieldDefinitions = [
    {
      candidateKey: 'fullName',
      selectors: ['input[name="name"]', 'input[autocomplete="name"]', 'input#name', 'input[placeholder*="Full Name" i]'],
      fieldType: 'text',
      label: 'Full Name'
    },
    {
      candidateKey: 'firstName',
      selectors: ['input[name*="first_name" i]', 'input[autocomplete="given-name"]', 'input#first_name', 'input[data-automation-id*="firstName" i]', 'input[placeholder*="First Name" i]'],
      fieldType: 'text',
      label: 'First Name'
    },
    {
      candidateKey: 'lastName',
      selectors: ['input[name*="last_name" i]', 'input[autocomplete="family-name"]', 'input#last_name', 'input[data-automation-id*="lastName" i]', 'input[placeholder*="Last Name" i]'],
      fieldType: 'text',
      label: 'Last Name'
    },
    {
      candidateKey: 'email',
      selectors: ['input[type="email"]', 'input[name*="email" i]', 'input[autocomplete="email"]', 'input#email', 'input[data-automation-id*="email" i]'],
      fieldType: 'email',
      label: 'Email'
    },
    {
      candidateKey: 'phone',
      selectors: ['input[type="tel"]', 'input[name*="phone" i]', 'input[autocomplete="tel"]', 'input#phone', 'input[data-automation-id*="phone" i]'],
      fieldType: 'tel',
      label: 'Phone'
    },
    {
      candidateKey: 'location',
      selectors: ['input[name*="location" i]', 'input[name*="city" i]', 'input[autocomplete="address-level2"]', 'input#location'],
      fieldType: 'text',
      label: 'Location / City'
    },
    {
      candidateKey: 'linkedInUrl',
      selectors: ['input[name*="linkedin" i]', 'input[name*="urls[LinkedIn]"]', 'input[placeholder*="linkedin" i]', 'input[id*="linkedin" i]'],
      fieldType: 'url',
      label: 'LinkedIn Profile'
    },
    {
      candidateKey: 'githubUrl',
      selectors: ['input[name*="github" i]', 'input[name*="urls[GitHub]"]', 'input[placeholder*="github" i]', 'input[id*="github" i]'],
      fieldType: 'url',
      label: 'GitHub URL'
    },
    {
      candidateKey: 'portfolioUrl',
      selectors: ['input[name*="portfolio" i]', 'input[name*="website" i]', 'input[name*="urls[Portfolio]"]', 'input[placeholder*="website" i]', 'input[placeholder*="portfolio" i]'],
      fieldType: 'url',
      label: 'Portfolio / Website'
    }
  ];

  for (const def of fieldDefinitions) {
    let matchedEl = null;
    let chosenSelector = '';

    for (const sel of def.selectors) {
      const el = (formEl || document).querySelector(sel);
      if (el && !fieldsMatched.some(f => f.targetSelector === sel)) {
        matchedEl = el;
        chosenSelector = sel;
        break;
      }
    }

    if (matchedEl) {
      fieldsMatched.push({
        candidateKey: def.candidateKey,
        targetSelector: chosenSelector,
        fieldType: def.fieldType,
        label: def.label,
        confidence: 0.95
      });
    } else {
      unmatchedFields.push(def.candidateKey);
    }
  }

  return {
    ats,
    confidence: formElementFound ? (ats ? 0.95 : 0.7) : 0.0,
    formElementFound,
    formSelector: formSelector || 'form',
    fieldsMatched,
    unmatchedFields
  };
}

function setNativeInputValue(element, value) {
  if (!element || value === undefined || value === null) return;
  const isTextArea = element instanceof HTMLTextAreaElement;
  const prototype = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

  if (descriptor && descriptor.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function executeAutofill(profile) {
  if (!profile) {
    return { fieldsPopulatedCount: 0, populatedFields: [], manualFieldsRequired: [] };
  }

  const detection = detectAtsForm();
  const formRoot = (detection.formSelector && detection.formSelector !== 'form' ? document.querySelector(detection.formSelector) : null) || document;
  const populatedFields = [];
  const manualFieldsRequired = [];

  for (const match of detection.fieldsMatched) {
    const val = profile[match.candidateKey];
    if (val) {
      const el = formRoot.querySelector(match.targetSelector);
      if (el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
        setNativeInputValue(el, val);
        populatedFields.push({
          candidateKey: match.candidateKey,
          targetSelector: match.targetSelector,
          label: match.label,
          valueSnippet: String(val).slice(0, 30)
        });
      }
    }
  }

  // Check for resume file upload input
  const fileInput = formRoot.querySelector('input[type="file"]');
  if (fileInput) {
    manualFieldsRequired.push({
      field: 'Resume File Upload',
      reason: 'file_attachment',
      selector: 'input[type="file"]'
    });
  }

  return {
    fieldsPopulatedCount: populatedFields.length,
    populatedFields,
    manualFieldsRequired
  };
}

function scrollToField(targetSelector) {
  try {
    ensureTransientHighlightStyles();
    const detection = detectAtsForm();
    const formRoot = (detection.formSelector ? document.querySelector(detection.formSelector) : null) || document;
    const el = formRoot.querySelector(targetSelector) || document.querySelector(targetSelector);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
    el.classList.add('tracklet-transient-highlight');
    setTimeout(() => {
      el.classList.remove('tracklet-transient-highlight');
    }, 1500);
    return true;
  } catch (err) {
    console.warn('[Tracklet] Failed to scroll to field:', err);
    return false;
  }
}

function inferContactCategoryContent(headline) {
  if (!headline) return 'Other';
  const clean = headline.trim().toLowerCase();

  // 1. Recruiter & Talent Acquisition keywords
  if (/(?:talent|recruiter|recruiting|sourcer|staffing|people\s+ops|technical\s+sourcer|hr\b|human\s+resources)/i.test(clean)) {
    return 'Recruiter';
  }

  // 2. Leadership & Hiring Manager keywords
  if (/(?:vp|vice\s+president|director|head\s+of|engineering\s+manager|cto|ceo|coo|cpo|chief|founder|co-founder|tech\s+lead\s+manager|hiring\s+manager)/i.test(clean)) {
    return 'Hiring Manager';
  }

  // 3. Mentorship & Advisory keywords
  if (/(?:mentor|advisor|coach|career\s+guide|instructor|professor|lecturer)/i.test(clean)) {
    return 'Mentor';
  }

  // 4. Peer / Alumni keywords
  if (/(?:peer|alumni|fellow|graduate|class\s+of|engineer|developer|designer|architect|scientist|product\s+manager|program\s+manager|analyst|devops|sre|qa|tester|consultant|specialist|lead)/i.test(clean)) {
    return 'Peer / Alumni';
  }

  return 'Other';
}

// Per-URL cache of LinkedIn profile fields so scrolling down enriches fields without losing top-card data
var lastLinkedInProfileCache = typeof lastLinkedInProfileCache !== 'undefined' ? lastLinkedInProfileCache : new Map();

function getCachedLinkedInProfile(url) {
  if (!url) return {};
  const inMem = lastLinkedInProfileCache.get(url);
  if (inMem) return inMem;
  try {
    const raw = window.sessionStorage && window.sessionStorage.getItem('tracklet_li_profile_cache_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed[url]) {
        lastLinkedInProfileCache.set(url, parsed[url]);
        return parsed[url];
      }
    }
  } catch {}
  return {};
}

function setCachedLinkedInProfile(url, profile) {
  if (!url || !profile) return;
  lastLinkedInProfileCache.set(url, profile);
  try {
    if (window.sessionStorage) {
      const raw = window.sessionStorage.getItem('tracklet_li_profile_cache_v1');
      const store = raw ? JSON.parse(raw) : {};
      store[url] = profile;
      window.sessionStorage.setItem('tracklet_li_profile_cache_v1', JSON.stringify(store));
    }
  } catch {}
}

function isLinkedInProfileNoiseLine(rawLine) {
  if (!rawLine) return true;
  const line = rawLine.replace(/^[·•|,\-–—\s]+|[·•|,\-–—\s]+$/g, '').trim();
  if (!line) return true;
  return /^(?:1st|2nd|3rd|(?:1st|2nd|3rd)\s+degree(?:\s+connection)?|Following|Follow|Connect|Message|Send\s+a\s+message|More|Pending|Edit\s+profile|Add\s+profile\s+section|Open\s+to|Open\s+to\s+work|Hiring|Enhance\s+profile|Resources|Contact\s+info|View\s+my\s+services|View\s+services|See\s+all\s+services|Request\s+services|Book\s+an\s+appointment|Visit\s+my\s+website|View\s+my\s+portfolio|View\s+my\s+newsletter|View\s+my\s+blog|\d[\d,.]*\+?\s*(?:connections|followers|mutual\s+connections|контакт.*|подписчик.*)|(?:\()?he\/him(?:\))?|(?:\()?she\/her(?:\))?|(?:\()?they\/them(?:\))?|•|·)$/i.test(line);
}

// Clean marketing noise from top-card LinkedIn headlines used only when Experience section is not yet mounted
function cleanLinkedInTopCardHeadlineFallback(rawHeadline) {
  if (!rawHeadline) return '';
  let cleaned = rawHeadline
    // Strip flag and decorative emojis
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u2600-\u27BF\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If the headline has pipe/bullet-separated marketing segments and either contains "@ / at <Company>" or parenthetical keyword lists or > 1 pipe, take the first primary role segment
  const pipeSegments = cleaned.split(/\s*[|•·]\s*/).map(s => s.trim()).filter(Boolean);
  if (pipeSegments.length > 1) {
    const firstSeg = pipeSegments[0];
    if (/(?:\bat\b|@)\s+/i.test(firstSeg) || /\([^)]*[-/,][^)]*\)/.test(cleaned) || pipeSegments.length >= 3 || cleaned.length > 68) {
      cleaned = firstSeg;
    }
  }

  // Strip trailing "@ Company" or "at Company" from the role title
  cleaned = cleaned.replace(/\s+(?:@|\bat\b)\s+[^|•·,\n]+$/i, '').trim();
  return cleaned || rawHeadline.trim();
}

// Fallback parser for LinkedIn embedded <code> JSON payloads when #experience is not yet scrolled into view
function parseLinkedInEmbeddedExperienceJson(docRoot) {
  try {
    const root = docRoot || document;
    const codeNodes = Array.from(root.querySelectorAll('code, script[type="application/json"]'));
    const positions = [];

    for (const node of codeNodes) {
      const txt = node.textContent || '';
      if (!txt.includes('companyName') || !txt.includes('title')) continue;
      if (txt.length > 1500000) continue;
      let parsed = null;
      try {
        parsed = JSON.parse(txt);
      } catch {
        continue;
      }
      const included = Array.isArray(parsed?.included)
        ? parsed.included
        : (Array.isArray(parsed?.data?.included) ? parsed.data.included : []);
      for (const item of included) {
        if (!item || typeof item !== 'object') continue;
        const typeStr = String(item.$type || item._type || '').toLowerCase();
        const rawTitle = typeof item.title === 'string' ? item.title : '';
        const rawCompany = typeof item.companyName === 'string' ? item.companyName : '';
        if (!rawTitle || !rawCompany) continue;
        if (typeStr && !typeStr.includes('position') && !typeStr.includes('experience') && !item.dateRange && !item.timePeriod) {
          continue;
        }
        const dr = item.dateRange || item.timePeriod || {};
        const start = dr.start || dr.startDate || {};
        const end = dr.end || dr.endDate || null;
        const isCurrent = !end || Object.keys(end).length === 0;
        const startYear = Number(start.year) || 0;
        const startMonth = Number(start.month) || 0;
        const rawLocation = typeof item.locationName === 'string'
          ? item.locationName
          : (typeof item.geoLocationName === 'string' ? item.geoLocationName : '');
        positions.push({
          roleTitle: cleanText(rawTitle),
          company: cleanText(rawCompany.split(/\s*[·•]\s*/)[0] || ''),
          location: cleanText(rawLocation.split(/\s*[·•]\s*/)[0] || ''),
          isCurrent,
          isFullTime: true,
          startYear,
          startMonth
        });
      }
    }

    if (positions.length === 0) return null;
    positions.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      if (b.startYear !== a.startYear) return b.startYear - a.startYear;
      return b.startMonth - a.startMonth;
    });

    const latest = positions[0];
    return {
      organization: latest.company || '',
      firstOrganization: latest.company || '',
      primaryRole: latest.roleTitle || '',
      location: latest.location || '',
      entries: positions
    };
  } catch {
    return null;
  }
}

// Parse LinkedIn Experience section (resilient to obfuscated SDUI classes, single-role items, grouped multi-role company items, and pure div layouts)
function parseLinkedInExperienceSection(docRoot) {
  const root = docRoot || document;
  const EMPLOYMENT_TYPE_REGEX = /\b(?:Full-time|Part-time|Contract|Freelance|Self-employed|Internship|Apprenticeship|Seasonal|Temporary|Volunteer|Полная занятость|Частичная занятость|Контракт|Фриланс|Стажировка)\b/i;
  const STANDALONE_EMPLOYMENT_TYPE_REGEX = /^(?:[·•|,\-–—\s])*(?:Full-time|Part-time|Contract|Freelance|Self-employed|Internship|Apprenticeship|Seasonal|Temporary|Volunteer|Полная занятость|Частичная занятость|Контракт|Фриланс|Стажировка|Самозанятый|Vollzeit|Teilzeit|Temps plein|Temps partiel|Jornada completa|Tiempo parcial|Tempo pieno|Fulltime|Parttime)(?:[·•|,\-–—\s])*$/i;
  const WORKPLACE_TYPE_REGEX = /\b(?:Hybrid|Remote|On-site|Onsite|Гибридный|Удаленно|Офис|На месте)\b/i;
  const STANDALONE_WORKPLACE_TYPE_REGEX = /^(?:[·•|,\-–—\s])*(?:Hybrid|Remote|On-site|Onsite|Гибридный|Удаленно|Офис|На месте|Vor Ort|À distance|Hybride|Presencial|Remoto|Híbrido)(?:[·•|,\-–—\s])*$/i;
  const MONTH_TOKEN_PATTERN = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Янв|Фев|Мар|Апр|Май|Июн|Июл|Авг|Сен|Окт|Ноя|Дек|Mär|Mai|Okt|Dez|Févr|Avr|Juin|Juil|Août|Déc|Ene|Abr|Ago|Dic)[a-zа-яäöüéû.]*';
  const ROLE_DATE_RANGE_REGEX = new RegExp(
    `(?:(?:\\b${MONTH_TOKEN_PATTERN}\\s+(?:19|20)\\d{2}|\\b(?:19|20)\\d{2})\\s*[-–—]\\s*(?:Present|Current|Now|настоящее время|сейчас|heute|actuel|actualidad|aujourd'hui|heden|(?:\\b${MONTH_TOKEN_PATTERN}\\s+)?(?:19|20)\\d{2})|(?:\\b${MONTH_TOKEN_PATTERN}\\s+(?:19|20)\\d{2}|\\b(?:19|20)\\d{2})\\s*[·•]\\s*\\d+\\s*(?:yr|yrs|year|years|mo|mos|month|months|г\\.|л\\.|мес\\.))`,
    'i'
  );
  const PRESENT_REGEX = /\b(?:present|current|now|настоящее время|сейчас|heute|actuel|actualidad|aujourd'hui|heden)\b/i;
  const TOTAL_DURATION_ONLY_REGEX = /^(?:(?:Full-time|Part-time|Contract|Freelance|Self-employed|Internship|Полная занятость|Частичная занятость)\s*[·•]\s*)?\d+\s*(?:yr|yrs|year|years|mo|mos|month|months|г\.|л\.|мес\.)(?:\s+\d+\s*(?:mo|mos|month|months|мес\.))?$/i;
  const EXP_HEADING_REGEX = /^(?:Experience|Work Experience|Опыт работы|Опыт|Berufserfahrung|Expérience|Experiencia|Experiência|Esperienza|Ervaring|Doświadczenie|Deneyim)$/i;
  const NEXT_SECTION_HEADING_REGEX = /^(?:Education|Licenses\s*&\s*certifications|Certifications|Volunteering|Volunteer\s+experience|Skills|Recommendations|Publications|Patents|Courses|Projects|Honors\s*&\s*awards|Test\s+scores|Languages|Organizations|Causes|Interests|Activity|Featured|Образование|Лицензии и сертификаты|Навыки|Рекомендации|Проекты|Языки|Ausbildung|Kenntnisse|Formation|Compétences|Educación|Aptitudes)$/i;

  const MONTH_INDEX_MAP = {
    jan: 1, янв: 1, ene: 1, gen: 1,
    feb: 2, фев: 2, fév: 2, fev: 2,
    mar: 3, мар: 3, mär: 3,
    apr: 4, апр: 4, avr: 4, abr: 4,
    may: 5, май: 5, mai: 5, mag: 5,
    jun: 6, июн: 6, jui: 6, giu: 6,
    jul: 7, июл: 7, lug: 7,
    aug: 8, авг: 8, aoû: 8, aou: 8, ago: 8,
    sep: 9, сен: 9, set: 9,
    oct: 10, окт: 10, okt: 10, ott: 10,
    nov: 11, ноя: 11,
    dec: 12, дек: 12, déc: 12, dez: 12, dic: 12
  };

  function parseStartYearMonth(dateLine) {
    if (!dateLine) return { startYear: 0, startMonth: 0 };
    const head = dateLine.split(/\s*[-–—·•]\s*/)[0] || dateLine;
    const yearMatch = head.match(/\b((?:19|20)\d{2})\b/);
    const startYear = yearMatch ? parseInt(yearMatch[1], 10) : 0;
    let startMonth = 0;
    const monthMatch = head.match(/([A-Za-zА-Яа-яÄÖÜäöüÉéÛû]{3,})/u);
    if (monthMatch) {
      const token = monthMatch[1].toLowerCase();
      if ( token.startsWith('juin') ) startMonth = 6;
      else if ( token.startsWith('juil') ) startMonth = 7;
      else startMonth = MONTH_INDEX_MAP[token.slice(0, 3)] || 0;
    }
    return { startYear, startMonth };
  }

  function findEnclosingExperienceCard(startEl) {
    if (!startEl) return null;
    const closestSec = startEl.closest('section');
    if (closestSec && ROLE_DATE_RANGE_REGEX.test(closestSec.textContent || '')) {
      return closestSec;
    }
    let curr = startEl.parentElement;
    for (let depth = 0; depth < 8 && curr && curr !== root.body && curr.tagName !== 'MAIN'; depth++) {
      const txt = curr.textContent || '';
      if (ROLE_DATE_RANGE_REGEX.test(txt)) {
        return curr;
      }
      curr = curr.parentElement;
    }
    return null;
  }

  // Fast bailout: if the document contains no date ranges at all, skip DOM queries and check embedded JSON directly
  const rootText = (root.body || root.documentElement || root)?.textContent || '';
  if (!ROLE_DATE_RANGE_REGEX.test(rootText)) {
    return parseLinkedInEmbeddedExperienceJson(root);
  }

  let expSection = null;

  // 1. Locate Experience section by #experience anchor, data-view-name, or section/card heading text
  const expAnchor = root.querySelector('#experience');
  if (expAnchor) {
    expSection = findEnclosingExperienceCard(expAnchor);
  }

  if (!expSection) {
    const viewNameEl = root.querySelector('section[data-view-name*="experience" i], div[data-view-name*="experience" i]');
    if (viewNameEl && ROLE_DATE_RANGE_REGEX.test(viewNameEl.textContent || '')) {
      expSection = viewNameEl;
    }
  }

  if (!expSection) {
    const headings = Array.from(root.querySelectorAll('main section h2, section h2, main [role="heading"], main h2, main h3, section [role="heading"], h2, h3, [role="heading"]'));
    for (const h of headings) {
      const headingTxt = getCleanElementText(h);
      if (EXP_HEADING_REGEX.test(headingTxt)) {
        expSection = findEnclosingExperienceCard(h);
        if (expSection) break;
      }
    }
  }

  if (!expSection) {
    const sections = Array.from(root.querySelectorAll('main section, section'));
    for (const sec of sections) {
      const firstLine = extractCleanLines(sec)[0] || '';
      if (EXP_HEADING_REGEX.test(firstLine) && ROLE_DATE_RANGE_REGEX.test(sec.textContent || '')) {
        expSection = sec;
        break;
      }
    }
  }

  // Fallback for pure SDUI div/span/p Experience cards without <section> or <h2>/[role="heading"]
  if (!expSection) {
    const EXP_SUBSTRING_FAST_REGEX = /experience|опыт|berufserfahrung|expérience|experiencia|experiência|esperienza|ervaring|doświadczenie|deneyim/i;
    const candidates = Array.from(root.querySelectorAll('main span, main p, main div, span, p, div'));
    for (const el of candidates) {
      if (el.children.length > 2) continue;
      const rawTxt = (el.textContent || '').trim();
      if (!rawTxt || rawTxt.length > 48 || !EXP_SUBSTRING_FAST_REGEX.test(rawTxt)) continue;
      if (EXP_HEADING_REGEX.test(getCleanElementText(el))) {
        expSection = findEnclosingExperienceCard(el);
        if (expSection) break;
      }
    }
  }

  if (!expSection) {
    return parseLinkedInEmbeddedExperienceJson(root);
  }

  function cleanCompanyLine(rawLine) {
    if (!rawLine) return '';
    const cleaned = rawLine
      .split(/\s*[·•]\s*/)[0]
      .replace(/\s*\((?:Full-time|Part-time|Contract|Freelance|Self-employed|Internship|Apprenticeship|Seasonal)\)\s*$/i, '')
      .trim();
    if (!cleaned) return '';
    if (STANDALONE_EMPLOYMENT_TYPE_REGEX.test(cleaned)) return '';
    if (STANDALONE_WORKPLACE_TYPE_REGEX.test(cleaned)) return '';
    if (ROLE_DATE_RANGE_REGEX.test(cleaned) || TOTAL_DURATION_ONLY_REGEX.test(cleaned)) return '';
    if (EXP_HEADING_REGEX.test(cleaned) || NEXT_SECTION_HEADING_REGEX.test(cleaned)) return '';
    return cleaned;
  }

  function isLikelyLocationLine(line) {
    if (!line || line.length < 2 || line.length > 68) return false;
    if (ROLE_DATE_RANGE_REGEX.test(line) || TOTAL_DURATION_ONLY_REGEX.test(line)) return false;
    if (EMPLOYMENT_TYPE_REGEX.test(line) && !WORKPLACE_TYPE_REGEX.test(line)) return false;
    if (/^(?:skills|see more|show all|helped me|conducted|leading|built|developed|architected|managed|designed|responsible|working)\b/i.test(line)) return false;
    if (/\b(?:engineer|developer|architect|manager|director|lead|designer|consultant|specialist|analyst|scientist|intern|instructor|founder|co-founder|president|officer|vp|head|chief|coordinator|recruiter|talent|partner|associate|assistant|executive|advisor|professor|lecturer|researcher|administrator|technician|operator|supervisor|controller|auditor|accountant|lawyer|attorney|counsel|producer|editor|writer|strategist|owner|member)\b/i.test(line)) {
      return false;
    }
    if (WORKPLACE_TYPE_REGEX.test(line)) return true;
    if (/\b(?:Bay Area|Metropolitan Area|Metro Area|Greater .+ Area)\b/i.test(line)) return true;
    // Geographic pattern: "City, Country" or "City, State" (Unicode letters across Latin, Cyrillic, Kazakh, European diacritics)
    if (/^\p{Lu}[\p{L}.\- '’]+,\s*\p{Lu}[\p{L}.\- ,'’]+$/u.test(line) && line.split(/\s+/).length <= 7) {
      return true;
    }
    return false;
  }

  function isLikelyDescriptionOrSkillsLine(line) {
    if (!line) return false;
    if (line.length > 75) return true;
    if (/^(?:Skills\s*:|Навыки\s*:|•|-|\*|\d+\.\s)/i.test(line)) return true;
    if (/[.!]$/.test(line) && line.split(/\s+/).length >= 6) return true;
    if ((line.match(/\s*[·•]\s*/g) || []).length >= 2 && !EMPLOYMENT_TYPE_REGEX.test(line)) return true;
    return false;
  }

  function cleanLocationLine(rawLine) {
    if (!rawLine) return '';
    return rawLine
      .replace(/\s*[·•]\s*(?:Hybrid|Remote|On-site|Onsite|Гибридный|Удаленно|Офис|На месте).*$/i, '')
      .replace(/\s*\b(?:Hybrid|Remote|On-site|Onsite|Гибридный|Удаленно|Офис|На месте)\s*$/i, '')
      .trim();
  }

  function normalizeExperienceLines(rawLines, sliceToExperienceWindow = false) {
    const out = [];
    let seenExpHeading = !sliceToExperienceWindow;
    for (const raw of rawLines) {
      const line = cleanText(raw);
      if (!line) continue;
      if (EXP_HEADING_REGEX.test(line)) {
        seenExpHeading = true;
        continue;
      }
      if (!seenExpHeading) continue;
      if (NEXT_SECTION_HEADING_REGEX.test(line)) {
        break;
      }
      if (/^(?:Show all.*|See more|…see more|\.\.\.see more)$/i.test(line)) {
        continue;
      }
      // Split glued date range if Company + DateRange were inside a single leaf node (e.g. "mazeed · Full-timeApr 2025 - Present · 1 yr 7 mos")
      const dateMatch = line.match(ROLE_DATE_RANGE_REGEX);
      if (dateMatch && dateMatch.index && dateMatch.index > 2) {
        const prefix = line.slice(0, dateMatch.index).replace(/[·•|,\-–—\s]+$/, '').trim();
        const rest = line.slice(dateMatch.index).trim();
        if (prefix) out.push(prefix);
        if (rest) out.push(rest);
        continue;
      }
      out.push(line);
    }
    return out;
  }

  const parsedEntries = [];

  function parseBlockLines(blockLines, isIsolatedItem = false) {
    let activeGroupCompany = '';
    let activeGroupLocation = '';
    let activeGroupIsFullTime = false;
    let lastConsumedIdx = -1;

    for (let i = 0; i < blockLines.length; i++) {
      const line = blockLines[i];

      // 1. Check for Grouped Company Header (Company followed by total duration like "Full-time · 3 yrs 7 mos" or "2 yrs 4 mos")
      if (TOTAL_DURATION_ONLY_REGEX.test(line) && !ROLE_DATE_RANGE_REGEX.test(line)) {
        const compIdx = (i >= 1 && STANDALONE_EMPLOYMENT_TYPE_REGEX.test(blockLines[i - 1])) ? i - 2 : i - 1;
        const groupComp = compIdx >= 0 ? cleanCompanyLine(blockLines[compIdx]) : '';
        if (groupComp) {
          activeGroupCompany = groupComp;
          activeGroupIsFullTime = /full-time|полная занятость/i.test(line) || /full-time|полная занятость/i.test(blockLines[i - 1] || '');
          activeGroupLocation = '';
          lastConsumedIdx = i;
          if (blockLines[i + 1] && isLikelyLocationLine(blockLines[i + 1]) && !ROLE_DATE_RANGE_REGEX.test(blockLines[i + 2] || '')) {
            activeGroupLocation = cleanLocationLine(blockLines[i + 1]);
            lastConsumedIdx = i + 1;
          }
        }
        continue;
      }

      // 2. Check for Role Date Range Anchor (e.g. "Apr 2025 - Present · 1 yr 7 mos")
      if (!ROLE_DATE_RANGE_REGEX.test(line)) continue;

      // Step back over any standalone employment-type ("Part-time", "Full-time") or workplace ("Hybrid", "Remote") lines right above the date range
      let empTypeLine = '';
      let cursor = i - 1;
      while (
        cursor > lastConsumedIdx &&
        (STANDALONE_EMPLOYMENT_TYPE_REGEX.test(blockLines[cursor]) || STANDALONE_WORKPLACE_TYPE_REGEX.test(blockLines[cursor]))
      ) {
        if (!empTypeLine && STANDALONE_EMPLOYMENT_TYPE_REGEX.test(blockLines[cursor])) {
          empTypeLine = blockLines[cursor];
        }
        cursor--;
      }

      if (cursor <= lastConsumedIdx) {
        lastConsumedIdx = i;
        continue;
      }

      const prevIdx = cursor - 1;
      let roleTitle = '';
      let company = '';
      let isFullTime = false;

      const isGroupedSubRole =
        prevIdx <= lastConsumedIdx ||
        (Boolean(activeGroupCompany) && isIsolatedItem) ||
        (Boolean(activeGroupCompany) &&
          !EMPLOYMENT_TYPE_REGEX.test(blockLines[cursor]) &&
          (isLikelyDescriptionOrSkillsLine(blockLines[prevIdx]) || isLikelyLocationLine(blockLines[prevIdx])));

      if (isGroupedSubRole) {
        roleTitle = blockLines[cursor];
        company = activeGroupCompany;
        isFullTime = empTypeLine ? /full-time|полная занятость/i.test(empTypeLine) : activeGroupIsFullTime;
      } else {
        const candidateCompany = cleanCompanyLine(blockLines[cursor]);
        const candidateRole = blockLines[prevIdx];
        if (candidateCompany && !ROLE_DATE_RANGE_REGEX.test(candidateRole) && !TOTAL_DURATION_ONLY_REGEX.test(candidateRole)) {
          roleTitle = candidateRole;
          company = candidateCompany;
          isFullTime = /full-time|полная занятость/i.test(blockLines[cursor]) || /full-time|полная занятость/i.test(empTypeLine);
          if (company !== activeGroupCompany) {
            activeGroupCompany = '';
            activeGroupLocation = '';
          }
        } else if (activeGroupCompany) {
          roleTitle = blockLines[cursor];
          company = activeGroupCompany;
          isFullTime = empTypeLine ? /full-time|полная занятость/i.test(empTypeLine) : activeGroupIsFullTime;
        }
      }

      const isCurrent = PRESENT_REGEX.test(line);
      const { startYear, startMonth } = parseStartYearMonth(line);
      let locCandidate = '';
      lastConsumedIdx = i;

      if (blockLines[i + 1] && isLikelyLocationLine(blockLines[i + 1])) {
        locCandidate = blockLines[i + 1];
        lastConsumedIdx = i + 1;
      } else if (
        blockLines[i + 2] &&
        STANDALONE_WORKPLACE_TYPE_REGEX.test(blockLines[i + 1] || '') &&
        isLikelyLocationLine(blockLines[i + 2])
      ) {
        locCandidate = blockLines[i + 2];
        lastConsumedIdx = i + 2;
      }

      const cleanedLoc = cleanLocationLine(locCandidate) || activeGroupLocation || '';

      if (roleTitle && (company || parsedEntries.length === 0)) {
        parsedEntries.push({
          roleTitle,
          company: company || '',
          location: cleanedLoc,
          isCurrent,
          isFullTime,
          startYear,
          startMonth,
          domOrder: parsedEntries.length
        });
      }
    }
  }

  // Isolate top-level <li> Experience items when present so trailing media captions ("Onyx IX ERP") or descriptions from Item N never bleed into Item N+1
  const topLevelLis = Array.from(expSection.querySelectorAll('li')).filter(li => {
    const parentLi = li.parentElement ? li.parentElement.closest('li') : null;
    if (parentLi && expSection.contains(parentLi)) return false;
    return ROLE_DATE_RANGE_REGEX.test(li.textContent || '');
  });

  if (topLevelLis.length > 0) {
    for (const li of topLevelLis) {
      const liLines = normalizeExperienceLines(extractCleanLines(li), false);
      parseBlockLines(liLines, true);
    }
  } else {
    const rawSectionLines = extractCleanLines(expSection);
    const hasExpHeadingLine = rawSectionLines.some(l => EXP_HEADING_REGEX.test(cleanText(l)));
    const sectionLines = normalizeExperienceLines(rawSectionLines, hasExpHeadingLine);
    parseBlockLines(sectionLines, false);
  }

  if (parsedEntries.length === 0) {
    return parseLinkedInEmbeddedExperienceJson(root);
  }

  // Sort helper: chronological latest start date (startYear, startMonth) wins; ties broken by Full-time, then DOM order
  const sortByLatestExperience = (a, b) => {
    if (a.startYear && b.startYear) {
      if (b.startYear !== a.startYear) return b.startYear - a.startYear;
      if (b.startMonth !== a.startMonth) return b.startMonth - a.startMonth;
    }
    if (a.isFullTime !== b.isFullTime) return a.isFullTime ? -1 : 1;
    return (a.domOrder || 0) - (b.domOrder || 0);
  };

  // The latest position in the Experience section is the unconditional source of truth for Role / Headline and Company / Organization
  const currentEntries = parsedEntries.filter(e => e.isCurrent).slice().sort(sortByLatestExperience);
  const sortedAllEntries = parsedEntries.slice().sort(sortByLatestExperience);
  const candidates = currentEntries.length > 0 ? currentEntries : sortedAllEntries;
  const latestEntry = candidates[0] || parsedEntries[0];
  const fallbackCompanyEntry = candidates.find(c => Boolean(c.company)) || parsedEntries.find(c => Boolean(c.company)) || latestEntry;

  // Choose the best location from parsed entries (prefer the latest entry's location if Latin, otherwise first Latin location, otherwise first available)
  const allLocations = [latestEntry.location, ...parsedEntries.map(e => e.location)].filter(Boolean);
  const latinLocation = allLocations.find(loc => /[A-Za-z]{2,}/.test(loc));
  const bestLocation = latinLocation || allLocations[0] || '';

  return {
    organization: latestEntry.company || fallbackCompanyEntry.company || '',
    firstOrganization: latestEntry.company || fallbackCompanyEntry.company || '',
    primaryRole: latestEntry.roleTitle || '',
    location: bestLocation,
    entries: parsedEntries
  };
}

function sanitizeLinkedInProfileName(rawName) {
  if (!rawName) return '';
  return dedupeDoubledString(
    rawName
      .replace(/^\s*\(\d+\+?\)\s*/, '') // Strip notification counts like (1), (99+)
      .replace(/\s*[|–-]\s*LinkedIn.*$/i, '')
      .replace(/\s*(?:[·•]\s*)?\b(?:1st|2nd|3rd)\b.*$/i, '')
      .replace(/\s*\((?:he|him|she|her|they|them|ze|hir)[^)]*\)/i, '')
      .replace(/\s*,\s*(?:Ph\.?D\.?|MBA|M\.?S\.?|B\.?S\.?|MD|PMP|CPA|Esq\.?|PE)\b.*$/i, '')
      .trim()
  );
}

function extractLinkedInProfileData() {
  try {
    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname;
    if (!host.includes('linkedin.com') || (!path.includes('/in/') && !path.includes('/pub/'))) {
      return null;
    }

    // Canonical LinkedIn URL
    let linkedInUrl = window.location.href;
    try {
      const parsed = new URL(window.location.href);
      const match = parsed.pathname.match(/^(\/(?:in|pub)\/[^/]+)/);
      if (match) {
        linkedInUrl = `${parsed.origin}${match[1]}`;
      } else {
        linkedInUrl = `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
      }
    } catch {
      linkedInUrl = window.location.href;
    }

    // 1. Full Name (Top card H1 > sticky header > og:title > document.title > JSON-LD)
    const nameEl = document.querySelector(
      'h1.inline.t-24.v-align-middle.break-words, ' +
      'h1.text-heading-xlarge, ' +
      'h2.text-heading-xlarge, ' +
      '.pv-text-details__left-panel h1, ' +
      '.pv-text-details__left-panel span.text-heading-xlarge, ' +
      'section.artdeco-card .pv-top-card--list h1, ' +
      '[data-view-name="profile-card"] h1, ' +
      '[data-view-name="profile-card"] [class*="text-heading"], ' +
      '.pv-top-card-section__name, ' +
      '.top-card-layout__title, ' +
      'h1.v-align-middle, ' +
      'div.ph5 h1, ' +
      'main section.pv-top-card h1, ' +
      'main section:first-of-type h1, ' +
      'main h1, ' +
      '.artdeco-entity-lockup__title'
    );
    let fullName = nameEl ? getCleanElementText(nameEl) : '';
    if (!fullName) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && ogTitle.content) {
        const parts = ogTitle.content.split(/\s*(?:[|•]|\s+[-–—]\s+)\s*/);
        if (parts[0]) fullName = cleanText(parts[0]);
      }
    }
    if (!fullName && document.title) {
      const cleanDocTitle = document.title.replace(/^\s*\(\d+\+?\)\s*/, '');
      const parts = cleanDocTitle.split(/\s*(?:[|•]|\s+[-–—]\s+)\s*/);
      if (parts[0] && !/^linkedin$/i.test(parts[0].trim())) {
        fullName = cleanText(parts[0]);
      }
    }
    if (!fullName) {
      try {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const s of scripts) {
          const d = JSON.parse(s.textContent);
          const p = findJsonLdEntity(d, 'Person');
          if (p && p.name) {
            fullName = cleanText(typeof p.name === 'string' ? p.name : p.name.name || '');
            if (fullName) break;
          }
        }
      } catch {}
    }
    fullName = sanitizeLinkedInProfileName(fullName);

    // Find all DOM elements that render the user's fullName (Top Card H1, SDUI heading, or Sticky Header bar regardless of CSS classes)
    const candidateNameElements = [];
    if (nameEl) candidateNameElements.push(nameEl);
    if (fullName) {
      const normTargetName = fullName.toLowerCase();
      const allNameCandidates = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"], span, div, a, button'));
      for (const el of allNameCandidates) {
        if (el === nameEl || el.children.length > 4) continue;
        if (el.closest('nav, footer, aside')) continue;
        const cleanedElName = sanitizeLinkedInProfileName(getCleanElementText(el));
        if (cleanedElName && cleanedElName.toLowerCase() === normTargetName) {
          candidateNameElements.push(el);
        }
      }
    }

    // 2. Top Card / Sticky Header Headline (used ONLY as a fallback when Experience section is unavailable)
    const headlineEl = document.querySelector(
      '.pv-text-details__left-panel .text-body-medium, ' +
      'main section:first-of-type .text-body-medium.break-words, ' +
      '.text-body-medium.break-words, ' +
      'div.pv-top-card-section__headline, ' +
      'div.top-card-layout__headline, ' +
      '[data-anonymize="headline"], ' +
      '.pv-top-card--list-bullet + div, ' +
      '[data-generated-suggestion-target], ' +
      '.artdeco-entity-lockup__subtitle'
    );
    let topCardHeadline = headlineEl ? getCleanElementText(headlineEl) : '';
    if (topCardHeadline && isLinkedInProfileNoiseLine(topCardHeadline)) {
      topCardHeadline = '';
    }

    // Layer 2B: Relative DOM traversal from any element matching fullName (works on obfuscated SDUI Top Card AND Sticky Header!)
    if (!topCardHeadline && fullName) {
      const normName = fullName.toLowerCase();
      for (const targetEl of candidateNameElements) {
        let ancestor = targetEl.parentElement;
        for (let depth = 0; depth < 7 && ancestor && ancestor !== document.body && ancestor.tagName !== 'MAIN'; depth++) {
          const lines = extractCleanLines(ancestor);
          const nameIdx = lines.findIndex(l => sanitizeLinkedInProfileName(l).toLowerCase() === normName || l.toLowerCase().includes(normName));
          if (nameIdx !== -1) {
            for (let i = nameIdx + 1; i < lines.length && i <= nameIdx + 5; i++) {
              const cand = lines[i]
                .replace(/^[·•]\s*(?:1st|2nd|3rd)\s*/i, '')
                .trim();
              if (!cand || isLinkedInProfileNoiseLine(cand)) continue;
              if (sanitizeLinkedInProfileName(cand).toLowerCase() === normName) continue;
              if (/contact info|контактная информация/i.test(cand)) break;
              if (/^(?:About|Activity|Experience|Education|Skills|Highlights|Featured|Recommendations|Interests)$/i.test(cand)) break;
              if (cand.length >= 3 && cand.length <= 240) {
                topCardHeadline = cand;
                break;
              }
            }
          }
          if (topCardHeadline) break;
          ancestor = ancestor.parentElement;
        }
        if (topCardHeadline) break;
      }
    }

    // Layer 2C: OpenGraph description fallback
    if (!topCardHeadline) {
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && ogDesc.content) {
        const firstPart = cleanText(ogDesc.content.split(/\s*[·•]\s*/)[0] || '');
        if (firstPart && !/^view\s+.*profile\s+on\s+linkedin/i.test(firstPart)) {
          topCardHeadline = firstPart;
        }
      }
    }

    // 3. Parse Experience section — SOURCE OF TRUTH for Role / Headline and Company / Organization!
    const expData = parseLinkedInExperienceSection(document);
    const experienceRole = (expData && expData.primaryRole) ? expData.primaryRole : '';
    const experienceOrganization = (expData && expData.organization) ? expData.organization : '';

    // Role / Headline: Latest Experience position is the source of truth; fallback to cleaned top-card headline only if Experience is not yet available
    let headline = experienceRole || cleanLinkedInTopCardHeadlineFallback(topCardHeadline);

    // 4. Organization: Latest Experience company is the source of truth; fallback to Top Card right-panel button or "@ Company" in headline
    let organization = experienceOrganization;
    if (!organization) {
      const currentCompanyBtn = document.querySelector(
        'button[aria-label^="Current company:"], ' +
        'div[aria-label="Current company"], ' +
        '.pv-top-card--experience-list-item, ' +
        '.pv-text-details__right-panel button, ' +
        '.pv-top-card__right-panel button'
      );
      if (currentCompanyBtn) {
        const aria = currentCompanyBtn.getAttribute('aria-label') || '';
        const ariaMatch = aria.match(/Current company:\s*([^.]+?)(?:\.\s*Click|$)/i);
        if (ariaMatch && ariaMatch[1]) {
          organization = cleanText(ariaMatch[1]);
        } else {
          organization = getCleanElementText(currentCompanyBtn);
        }
      }
    }

    if (!organization) {
      const expItem = document.querySelector('.pv-top-card--experience-list li, ul.pv-top-card--experience-list span');
      if (expItem) organization = getCleanElementText(expItem);
    }

    // Fallback: Headline explicit "at" or "@" pattern (NEVER split on "|" or "-" which are role separators!)
    if (!organization && topCardHeadline) {
      const atMatch = topCardHeadline.match(/(?:\bat\b|@)\s+([^,|•·\n]+)/i);
      if (atMatch && atMatch[1]) {
        organization = cleanText(
          atMatch[1].replace(/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u2600-\u27BF\uFE0F]/gu, '')
        );
      }
    }

    // 5. Location
    // Layer 5A: Standard selectors
    const locEl = document.querySelector(
      'span.text-body-small.inline.t-black--light.break-words, ' +
      '.pv-text-details__left-panel span.text-body-small, ' +
      '.top-card-layout__first-subline, ' +
      'div.pv-top-card--list-bullet > span, ' +
      '.pv-top-card-section__location'
    );
    let location = locEl ? getCleanElementText(locEl) : '';

    // Layer 5B: Relative DOM traversal from "Contact info" anchor (a[href*="contact-info"]) — invariant across SDUI & legacy!
    if (!location) {
      const contactInfoAnchor = document.querySelector('a[href*="contact-info"]');
      if (contactInfoAnchor) {
        let container = contactInfoAnchor.parentElement;
        for (let depth = 0; depth < 4 && container && container !== document.body; depth++) {
          const lines = extractCleanLines(container);
          const ciIdx = lines.findIndex(l => /contact info|контактная информация/i.test(l));
          if (ciIdx > 0) {
            for (let k = ciIdx - 1; k >= 0; k--) {
              const candidate = lines[k]
                .replace(/\s*[·•]\s*Contact info.*$/i, '')
                .replace(/\s*[·•]\s*(?:1st|2nd|3rd)\b.*$/i, '')
                .trim();
              if (candidate && candidate !== fullName && candidate !== topCardHeadline && candidate !== headline && !isLinkedInProfileNoiseLine(candidate)) {
                location = candidate;
                break;
              }
            }
            if (location) break;
          }
          const rawContainerText = getCleanElementText(container);
          if (/contact info|контактная информация/i.test(rawContainerText)) {
            const beforeCi = rawContainerText
              .split(/\s*[·•]?\s*(?:Contact info|Контактная информация)/i)[0]
              .replace(/\s*[·•]\s*(?:1st|2nd|3rd)\b.*$/i, '')
              .trim();
            if (beforeCi && beforeCi.length >= 2 && beforeCi.length <= 65 && beforeCi !== fullName && beforeCi !== topCardHeadline && beforeCi !== headline && !isLinkedInProfileNoiseLine(beforeCi)) {
              location = beforeCi;
              break;
            }
          }
          container = container.parentElement;
        }
      }
    }

    // Layer 5C: Experience section fallback location (e.g. "Dubai, United Arab Emirates · Hybrid" -> "Dubai, United Arab Emirates" when scrolled to Experience!)
    if (!location && expData && expData.location) {
      location = expData.location;
    }

    if (location) {
      location = location
        .replace(/\s*[·•]?\s*Contact info.*$/i, '')
        .replace(/\s*[·•]\s*(?:Hybrid|Remote|On-site|Onsite).*$/i, '')
        .trim();
    }

    // 6. Avatar
    function isValidProfileAvatarSrc(src) {
      if (!src) return false;
      const s = src.toLowerCase();
      if (s.includes('profile-displaybackgroundimage') || s.includes('company-logo') || s.includes('ghost') || s.includes('data:image/gif')) {
        return false;
      }
      return true;
    }

    const avatarImg = document.querySelector(
      'img.pv-top-card-profile-picture__image, ' +
      'img.pv-top-card-profile-picture__image--show, ' +
      'img.profile-photo-edit__preview, ' +
      'main section:first-of-type img[src*="profile-displayphoto"], ' +
      'main section:first-of-type img[src*="profile-framedphoto"], ' +
      'img[src*="profile-displayphoto"]:not(header *):not(nav *):not(aside *), ' +
      'img[src*="profile-framedphoto"]:not(header *):not(nav *):not(aside *), ' +
      'img[alt*="profile photo" i]:not(header *):not(nav *), ' +
      'img[alt*="profile picture" i]:not(header *):not(nav *), ' +
      '.artdeco-entity-lockup__image img, ' +
      'img.evi-image:not(header *):not(nav *):not(aside *), ' +
      'img.presence-entity__image:not(header *):not(nav *):not(aside *)'
    );
    let avatarUrl = (avatarImg && isValidProfileAvatarSrc(avatarImg.src)) ? avatarImg.src : '';

    // Layer 6B: Check images matching fullName alt OR inside the same lockup/sticky-bar container as candidateNameElements
    if (!avatarUrl && fullName) {
      const allImgs = Array.from(document.querySelectorAll('img:not(nav *):not(aside *)'));
      const matchedByAlt = allImgs.find(img => {
        const alt = (img.getAttribute('alt') || '').toLowerCase();
        return isValidProfileAvatarSrc(img.src || img.getAttribute('src')) && alt.includes(fullName.toLowerCase());
      });
      if (matchedByAlt) {
        avatarUrl = matchedByAlt.src || '';
      }
    }

    if (!avatarUrl && candidateNameElements.length > 0) {
      for (const targetEl of candidateNameElements) {
        let lockup = targetEl.parentElement;
        for (let depth = 0; depth < 5 && lockup && lockup !== document.body && lockup.tagName !== 'MAIN'; depth++) {
          const imgs = Array.from(lockup.querySelectorAll('img')).filter(img => isValidProfileAvatarSrc(img.src || img.getAttribute('src')));
          if (imgs.length === 1) {
            avatarUrl = imgs[0].src || '';
            break;
          }
          lockup = lockup.parentElement;
        }
        if (avatarUrl) break;
      }
    }

    if (!avatarUrl) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg && ogImg.content) avatarUrl = ogImg.content;
    }

    // 7. Merge with per-URL cache (in-memory + sessionStorage), prioritizing Experience section data as the source of truth
    const cached = getCachedLinkedInProfile(linkedInUrl);
    const finalExperienceRole = experienceRole || cached.experienceRole || '';
    const finalExperienceOrg = experienceOrganization || cached.experienceOrganization || '';
    const hasExperienceData = Boolean(finalExperienceRole || finalExperienceOrg);

    const finalFullName = fullName || cached.fullName || '';
    const finalHeadline = finalExperienceRole || headline || cached.headline || '';
    const finalOrganization = finalExperienceOrg || organization || cached.organization || '';
    const finalLocation = location || cached.location || '';
    const finalAvatarUrl = avatarUrl || cached.avatarUrl || '';

    // 8. Category smart defaulting
    const suggestedCategory = inferContactCategoryContent(finalHeadline || topCardHeadline);

    const profileResult = {
      fullName: finalFullName,
      name: finalFullName,
      headline: finalHeadline,
      role: finalHeadline,
      organization: finalOrganization,
      experienceRole: finalExperienceRole,
      experienceOrganization: finalExperienceOrg,
      hasExperienceData,
      location: finalLocation,
      avatarUrl: finalAvatarUrl,
      linkedInUrl,
      suggestedCategory,
      platform: 'LinkedIn'
    };

    if (finalFullName) {
      setCachedLinkedInProfile(linkedInUrl, profileResult);
    }

    return profileResult;
  } catch (err) {
    console.warn('[Tracklet] Failed to extract LinkedIn profile:', err);
    return null;
  }
}

// Scrape profile details from X (formerly Twitter)
function extractXProfileData() {
  try {
    const host = window.location.hostname.toLowerCase();
    if (host !== 'x.com' && !host.endsWith('.x.com') && host !== 'twitter.com' && !host.endsWith('.twitter.com')) {
      return null;
    }

    const path = window.location.pathname;
    const nonProfileSegments = [
      'home', 'explore', 'notifications', 'messages', 'settings', 'i', 'search',
      'compose', 'lists', 'bookmarks', 'communities', 'tos', 'privacy', 'jobs'
    ];
    const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);
    if (segments.length !== 1 || nonProfileSegments.includes(segments[0].toLowerCase())) {
      return null;
    }

    const username = segments[0];

    // 1. Full Name / Display Name
    const userNameContainer = document.querySelector('[data-testid="UserName"]');
    let fullName = '';
    if (userNameContainer) {
      const firstTextEl = userNameContainer.querySelector('span');
      if (firstTextEl) fullName = cleanText(firstTextEl.textContent);
    }

    if (!fullName) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && ogTitle.content) {
        const match = ogTitle.content.match(/^([^(]+)/);
        if (match && match[1]) fullName = cleanText(match[1]);
      }
    }

    if (!fullName) {
      fullName = username;
    }

    // 2. Headline / Bio / Professional Category
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    const profCatEl = document.querySelector('[data-testid="UserProfessionalCategory"]');
    let headline = cleanText(bioEl ? bioEl.textContent : '');
    const profCategory = cleanText(profCatEl ? profCatEl.textContent : '');
    if (!headline && profCategory) {
      headline = profCategory;
    }
    if (!headline) {
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && ogDesc.content) headline = cleanText(ogDesc.content);
    }

    // 3. Organization (from bio heuristics with strict word boundary before 'at')
    let organization = '';
    if (headline) {
      const orgMatch = headline.match(/(?:\bat\s+|@|\bfounder\s+(?:at\s+|of\s+|@)?|\bco-founder\s+(?:at\s+|of\s+|@)?|\bengineer\s+(?:at\s+|@)|\blead\s+(?:at\s+|@)|\bbuilding\s+@?)([A-Za-z0-9_.\-]+)/i);
      if (orgMatch && orgMatch[1]) organization = cleanText(orgMatch[1]).replace(/[.,!;:]+$/, '');
    }

    // 4. Location
    const locEl = document.querySelector('[data-testid="UserLocation"]');
    const location = cleanText(locEl ? locEl.textContent : '');

    // 5. Avatar
    const avatarImg = document.querySelector('[data-testid*="UserAvatar"] img, img[src*="profile_images"]');
    let avatarUrl = avatarImg ? (avatarImg.src || '') : '';
    if (!avatarUrl) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg && ogImg.content) avatarUrl = ogImg.content;
    }

    // 6. Canonical URL
    const linkedInUrl = `https://x.com/${username}`;
    const suggestedCategory = inferContactCategoryContent(headline || profCategory);

    return {
      fullName,
      name: fullName,
      headline,
      role: headline || `@${username}`,
      organization,
      location,
      avatarUrl,
      linkedInUrl,
      suggestedCategory,
      platform: 'X',
    };
  } catch (err) {
    console.warn('[Tracklet] Failed to extract X profile:', err);
    return null;
  }
}

// Scrape profile details from GitHub
function extractGitHubProfileData() {
  try {
    const host = window.location.hostname.toLowerCase();
    if (host !== 'github.com' && !host.endsWith('.github.com')) {
      return null;
    }

    const path = window.location.pathname;
    const nonProfileSegments = [
      'features', 'pricing', 'pulls', 'issues', 'explore', 'trending', 'marketplace',
      'topics', 'settings', 'orgs', 'login', 'join', 'about', 'site', 'contact', 'security', 'notifications'
    ];
    const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);
    if (segments.length === 0 || nonProfileSegments.includes(segments[0].toLowerCase())) {
      return null;
    }

    if (segments.length > 1 && !['repositories', 'projects', 'packages', 'stars'].includes(segments[1])) {
      return null;
    }

    const username = segments[0];

    const nameEl = document.querySelector('[itemprop="name"], .vcard-fullname');
    let fullName = cleanText(nameEl ? nameEl.textContent : '');
    if (!fullName) {
      fullName = username;
    }

    const bioEl = document.querySelector('[data-bio-text], .user-profile-bio');
    let headline = cleanText(bioEl ? bioEl.textContent : '');

    const orgEl = document.querySelector('[itemprop="worksFor"], .p-org');
    let organization = cleanText(orgEl ? orgEl.textContent : '');

    const locEl = document.querySelector('[itemprop="homeLocation"]');
    let location = cleanText(locEl ? locEl.textContent : '');

    const avatarImg = document.querySelector('img.avatar-user, img[alt*="avatar"]');
    let avatarUrl = avatarImg ? (avatarImg.src || '') : '';

    const linkedInUrl = `https://github.com/${username}`;
    const suggestedCategory = inferContactCategoryContent(headline);

    return {
      fullName,
      name: fullName,
      headline,
      role: headline || `@${username} on GitHub`,
      organization,
      location,
      avatarUrl,
      linkedInUrl,
      suggestedCategory,
      platform: 'GitHub',
    };
  } catch (err) {
    console.warn('[Tracklet] Failed to extract GitHub profile:', err);
    return null;
  }
}

// Scrape job opening details directly from an X (formerly Twitter) tweet / post
function extractXPostJobData() {
  try {
    const host = window.location.hostname.toLowerCase();
    if (host !== 'x.com' && !host.endsWith('.x.com') && host !== 'twitter.com' && !host.endsWith('.twitter.com')) {
      return null;
    }

    const path = window.location.pathname;
    const isStatusUrl = path.includes('/status/');

    let tweetEl = document.querySelector('[role="dialog"] article[data-testid="tweet"], [aria-modal="true"] article[data-testid="tweet"]');
    if (!tweetEl && lastUserClickedElement) {
      const clickedTweet = lastUserClickedElement.closest('article[data-testid="tweet"]');
      if (clickedTweet && document.contains(clickedTweet)) {
        tweetEl = clickedTweet;
      }
    }
    if (!tweetEl) {
      const allTweets = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
      if (allTweets.length > 1) {
        tweetEl = allTweets.find(el => HIRING_POST_INTENT_REGEX.test(el.textContent || '')) || (isStatusUrl ? allTweets[0] : null);
      } else if (allTweets.length === 1) {
        tweetEl = allTweets[0];
      }
    }
    if (!tweetEl && !isStatusUrl) return null;

    const tweetTextEl = (tweetEl || document).querySelector('[data-testid="tweetText"]');
    const rawTweetText = tweetTextEl ? (tweetTextEl.innerText || tweetTextEl.textContent || '') : '';
    const tweetText = cleanText(rawTweetText);
    if (!tweetText) return null;

    const hasHiringIntent = HIRING_POST_INTENT_REGEX.test(tweetText);
    if (!hasHiringIntent && !isStatusUrl) {
      return null;
    }

    const parsedMeta = extractRoleAndMetaFromPostText(rawTweetText);
    if (!parsedMeta) return null;

    let authorName = '';
    let authorHandle = '';
    const userContainer = (tweetEl || document).querySelector('[data-testid="User-Name"], [data-testid="UserName"]');
    if (userContainer) {
      const spans = Array.from(userContainer.querySelectorAll('span')).map(s => cleanText(s.textContent)).filter(Boolean);
      if (spans.length > 0) authorName = spans[0];
      const handleSpan = spans.find(s => s.startsWith('@'));
      if (handleSpan) authorHandle = handleSpan.replace(/^@/, '');
    }

    if (!authorHandle) {
      const match = path.match(/^\/([A-Za-z0-9_]+)\/status/);
      if (match) authorHandle = match[1];
    }
    if (!authorName) authorName = authorHandle || 'X User';

    const avatarEl = (tweetEl || document).querySelector('[data-testid*="Avatar"] img, [data-testid*="avatar"] img');
    const avatarUrl = avatarEl ? avatarEl.src : '';

    const externalAnchors = Array.from((tweetEl || document).querySelectorAll('a[href*="http"]'))
      .filter(a => {
        try {
          const h = new URL(a.href).hostname.toLowerCase();
          return !h.includes('x.com') && !h.includes('twitter.com');
        } catch {
          return false;
        }
      });
    const applyLink = externalAnchors.length > 0 ? resolveExpandedUrl(externalAnchors[0]) : window.location.href;

    let company = parsedMeta.company || '';
    if (!company && externalAnchors.length > 0) {
      const extHost = getDomainFromUrl(resolveExpandedUrl(externalAnchors[0]));
      const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
      if (registry && registry.cleanCompanyDomain) {
        const cleaned = registry.cleanCompanyDomain(extHost);
        if (cleaned && !registry.isJobBoardOrAts(extHost)) {
          const compName = cleaned.split('.')[0];
          company = compName.charAt(0).toUpperCase() + compName.slice(1);
        }
      }
    }

    if (!company) {
      const atCompMatch = tweetText.match(/(?:\bat\s+|@|join\s+(?:us\s+at\s+)?|hiring\s+at\s+|opening\s+at\s+)([A-Z][A-Za-z0-9&.\-_]+)/i);
      if (atCompMatch && atCompMatch[1]) {
        company = cleanText(atCompMatch[1]);
      }
    }

    if (!company && applyLink && applyLink !== window.location.href) {
      company = getDomainName(applyLink);
    }

    if (!company) {
      company = authorName ? `${authorName}'s Team` : 'Company';
    }

    let role = parsedMeta.role;
    if (!role && hasHiringIntent) {
      role = 'Open Role';
    }
    if (!role) return null;

    const contact = {
      name: authorName,
      role: authorHandle ? `@${authorHandle}` : 'X User',
      linkedIn: authorHandle ? `https://x.com/${authorHandle}` : window.location.href,
      avatarUrl,
      category: 'Recruiter'
    };

    return {
      title: role,
      company,
      location: parsedMeta.location || '',
      workLocation: parsedMeta.workLocation,
      employmentType: parsedMeta.employmentType || 'Full-time',
      salary: parsedMeta.salary,
      descriptionHtml: `<p>${tweetText}</p>`,
      jobLink: applyLink,
      contact,
      isPostJob: true,
      platform: 'Other'
    };
  } catch (err) {
    console.warn('[Tracklet] Failed to extract X job tweet:', err);
    return null;
  }
}

// Scrape profile details from Peerlist (peerlist.io/[username])
function extractPeerlistProfileData() {
  try {
    const host = window.location.hostname.toLowerCase();
    if (!host.includes('peerlist.io')) return null;
    const path = window.location.pathname;
    const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);
    if (segments.length !== 1 || ['jobs', 'company', 'scroll', 'projects', 'explore', 'about', 'join'].includes(segments[0].toLowerCase())) {
      return null;
    }

    const username = segments[0];
    const nameEl = document.querySelector('h1, [data-testid="user-profile-name"], .profile-name');
    let fullName = cleanText(nameEl ? nameEl.textContent : '');
    if (!fullName) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && ogTitle.content) fullName = cleanText(ogTitle.content.split('(')[0]);
    }
    if (!fullName) fullName = username;

    const roleEl = document.querySelector('[data-testid="user-profile-tagline"], .profile-headline, h2');
    const headline = cleanText(roleEl ? roleEl.textContent : '');

    let organization = '';
    const compEl = document.querySelector('[data-testid="user-profile-company"], [class*="experience"] h3');
    if (compEl) organization = cleanText(compEl.textContent);

    const locEl = document.querySelector('[data-testid="user-location"], [class*="location"]');
    const location = cleanText(locEl ? locEl.textContent : '');

    const avatarEl = document.querySelector('img[alt="avatar"], [data-testid="user-avatar"] img, img[src*="avatar"]');
    const avatarUrl = avatarEl ? avatarEl.src : '';

    return {
      fullName,
      name: fullName,
      headline,
      role: headline,
      organization,
      location,
      avatarUrl,
      linkedInUrl: `https://peerlist.io/${username}`,
      suggestedCategory: inferContactCategoryContent(headline),
      platform: 'Other'
    };
  } catch {
    return null;
  }
}

// Scrape profile details from Wellfound / AngelList (wellfound.com/u/[username])
function extractWellfoundProfileData() {
  try {
    const host = window.location.hostname.toLowerCase();
    if (!host.includes('wellfound.com') && !host.includes('angel.co')) return null;
    const match = window.location.pathname.match(/^\/u\/([^/?#]+)/i);
    if (!match) return null;

    const username = match[1];
    const nameEl = document.querySelector('h1, [data-testid="profile-name"], [class*="profileName" i]');
    let fullName = getCleanElementText(nameEl);
    if (!fullName) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && ogTitle.content) fullName = cleanText(ogTitle.content.split(/\s*[-–|•(]\s*/)[0]);
    }
    if (!fullName) fullName = username;

    const roleEl = document.querySelector('[data-testid="profile-headline"], [class*="headline" i], [class*="tagline" i], main h2');
    let headline = getCleanElementText(roleEl);
    if (!headline) {
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && ogDesc.content) headline = cleanText(ogDesc.content);
    }

    let organization = '';
    const compEl = document.querySelector('[data-testid="profile-company"], a[href*="/company/"], [class*="companyName" i]');
    if (compEl) organization = getCleanElementText(compEl);
    if (!organization && headline) {
      const atMatch = headline.match(/(?:\bat\s+|@)([^,|•·\n]+)/i);
      if (atMatch && atMatch[1]) organization = cleanText(atMatch[1]);
    }

    const locEl = document.querySelector('[data-testid="profile-location"], [class*="location" i]');
    const location = getCleanElementText(locEl);

    const avatarEl = document.querySelector('main img[src*="wellfound"], main img[src*="angel.co"], main img[alt*="avatar" i], img[src*="avatars"]');
    const avatarUrl = avatarEl ? avatarEl.src : '';

    return {
      fullName,
      name: fullName,
      headline,
      role: headline,
      organization,
      location,
      avatarUrl,
      linkedInUrl: `https://wellfound.com/u/${username}`,
      suggestedCategory: inferContactCategoryContent(headline),
      platform: 'Wellfound'
    };
  } catch {
    return null;
  }
}

// Universal Person Structured Data (Schema.org Person)
function extractUniversalPersonData() {
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const item = findJsonLdEntity(data, 'Person');
        if (item && (item.name || item.givenName)) {
          const rawName = item.name ? (typeof item.name === 'string' ? item.name : (item.name.name || '')) : `${item.givenName || ''} ${item.familyName || ''}`.trim();
          const fullName = cleanText(rawName);
          const headline = cleanText(item.jobTitle || item.description || '');
          let organization = '';
          if (typeof item.worksFor === 'string') organization = cleanText(item.worksFor);
          else if (item.worksFor && typeof item.worksFor === 'object') organization = cleanText(item.worksFor.name || '');

          let location = '';
          if (item.address) {
            if (typeof item.address === 'string') location = cleanText(item.address);
            else if (typeof item.address === 'object') location = cleanText([item.address.addressLocality, item.address.addressCountry].filter(Boolean).join(', '));
          }

          let avatarUrl = '';
          if (typeof item.image === 'string') avatarUrl = item.image;
          else if (item.image && typeof item.image === 'object') avatarUrl = item.image.url || '';

          const linkedInUrl = item.url || window.location.href;
          const suggestedCategory = inferContactCategoryContent(headline);

          return {
            fullName,
            name: fullName,
            headline,
            role: headline,
            organization,
            location,
            avatarUrl,
            linkedInUrl,
            suggestedCategory,
            platform: 'Other',
          };
        }
      } catch {
        // continue
      }
    }
  } catch {
    // continue
  }
  return null;
}

// ============================================================================
// AI Scraping Fallback & Boost Engine (Chrome Built-in LanguageModel + Semantic NLP)
// ============================================================================

function buildAiPageSnapshot() {
  try {
    const url = window.location.href;
    const domain = window.location.hostname.toLowerCase();
    const title = cleanText(document.title || '');
    const metaDescEl = document.querySelector('meta[name="description"], meta[property="og:description"]');
    const metaDescription = metaDescEl ? cleanText(metaDescEl.getAttribute('content') || '') : '';
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    const ogTitle = ogTitleEl ? cleanText(ogTitleEl.getAttribute('content') || '') : '';
    const ogSiteEl = document.querySelector('meta[property="og:site_name"]');
    const ogSiteName = ogSiteEl ? cleanText(ogSiteEl.getAttribute('content') || '') : '';

    const openDialog = document.querySelector(
      'dialog[open], [role="dialog"]:not([aria-hidden="true"]), [aria-modal="true"]:not([aria-hidden="true"]), [data-state="open"][role="dialog"]'
    ) || (typeof findActiveJobModalContainer === 'function' ? findActiveJobModalContainer() : null);
    const modalLines = openDialog ? extractCleanLines(openDialog).slice(0, 45) : [];

    const headingsScope = openDialog || document;
    const headings = Array.from(headingsScope.querySelectorAll('h1, h2, h3, [role="heading"]'))
      .filter(el => !el.closest('nav, footer, aside'))
      .map(el => getCleanElementText(el))
      .filter(t => t && t.length >= 2 && t.length <= 160)
      .slice(0, 15);

    const expData = domain.includes('linkedin.com') ? parseLinkedInExperienceSection(document) : null;
    const mainRoot = openDialog || document.querySelector('main, article, [role="main"]') || document.body;
    const mainLines = extractCleanLines(mainRoot).slice(0, 75);

    const footerEl = document.querySelector('footer, [role="contentinfo"]');
    const footerText = footerEl ? getCleanElementText(footerEl).slice(0, 400) : '';

    return {
      url,
      domain,
      title,
      metaDescription,
      ogTitle,
      ogSiteName,
      headings,
      modalLines,
      hasActiveModal: Boolean(openDialog),
      experienceData: expData,
      mainLines,
      footerText
    };
  } catch {
    return {
      url: window.location.href,
      domain: window.location.hostname || '',
      title: document.title || '',
      metaDescription: '',
      ogTitle: '',
      ogSiteName: '',
      headings: [],
      modalLines: [],
      hasActiveModal: false,
      experienceData: null,
      mainLines: [],
      footerText: ''
    };
  }
}

function aiSemanticBoostFromSnapshot(snapshot, modeHint = 'auto') {
  if (!snapshot) return { jobBoost: {}, contactBoost: {} };
  const allLines = [
    ...(snapshot.modalLines || []),
    ...(snapshot.headings || []),
    ...(snapshot.mainLines || [])
  ];
  const combinedText = allLines.join('\n');

  const GENERIC_ROLE_NOISE = /^(?:careers?|karriere|jobs?|job\s+opening|openings|open\s+roles?|open\s+positions?|job\s+openings?|current\s+openings|remote\s+jobs|remote\s+developer\s+jobs|find\s+remote\s+jobs|startup\s+jobs|browse\s+jobs|search\s+jobs|all\s+jobs|verified\s+jobs|recommended\s+jobs|arc\s+jobs|wellfound\s+jobs|arc\s+exclusive|dashboard|join\s+us|about\s+us|our\s+mission|benefits|perks|apply\s+now|work\s+with\s+us|stellenangebote|offene\s+stellen)$/i;
  const GENERIC_BOARD_OR_SITE_NAMES = /^(?:linkedin|x|twitter|github|notion|webflow|framer|ashby|greenhouse|lever|workable|arc|arc\.dev|arc\s+exclusive|arc\s+verified|wellfound|angel\.?co|indeed|glassdoor|otta|peerlist|monster|dice|ziprecruiter|bayt|workday|smartrecruiters|bamboohr|jobvite|recruitee|rippling|breezy|remotive|himalayas|weworkremotely|remoteok|y\s+combinator|work\s+at\s+a\s+startup|company|unknown|careers?|karriere|jobs?)$/i;

  const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
  const snapDomain = snapshot.url ? getDomainFromUrl(snapshot.url) : (snapshot.domain || '');
  const isBoardOrAtsHost = Boolean(
    (snapDomain && isJobBoardHost(snapDomain)) ||
    (snapshot.url && registry && registry.isJobBoardOrAts && registry.isJobBoardOrAts(snapshot.url))
  );

  // 1. Job Boost Inference (for unconventional job boards, startup sites, Notion/Framer pages, modals, and posts)
  const jobBoost = {};
  const postMeta = extractRoleAndMetaFromPostText(combinedText);
  if (postMeta) {
    if (postMeta.role && !GENERIC_ROLE_NOISE.test(postMeta.role)) jobBoost.role = postMeta.role;
    if (postMeta.company) {
      const cleanedPostComp = cleanCompanyName(postMeta.company);
      if (cleanedPostComp && !GENERIC_BOARD_OR_SITE_NAMES.test(cleanedPostComp)) {
        jobBoost.company = cleanedPostComp;
      }
    }
    if (postMeta.location) jobBoost.location = postMeta.location;
    if (postMeta.workLocation) jobBoost.workLocation = postMeta.workLocation;
    if (postMeta.employmentType) jobBoost.employmentType = postMeta.employmentType;
    if (postMeta.salary) jobBoost.salary = postMeta.salary;
  }

  // Scan headings and modal lines for role title if not yet found
  if (!jobBoost.role) {
    const roleCandidates = [...(snapshot.modalLines || []).slice(0, 8), ...(snapshot.headings || [])];
    for (const cand of roleCandidates) {
      if (!cand || cand.length < 3 || cand.length > 95) continue;
      if (GENERIC_ROLE_NOISE.test(cand) || (typeof PROSE_SECTION_HEADING_RE !== 'undefined' && PROSE_SECTION_HEADING_RE.test(cand))) continue;
      if (POST_ROLE_TITLE_REGEX.test(cand) || /\b(?:Engineer|Developer|Designer|Architect|Manager|Lead|Scientist|Analyst|Director|Specialist|Consultant|Researcher|Intern|Instructor|Advocate|Coordinator|Producer|Counsel|Head\s+of\s+\w+|VP\s+of\s+\w+|Founding\s+\w+)\b/i.test(cand)) {
        const strippedRole = cand.replace(/\s*[-–—|]\s*(?:Remote|Hybrid|On-site|Onsite|Full-time|Part-time).*$/i, '').trim();
        if (strippedRole && !GENERIC_ROLE_NOISE.test(strippedRole)) {
          jobBoost.role = strippedRole;
          break;
        }
      }
    }
  }

  // Scan for company name across prose patterns ("Join Our Team at <Company>", "About <Company>", "At <Company>, we"), then ogSiteName, copyright footer, or domain
  if (!jobBoost.company) {
    for (const line of allLines) {
      const aboutMatch = line.match(/^(?:About|Join(?:\s+(?:Our|The)\s+Team\s+at)?|Working\s+at|Life\s+at|Careers\s+at)\s+([A-Z0-9][A-Za-z0-9&.\-_ ]{1,32})$/i);
      if (aboutMatch && aboutMatch[1] && !/^(?:Us|The\s+Team|The\s+Role|Our\s+Company|Our\s+Team)$/i.test(aboutMatch[1].trim())) {
        const candComp = cleanCompanyName(aboutMatch[1]);
        if (candComp && !GENERIC_BOARD_OR_SITE_NAMES.test(candComp)) {
          jobBoost.company = candComp;
          break;
        }
      }
      const atWeMatch = line.match(/\bAt\s+([A-Z0-9][A-Za-z0-9&.\-_]{1,25}(?:\s+[A-Z0-9][A-Za-z0-9&.\-_]{1,25})?),\s+we\s+(?:are|build|believe|help|create|make|empower)\b/);
      if (atWeMatch && atWeMatch[1]) {
        const candComp = cleanCompanyName(atWeMatch[1]);
        if (candComp && !GENERIC_BOARD_OR_SITE_NAMES.test(candComp)) {
          jobBoost.company = candComp;
          break;
        }
      }
    }
  }
  if (!jobBoost.company && snapshot.ogSiteName && !isBoardOrAtsHost) {
    const cleanedOgSite = cleanCompanyName(snapshot.ogSiteName);
    if (cleanedOgSite && !GENERIC_BOARD_OR_SITE_NAMES.test(cleanedOgSite)) {
      jobBoost.company = cleanedOgSite;
    }
  }
  if (!jobBoost.company && snapshot.footerText && !isBoardOrAtsHost) {
    const copyMatch = snapshot.footerText.match(/(?:©|Copyright)\s*(?:20\d{2}\s*)?([A-Z][A-Za-z0-9&.\-_ ]{1,30}?)(?:\s*(?:Inc\.?|LLC|Ltd\.?|Corp\.?|All\s+rights|·|\||,|$))/i);
    if (copyMatch && copyMatch[1]) {
      const cleanedFooterComp = cleanCompanyName(copyMatch[1]);
      if (cleanedFooterComp && !GENERIC_BOARD_OR_SITE_NAMES.test(cleanedFooterComp)) {
        jobBoost.company = cleanedFooterComp;
      }
    }
  }
  if (!jobBoost.company && snapshot.url && !isBoardOrAtsHost) {
    jobBoost.company = getDomainName(snapshot.url);
  }
  if (jobBoost.role) {
    jobBoost.role = cleanRoleTitle(jobBoost.role, jobBoost.company || '');
  }

  // 2. Contact / Profile Boost Inference (Latest Experience position is the source of truth)
  const contactBoost = {};
  const expSource = snapshot.experienceData !== undefined ? snapshot.experienceData : parseLinkedInExperienceSection(document);
  if (expSource) {
    if (expSource.primaryRole) {
      contactBoost.role = expSource.primaryRole;
      contactBoost.headline = expSource.primaryRole;
      contactBoost.experienceRole = expSource.primaryRole;
      contactBoost.hasExperienceData = true;
    }
    if (expSource.organization) {
      contactBoost.organization = expSource.organization;
      contactBoost.experienceOrganization = expSource.organization;
      contactBoost.hasExperienceData = true;
    }
    if (expSource.location) {
      contactBoost.location = expSource.location;
    }
  }

  // Scan headings/lines for "<Role> at <Company>" or "<Name> - <Role> @ <Company>"
  if (!contactBoost.role || !contactBoost.organization) {
    for (const line of allLines.slice(0, 25)) {
      const roleAtComp = line.match(/^([A-Za-z][A-Za-z0-9 /#+.\-&|]{2,55}?)\s+(?:at|@)\s+([A-Z][A-Za-z0-9&.\-_ ]{1,35})(?:\s*[|•·]|$)/i);
      if (roleAtComp && roleAtComp[1] && roleAtComp[2]) {
        if (!contactBoost.role) {
          contactBoost.role = cleanLinkedInTopCardHeadlineFallback(roleAtComp[1]);
          contactBoost.headline = contactBoost.role;
        }
        if (!contactBoost.organization) {
          contactBoost.organization = cleanText(roleAtComp[2].replace(/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u2600-\u27BF\uFE0F]/gu, ''));
        }
        break;
      }
    }
  }

  // Fallback to structured key-value lines (Role: / Position: / Company: / Organization: / Location:) parsed by postMeta
  if (postMeta) {
    if (!contactBoost.role && postMeta.role) {
      contactBoost.role = postMeta.role;
      contactBoost.headline = postMeta.role;
    }
    if (!contactBoost.organization && postMeta.company) {
      contactBoost.organization = postMeta.company;
    }
    if (!contactBoost.location && postMeta.location) {
      contactBoost.location = postMeta.location;
    }
  }

  return { jobBoost, contactBoost, modeHint };
}

async function runBuiltInPromptApiExtraction(snapshot, modeHint = 'auto') {
  const heuristicResult = aiSemanticBoostFromSnapshot(snapshot, modeHint);
  try {
    const lmNamespace = (typeof LanguageModel !== 'undefined' && LanguageModel)
      ? LanguageModel
      : (typeof globalThis !== 'undefined' && globalThis.ai && globalThis.ai.languageModel ? globalThis.ai.languageModel : null);

    if (!lmNamespace || typeof lmNamespace.create !== 'function') {
      return { ...heuristicResult, aiProvider: 'semantic_heuristics' };
    }

    if (typeof lmNamespace.availability === 'function') {
      const avail = await lmNamespace.availability();
      if (avail === 'unavailable' || avail === 'no') {
        return { ...heuristicResult, aiProvider: 'semantic_heuristics' };
      }
    }

    const session = await lmNamespace.create({
      systemPrompt:
        'You are a precision structured data extractor for a job & contact tracker. ' +
        'For contacts/profiles, ALWAYS use the latest position and company from their Experience / Work History section as the source of truth for role and organization, NEVER their marketing bio/headline. ' +
        'Never return employment types like "Part-time" or "Full-time" as a company or organization name. ' +
        'Return ONLY valid JSON.'
    });

    try {
      const schema = {
        type: 'object',
        properties: {
          role: { type: 'string' },
          company: { type: 'string' },
          organization: { type: 'string' },
          fullName: { type: 'string' },
          location: { type: 'string' },
          workLocation: { type: 'string' },
          employmentType: { type: 'string' },
          salary: { type: 'string' }
        }
      };

      const promptInput = JSON.stringify({
        mode: modeHint,
        url: snapshot.url,
        title: snapshot.title,
        headings: snapshot.headings,
        modalLines: snapshot.modalLines,
        experience: snapshot.experienceData,
        mainLines: (snapshot.mainLines || []).slice(0, 45)
      });

      const rawResponse = await session.prompt(
        `Extract structured job and/or contact fields from this webpage snapshot:\n${promptInput}`,
        { responseConstraint: schema }
      );
      const parsed = JSON.parse(rawResponse);
      if (parsed && typeof parsed === 'object') {
        const cleanOrg = (val) => {
          if (!val || typeof val !== 'string') return '';
          if (/^(?:full-time|part-time|contract|freelance|self-employed|internship|remote|hybrid|on-site|onsite)$/i.test(val.trim())) return '';
          return val.trim();
        };

        if (parsed.role && !heuristicResult.jobBoost.role) heuristicResult.jobBoost.role = cleanText(parsed.role);
        if (cleanOrg(parsed.company) && !heuristicResult.jobBoost.company) heuristicResult.jobBoost.company = cleanOrg(parsed.company);
        if (parsed.location && !heuristicResult.jobBoost.location) heuristicResult.jobBoost.location = cleanText(parsed.location);
        if (parsed.workLocation && !heuristicResult.jobBoost.workLocation) heuristicResult.jobBoost.workLocation = cleanText(parsed.workLocation);
        if (parsed.employmentType && !heuristicResult.jobBoost.employmentType) heuristicResult.jobBoost.employmentType = cleanText(parsed.employmentType);
        if (parsed.salary && !heuristicResult.jobBoost.salary) heuristicResult.jobBoost.salary = cleanText(parsed.salary);

        if (parsed.fullName && !heuristicResult.contactBoost.fullName) heuristicResult.contactBoost.fullName = cleanText(parsed.fullName);
        if (parsed.role && !heuristicResult.contactBoost.role) {
          heuristicResult.contactBoost.role = cleanText(parsed.role);
          heuristicResult.contactBoost.headline = cleanText(parsed.role);
        }
        const aiContactOrg = cleanOrg(parsed.organization || parsed.company);
        if (aiContactOrg && !heuristicResult.contactBoost.organization) {
          heuristicResult.contactBoost.organization = aiContactOrg;
        }
        if (parsed.location && !heuristicResult.contactBoost.location) {
          heuristicResult.contactBoost.location = cleanText(parsed.location);
        }
      }
      return { ...heuristicResult, aiProvider: 'chrome_builtin_ai' };
    } finally {
      if (session && typeof session.destroy === 'function') {
        session.destroy();
      }
    }
  } catch {
    return { ...heuristicResult, aiProvider: 'semantic_heuristics' };
  }
}

function getPageDataUnified(userEmail) {
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname;

  // 1. Webmail (Gmail & Outlook)
  if (host.includes('mail.google.com') || host.includes('outlook.')) {
    const emailData = extractEmailData(userEmail);
    return {
      success: true,
      pageType: 'webmail',
      emailData
    };
  }

  // 2. LinkedIn Profile (/in/ or /pub/)
  if (host.includes('linkedin.com') && (path.includes('/in/') || path.includes('/pub/'))) {
    const profileData = extractLinkedInProfileData();
    if (profileData && (profileData.fullName || profileData.name)) {
      if (!profileData.role || !profileData.organization || !profileData.location) {
        const { contactBoost } = aiSemanticBoostFromSnapshot(buildAiPageSnapshot(), 'contact');
        if (!profileData.role && contactBoost.role) {
          profileData.role = contactBoost.role;
          profileData.headline = contactBoost.role;
        }
        if (!profileData.organization && contactBoost.organization) {
          profileData.organization = contactBoost.organization;
        }
        if (!profileData.location && contactBoost.location) {
          profileData.location = contactBoost.location;
        }
      }
      return {
        success: true,
        pageType: 'contact_profile',
        profileData
      };
    }
  }

  // 3. X (Twitter) Profile (exact 1 segment)
  const xProfile = extractXProfileData();
  if (xProfile && (xProfile.fullName || xProfile.headline)) {
    return {
      success: true,
      pageType: 'contact_profile',
      profileData: xProfile
    };
  }

  // 4. GitHub Profile (exact 1 segment)
  const ghProfile = extractGitHubProfileData();
  if (ghProfile && (ghProfile.fullName || ghProfile.headline)) {
    return {
      success: true,
      pageType: 'contact_profile',
      profileData: ghProfile
    };
  }

  // 5. Peerlist Profile
  const peerlistProfile = extractPeerlistProfileData();
  if (peerlistProfile && (peerlistProfile.fullName || peerlistProfile.headline)) {
    return {
      success: true,
      pageType: 'contact_profile',
      profileData: peerlistProfile
    };
  }

  // 5B. Wellfound Profile (/u/[username])
  const wellfoundProfile = extractWellfoundProfileData();
  if (wellfoundProfile && (wellfoundProfile.fullName || wellfoundProfile.headline)) {
    return {
      success: true,
      pageType: 'contact_profile',
      profileData: wellfoundProfile
    };
  }

  // 6. LinkedIn Post Job
  const postJob = extractLinkedInPostJobData();
  if (postJob && postJob.title) {
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    const notes = (registry && registry.htmlToMarkdown && postJob.descriptionHtml)
      ? registry.htmlToMarkdown(postJob.descriptionHtml)
      : (postJob.descriptionHtml ? postJob.descriptionHtml.replace(/<[^>]*>/g, '').trim() : '');

    const jobData = {
      role: postJob.title,
      company: postJob.company,
      platform: 'LinkedIn',
      jobLink: postJob.jobLink,
      notes,
      companyDomain: resolveCompanyDomain(postJob.company, null, null),
      location: postJob.location,
      workLocation: postJob.workLocation,
      employmentType: postJob.employmentType,
      status: 'Saved',
      contact: postJob.contact,
      salary: postJob.salary || undefined,
    };

    return {
      success: true,
      pageType: 'job_posting',
      jobData,
      atsResult: { formElementFound: false }
    };
  }

  // 7. X (Twitter) Post / Tweet Job
  const xPostJob = extractXPostJobData();
  if (xPostJob && xPostJob.title) {
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    const notes = (registry && registry.htmlToMarkdown && xPostJob.descriptionHtml)
      ? registry.htmlToMarkdown(xPostJob.descriptionHtml)
      : (xPostJob.descriptionHtml ? xPostJob.descriptionHtml.replace(/<[^>]*>/g, '').trim() : '');

    const jobData = {
      role: xPostJob.title,
      company: xPostJob.company,
      platform: 'Other',
      jobLink: xPostJob.jobLink,
      notes,
      companyDomain: resolveCompanyDomain(xPostJob.company, null, null),
      location: xPostJob.location,
      workLocation: xPostJob.workLocation,
      employmentType: xPostJob.employmentType,
      status: 'Saved',
      contact: xPostJob.contact,
      salary: xPostJob.salary || undefined,
    };

    return {
      success: true,
      pageType: 'job_posting',
      jobData,
      atsResult: { formElementFound: false }
    };
  }

  // 8. Active Modal or Side Menu / Drawer Job Posting (takes priority over background listing pages)
  const modalJob = extractJobFromActiveModalOrDrawer();
  if (modalJob && modalJob.title) {
    const domain = getDomainFromUrl(window.location.href);
    const platform = detectPlatform(domain);
    const registry = typeof JobBoardRegistry !== 'undefined' ? JobBoardRegistry : null;
    const companyDomain = resolveCompanyDomain(modalJob.company, null, null);
    let notes = '';
    const selectedText = window.getSelection ? window.getSelection().toString().trim() : '';
    if (selectedText.length > 20) {
      notes = selectedText;
    } else {
      notes = (registry && registry.htmlToMarkdown && modalJob.descriptionHtml)
        ? registry.htmlToMarkdown(modalJob.descriptionHtml)
        : (modalJob.descriptionHtml ? modalJob.descriptionHtml.replace(/<[^>]*>/g, '').trim() : '');
    }

    const jobData = {
      role: modalJob.title,
      company: modalJob.company || (!isJobBoardHost(domain) ? getDomainName(window.location.href) : ''),
      platform,
      jobLink: modalJob.jobLink || window.location.href,
      notes,
      companyDomain,
      location: modalJob.location,
      workLocation: modalJob.workLocation,
      employmentType: modalJob.employmentType,
      status: 'Saved',
      salary: modalJob.salary || undefined,
    };

    return {
      success: true,
      pageType: 'job_posting',
      jobData,
      atsResult: detectAtsForm()
    };
  }

  // 9. Universal Person Structured Data (if page has Schema.org/Person and no dedicated job posting)
  const sitePrecheck = parseSiteSpecific();
  const jsonLdJobPrecheck = parseJsonLd();
  if (!sitePrecheck?.title && !jsonLdJobPrecheck?.title) {
    const personData = extractUniversalPersonData();
    if (personData && personData.fullName) {
      return {
        success: true,
        pageType: 'contact_profile',
        profileData: personData
      };
    }
  }

  // 10. Standard Job Posting, ATS Form, or Universal Web Page Scraper + Automatic AI Fallback
  const jobData = extractPageData();
  const atsResult = detectAtsForm();

  // Automatic AI Semantic Fallback when deterministic selectors miss key job fields on unconventional sites
  if (jobData && (!jobData.role || !jobData.company || !jobData.location)) {
    const { jobBoost } = aiSemanticBoostFromSnapshot(buildAiPageSnapshot(), 'job');
    if (!jobData.role && jobBoost.role) jobData.role = jobBoost.role;
    if (!jobData.company && jobBoost.company) jobData.company = jobBoost.company;
    if (!jobData.location && jobBoost.location) jobData.location = jobBoost.location;
    if (!jobData.workLocation && jobBoost.workLocation) jobData.workLocation = jobBoost.workLocation;
    if (!jobData.employmentType && jobBoost.employmentType) jobData.employmentType = jobBoost.employmentType;
    if (!jobData.salary && jobBoost.salary) jobData.salary = jobBoost.salary;
  }

  const hasJob = Boolean(jobData && (jobData.company || jobData.role));
  if (atsResult.formElementFound || hasJob) {
    return {
      success: true,
      pageType: atsResult.formElementFound ? 'ats_form' : 'job_posting',
      jobData,
      atsResult
    };
  }

  return {
    success: true,
    pageType: 'generic_page',
    jobData,
    atsResult
  };
}

// Extract stripped, readable page text capped at 12,000 chars for AI fallback
function extractCleanPageTextForAi(maxChars = 12000) {
  try {
    if (!document.body) return '';
    const formatCloneText = (rootNode) => {
      const clone = rootNode.cloneNode(true);
      stripScreenReaderDuplicates(clone);
      clone.querySelectorAll('script, style, noscript, svg, nav, footer, iframe').forEach(n => n.remove());
      clone.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, br, tr, section, article').forEach(el => {
        el.appendChild(document.createTextNode('\n'));
      });
      return (clone.textContent || '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n+/g, '\n\n')
        .trim();
    };

    const activeModal = findActiveJobModalContainer();
    if (activeModal) {
      const modalText = formatCloneText(activeModal);
      if (modalText.length >= 100) {
        if (modalText.length >= maxChars) return modalText.slice(0, maxChars);
        const bodyText = formatCloneText(document.body);
        const combined = modalText + '\n\n---\n\n' + bodyText;
        return combined.slice(0, maxChars);
      }
    }

    const raw = formatCloneText(document.body);
    return raw.slice(0, maxChars);
  } catch {
    return cleanText(document.body ? (document.body.innerText || document.body.textContent || '') : '').slice(0, maxChars);
  }
}

// 1. Listen for runtime messages from popup, side panel or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_PAGE_DATA') {
    const data = getPageDataUnified(request.userEmail);
    sendResponse(data);
    return true;
  } else if (request.action === 'GET_CLEAN_PAGE_TEXT') {
    const text = extractCleanPageTextForAi(12000);
    sendResponse({
      success: true,
      url: window.location.href,
      title: document.title,
      text,
    });
    return true;
  } else if (request.action === 'AI_SCRAPE_BOOST') {
    const snapshot = buildAiPageSnapshot();
    const unified = getPageDataUnified(request.userEmail);
    const finalizeAiBoostResponse = (aiResult) => {
      const jobBoostClean = Object.fromEntries(
        Object.entries(aiResult?.jobBoost || {}).filter(([, v]) => Boolean(v))
      );
      const contactBoostClean = Object.fromEntries(
        Object.entries(aiResult?.contactBoost || aiResult?.profileBoost || {}).filter(([, v]) => Boolean(v))
      );
      const baseJob = unified?.jobData || {};
      if (
        baseJob.role &&
        jobBoostClean.role &&
        baseJob.role !== cleanText(document.title || '') &&
        baseJob.role.toLowerCase().includes(String(jobBoostClean.role).toLowerCase())
      ) {
        jobBoostClean.role = baseJob.role;
        if (aiResult && aiResult.jobBoost) {
          aiResult.jobBoost.role = baseJob.role;
        }
      }
      const mergedJobData = Object.assign({}, baseJob, jobBoostClean);
      const baseProfile = unified?.profileData || {};
      const mergedProfileData = Object.assign({}, baseProfile, contactBoostClean);
      if (baseProfile.experienceRole && baseProfile.primaryRole) {
        mergedProfileData.primaryRole = baseProfile.primaryRole;
        mergedProfileData.headline = baseProfile.primaryRole;
      }
      if (baseProfile.experienceOrganization && baseProfile.organization) {
        mergedProfileData.organization = baseProfile.organization;
        mergedProfileData.firstOrganization = baseProfile.organization;
      }
      if (!mergedProfileData.headline && mergedProfileData.role) {
        mergedProfileData.headline = mergedProfileData.role;
      }
      if (unified) {
        if (unified.jobData || Object.keys(mergedJobData).length > 0) unified.jobData = mergedJobData;
        if (unified.profileData || Object.keys(mergedProfileData).length > 0) unified.profileData = mergedProfileData;
      }
      sendResponse({
        success: true,
        aiBoosted: true,
        jobData: mergedJobData,
        profileData: mergedProfileData,
        unified,
        snapshot,
        aiResult
      });
    };
    runBuiltInPromptApiExtraction(snapshot, request.mode || 'auto')
      .then((aiResult) => {
        finalizeAiBoostResponse(aiResult);
      })
      .catch(() => {
        finalizeAiBoostResponse(aiSemanticBoostFromSnapshot(snapshot, request.mode || 'auto'));
      });
    return true;
  } else if (request.action === 'DETECT_ATS_FORM') {
    const result = detectAtsForm();
    sendResponse({ success: true, result });
    return true;
  } else if (request.action === 'EXECUTE_AUTOFILL') {
    const result = executeAutofill(request.profile);
    sendResponse({ success: true, ...result });
    return true;
  } else if (request.action === 'SCROLL_TO_FIELD') {
    const scrolled = scrollToField(request.targetSelector);
    sendResponse({ success: true, scrolled });
    return true;
  } else if (request.action === 'EXTRACT_PAGE_DATA') {
    const data = extractPageData();
    sendResponse(data);
  } else if (request.action === 'EXTRACT_EMAIL_DATA') {
    const data = extractEmailData(request.userEmail);
    sendResponse(data);
  } else if (request.action === 'TRACKLET_EXT_INCOMING_APP') {
    if (!isTrackletOrigin()) {
      sendResponse({ received: false });
      return true;
    }
    window.postMessage({
      type: 'TRACKLET_EXT_ADD_APPLICATION',
      payload: request.payload,
      persistedToCloud: request.persistedToCloud
    }, window.location.origin);
    sendResponse({ received: true });
  } else if (request.action === 'TRACKLET_EXT_INCOMING_EMAIL') {
    if (!isTrackletOrigin()) {
      sendResponse({ received: false });
      return true;
    }
    window.postMessage({
      type: 'TRACKLET_EXT_ADD_EMAIL',
      payload: request.payload
    }, window.location.origin);
    sendResponse({ received: true });
  } else if (request.action === 'TRACKLET_EXT_INCOMING_CONTACT') {
    if (!isTrackletOrigin()) {
      sendResponse({ received: false });
      return true;
    }
    window.postMessage({
      type: 'TRACKLET_EXT_ADD_CONTACT',
      payload: request.payload,
      persistedToCloud: request.persistedToCloud
    }, window.location.origin);
    sendResponse({ received: true });
  }
  return true;
});

// Helper: verifies whether the active tab is an authorized Tracklet origin
function isTrackletOrigin() {
  try {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === 'tracklet.app' || hostname.endsWith('.tracklet.app')) return true;
    if (hostname === 'usetracklet.com' || hostname.endsWith('.usetracklet.com')) return true;
    if (hostname === 'usetracklet.netlify.app') return true;
    if (/^(use)?tracklet(-[a-z0-9-]+)?\.web\.app$/.test(hostname)) return true;
    if (/^(use)?tracklet(-[a-z0-9-]+)?\.firebaseapp\.com$/.test(hostname)) return true;
    if (/^(use)?tracklet(-[a-z0-9-]+)?\.netlify\.app$/.test(hostname)) return true;
    if (/^(use)?tracklet(-[a-z0-9-]+)?\.pages\.dev$/.test(hostname)) return true;
    if (hostname.endsWith('.pages.dev') && hostname.includes('tracklet')) return true;
    if (hostname.endsWith('.netlify.app') && hostname.includes('tracklet')) return true;
    return false;
  } catch {
    return false;
  }
}

// Proactive handshake broadcaster: stamps DOM markers and announces presence to Tracklet web app
function announceTrackletPresence() {
  if (!isTrackletOrigin()) return;
  try {
    const manifest = (typeof chrome !== 'undefined' && chrome.runtime?.getManifest)
      ? chrome.runtime.getManifest()
      : { version: '1.3.4', name: 'Tracklet' };
    const version = manifest.version || '1.3.4';

    // 1. Direct DOM markers on documentElement for instant zero-latency detection
    if (document.documentElement) {
      document.documentElement.setAttribute('data-tracklet-extension-installed', 'true');
      document.documentElement.setAttribute('data-tracklet-extension-version', version);
    }

    // 2. Broadcast PONG event to Tracklet web window
    window.postMessage({
      type: 'TRACKLET_EXT_PONG',
      payload: {
        installed: true,
        version: version,
        name: manifest.name || 'Tracklet'
      }
    }, window.location.origin);

    // 3. Dispatch synchronous custom event for in-page listeners
    window.dispatchEvent(new CustomEvent('tracklet:extension:ready', {
      detail: { installed: true, version: version }
    }));
  } catch {
    // Extension context invalidated
  }
}

// Immediately announce presence upon script load
announceTrackletPresence();

// 2. Listen for auth session and applications index sync from Tracklet web app window
window.addEventListener('message', (event) => {
  if (event.source !== window || !isTrackletOrigin()) return;
  if (!event.data || typeof event.data !== 'object') return;

  if (event.data.type === 'TRACKLET_EXT_PING') {
    announceTrackletPresence();
  } else if (event.data.type === 'TRACKLET_WEB_AUTH_SYNC') {
    try {
      if (event.data.payload?.latestVersion && typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ tracklet_latest_version: event.data.payload.latestVersion });
      }
      chrome.runtime.sendMessage({
        action: 'SYNC_USER_SESSION',
        payload: {
          ...event.data.payload,
          origin: window.location.origin
        }
      });
    } catch {
      // Extension context invalidated or reloaded
    }
  } else if (event.data.type === 'TRACKLET_APPS_INDEX_SYNC') {
    try {
      chrome.runtime.sendMessage({
        action: 'SYNC_APPS_INDEX',
        payload: event.data.payload
      });
    } catch {
      // Extension context invalidated or reloaded
    }
  } else if (event.data.type === 'TRACKLET_CONTACTS_INDEX_SYNC') {
    try {
      chrome.runtime.sendMessage({
        action: 'SYNC_CONTACTS_INDEX',
        payload: event.data.payload
      });
    } catch {
      // Extension context invalidated or reloaded
    }
  } else if (event.data.type === 'TRACKLET_EXT_EMAIL_ACK') {
    const ackId = event.data.emailLogId;
    if (ackId && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['tracklet_pending_emails'], (res) => {
        const current = res?.tracklet_pending_emails || [];
        const remaining = current.filter(item => item.emailLog?.id !== ackId);
        if (remaining.length < current.length) {
          if (remaining.length === 0) {
            chrome.storage.local.remove(['tracklet_pending_emails']);
          } else {
            chrome.storage.local.set({ tracklet_pending_emails: remaining });
          }
        }
      });
    }
  } else if (event.data.type === 'TRACKLET_EXT_DELETE_APPLICATION') {
    const deletedId = event.data.payload?.id;
    if (deletedId && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_apps_index'], (res) => {
        const pending = (res?.tracklet_pending_apps || []).filter((a) => a?.id !== deletedId);
        const appsIndex = (res?.tracklet_apps_index || []).filter((a) => a?.id !== deletedId);
        chrome.storage.local.set({
          tracklet_pending_apps: pending,
          tracklet_apps_index: appsIndex,
        });
      });
      try {
        chrome.runtime.sendMessage({
          action: 'DELETE_APPLICATION',
          payload: { id: deletedId }
        });
      } catch {
        // Extension context invalidated
      }
    }
  } else if (event.data.type === 'TRACKLET_EXT_DELETE_CONTACT') {
    const deletedIds = event.data.payload?.ids || (event.data.payload?.id ? [event.data.payload.id] : []);
    if (deletedIds.length > 0 && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['tracklet_pending_contacts', 'tracklet_contacts_index'], (res) => {
        const pending = (res?.tracklet_pending_contacts || []).filter((c) => !deletedIds.includes(c?.id));
        const contactsIndex = (res?.tracklet_contacts_index || []).filter((c) => !deletedIds.includes(c?.id));
        chrome.storage.local.set({
          tracklet_pending_contacts: pending,
          tracklet_contacts_index: contactsIndex,
        });
      });
      try {
        chrome.runtime.sendMessage({
          action: 'DELETE_CONTACT',
          payload: { ids: deletedIds }
        });
      } catch {
        // Extension context invalidated
      }
    }
  } else if (event.data.type === 'TRACKLET_EXT_APPS_DRAIN_ACK') {
    // Web app confirmed it processed all drained pending apps — safe to clear
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(['tracklet_pending_apps']);
    }
  } else if (event.data.type === 'TRACKLET_EXT_CONTACTS_DRAIN_ACK') {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(['tracklet_pending_contacts']);
    }
  }
});

// 3. Drain any pending clipped applications, contacts, or logged emails when Tracklet tab loads
function drainPendingItemsToTracklet() {
  if (!isTrackletOrigin()) return;

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_pending_emails', 'tracklet_pending_contacts'], (res) => {
        const pendingApps = res?.tracklet_pending_apps || [];
        const pendingEmails = res?.tracklet_pending_emails || [];
        const pendingContacts = res?.tracklet_pending_contacts || [];

        if (Array.isArray(pendingApps) && pendingApps.length > 0) {
          pendingApps.forEach(app => {
            window.postMessage({
              type: 'TRACKLET_EXT_ADD_APPLICATION',
              payload: app,
              persistedToCloud: false
            }, window.location.origin);
          });
          // Note: Pending apps are kept until acknowledged by Tracklet via TRACKLET_EXT_APPS_DRAIN_ACK
        }

        if (Array.isArray(pendingContacts) && pendingContacts.length > 0) {
          pendingContacts.forEach(contact => {
            window.postMessage({
              type: 'TRACKLET_EXT_ADD_CONTACT',
              payload: contact,
              persistedToCloud: false
            }, window.location.origin);
          });
          // Note: Pending contacts are kept until acknowledged by Tracklet via TRACKLET_EXT_CONTACTS_DRAIN_ACK
        }

        if (Array.isArray(pendingEmails) && pendingEmails.length > 0) {
          pendingEmails.forEach(emailItem => {
            window.postMessage({
              type: 'TRACKLET_EXT_ADD_EMAIL',
              payload: emailItem
            }, window.location.origin);
          });
          // Note: Pending emails are kept until acknowledged by Tracklet via TRACKLET_EXT_EMAIL_ACK
        }
      });
    }
  } catch (e) {
    // Context invalidated or non-extension environment
  }
}

// Drain after DOM is fully interactive and re-announce presence
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    announceTrackletPresence();
    drainPendingItemsToTracklet();
  });
} else {
  announceTrackletPresence();
  drainPendingItemsToTracklet();
}

// Re-drain pending items and re-announce presence when an already-open Tracklet tab regains focus
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    announceTrackletPresence();
    drainPendingItemsToTracklet();
  }
});

// 4. In-Page SPA Navigation & Thread Reactivity Observer (T046)
var lastReportedUrl = typeof lastReportedUrl !== 'undefined' ? lastReportedUrl : '';
var lastObservedThreadSignature = typeof lastObservedThreadSignature !== 'undefined' ? lastObservedThreadSignature : '';
var contextChangeDebounceTimer = typeof contextChangeDebounceTimer !== 'undefined' ? contextChangeDebounceTimer : null;

function notifyPageContextChange(source, threadSig = '', precomputedData = null) {
  const currentUrl = window.location.href;
  const currentTitle = document.title;
  let scrapedData = precomputedData;
  if (!scrapedData) {
    try {
      scrapedData = getPageDataUnified();
    } catch {}
  }

  if (scrapedData && (scrapedData.pageType === 'contact_profile' || scrapedData.pageType === 'job_posting' || scrapedData.pageType === 'ats_form')) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({
          tracklet_active_tab_data: {
            url: currentUrl,
            title: currentTitle,
            data: scrapedData,
            timestamp: Date.now()
          }
        });
      }
    } catch {}
  }

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'PAGE_CONTEXT_CHANGED',
        payload: {
          url: currentUrl,
          title: currentTitle,
          threadSignature: threadSig || lastObservedThreadSignature,
          source: source || 'spa_navigation',
          data: scrapedData,
          pageType: scrapedData?.pageType || 'generic_page'
        }
      }).catch(() => {});
    }
  } catch (err) {}
}

function checkAndDispatchContextChange(forcedSource) {
  const currentUrl = window.location.href;
  let scrapedData = null;
  try {
    scrapedData = getPageDataUnified();
  } catch {}

  // Build a comprehensive signature from the actual scraped fields so any newly hydrated field (headline, org, location, modal job, description, email) triggers an immediate update
  let threadSig = '';
  if (scrapedData) {
    if (scrapedData.pageType === 'contact_profile' && scrapedData.profileData) {
      const pd = scrapedData.profileData;
      threadSig = `profile:::${pd.fullName || ''}:::${pd.headline || ''}:::${pd.organization || ''}:::${pd.location || ''}:::${pd.avatarUrl || ''}`;
    } else if ((scrapedData.pageType === 'job_posting' || scrapedData.pageType === 'ats_form') && scrapedData.jobData) {
      const jd = scrapedData.jobData;
      threadSig = `job:::${jd.role || ''}:::${jd.company || ''}:::${jd.location || ''}:::${jd.workLocation || ''}:::${jd.employmentType || ''}:::${jd.salary || ''}:::${(jd.notes || '').length}:::${jd.jobLink || ''}`;
    } else if (scrapedData.pageType === 'webmail' && scrapedData.emailData) {
      const ed = scrapedData.emailData;
      threadSig = `email:::${ed.subject || ''}:::${ed.senderEmail || ''}:::${ed.date || ''}`;
    }
  }

  const urlChanged = currentUrl !== lastReportedUrl;
  const threadChanged = Boolean(threadSig && threadSig !== lastObservedThreadSignature);
  const isExplicitForce = forcedSource === 'force' || forcedSource === 'manual_refresh' || forcedSource === 'spa_hydration_retry';

  if (urlChanged || threadChanged || isExplicitForce) {
    lastReportedUrl = currentUrl;
    if (threadSig) {
      lastObservedThreadSignature = threadSig;
    }
    const changeSource = urlChanged ? 'url_changed' : (threadChanged ? 'dom_thread_changed' : (forcedSource || 'spa_navigation'));
    notifyPageContextChange(changeSource, threadSig, scrapedData);
  }
}

function scheduleContextCheck(source) {
  if (contextChangeDebounceTimer) {
    clearTimeout(contextChangeDebounceTimer);
  }
  const delay = (source === 'thread_mutation' || source === 'dom_mutation' || source === 'scroll') ? 250 : 120;
  contextChangeDebounceTimer = setTimeout(() => {
    checkAndDispatchContextChange(source);
  }, delay);
}

// Listen to popstate, hashchange, scroll (for lazy-loaded Experience sections and feed posts), and clicks (guarded against duplicate registration on re-injection)
if (!window.__trackletListenersAttached) {
  window.__trackletListenersAttached = true;
  window.addEventListener('popstate', () => scheduleContextCheck('popstate'));
  window.addEventListener('hashchange', () => scheduleContextCheck('hashchange'));
  window.addEventListener('scroll', () => scheduleContextCheck('scroll'), { passive: true });
  document.addEventListener('click', () => scheduleContextCheck('click'), { passive: true });
}

// Observe DOM mutations debounced to catch SPA transitions, profile renders, and modal expansions
try {
  if (window.__trackletSpaObserver) {
    try {
      window.__trackletSpaObserver.disconnect();
    } catch {}
  }
  if (Array.isArray(window.__trackletHydrationTimers)) {
    window.__trackletHydrationTimers.forEach(t => clearTimeout(t));
  }

  const spaObserver = new MutationObserver(() => {
    if (window.location.href !== lastReportedUrl) {
      scheduleContextCheck('url_mutation');
      return;
    }
    scheduleContextCheck('dom_mutation');
  });
  window.__trackletSpaObserver = spaObserver;

  if (document.body) {
    spaObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) spaObserver.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  }

  // Initial auto-scrape and backoff schedule for single page applications
  window.__trackletHydrationTimers = [
    setTimeout(() => checkAndDispatchContextChange('initial_load'), 50),
    ...[350, 900, 1800, 3200].map(delay =>
      setTimeout(() => checkAndDispatchContextChange('spa_hydration_retry'), delay)
    )
  ];
} catch (e) {
  // Safe fallback
}

