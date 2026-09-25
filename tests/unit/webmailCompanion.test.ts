import { describe, it, expect } from 'vitest';
import { normalizeJobUrl } from '../../src/lib/extensionSync';

// --- Reusable Webmail Parsing & Matching Logic mirroring extension implementation ---

const ATS_DOMAINS = [
  'greenhouse.io', 'greenhouse-mail.io',
  'lever.co', 'hire.lever.co',
  'ashbyhq.com', 'ashby-mail.com',
  'smartrecruiters.com',
  'workday.com', 'myworkday.com',
  'jobvite.com', 'recruitee.com',
  'rippling.com', 'bamboohr.com'
];

function extractEmailAddress(rawStr: string): string {
  if (!rawStr) return '';
  const match = rawStr.match(/<([^>]+)>/) || rawStr.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].trim() : rawStr.trim();
}

function formatDateParts(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MONTH_MAP: Record<string, number> = {
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

function parseDateToIso(dateStr: string, refDate: Date = new Date()): string {
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
  const weekdayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
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

function cleanHtmlBody(htmlContent: string): { body: string; snippet: string } {
  const container = document.createElement('div');
  container.innerHTML = htmlContent;

  const quoteSelectors = [
    '.gmail_quote', 'blockquote', '.gmail_extra',
    'div[id*="divRplyFwdMsg"]', '.divRplyFwdMsg', '#appendonsend',
    'div[data-smartmail="gmail_signature"]', '.gmail_signature'
  ];
  quoteSelectors.forEach(sel => {
    container.querySelectorAll(sel).forEach(el => el.remove());
  });

  container.querySelectorAll('script, style, link, meta').forEach(el => el.remove());
  container.querySelectorAll('img').forEach(img => {
    const w = img.getAttribute('width');
    const h = img.getAttribute('height');
    const style = img.getAttribute('style') || '';
    if (w === '1' || h === '1' || style.includes('display: none') || style.includes('display:none')) {
      img.remove();
    }
  });

  let text = container.innerText || container.textContent || '';
  text = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const snippet = text.slice(0, 200).replace(/\s+/g, ' ').trim();
  return { body: text, snippet };
}

interface ApplicationSummary {
  id: string;
  company: string;
  role: string;
  status: string;
  companyDomain?: string;
  contactEmail?: string;
  contactEmails?: string[];
}

function matchEmailToApplications(
  emailData: {
    senderEmail?: string;
    recipientEmail?: string;
    counterpartyDomain?: string;
    subject?: string;
    senderName?: string;
    isAts?: boolean;
  },
  allKnownApps: ApplicationSummary[]
) {
  if (!allKnownApps || allKnownApps.length === 0) return { bestMatch: null, ranked: [] };

  const senderEmail = (emailData.senderEmail || '').toLowerCase().trim();
  const recipientEmail = (emailData.recipientEmail || '').toLowerCase().trim();
  const domain = (emailData.counterpartyDomain || '').toLowerCase().trim();
  const subject = (emailData.subject || '').toLowerCase().trim();
  const senderName = (emailData.senderName || '').toLowerCase().trim();

  const scored = allKnownApps.map(app => {
    let score = 0;
    const appCompany = (app.company || '').toLowerCase().trim();
    const appDomain = (app.companyDomain || '').toLowerCase().trim();
    const contactEmail = (app.contactEmail || '').toLowerCase().trim();
    const contactEmails = (app.contactEmails || []).map(e => e.toLowerCase().trim());

    // Tier 1: Direct Contact Match (100 pts)
    if (senderEmail && (senderEmail === contactEmail || contactEmails.includes(senderEmail))) {
      score += 100;
    } else if (recipientEmail && (recipientEmail === contactEmail || contactEmails.includes(recipientEmail))) {
      score += 90;
    }

    // Tier 2: Company Domain Match (80 pts)
    if (domain && appDomain && (domain === appDomain || domain.endsWith('.' + appDomain))) {
      score += 80;
    } else if (domain && appCompany && (domain.includes(appCompany) || appCompany.includes(domain.split('.')[0]))) {
      score += 70;
    }

    // Tier 3: ATS Disambiguation / Sender Display Name (60 pts)
    if (emailData.isAts && appCompany) {
      if (senderName && senderName.includes(appCompany)) {
        score += 65;
      }
      if (subject && subject.includes(appCompany)) {
        score += 60;
      }
    }

    // Tier 4: Subject Mentions (40 pts)
    if (appCompany && appCompany.length >= 3) {
      const regex = new RegExp(`\\b${appCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(subject)) {
        score += 45;
      }
    }

    return { app, score };
  });

  const ranked = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestMatch = ranked.length > 0 ? ranked[0].app : null;
  return { bestMatch, ranked: ranked.map(r => r.app) };
}


// --- Test Suites ---

describe('Webmail Companion Engine', () => {
  describe('Email & Date Sanitizers', () => {
    it('extracts clean email address from bracketed strings and complex headers', () => {
      expect(extractEmailAddress('Sarah Chen <sarah@linear.app>')).toBe('sarah@linear.app');
      expect(extractEmailAddress('recruiting@stripe.com')).toBe('recruiting@stripe.com');
      expect(extractEmailAddress('"Talent Team" <talent@figma.com>')).toBe('talent@figma.com');
    });

    it('parses diverse human-readable date strings into ISO YYYY-MM-DD', () => {
      expect(parseDateToIso('September 12, 2026, 11:30 AM')).toBe('2026-09-12');
      expect(parseDateToIso('2026-08-15T09:00:00Z')).toBe('2026-08-15');
      expect(parseDateToIso('')).toBe(formatDateParts(new Date()));
    });

    it('normalizes job links and strips marketing tracking parameters', () => {
      const dirtyUrl = 'https://www.linkedin.com/jobs/view/12345678/?utm_source=share&utm_medium=member_desktop&refId=abc';
      const cleanUrl = normalizeJobUrl(dirtyUrl);
      expect(cleanUrl).toBe('linkedin.com/jobs/view/12345678');
    });
  });

  describe('DOM Body Sanitization Pipeline', () => {
    it('strips Gmail quoted reply chains, signatures, and tracking pixels', () => {
      const dirtyHtml = `
        <div>
          <p>Hi Saleem, we would love to invite you to a 45-minute technical screen next week!</p>
          <img src="https://email-tracker.com/pixel.gif" width="1" height="1" style="display: none;" />
          <div class="gmail_signature">Best regards,<br>Sarah Chen<br>Head of Talent</div>
          <div class="gmail_quote">
            <blockquote>On Sep 10, 2026, Saleem wrote: I am excited to apply for Senior Frontend...</blockquote>
          </div>
        </div>
      `;

      const cleaned = cleanHtmlBody(dirtyHtml);
      expect(cleaned.body).toContain('Hi Saleem, we would love to invite you to a 45-minute technical screen next week!');
      expect(cleaned.body).not.toContain('On Sep 10, 2026, Saleem wrote');
      expect(cleaned.body).not.toContain('Head of Talent');
      expect(cleaned.snippet).toContain('Hi Saleem');
    });
  });

  describe('4-Tier Application Matching & ATS Disambiguation', () => {
    const mockApps: ApplicationSummary[] = [
      {
        id: 'app-linear',
        company: 'Linear',
        role: 'Senior Frontend Engineer',
        status: 'Applied',
        companyDomain: 'linear.app',
        contactEmail: 'sarah@linear.app',
        contactEmails: ['sarah@linear.app', 'karri@linear.app']
      },
      {
        id: 'app-stripe',
        company: 'Stripe',
        role: 'Fullstack Engineer',
        status: 'Interview',
        companyDomain: 'stripe.com',
        contactEmail: 'talent@stripe.com'
      },
      {
        id: 'app-figma',
        company: 'Figma',
        role: 'Product Designer',
        status: 'Screening',
        companyDomain: 'figma.com'
      }
    ];

    it('matches Tier 1: direct recruiter contact email match', () => {
      const match = matchEmailToApplications({
        senderEmail: 'sarah@linear.app',
        counterpartyDomain: 'linear.app',
        subject: 'Hello from Linear'
      }, mockApps);

      expect(match.bestMatch?.id).toBe('app-linear');
    });

    it('matches Tier 2: company domain match when contact email is unknown', () => {
      const match = matchEmailToApplications({
        senderEmail: 'alex.recruiting@stripe.com',
        counterpartyDomain: 'stripe.com',
        subject: 'Quick chat regarding your application'
      }, mockApps);

      expect(match.bestMatch?.id).toBe('app-stripe');
    });

    it('matches Tier 3: ATS domain disambiguation using sender display name and subject', () => {
      // Email originates from greenhouse.io ATS domain
      const match = matchEmailToApplications({
        senderEmail: 'no-reply@greenhouse.io',
        counterpartyDomain: 'greenhouse.io',
        senderName: 'Figma Recruiting',
        subject: 'Update regarding your Figma application',
        isAts: true
      }, mockApps);

      expect(match.bestMatch?.id).toBe('app-figma');
    });

    it('matches Tier 4: subject line mention as fallback', () => {
      const match = matchEmailToApplications({
        senderEmail: 'recruiter.external@gmail.com',
        counterpartyDomain: 'gmail.com',
        subject: 'Interview with Linear next Tuesday'
      }, mockApps);

      expect(match.bestMatch?.id).toBe('app-linear');
    });

    it('returns null bestMatch when no applications match', () => {
      const match = matchEmailToApplications({
        senderEmail: 'promotions@randomservice.com',
        counterpartyDomain: 'randomservice.com',
        subject: 'Weekly Deals Digest'
      }, mockApps);

      expect(match.bestMatch).toBeNull();
      expect(match.ranked.length).toBe(0);
    });
  });


  describe('Webmail Date Parsing (parseDateToIso)', () => {
    // Fixed reference date: Saturday, Sep 12, 2026, 3:00 PM
    const refDate = new Date('2026-09-12T15:00:00');

    it('extracts exact date from Gmail numeric data-timestamp attribute', () => {
      // 1726084800000 = September 11, 2024
      const result = parseDateToIso('1726084800000', refDate);
      expect(result).toBe('2024-09-11');
    });

    it('extracts date from Gmail title with parenthetical relative comments', () => {
      const result = parseDateToIso('Sep 10, 2026, 2:45 PM (2 days ago)', refDate);
      expect(result).toBe('2026-09-10');
    });

    it('extracts date from strings with "at" time separators', () => {
      const result = parseDateToIso('Thu, Sep 10, 2026 at 2:45 PM', refDate);
      expect(result).toBe('2026-09-10');
    });

    it('extracts Yesterday correctly relative to reference date', () => {
      expect(parseDateToIso('Yesterday, 4:15 PM', refDate)).toBe('2026-09-11');
      expect(parseDateToIso('Yesterday', refDate)).toBe('2026-09-11');
    });

    it('extracts relative "X days ago" dates', () => {
      expect(parseDateToIso('3 days ago', refDate)).toBe('2026-09-09');
      expect(parseDateToIso('1 day ago', refDate)).toBe('2026-09-11');
    });

    it('treats time-only strings as message sent today', () => {
      expect(parseDateToIso('11:30 AM', refDate)).toBe('2026-09-12');
      expect(parseDateToIso('14:22', refDate)).toBe('2026-09-12');
    });

    it('calculates weekday within the past 7 days', () => {
      // Ref is Saturday Sep 12, so previous Thursday was Sep 10
      expect(parseDateToIso('Thu 11:30 AM', refDate)).toBe('2026-09-10');
      expect(parseDateToIso('Thursday', refDate)).toBe('2026-09-10');
    });

    it('handles month and day with missing year by inferring current year', () => {
      expect(parseDateToIso('Sep 10', refDate)).toBe('2026-09-10');
      expect(parseDateToIso('10 Sep', refDate)).toBe('2026-09-10');
      expect(parseDateToIso('Sep 10, 11:30 AM', refDate)).toBe('2026-09-10');
    });

    it('handles Outlook and standard RFC/ISO timestamp strings', () => {
      expect(parseDateToIso('2026-09-08T14:30:00Z', refDate)).toBe('2026-09-08');
      expect(parseDateToIso('Thu 9/10/2026 2:30 PM', refDate)).toBe('2026-09-10');
      expect(parseDateToIso('Date: September 5, 2026', refDate)).toBe('2026-09-05');
      expect(parseDateToIso('Received: Fri, 4 Sep 2026 10:00:00 +0000', refDate)).toBe('2026-09-04');
    });

    it('handles Gmail timestamps with invisible Unicode bidirectional formatting marks', () => {
      expect(parseDateToIso('\u200eSep 10, 2026, 11:30 AM', refDate)).toBe('2026-09-10');
      expect(parseDateToIso('\u200fSep 10, 2026\u200e', refDate)).toBe('2026-09-10');
      expect(parseDateToIso('\ufeff10 Sep 2026', refDate)).toBe('2026-09-10');
    });

    it('handles international dot-separated and slash-separated dates correctly', () => {
      expect(parseDateToIso('10.09.2026', refDate)).toBe('2026-09-10');
      expect(parseDateToIso('25/09/2026', refDate)).toBe('2026-09-25');
      expect(parseDateToIso('25-09-2026', refDate)).toBe('2026-09-25');
    });

    it('handles month abbreviations with trailing periods and Arabic locale names', () => {
      expect(parseDateToIso('10 Sept. 2026', refDate)).toBe('2026-09-10');
      expect(parseDateToIso('10 Sept 2026', refDate)).toBe('2026-09-10');
      expect(parseDateToIso('10 سبتمبر 2026', refDate)).toBe('2026-09-10');
      expect(parseDateToIso('سبتمبر 10', refDate)).toBe('2026-09-10');
    });
  });

  describe('Webmail Counterparty & Direction Resolution', () => {
    function resolveCounterpartyAndDirection({
      currentUserEmail,
      senderName,
      senderEmail,
      recipientName,
      recipientEmail,
      isSentFolder = false,
    }: {
      currentUserEmail?: string;
      senderName?: string;
      senderEmail?: string;
      recipientName?: string;
      recipientEmail?: string;
      isSentFolder?: boolean;
    }) {
      const isSenderMe = (senderName || '').toLowerCase() === 'me' || (senderEmail || '').toLowerCase() === 'me';
      const isCurrentUser = Boolean(
        currentUserEmail &&
        senderEmail &&
        senderEmail.toLowerCase().trim() === currentUserEmail.toLowerCase().trim()
      );
      const isOutbound = isCurrentUser || isSenderMe || isSentFolder;
      const direction = isOutbound ? 'outbound' : 'inbound';
      const counterparty = isOutbound
        ? (recipientEmail || recipientName || senderEmail || senderName || '')
        : (senderEmail || senderName || '');
      const counterpartyName = isOutbound ? (recipientName || senderName || '') : (senderName || '');
      const counterpartyEmail = isOutbound ? (recipientEmail || senderEmail || '') : (senderEmail || '');

      return { direction, counterparty, counterpartyName, counterpartyEmail };
    }

    it('identifies inbound recruiter email and sets counterparty to recruiter', () => {
      const res = resolveCounterpartyAndDirection({
        currentUserEmail: 'candidate@gmail.com',
        senderName: 'Sarah Recruiter',
        senderEmail: 'sarah@stripe.com',
        recipientName: 'Candidate Name',
        recipientEmail: 'candidate@gmail.com'
      });

      expect(res.direction).toBe('inbound');
      expect(res.counterparty).toBe('sarah@stripe.com');
      expect(res.counterpartyName).toBe('Sarah Recruiter');
      expect(res.counterpartyEmail).toBe('sarah@stripe.com');
    });

    it('identifies outbound reply by matching sender to currentUserEmail and assigns recipient as counterparty', () => {
      const res = resolveCounterpartyAndDirection({
        currentUserEmail: 'candidate@gmail.com',
        senderName: 'Candidate Name',
        senderEmail: 'candidate@gmail.com',
        recipientName: 'Sarah Recruiter',
        recipientEmail: 'sarah@stripe.com'
      });

      expect(res.direction).toBe('outbound');
      expect(res.counterparty).toBe('sarah@stripe.com');
      expect(res.counterpartyName).toBe('Sarah Recruiter');
      expect(res.counterpartyEmail).toBe('sarah@stripe.com');
    });

    it('identifies outbound sent email via "me" label even without currentUserEmail', () => {
      const res = resolveCounterpartyAndDirection({
        senderName: 'me',
        senderEmail: 'me',
        recipientName: 'Karla Recruiter',
        recipientEmail: 'karla@linear.app'
      });

      expect(res.direction).toBe('outbound');
      expect(res.counterparty).toBe('karla@linear.app');
      expect(res.counterpartyName).toBe('Karla Recruiter');
      expect(res.counterpartyEmail).toBe('karla@linear.app');
    });

    it('identifies outbound email from sent folder navigation flag', () => {
      const res = resolveCounterpartyAndDirection({
        isSentFolder: true,
        senderName: 'User',
        senderEmail: 'user@domain.com',
        recipientName: 'David Hiring Manager',
        recipientEmail: 'david@company.com'
      });

      expect(res.direction).toBe('outbound');
      expect(res.counterparty).toBe('david@company.com');
      expect(res.counterpartyName).toBe('David Hiring Manager');
      expect(res.counterpartyEmail).toBe('david@company.com');
    });
  });
});
