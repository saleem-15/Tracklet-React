/**
 * Tracklet Content Script — Page Extraction Engine
 * Parses job postings using JSON-LD, site-specific DOM selectors, and universal meta fallbacks.
 */

// Helper to sanitize text
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
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

// Detect job platform from hostname
function detectPlatform(hostname) {
  const host = hostname.toLowerCase();
  if (host.includes('linkedin.')) return 'LinkedIn';
  if (host.includes('indeed.')) return 'Indeed';
  if (host.includes('lever.co')) return 'Lever';
  if (host.includes('greenhouse.io')) return 'Greenhouse';
  if (host.includes('otta.com')) return 'Otta';
  if (host.includes('wellfound.com') || host.includes('angel.co')) return 'Wellfound';
  if (host.includes('glassdoor.')) return 'Other';
  if (host.includes('workdayjobs.')) return 'Company Site';
  return 'Company Site';
}

// Parse JSON-LD structured data (@type: JobPosting)
function parseJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      const item = Array.isArray(data) ? data.find(i => i['@type'] === 'JobPosting') : (data['@type'] === 'JobPosting' ? data : null);
      if (item) {
        let company = '';
        if (typeof item.hiringOrganization === 'string') {
          company = item.hiringOrganization;
        } else if (item.hiringOrganization && item.hiringOrganization.name) {
          company = item.hiringOrganization.name;
        }

        return {
          title: cleanText(item.title),
          company: cleanText(company),
          description: cleanText(typeof item.description === 'string' ? item.description.replace(/<[^>]*>?/gm, '') : ''),
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
  
  // LinkedIn
  if (host.includes('linkedin.')) {
    const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24');
    const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .jobs-unified-top-card__subtitle-primary-grouping a');
    return {
      title: cleanText(titleEl ? titleEl.textContent : ''),
      company: cleanText(companyEl ? companyEl.textContent : ''),
    };
  }

  // Indeed
  if (host.includes('indeed.')) {
    const titleEl = document.querySelector('h1.jobsearch-JobInfoHeader-title, .jobsearch-JobInfoHeader-title');
    const companyEl = document.querySelector('[data-company-name="true"], .jobsearch-CompanyReview--heading');
    return {
      title: cleanText(titleEl ? titleEl.textContent : ''),
      company: cleanText(companyEl ? companyEl.textContent : ''),
    };
  }

  // Greenhouse
  if (host.includes('greenhouse.io')) {
    const titleEl = document.querySelector('#header h1.app-title, .job-title, h1');
    const companyEl = document.querySelector('.company-name, #header .company-name');
    return {
      title: cleanText(titleEl ? titleEl.textContent : ''),
      company: cleanText(companyEl ? companyEl.textContent : ''),
    };
  }

  // Lever
  if (host.includes('lever.co')) {
    const titleEl = document.querySelector('.posting-header h2, h2');
    const companyEl = document.querySelector('.main-header-text, .posting-header .company-name');
    return {
      title: cleanText(titleEl ? titleEl.textContent : ''),
      company: cleanText(companyEl ? companyEl.textContent : ''),
    };
  }

  // Wellfound
  if (host.includes('wellfound.com') || host.includes('angel.co')) {
    const titleEl = document.querySelector('h1, [class*="jobTitle"]');
    const companyEl = document.querySelector('[class*="companyName"], h2');
    return {
      title: cleanText(titleEl ? titleEl.textContent : ''),
      company: cleanText(companyEl ? companyEl.textContent : ''),
    };
  }

  return null;
}

// Universal heuristic fallback parser
function parseUniversalFallback() {
  let title = '';
  let company = '';

  // 1. Check OpenGraph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogSiteName = document.querySelector('meta[property="og:site_name"]');

  if (ogSiteName && ogSiteName.content) {
    company = cleanText(ogSiteName.content);
  }

  if (ogTitle && ogTitle.content) {
    const content = ogTitle.content;
    // Common pattern: "Job Title at Company Name" or "Company Name - Job Title"
    if (content.includes(' at ')) {
      const parts = content.split(' at ');
      title = parts[0];
      if (!company) company = parts[1];
    } else if (content.includes(' - ')) {
      const parts = content.split(' - ');
      title = parts[0];
      if (!company) company = parts[1];
    } else if (content.includes(' | ')) {
      const parts = content.split(' | ');
      title = parts[0];
      if (!company) company = parts[1];
    } else {
      title = content;
    }
  }

  // 2. Check main H1 heading if title is still missing
  if (!title) {
    const h1 = document.querySelector('h1');
    if (h1) title = cleanText(h1.textContent);
  }

  // 3. Check document.title if company or title missing
  if (!company || !title) {
    const docTitle = document.title;
    if (docTitle) {
      const delimiters = [' at ', ' - ', ' | ', ' – ', ' • '];
      for (const delim of delimiters) {
        if (docTitle.includes(delim)) {
          const parts = docTitle.split(delim);
          if (!title) title = cleanText(parts[0]);
          if (!company) company = cleanText(parts[1]);
          break;
        }
      }
      if (!title) title = cleanText(docTitle);
    }
  }

  // 4. Fallback company from domain name if still empty
  if (!company) {
    const host = getDomainFromUrl(window.location.href);
    const domainName = host.split('.')[0];
    if (domainName && domainName !== 'careers' && domainName !== 'jobs') {
      company = domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }
  }

  return { title: cleanText(title), company: cleanText(company) };
}

// Master extraction function
function extractPageData() {
  const jsonLdData = parseJsonLd();
  const siteData = parseSiteSpecific();
  const fallbackData = parseUniversalFallback();

  const domain = getDomainFromUrl(window.location.href);
  const platform = detectPlatform(domain);
  const isWebmail = isWebmailUrl(window.location.href);

  // Combine extracted results by priority
  const role = (jsonLdData && jsonLdData.title) || (siteData && siteData.title) || fallbackData.title || '';
  const company = (jsonLdData && jsonLdData.company) || (siteData && siteData.company) || fallbackData.company || '';

  // Get active text selection if any
  const selection = cleanText(window.getSelection() ? window.getSelection().toString() : '');
  const notes = selection || (jsonLdData && jsonLdData.description ? jsonLdData.description.slice(0, 300) : '');

  // Favicon URL
  let faviconUrl = '';
  const iconLink = document.querySelector('link[rel*="icon"]');
  if (iconLink && iconLink.href) {
    faviconUrl = iconLink.href;
  } else {
    faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  }

  return {
    isWebmail,
    role,
    company,
    platform,
    jobLink: window.location.href,
    domain,
    notes,
    faviconUrl,
    pageTitle: document.title,
  };
}

// --- Webmail Detection & Extraction Engine ---

const ATS_DOMAINS = [
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

const MONTH_MAP = {
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

  // Reject UI button labels, tooltips, or actions
  if (/^(show details|reply|forward|more|details|star|not starred|labels|archive|delete|snooze|print|unread|mark as|to:|from:|cc:|bcc:)/i.test(s)) {
    return false;
  }

  const norm = normalizeNumerals(s.toLowerCase());

  // 1. Explicit 4-digit year (e.g. 2024..2035)
  if (/\b20\d{2}\b/.test(norm)) return true;

  // 2. Month keywords (English, French, Arabic Standard, Levant, North African)
  if (/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|كانون|شباط|آذار|اذار|نيسان|أيار|ايار|حزيران|تموز|آب|اب|أيلول|ايلول|تشرين|جانفي|فيفري|أفريل|افريل|ماي|جوان|جويلية|أوت|اوت)/i.test(norm)) {
    return true;
  }

  // 3. Numeric calendar format: DD/MM/YYYY, MM/DD/YYYY, DD.MM.YYYY, YYYY-MM-DD
  if (/\b\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?\b/.test(norm)) return true;

  // 4. Relative expressions: "2 weeks ago", "25 days ago", "yesterday", "today"
  if (/\b(\d+)\s*(days?|weeks?|months?|hours?|mins?|minutes?)\s*ago\b/i.test(norm) || /\b(yesterday|today)\b/i.test(norm)) {
    return true;
  }

  // 5. Weekday tokens: "Mon", "Tuesday", etc.
  if (/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/i.test(norm)) return true;

  // 6. Time tokens: "10:15 AM", "14:30"
  if (/^\d{1,2}:\d{2}(?::\d{2})?(\s*(am|pm))?$/i.test(norm)) return true;

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

// Convert various webmail date formats into a { date: 'YYYY-MM-DD', timestamp: 'YYYY-MM-DDTHH:MM:SS' } object.
// `date` preserves backward compatibility; `timestamp` carries full precision for analytics.
function parseDateToIso(dateStr, refDate = new Date()) {
  const fallback = { date: formatDateParts(refDate), timestamp: formatIsoWithTime(refDate, true) };
  if (!dateStr) return fallback;

  // 1. Sanitize: normalize Eastern/Persian digits, strip invisible Unicode marks
  let raw = normalizeNumerals(
    String(dateStr)
      .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '')
      .replace(/[\u00A0\u202F\u2000-\u200A]/g, ' ')
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

  // 3. Clean string: strip parenthesized annotations, prefixes, and 'at' conjunctions
  let clean = raw
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s+at\s+/i, ' ')
    .replace(/^(received|date|sent|on):\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Try native Date.parse first — handles RFC-2822, ISO-8601, and rich locale strings
  //    e.g. "Thu, 25 Sep 2026 14:35:10 +0300", "2026-09-25T14:35:10Z", "Sep 25, 2026, 2:35 PM"
  //    Guard: only accept if the string contains an explicit 4-digit year AND is not a
  //    purely numeric date like "25/09/2026" (those are ambiguous locale-dependent; let
  //    the slash/dot branches below handle them with correct day-first semantics).
  const hasExplicitYear = /\b20\d{2}\b/.test(clean);
  const isPurelyNumericDate = /^\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}$/.test(clean.trim());
  if (hasExplicitYear && !isPurelyNumericDate) {
    const nativeParse = new Date(clean);
    if (!isNaN(nativeParse.getTime())) {
      const yr = nativeParse.getFullYear();
      if (yr >= 2000 && yr <= 2100) {
        const hasTime = /\d{1,2}:\d{2}/.test(clean);
        return { date: formatDateParts(nativeParse), timestamp: formatIsoWithTime(nativeParse, hasTime) };
      }
    }
  }

  // 5. Relative keywords (days ago, weeks ago, months ago, yesterday, today, bare time)
  const lower = clean.toLowerCase();

  // Bare time token (e.g. "10:35 AM") → today
  const bareTimeMatch = lower.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (bareTimeMatch || lower === 'today') {
    if (bareTimeMatch) {
      let h = parseInt(bareTimeMatch[1], 10);
      const m = parseInt(bareTimeMatch[2], 10);
      const s = parseInt(bareTimeMatch[3] || '0', 10);
      const meridiem = (bareTimeMatch[4] || '').toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      const d = new Date(refDate);
      d.setHours(h, m, s, 0);
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, true) };
    }
    return { date: formatDateParts(refDate), timestamp: formatIsoWithTime(refDate, false) };
  }

  if (lower.startsWith('yesterday')) {
    const d = new Date(refDate.getTime() - 86400000);
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, false) };
  }
  const daysAgoMatch = lower.match(/^(\d+)\s+days?\s+ago/);
  if (daysAgoMatch) {
    const d = new Date(refDate.getTime() - parseInt(daysAgoMatch[1], 10) * 86400000);
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, false) };
  }
  const weeksAgoMatch = lower.match(/^(\d+)\s+weeks?\s+ago/);
  if (weeksAgoMatch) {
    const d = new Date(refDate.getTime() - parseInt(weeksAgoMatch[1], 10) * 7 * 86400000);
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, false) };
  }
  const monthsAgoMatch = lower.match(/^(\d+)\s+months?\s+ago/);
  if (monthsAgoMatch) {
    const d = new Date(refDate.getTime() - parseInt(monthsAgoMatch[1], 10) * 30 * 86400000);
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, false) };
  }

  // 6. Weekday names within the past 7 days (e.g. 'Thu', 'Thursday', 'Thu 11:30 AM')
  const weekdayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const weekdayMatch = lower.match(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i);
  if (weekdayMatch) {
    const targetDay = weekdayMap[weekdayMatch[1].toLowerCase().slice(0, 3)];
    let diff = refDate.getDay() - targetDay;
    if (diff <= 0) diff += 7;
    const d = new Date(refDate.getTime() - diff * 86400000);
    let hasTime = false;
    if (weekdayMatch[2]) {
      let h = parseInt(weekdayMatch[2], 10);
      const m = parseInt(weekdayMatch[3], 10);
      const s = parseInt(weekdayMatch[4] || '0', 10);
      const meridiem = (weekdayMatch[5] || '').toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      d.setHours(h, m, s, 0);
      hasTime = true;
    }
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTime) };
  }

  // 7. Non-English and English month names (with optional time component)
  const yearMatch = clean.match(/\b(20\d{2})\b/);
  const explicitYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

  // Extract time component from string if present (e.g. "Sep 25, 2026 2:35 PM")
  const timeMatch = clean.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  let timeH = 0, timeM = 0, timeS = 0, hasTimeInStr = false;
  if (timeMatch) {
    timeH = parseInt(timeMatch[1], 10);
    timeM = parseInt(timeMatch[2], 10);
    timeS = parseInt(timeMatch[3] || '0', 10);
    const mer = (timeMatch[4] || '').toLowerCase();
    if (mer === 'pm' && timeH < 12) timeH += 12;
    if (mer === 'am' && timeH === 12) timeH = 0;
    hasTimeInStr = true;
  }

  // Strip time portion before matching month/day so regexes aren't confused
  const cleanNoTime = clean.replace(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/gi, '').trim();

  // Match month word then day: "September 1", "Sep 1, 2026", "أيلول 1", "سبتمبر 1"
  const m1 = cleanNoTime.match(/(?:^|\s)([a-zA-Z\u0600-\u06FF\s]+?)[.,]?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*|\s+|$)/i);
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

  // Match day then month word: "1 September", "1 Sep 2026", "1 أيلول 2026", "1 سبتمبر"
  const m2 = cleanNoTime.match(/(?:^|\s)(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z\u0600-\u06FF\s]+?)[.,]?(?:\s*,\s*|\s+|$)/i);
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

  // 8. Dot-separated dates (DD.MM.YYYY)
  const dotMatch = clean.match(/(?:^|\s)(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:$|\s)/);
  if (dotMatch) {
    let day = parseInt(dotMatch[1], 10);
    let month = parseInt(dotMatch[2], 10);
    let year = parseInt(dotMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, timeH, timeM, timeS);
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
    }
  }

  // 9. Slash-separated dates (DD/MM/YYYY or MM/DD/YYYY)
  const slashMatch = clean.match(/(?:^|\s)(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:$|\s)/);
  if (slashMatch) {
    let p1 = parseInt(slashMatch[1], 10);
    let p2 = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;
    let day = null, month = null;
    if (p1 > 12) { day = p1; month = p2; }
    else if (p2 > 12) { month = p1; day = p2; }
    if (day !== null && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day, timeH, timeM, timeS);
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
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

  // Convert line breaks and paragraph spacing
  let text = clone.innerText || clone.textContent || '';
  // Normalize whitespace
  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // Generate snippet
  const snippet = text.slice(0, 200).replace(/\s+/g, ' ').trim();
  return { body: text, snippet };
}

