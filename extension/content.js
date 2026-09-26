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
  'greenhouse.io', 'greenhouse-mail.io',
  'lever.co', 'hire.lever.co',
  'ashbyhq.com', 'ashby-mail.com',
  'smartrecruiters.com',
  'workday.com', 'myworkday.com',
  'jobvite.com', 'recruitee.com',
  'rippling.com', 'bamboohr.com'
];

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
  'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12
};

function formatDateParts(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Convert various webmail date formats (Unix timestamps, relative strings, localized dates) into YYYY-MM-DD
function parseDateToIso(dateStr, refDate = new Date()) {
  if (!dateStr) return formatDateParts(refDate);

  // 1. Sanitize string: strip zero-width and bidirectional formatting marks (\u200E, \u200F, BOM)
  let raw = String(dateStr)
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '')
    .replace(/[\u00A0\u202F\u2000-\u200A]/g, ' ')
    .trim();
  if (!raw) return formatDateParts(refDate);

  // 2. Unix numeric timestamp (10-digit seconds or 13-digit milliseconds)
  if (/^\d{10,13}$/.test(raw)) {
    const ts = Number(raw.length === 10 ? raw + '000' : raw);
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return formatDateParts(d);
    }
  }

  // 3. Clean string: strip parenthesized annotations (e.g. '(2 days ago)', '(UTC+3)'), prefixes, 'at'
  let clean = raw
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s+at\s+/i, ' ')
    .replace(/^(received|date|sent|on):\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Relative keywords
  const lower = clean.toLowerCase();
  if (lower === 'today' || /^\d{1,2}:\d{2}(?::\d{2})?(\s*(?:am|pm))?$/i.test(lower)) {
    return formatDateParts(refDate);
  }
  if (lower.startsWith('yesterday')) {
    const d = new Date(refDate.getTime() - 86400000);
    return formatDateParts(d);
  }
  const daysAgoMatch = lower.match(/^(\d+)\s+days?\s+ago/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    const d = new Date(refDate.getTime() - days * 86400000);
    return formatDateParts(d);
  }

  // 5. Weekday names within the past 7 days (e.g., 'Thu', 'Thursday', 'Thu 11:30 AM')
  const weekdayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const weekdayMatch = lower.match(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*(\s+\d{1,2}:\d{2}(\s*(?:am|pm))?)?$/i);
  if (weekdayMatch) {
    const targetDay = weekdayMap[weekdayMatch[1].toLowerCase().slice(0, 3)];
    let diff = refDate.getDay() - targetDay;
    if (diff <= 0) diff += 7;
    const d = new Date(refDate.getTime() - diff * 86400000);
    return formatDateParts(d);
  }

  // 6. Non-English and English month names (with or without year/time)
  const yearMatch = clean.match(/\b(20\d{2})\b/);
  const explicitYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

  const m1 = clean.match(/(?:^|\s)([a-zA-Z\u0600-\u06FF]+)[.,]?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*|\s+|$)/i);
  if (m1) {
    const key = m1[1].toLowerCase();
    const month = MONTH_MAP[key] || MONTH_MAP[key.slice(0, 3)];
    if (month) {
      const day = parseInt(m1[2], 10);
      let year = explicitYear || refDate.getFullYear();
      if (!explicitYear) {
        const testD = new Date(year, month - 1, day);
        if (testD.getTime() > refDate.getTime() + 86400000 * 2) {
          year -= 1;
        }
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const m2 = clean.match(/(?:^|\s)(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z\u0600-\u06FF]+)[.,]?(?:\s*,\s*|\s+|$)/i);
  if (m2) {
    const key = m2[2].toLowerCase();
    const month = MONTH_MAP[key] || MONTH_MAP[key.slice(0, 3)];
    if (month) {
      const day = parseInt(m2[1], 10);
      let year = explicitYear || refDate.getFullYear();
      if (!explicitYear) {
        const testD = new Date(year, month - 1, day);
        if (testD.getTime() > refDate.getTime() + 86400000 * 2) {
          year -= 1;
        }
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 7. Dot-separated dates (DD.MM.YYYY) or day-first slashes (25/09/2026)
  const dotMatch = clean.match(/(?:^|\s)(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:$|\s)/);
  if (dotMatch) {
    let day = parseInt(dotMatch[1], 10);
    let month = parseInt(dotMatch[2], 10);
    let year = parseInt(dotMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const slashMatch = clean.match(/(?:^|\s)(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:$|\s)/);
  if (slashMatch) {
    let p1 = parseInt(slashMatch[1], 10);
    let p2 = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year < 100) year += 2000;
    let day = null, month = null;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      month = p1;
      day = p2;
    }
    if (day !== null && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // 8. Standard date fallback
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    return formatDateParts(d);
  }

  return formatDateParts(refDate);
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

    // Extract date element
    let dateEl = (activeMessage && activeMessage.querySelector('.g3, .bi4, td.gH .gK span, td.gH span, [data-timestamp], span.mI, td.g3, .date')) || null;

    if (!dateEl && activeMessage) {
      dateEl = activeMessage.querySelector('[title*="202"], [title*=":"], [aria-label*="202"], [aria-label*=":"], td.gH, .gK');
    }

    if (!dateEl) {
      const allDateEls = document.querySelectorAll('div[role="main"] td.gH span, div[role="main"] .g3, div[role="main"] .bi4, div[role="main"] [data-timestamp], div[role="main"] td.g3');
      if (allDateEls.length > 0) {
        dateEl = allDateEls[allDateEls.length - 1];
      }
    }

    if (dateEl) {
      const titleAttr = dateEl.getAttribute('title');
      const hasDigitInTitle = titleAttr && /\d/.test(titleAttr);
      const ariaAttr = dateEl.getAttribute('aria-label');
      const hasDigitInAria = ariaAttr && /\d/.test(ariaAttr);

      rawDate = (hasDigitInTitle ? titleAttr : '') ||
                dateEl.getAttribute('data-timestamp') ||
                dateEl.getAttribute('datetime') ||
                (hasDigitInAria ? ariaAttr : '') ||
                dateEl.getAttribute('alt') ||
                dateEl.textContent;
    }

    // If rawDate is still empty or is purely a time token (e.g. "11:30 AM"), search header parent or container for full date attribute
    const isOnlyTime = !rawDate || /^\s*[\u200e\u200f]*\d{1,2}:\d{2}(?::\d{2})?(\s*(?:am|pm))?\s*$/i.test(String(rawDate).trim());
    if (isOnlyTime && activeMessage) {
      const parentWithTitle = activeMessage.querySelector('.gE [title*="202"], .gH [title*="202"], table.cf [title*="202"], [title*="202"]');
      if (parentWithTitle) {
        rawDate = parentWithTitle.getAttribute('title');
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

  // ATS Disambiguation: if counterparty domain is an ATS domain
  const isAts = ATS_DOMAINS.some(ats => counterpartyDomain.includes(ats));

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
    date: parseDateToIso(rawDate) || formatDateParts(new Date()),
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
  const dateEl = document.querySelector('div[role="main"] time, div[role="main"] [aria-label*="Received"], div[role="main"] [aria-label*="Date"], div[role="main"] span[title*="202"], div[data-testid="readingPane"] time, div[data-testid="readingPane"] span[title*="202"], time, div[aria-label*="Received"], div[aria-label*="Date"]');
  if (dateEl) {
    rawDate = dateEl.getAttribute('datetime') || 
              dateEl.getAttribute('title') || 
              dateEl.getAttribute('aria-label') || 
              dateEl.textContent;
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
  const isAts = ATS_DOMAINS.some(ats => counterpartyDomain.includes(ats));

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
    date: parseDateToIso(rawDate) || formatDateParts(new Date()),
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
    if (/^tracklet(-[a-z0-9-]+)?\.vercel\.app$/.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

// 2. Listen for auth session and applications index sync from Tracklet web app window
window.addEventListener('message', (event) => {
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

