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
  // Standard & Egyptian Arabic
  'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12,
  // Levant & Mesopotamian Arabic (Jordan, Palestine, Syria, Lebanon, Iraq)
  'كانون الثاني': 1, 'شباط': 2, 'آذار': 3, 'اذار': 3, 'نيسان': 4, 'أيار': 5, 'ايار': 5, 'حزيران': 6, 'تموز': 7, 'آب': 8, 'اب': 8, 'أيلول': 9, 'ايلول': 9, 'تشرين الأول': 10, 'تشرين الاول': 10, 'تشرين الثاني': 11, 'كانون الأول': 12, 'كانون الاول': 12,
  // North African Arabic
  'جانفي': 1, 'فيفري': 2, 'أفريل': 4, 'افريل': 4, 'ماي': 5, 'جوان': 6, 'جويلية': 7, 'أوت': 8, 'اوت': 8
};

function normalizeNumerals(str: string): string {
  if (!str) return '';
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str)
    .replace(/[٠-٩]/g, d => String(easternDigits.indexOf(d)))
    .replace(/[۰-۹]/g, d => String(persianDigits.indexOf(d)));
}

const ARABIC_WEEKDAYS: Record<string, number> = {
  'الأحد': 0, 'الاحد': 0,
  'الاثنين': 1, 'الإثنين': 1,
  'الثلاثاء': 2,
  'الأربعاء': 3, 'الاربعاء': 3,
  'الخميس': 4,
  'الجمعة': 5,
  'السبت': 6
};

function formatIsoWithTime(d: Date, hasTime = false): string {
  const offsetMin = -d.getTimezoneOffset();
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

function looksLikeDate(str: string): boolean {
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
  if (/(?:(am|pm|ص|م|صباحا|صباحاً|مساء|مساءً)\s*)?\b\d{1,2}:\d{2}(?::\d{2})?(?:\s*(am|pm|ص|م|صباحا|صباحاً|مساء|مساءً))?/i.test(norm)) return true;

  return false;
}

function parseDateAndTimestamp(dateStr: string, refDate: Date = new Date()): { date: string; timestamp: string } {
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

  // 2. Unix numeric timestamp
  if (/^\d{10,13}$/.test(raw)) {
    const ts = Number(raw.length === 10 ? raw + '000' : raw);
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, true) };
    }
  }

  // 3. Clean string
  let clean = raw
    .replace(/\s*\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. Extract time component (English AM/PM or Arabic م / ص / مساءً / صباحاً)
  const timeRegex = /(?:(?<![a-zA-Z\u0600-\u06FF])(am|pm|صباحاً|صباحا|صباح|مساءً|مساء|ص|م|\b[ap]\.?m\.?)\s*)?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(?<![a-zA-Z\u0600-\u06FF])(am|pm|صباحاً|صباحا|صباح|مساءً|مساء|ص|م|\b[ap]\.?m\.?)(?![a-zA-Z\u0600-\u06FF]))?/i;
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

    datePartStr = clean.replace(timeRegex, ' ')
      .replace(/\s+(?:at|في|الساعة|بتاريخ|on)\s+/gi, ' ')
      .replace(/^[,\s]+|[,\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 5. Try native Date.parse for standard RFC/ISO/weekday formats (e.g. 'Thu, September 10, 2026 2:30 PM')
  // Skip native parse whenever datePartStr contains numeric D/M/Y tokens to preserve day-first DMY logic
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

  if (!datePartStr || datePartStr === 'today' || datePartStr === 'اليوم') {
    const d = new Date(refDate);
    d.setHours(timeH, timeM, timeS, 0);
    return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
  }

  const lowerDate = datePartStr.toLowerCase();

  // 6. Relative day keywords
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
  const weekdayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  let targetDay: number | null = null;
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

  // 7. Explicit YYYY/MM/DD or YYYY-MM-DD
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
    let day: number | null = null, month: number | null = null;
    if (p1 > 12) { day = p1; month = p2; }
    else if (p2 > 12) { month = p1; day = p2; }
    else {
      // Disambiguate using weekday if present in datePartStr
      if (targetDay !== null) {
        const d1 = new Date(yr, p2 - 1, p1);
        const d2 = new Date(yr, p1 - 1, p2);
        if (d1.getDay() === targetDay && d2.getDay() !== targetDay) {
          day = p1; month = p2;
        } else if (d2.getDay() === targetDay && d1.getDay() !== targetDay) {
          day = p2; month = p1;
        } else {
          day = p1; month = p2;
        }
      } else {
        day = p1; month = p2; // Default international day-first
      }
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && yr >= 2000 && yr <= 2100) {
      const d = new Date(yr, month - 1, day, timeH, timeM, timeS);
      return { date: formatDateParts(d), timestamp: formatIsoWithTime(d, hasTimeInStr) };
    }
  }

  // 10. Native Date fallback (only for strings with explicit year to prevent month-first assumptions on numeric inputs)
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

function parseDateToIso(dateStr: string, refDate: Date = new Date()): string {
  return parseDateAndTimestamp(dateStr, refDate).date;
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
  jobLink?: string;
  companyDomain?: string;
  contactEmail?: string;
  contactEmails?: string[];
}

function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(inc|incorporated|llc|ltd|limited|corp|corporation|technologies|technology|solutions|group|holdings|services|gmbh|co|sa|ag|pty|pte)\b/gi, ' ')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDomainFromUrl(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    let host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (/linkedin|indeed|glassdoor|monster|ziprecruiter|simplyhired/.test(host)) {
      return '';
    }
    if (ATS_DOMAINS.some(ats => host.includes(ats))) {
      return '';
    }
    return host;
  } catch {
    return '';
  }
}