// Parse active Gmail email thread
function parseGmailThread(currentUserEmail) {
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
  let recipientName = '';
  let recipientEmail = '';
  let rawDate = '';
  let bodyText = '';
  let snippetText = '';

  if (activeMessage) {
    const senderEl = activeMessage.querySelector('.gD') || document.querySelector('div[role="main"] span.gD');
    if (senderEl) {
      senderEmail = senderEl.getAttribute('email') || senderEl.getAttribute('data-hovercard-id') || extractEmailAddress(senderEl.textContent);
      senderName = senderEl.getAttribute('name') || cleanText(senderEl.textContent.replace(/<[^>]+>/g, ''));
    }

    const recipientEl = activeMessage.querySelector('.gI, .hb, span[email]:not(.gD), span[data-hovercard-id]:not(.gD)') ||
                        document.querySelector('div[role="main"] .g2, div[role="main"] .hb, div[role="main"] span[email]:not(.gD)');
    if (recipientEl) {
      recipientEmail = recipientEl.getAttribute('email') || recipientEl.getAttribute('data-hovercard-id') || extractEmailAddress(recipientEl.textContent);
      recipientName = cleanText(recipientEl.textContent.replace(/<[^>]+>/g, ''));
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

  // Direction: if sender matches current user or 'me', or URL is sent
  const urlHash = (window.location.hash || '').toLowerCase();
  const urlPath = (window.location.pathname || '').toLowerCase();
  const isSentFolder = /^#sent(?:\/|$)/.test(urlHash) || /(?:^|\/)sentitems(?:\/|$)/.test(urlPath);
  const isSenderMe = senderName.toLowerCase() === 'me' || (senderName === '' && senderEmail.toLowerCase() === 'me');
  const isCurrentUser = Boolean(
    currentUserEmail && 
    senderEmail && 
    senderEmail.toLowerCase().trim() === currentUserEmail.toLowerCase().trim()
  );
  const isOutbound = isCurrentUser || isSenderMe || isSentFolder;
  const direction = isOutbound ? 'outbound' : 'inbound';
  const counterparty = isOutbound ? (recipientEmail || recipientName || senderEmail || senderName) : (senderEmail || senderName);
  const counterpartyName = isOutbound ? (recipientName || senderName) : senderName;
  const counterpartyEmail = isOutbound ? (recipientEmail || senderEmail) : senderEmail;

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

  const isSentFolder = window.location.href.toLowerCase().includes('sentitems');
  const isOutbound = Boolean(
    (currentUserEmail && senderEmail && senderEmail.toLowerCase().trim() === currentUserEmail.toLowerCase().trim()) ||
    isSentFolder
  );
  const direction = isOutbound ? 'outbound' : 'inbound';
  const counterparty = isOutbound ? (recipientEmail || recipientName || senderEmail || senderName) : (senderEmail || senderName);
  const counterpartyName = isOutbound ? (recipientName || senderName) : senderName;
  const counterpartyEmail = isOutbound ? (recipientEmail || senderEmail) : senderEmail;
  let counterpartyDomain = '';
  if (counterpartyEmail && counterpartyEmail.includes('@')) {
    counterpartyDomain = counterpartyEmail.split('@')[1].toLowerCase().trim();
  }
  // ATS Disambiguation: exact-domain or dot-suffix matching via isAtsHost
  const isAts = isAtsHost(counterpartyDomain) ||
    isAtsHost(domainFromEmail(senderEmail)) ||
    isAtsHost(domainFromEmail(recipientEmail));


  return {
    provider: 'outlook',
    subject: subject || 'Email Message',
    sender: senderName ? `${senderName} <${senderEmail}>` : senderEmail,
    senderEmail,
    senderName,
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

// 1. Listen for runtime messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_PAGE_DATA') {
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
    // Deliver newly saved application directly to Tracklet web app running in this tab
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
    // Deliver newly logged email directly to Tracklet web app running in this tab
    window.postMessage({
      type: 'TRACKLET_EXT_ADD_EMAIL',
      payload: request.payload
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
    if (/^tracklet(-[a-z0-9-]+)?\.web\.app$/.test(hostname)) return true;
    if (/^tracklet(-[a-z0-9-]+)?\.firebaseapp\.com$/.test(hostname)) return true;
    if (hostname === 'tracklet-eight.vercel.app') return true;
    return false;
  } catch {
    return false;
  }
}

// 2. Listen for auth session and applications index sync from Tracklet web app window
window.addEventListener('message', (event) => {
  if (event.source !== window || !isTrackletOrigin()) return;
  if (!event.data || typeof event.data !== 'object') return;

  if (event.data.type === 'TRACKLET_WEB_AUTH_SYNC') {
    try {
      chrome.runtime.sendMessage({
        action: 'SYNC_USER_SESSION',
        payload: event.data.payload
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
      chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_guest_apps_v1', 'tracklet_apps_index'], (res) => {
        const pending = (res?.tracklet_pending_apps || []).filter((a) => a?.id !== deletedId);
        const guestApps = (res?.tracklet_guest_apps_v1 || []).filter((a) => a?.id !== deletedId);
        const appsIndex = (res?.tracklet_apps_index || []).filter((a) => a?.id !== deletedId);
        chrome.storage.local.set({
          tracklet_pending_apps: pending,
          tracklet_guest_apps_v1: guestApps,
          tracklet_apps_index: appsIndex,
        });
      });
    }
  }
});

// 3. Drain any pending clipped applications or logged emails when Tracklet tab loads
function drainPendingItemsToTracklet() {
  if (!isTrackletOrigin()) return;

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['tracklet_pending_apps', 'tracklet_pending_emails'], (res) => {
        const pendingApps = res?.tracklet_pending_apps || [];
        const pendingEmails = res?.tracklet_pending_emails || [];

        if (Array.isArray(pendingApps) && pendingApps.length > 0) {
          pendingApps.forEach(app => {
            window.postMessage({
              type: 'TRACKLET_EXT_ADD_APPLICATION',
              payload: app,
              persistedToCloud: false
            }, window.location.origin);
          });
          chrome.storage.local.remove(['tracklet_pending_apps']);
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

// Drain after DOM is fully interactive
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', drainPendingItemsToTracklet);
} else {
  drainPendingItemsToTracklet();
}