function extractAtsSlugFromUrl(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.toLowerCase();

    // boards.greenhouse.io/{slug} or job-boards.greenhouse.io/{slug}
    if (host.includes('greenhouse.io')) {
      const match = pathname.match(/^\/(?:embed\/job_board\/|boards\/|job-boards\/)?([a-z0-9-]+)/);
      if (match && !['jobs', 'search', 'embed'].includes(match[1])) return match[1];
    }
    // jobs.lever.co/{slug}
    if (host.includes('lever.co')) {
      const match = pathname.match(/^\/([a-z0-9-]+)/);
      if (match && !['jobs', 'apply'].includes(match[1])) return match[1];
    }
    // jobs.ashbyhq.com/{slug}
    if (host.includes('ashbyhq.com')) {
      const match = pathname.match(/^\/([a-z0-9-]+)/);
      if (match && !['jobs'].includes(match[1])) return match[1];
    }
    // {slug}.workdayjobs.com or {slug}.recruitee.com
    const subMatch = host.match(/^([a-z0-9-]+)\.(?:workdayjobs|greenhouse|lever|recruitee)\./);
    if (subMatch && !['jobs', 'boards', 'www'].includes(subMatch[1])) return subMatch[1];

    return '';
  } catch {
    return '';
  }
}

function cleanDomain(d?: string): string {
  if (!d) return '';
  return d.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim();
}

function isGenericRecruitingWord(word?: string): boolean {
  const w = (word || '').toLowerCase().trim();
  return [
    'recruiting', 'recruitment', 'talent', 'careers', 'hiring', 'team',
    'greenhouse', 'lever', 'ashby', 'workday', 'jobvite', 'smartrecruiters',
    'interview', 'interviews', 'hr', 'people', 'human resources'
  ].includes(w) || w.length < 2;
}

function extractCompanyFromAts(senderName?: string, senderEmail?: string, subject?: string): string {
  const name = (senderName || '').trim();
  const subj = (subject || '').trim();
  const text = `${name} ${subj}`;

  // 1. "[Company] via [ATS]" (e.g. "Stripe via Greenhouse", "Figma via Lever")
  const viaMatch = text.match(/([A-Z0-9a-z\s&'-]+?)\s+(?:via|by|through)\s+(?:greenhouse|lever|ashby|smartrecruiters|workday|jobvite|recruitee|rippling|bamboohr|icims|jazzhr)/i);
  if (viaMatch && viaMatch[1].trim()) {
    const candidate = viaMatch[1].trim();
    if (!isGenericRecruitingWord(candidate)) return candidate;
  }

  // 2. Parentheses or brackets in sender name: "Jane Doe (Stripe)" or "Jane Doe [Stripe]"
  const parenMatch = name.match(/[\(\[]([A-Z0-9a-z\s&'-]+)[\)\]]/);
  if (parenMatch && parenMatch[1].trim()) {
    const candidate = parenMatch[1].trim();
    if (!isGenericRecruitingWord(candidate)) return candidate;
  }

  // 3. "Jane Doe at Stripe" or "Jane Doe from Stripe"
  // \b before at/from ensures we don't match inside names like "Fromberg" or "Strathmore"
  const atFromMatch = name.match(/\b(?:at|from)\s+([A-Z0-9a-z\s&'-]+)$/i);
  if (atFromMatch && atFromMatch[1].trim()) {
    const candidate = atFromMatch[1].trim();
    if (!isGenericRecruitingWord(candidate)) return candidate;
  }

  // 4. "[Company] Recruiting" or "[Company] Talent" or "[Company] Careers" or "[Company] Team"
  const teamMatch = name.match(/^([A-Z0-9a-z\s&'-]+?)\s+(?:recruiting|recruitment|talent|careers|hiring|team)\b/i);
  if (teamMatch && teamMatch[1].trim()) {
    const candidate = teamMatch[1].trim();
    if (!isGenericRecruitingWord(candidate)) return candidate;
  }

  // 5. Subject patterns: "Thank you for applying to [Company]" or "Application to [Company]" or "Interview with [Company]"
  const subjActionMatch = subj.match(/(?:applying to|application to|interview with|welcome to|next steps with)\s+([A-Z0-9a-z\s&'-]+?)(?:[:,\.\?!]|\s+for\b|\s+as\b|$)/i);
  if (subjActionMatch && subjActionMatch[1].trim()) {
    const candidate = subjActionMatch[1].trim();
    if (!isGenericRecruitingWord(candidate)) return candidate;
  }

  // 6. Subdomain or prefix in sender email e.g. "company@ashby-mail.com" or "company.greenhouse.io"
  if (senderEmail) {
    const emailDomain = senderEmail.includes('@') ? senderEmail.split('@')[1].toLowerCase() : senderEmail.toLowerCase();
    const emailPrefix = senderEmail.includes('@') ? senderEmail.split('@')[0].toLowerCase() : '';
    const subMatch = emailDomain.match(/^([a-z0-9-]+)\.(?:greenhouse\.io|lever\.co|smartrecruiters\.com|workday\.com|recruitee\.com)/i);
    if (subMatch && subMatch[1] && !['no-reply', 'mail', 'hire', 'jobs', 'notifications'].includes(subMatch[1])) {
      return subMatch[1];
    }
    if ((emailDomain.includes('ashby-mail') || emailDomain.includes('greenhouse-mail') || emailDomain.includes('gh-mail')) && 
        emailPrefix && !['no-reply', 'notifications', 'interviews', 'jobs', 'mailer', 'talent'].includes(emailPrefix)) {
      return emailPrefix;
    }
  }

  return '';
}

function matchEmailToApplications(
  emailData: {
    senderEmail?: string;
    recipientEmail?: string;
    counterpartyDomain?: string;
    subject?: string;
    senderName?: string;
    sender?: string;
    body?: string;
    snippet?: string;
    isAts?: boolean;
  },
  allKnownApps: ApplicationSummary[]
) {
  if (!allKnownApps || allKnownApps.length === 0) return { bestMatch: null, ranked: [] };

  const senderEmail = (emailData.senderEmail || '').toLowerCase().trim();
  const recipientEmail = (emailData.recipientEmail || '').toLowerCase().trim();
  const domain = cleanDomain(emailData.counterpartyDomain);
  const subject = (emailData.subject || '').toLowerCase().trim();
  const senderName = (emailData.senderName || '').toLowerCase().trim();
  const bodyText = (emailData.body || emailData.snippet || '').toLowerCase().trim();
  const snippetText = (emailData.snippet || '').toLowerCase().trim();

  const isEmailDomainAts = Boolean(emailData.isAts) || ATS_DOMAINS.some(ats => domain.includes(ats));
  const atsCompanyCandidate = normalizeCompanyName(extractCompanyFromAts(senderName, senderEmail, subject));

  const scored = allKnownApps.map(app => {
    let score = 0;
    const rawAppCompany = (app.company || '').trim();
    const normAppCompany = normalizeCompanyName(rawAppCompany);
    const appDomain = cleanDomain(app.companyDomain) || extractDomainFromUrl(app.jobLink);
    const atsJobSlug = extractAtsSlugFromUrl(app.jobLink);
    const contactEmail = (app.contactEmail || '').toLowerCase().trim();
    const contactEmails = (app.contactEmails || []).map(e => e.toLowerCase().trim());
    const normRole = (app.role || '').toLowerCase().trim();

    // Tier 1: Direct Contact Match (100 pts)
    if (senderEmail && (senderEmail === contactEmail || contactEmails.includes(senderEmail))) {
      score += 100;
    } else if (recipientEmail && (recipientEmail === contactEmail || contactEmails.includes(recipientEmail))) {
      score += 90;
    }

    // Tier 2: Company Domain Match (80 pts)
    // Never award generic ATS domain match unless the company itself is the ATS
    if (domain && appDomain && (!isEmailDomainAts || normAppCompany.includes(domain.split('.')[0]))) {
      if (domain === appDomain || domain.endsWith('.' + appDomain) || appDomain.endsWith('.' + domain)) {
        score += 80;
      }
    }
    
    // Clean company domain slug match (e.g. domain is 'stripe.com' and company is 'Stripe')
    if (domain && !isEmailDomainAts && normAppCompany && normAppCompany.length >= 3) {
      const domainSlug = domain.split('.')[0];
      if (domainSlug === normAppCompany) {
        score += 75;
      } else if (domainSlug.startsWith(normAppCompany) || normAppCompany.startsWith(domainSlug)) {
        score += 65;
      }
    }

    // Match ATS slug from app's jobLink (e.g. boards.greenhouse.io/stripe/jobs/123 -> stripe)
    if (atsJobSlug && atsJobSlug.length >= 3) {
      if (domain && !isEmailDomainAts && domain.split('.')[0] === atsJobSlug) {
        score += 75;
      }
      if (atsCompanyCandidate && (atsCompanyCandidate === atsJobSlug || atsJobSlug.includes(atsCompanyCandidate))) {
        score += 70;
      }
    }

    // Tier 3: ATS Disambiguation / Sender Display Name (70 pts)
    if (isEmailDomainAts || /greenhouse|lever|ashby|smartrecruiters|workday/.test(domain)) {
      if (atsCompanyCandidate && normAppCompany && (atsCompanyCandidate === normAppCompany || atsCompanyCandidate.includes(normAppCompany) || normAppCompany.includes(atsCompanyCandidate))) {
        score += 70;
      } else if (senderName && normAppCompany && normAppCompany.length >= 3) {
        const nameRegex = new RegExp(`\\b${normAppCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (nameRegex.test(senderName)) {
          score += 65;
        }
      }
    }

    // Tier 4: Subject Mentions (Word-Bounded, 50 pts)
    const isShortStopWord = normAppCompany.length <= 2 || ['box', 'and', 'the', 'for', 'all', 'one', 'new', 'top', 'in', 'on', 'at', 'to', 'up', 'do'].includes(normAppCompany);
    if (normAppCompany && normAppCompany.length >= 2) {
      const escaped = normAppCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (isShortStopWord) {
        // Require contextual phrasing like "at Company" or "Company Team" for short names / stop words
        const contextRegex = new RegExp(`(?:\\bat|\\bwith|\\bfor|\\bjoining|\\bteam)\\s+${escaped}\\b|\\b${escaped}\\s+(?:team|careers|recruiting|technologies|solutions)\\b`, 'i');
        if (contextRegex.test(subject)) {
          score += 50;
        }
      } else {
        const subjRegex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (subjRegex.test(subject)) {
          score += 50;
        }
      }
    }

    // Tier 5: Email Body & Snippet Mentions (Word-Bounded, 45-50 pts)
    if (normAppCompany && normAppCompany.length >= 3 && bodyText) {
      const isCommonWord = ['box', 'and', 'the', 'for', 'all', 'one', 'new', 'top', 'run', 'get'].includes(normAppCompany);
      const escaped = normAppCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (isCommonWord) {
        const contextRegex = new RegExp(`(?:\\bat|\\bwith|\\bfor|\\bjoining|\\bteam)\\s+${escaped}\\b|\\b${escaped}\\s+(?:team|careers|recruiting|technologies|solutions)\\b`, 'i');
        if (contextRegex.test(bodyText)) {
          score += 45;
        }
      } else {
        const bodyRegex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (bodyRegex.test(bodyText)) {
          if (snippetText && bodyRegex.test(snippetText)) {
            score += 50;
          } else {
            score += 45;
          }
        }
      }
    }

    // Tier 6: Role / Title Mention in Subject or Body (+15-25 pts)
    if (normRole && normRole.length >= 4) {
      const escapedRole = normRole.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const roleRegex = new RegExp(`\\b${escapedRole}\\b`, 'i');
      if (roleRegex.test(subject)) {
        score += 25;
      } else if (bodyText && roleRegex.test(bodyText)) {
        score += 15;
      }
    }

    return { app, score };
  });

  const ranked = scored
    .filter(item => item.score >= 40)
    .sort((a, b) => b.score - a.score);

  const bestMatch = (ranked.length > 0 && ranked[0].score >= 45) ? ranked[0].app : null;
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

    it('normalizes legal suffixes in company names', () => {
      expect(normalizeCompanyName('Stripe, Inc.')).toBe('stripe');
      expect(normalizeCompanyName('Deliveroo Ltd.')).toBe('deliveroo');
      expect(normalizeCompanyName('GitLab Inc.')).toBe('gitlab');
      expect(normalizeCompanyName('Siemens AG')).toBe('siemens');
      expect(normalizeCompanyName('Acme Technologies LLC')).toBe('acme');
    });

    it('extracts company name candidate from diverse ATS patterns', () => {
      expect(extractCompanyFromAts('Figma via Lever', 'no-reply@lever.co', 'Your application')).toBe('Figma');
      expect(extractCompanyFromAts('Sarah Chen (Stripe)', 'sarah@recruiting.com', 'Interview details')).toBe('Stripe');
      expect(extractCompanyFromAts('Alex at Datadog', 'recruiting@external.com', 'Call tomorrow')).toBe('Datadog');
      expect(extractCompanyFromAts('OpenAI Recruiting', 'no-reply@greenhouse.io', 'Update')).toBe('OpenAI');
      expect(extractCompanyFromAts('Recruiting Team', 'no-reply@greenhouse.io', 'Interview with Linear')).toBe('Linear');
      expect(extractCompanyFromAts('no-reply', 'stripe.greenhouse.io', 'Next steps')).toBe('stripe');
      expect(extractCompanyFromAts('interviews', 'figma@ashby-mail.com', 'Schedule interview')).toBe('figma');
    });

    it('prevents generic ATS domains from false-matching unrelated applications', () => {
      const appsWithAtsLinks: ApplicationSummary[] = [
        {
          id: 'app-stripe',
          company: 'Stripe',
          role: 'Engineer',
          status: 'Applied',
          jobLink: 'https://boards.greenhouse.io/stripe/jobs/123'
        },
        {
          id: 'app-datadog',
          company: 'Datadog',
          role: 'Engineer',
          status: 'Applied',
          jobLink: 'https://boards.greenhouse.io/datadog/jobs/456'
        }
      ];

      // Generic email from Greenhouse with no company name in text should NOT match either application
      const match = matchEmailToApplications({
        senderEmail: 'no-reply@greenhouse.io',
        counterpartyDomain: 'greenhouse.io',
        subject: 'General ATS Maintenance Notification',
        isAts: true
      }, appsWithAtsLinks);

      expect(match.bestMatch).toBeNull();
    });

    it('matches application from ATS jobLink slug fallback when companyDomain is empty', () => {
      const appsWithoutDomain: ApplicationSummary[] = [
        {
          id: 'app-stripe-ats',
          company: 'Stripe',
          role: 'Backend Engineer',
          status: 'Applied',
          jobLink: 'https://boards.greenhouse.io/stripe/jobs/98765'
        }
      ];

      const match = matchEmailToApplications({
        senderEmail: 'recruiting@stripe.com',
        counterpartyDomain: 'stripe.com',
        subject: 'Quick chat'
      }, appsWithoutDomain);

      expect(match.bestMatch?.id).toBe('app-stripe-ats');
    });

    it('matches Tier 5: body and snippet keywords when subject is generic', () => {
      const match = matchEmailToApplications({
        senderEmail: 'hr-generic@unknownmail.com',
        counterpartyDomain: 'unknownmail.com',
        subject: 'Follow up from our call yesterday',
        body: 'Thank you for your time chatting about the Product Designer opportunity at Figma. We would like to move you to the next round!',
        snippet: 'Thank you for your time chatting about the Product Designer opportunity at Figma.'
      }, mockApps);

      expect(match.bestMatch?.id).toBe('app-figma');
    });

    it('prevents stop-word collisions for short company names', () => {
      const stopWordApps: ApplicationSummary[] = [
        {
          id: 'app-in',
          company: 'In',
          role: 'Software Engineer',
          status: 'Applied',
          companyDomain: 'in.inc'
        }
      ];

      // Preposition "in" should NOT trigger a match
      const falseMatch = matchEmailToApplications({
        senderEmail: 'newsletter@linkedin.com',
        counterpartyDomain: 'linkedin.com',
        subject: 'You appeared in 14 searches this week',
        body: 'See who looked at your profile in the past 7 days'
      }, stopWordApps);

      expect(falseMatch.bestMatch).toBeNull();

      // Contextual phrase "at In" or "Joining In" SHOULD match
      const trueMatch = matchEmailToApplications({
        senderEmail: 'recruiter@external.com',
        counterpartyDomain: 'external.com',
        subject: 'Joining In as Senior Engineer'
      }, stopWordApps);

      expect(trueMatch.bestMatch?.id).toBe('app-in');
    });

    it('uses role mention for disambiguation between applications at the same company', () => {
      const multiRoleApps: ApplicationSummary[] = [
        {
          id: 'app-frontend',
          company: 'Acme Corp',
          role: 'Frontend Engineer',
          status: 'Applied',
          companyDomain: 'acme.com'
        },
        {
          id: 'app-backend',
          company: 'Acme Corp',
          role: 'Backend Engineer',
          status: 'Applied',
          companyDomain: 'acme.com'
        }
      ];

      const match = matchEmailToApplications({
        senderEmail: 'recruiting@acme.com',
        counterpartyDomain: 'acme.com',
        subject: 'Interview for Frontend Engineer position at Acme Corp'
      }, multiRoleApps);

      expect(match.bestMatch?.id).toBe('app-frontend');
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

    it('handles Eastern Arabic numerals and Levant Arabic months (e.g. أيلول for September)', () => {
      expect(parseDateToIso('١ سبتمبر ٢٠٢٦', refDate)).toBe('2026-09-01');
      expect(parseDateToIso('١ أيلول ٢٠٢٦', refDate)).toBe('2026-09-01');
      expect(parseDateToIso('1 أيلول 2026', refDate)).toBe('2026-09-01');
      expect(parseDateToIso('أيلول 1, 2026', refDate)).toBe('2026-09-01');
    });

    it('handles relative week and day expressions from older emails (e.g. 2 weeks ago, 25 days ago)', () => {
      const sept26 = new Date('2026-09-26T12:00:00Z');
      expect(parseDateToIso('2 weeks ago', sept26)).toBe('2026-09-12');
      expect(parseDateToIso('3 weeks ago', sept26)).toBe('2026-09-05');
      expect(parseDateToIso('25 days ago', sept26)).toBe('2026-09-01');
      expect(parseDateToIso('Sep 1, 2026, 10:15 AM (25 days ago)', sept26)).toBe('2026-09-01');
      expect(parseDateToIso('Sep 1', sept26)).toBe('2026-09-01');
      expect(parseDateToIso('Tuesday, September 1, 2026 at 10:15:32 AM GMT+3', sept26)).toBe('2026-09-01');
    });

    it('looksLikeDate correctly identifies valid dates and rejects UI button tooltips', () => {
      expect(looksLikeDate('Show details')).toBe(false);
      expect(looksLikeDate('Reply to: John Doe')).toBe(false);
      expect(looksLikeDate('Labels: Inbox')).toBe(false);
      expect(looksLikeDate('Not starred')).toBe(false);
      expect(looksLikeDate('More options')).toBe(false);
      expect(looksLikeDate('رد')).toBe(false);
      expect(looksLikeDate('إعادة توجيه')).toBe(false);
      expect(looksLikeDate('المزيد')).toBe(false);
      expect(looksLikeDate('حذف')).toBe(false);
      expect(looksLikeDate('Sep 1, 2026, 10:15 AM')).toBe(true);
      expect(looksLikeDate('١ أيلول ٢٠٢٦')).toBe(true);
      expect(looksLikeDate('2 weeks ago')).toBe(true);
      expect(looksLikeDate('2026-09-01T10:15:00Z')).toBe(true);
      expect(looksLikeDate('Sep 1')).toBe(true);
      expect(looksLikeDate('3:55 م، 2026/09/08')).toBe(true);
      expect(looksLikeDate('3:55 م')).toBe(true);
      expect(looksLikeDate('٣:٥٥ م')).toBe(true);
      expect(looksLikeDate('2026/09/08')).toBe(true);
    });

    it('parses Arabic Gmail date and time strings accurately (e.g. Canonical email screenshot)', () => {
      // Test the user's exact email screenshot: "3:55 م، 2026/09/08"
      const userEmail = parseDateAndTimestamp('3:55 م، 2026/09/08', refDate);
      expect(userEmail.date).toBe('2026-09-08');
      expect(userEmail.timestamp).toContain('2026-09-08T15:55:00');

      // Test reverse order: "2026/09/08، 3:55 م"
      const reversed = parseDateAndTimestamp('2026/09/08، 3:55 م', refDate);
      expect(reversed.date).toBe('2026-09-08');
      expect(reversed.timestamp).toContain('2026-09-08T15:55:00');

      // Test Eastern Arabic numerals: "٣:٥٥ م، ٢٠٢٦/٠٩/٠٨"
      const eastern = parseDateAndTimestamp('٣:٥٥ م، ٢٠٢٦/٠٩/٠٨', refDate);
      expect(eastern.date).toBe('2026-09-08');
      expect(eastern.timestamp).toContain('2026-09-08T15:55:00');

      // Test Arabic named month with time: "8 سبتمبر 2026 في 3:55 م"
      const namedArabic = parseDateAndTimestamp('8 سبتمبر 2026 في 3:55 م', refDate);
      expect(namedArabic.date).toBe('2026-09-08');
      expect(namedArabic.timestamp).toContain('2026-09-08T15:55:00');

      // Test with Arabic weekday: "الثلاثاء، 8 سبتمبر 2026 في 3:55 م"
      const withWeekday = parseDateAndTimestamp('الثلاثاء، 8 سبتمبر 2026 في 3:55 م', refDate);
      expect(withWeekday.date).toBe('2026-09-08');
      expect(withWeekday.timestamp).toContain('2026-09-08T15:55:00');

      // Test same-day Arabic PM & AM
      const sameDayPm = parseDateAndTimestamp('3:55 م', refDate);
      expect(sameDayPm.date).toBe('2026-09-12');
      expect(sameDayPm.timestamp).toContain('2026-09-12T15:55:00');

      const sameDayAm = parseDateAndTimestamp('3:55 ص', refDate);
      expect(sameDayAm.date).toBe('2026-09-12');
      expect(sameDayAm.timestamp).toContain('2026-09-12T03:55:00');

      // Test international DD/MM/YYYY with both numbers <= 12
      const dmy = parseDateAndTimestamp('08/09/2026', refDate);
      expect(dmy.date).toBe('2026-09-08');

      // Test yesterday in Arabic
      const yestAr = parseDateAndTimestamp('أمس 3:55 م', refDate);
      expect(yestAr.date).toBe('2026-09-11');
      expect(yestAr.timestamp).toContain('2026-09-11T15:55:00');

      // Test numeric date with weekday disambiguates day/month (Sep 10, 2026 is Thursday)
      const dmyWeekday = parseDateAndTimestamp('Thu 9/10/2026 2:30 PM', refDate);
      expect(dmyWeekday.date).toBe('2026-09-10');
      expect(dmyWeekday.timestamp).toContain('2026-09-10T14:30:00');

      // Test word boundaries for Arabic meridiem markers
      const arLongMarker = parseDateAndTimestamp('2026-09-12 10:15 صباحاً', refDate);
      expect(arLongMarker.timestamp).toContain('2026-09-12T10:15:00');

      const arEveningLong = parseDateAndTimestamp('2026-09-12 10:15 مساءً', refDate);
      expect(arEveningLong.timestamp).toContain('2026-09-12T22:15:00');
    });
  });

  describe('Webmail Counterparty & Direction Resolution', () => {
    function resolveCounterpartyAndDirection({
      currentUserEmail,
      detectedUserEmail,
      senderName,
      senderEmail,
      recipientName,
      recipientEmail,
      isSentFolder = false,
    }: {
      currentUserEmail?: string;
      detectedUserEmail?: string;
      senderName?: string;
      senderEmail?: string;
      recipientName?: string;
      recipientEmail?: string;
      isSentFolder?: boolean;
    }) {
      const effectiveUserEmail = (currentUserEmail || detectedUserEmail || '').toLowerCase().trim();
      const isSenderMe = (senderName || '').toLowerCase() === 'me' || 
                         (senderEmail || '').toLowerCase() === 'me' ||
                         /^me$/i.test((senderName || '').trim());
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

        const userEmails = [effectiveUserEmail, senderEmail].filter(Boolean).map(e => (e as string).toLowerCase().trim());
        if (userEmails.includes((counterpartyEmail || '').toLowerCase().trim())) {
          counterpartyEmail = '';
          counterparty = recipientName || '';
        }
      } else {
        counterpartyEmail = senderEmail || '';
        counterpartyName = senderName || '';
        counterparty = senderEmail || senderName || '';
      }

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
    it('does NOT fall back to the sender\'s own email when capturing an outbound email with missing recipient metadata', () => {
      // Regression: Gmail sometimes fails to parse the To: address on sent emails.
      // The field must be empty rather than the user\'s own address.
      const res = resolveCounterpartyAndDirection({
        currentUserEmail: 'user@gmail.com',
        senderName: 'User',
        senderEmail: 'user@gmail.com',
        recipientName: '',
        recipientEmail: ''
      });

      expect(res.direction).toBe('outbound');
      // Must be empty - NOT 'user@gmail.com'
      expect(res.counterparty).toBe('');
      expect(res.counterpartyName).toBe('');
      expect(res.counterpartyEmail).toBe('');
    });

    it('identifies outbound sent email via detected page user account even without Tracklet currentUserEmail', () => {
      const res = resolveCounterpartyAndDirection({
        detectedUserEmail: 'saleem@gmail.com',
        senderName: 'Saleem Dev',
        senderEmail: 'saleem@gmail.com',
        recipientName: 'Sarah Recruiter',
        recipientEmail: 'sarah@stripe.com'
      });

      expect(res.direction).toBe('outbound');
      expect(res.counterparty).toBe('sarah@stripe.com');
      expect(res.counterpartyName).toBe('Sarah Recruiter');
      expect(res.counterpartyEmail).toBe('sarah@stripe.com');
    });

    it('safeguards against setting counterparty to sender email on outbound when recipient is empty', () => {
      const res = resolveCounterpartyAndDirection({
        detectedUserEmail: 'saleem@gmail.com',
        senderName: 'Saleem Dev',
        senderEmail: 'saleem@gmail.com',
        recipientName: '',
        recipientEmail: ''
      });

      expect(res.direction).toBe('outbound');
      expect(res.counterparty).toBe('');
      expect(res.counterpartyEmail).toBe('');
    });

    it('ensures sent folder alone cannot override a sender identified as someone other than the user', () => {
      const res = resolveCounterpartyAndDirection({
        currentUserEmail: 'candidate@gmail.com',
        senderName: 'Sarah Recruiter',
        senderEmail: 'sarah@stripe.com',
        recipientName: 'Candidate Name',
        recipientEmail: 'candidate@gmail.com',
        isSentFolder: true
      });

      expect(res.direction).toBe('inbound');
      expect(res.counterparty).toBe('sarah@stripe.com');
      expect(res.counterpartyName).toBe('Sarah Recruiter');
      expect(res.counterpartyEmail).toBe('sarah@stripe.com');
    });
  });
});
