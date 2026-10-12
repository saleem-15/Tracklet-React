import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { isJobBoardOrAts } from '../../src/lib/jobBoardRegistry';

// Core helper functions mirroring extension/content.js
function cleanText(text: string): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

function getDomainName(urlStr: string): string {
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

function findJsonLdEntity(data: any, targetType: string): any {
  if (!data) return null;
  const isTarget = (type: any): boolean => {
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

function dedupeDoubledString(str: string): string {
  if (!str) return '';
  const trimmed = str.replace(/\s+/g, ' ').trim();
  if (trimmed.length < 4) return trimmed;

  if (trimmed.length % 2 === 0) {
    const half = trimmed.length / 2;
    const first = trimmed.slice(0, half);
    const second = trimmed.slice(half);
    if (first.toLowerCase() === second.toLowerCase()) {
      return first.trim();
    }
  }

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

function getCleanElementText(el: Element | null): string {
  if (!el) return '';
  const directAriaHidden = el.querySelector(':scope > span[aria-hidden="true"], :scope > div > span[aria-hidden="true"]');
  if (directAriaHidden) {
    const ariaTxt = cleanText(directAriaHidden.textContent || '');
    if (ariaTxt && ariaTxt.length > 1 && !/^[·•|]+$/.test(ariaTxt)) {
      return dedupeDoubledString(ariaTxt);
    }
  }

  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll(
    '.visually-hidden, .sr-only, [class*="visually-hidden"], [class*="sr-only"], style, script, noscript, svg'
  ).forEach(n => n.remove());
  return dedupeDoubledString(cleanText(clone.textContent || ''));
}

function extractCleanLines(container: Element | null): string[] {
  if (!container) return [];
  const lines: string[] = [];

  function addLine(raw: string) {
    const cleaned = dedupeDoubledString(cleanText(raw));
    if (!cleaned || /^[·•|,\-–—]+$/.test(cleaned)) return;
    if (lines.length > 0 && lines[lines.length - 1].toLowerCase() === cleaned.toLowerCase()) return;
    lines.push(cleaned);
  }

  const ariaSpans = Array.from(container.querySelectorAll('span[aria-hidden="true"]'));
  if (ariaSpans.length >= 2) {
    for (const span of ariaSpans) {
      if (span.closest('button, nav, .visually-hidden, .sr-only, [class*="visually-hidden"]')) continue;
      if (span.querySelector('span[aria-hidden="true"]')) continue;
      addLine(span.textContent || '');
    }
    if (lines.length >= 2) return lines;
  }

  const clone = container.cloneNode(true) as Element;
  clone.querySelectorAll(
    '.visually-hidden, .sr-only, [class*="visually-hidden"], [class*="sr-only"], button, style, script, noscript, svg'
  ).forEach(n => n.remove());

  clone.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, br, tr, section, article, span').forEach(el => {
    const tag = el.tagName.toLowerCase();
    if (tag !== 'span' || el.children.length === 0) {
      el.appendChild(container.ownerDocument.createTextNode('\n'));
    }
  });

  const rawLines = (clone.textContent || '').split(/\n+/);
  for (const r of rawLines) {
    addLine(r);
  }
  return lines;
}

function inferContactCategory(headline: string): string {
  if (!headline) return 'Other';
  const clean = headline.trim().toLowerCase();
  if (/(?:talent|recruiter|recruiting|sourcer|staffing|people\s+ops|technical\s+sourcer|hr\b|human\s+resources)/i.test(clean)) {
    return 'Recruiter';
  }
  if (/(?:vp|vice\s+president|director|head\s+of|engineering\s+manager|cto|ceo|coo|cpo|chief|founder|co-founder|tech\s+lead\s+manager|hiring\s+manager)/i.test(clean)) {
    return 'Hiring Manager';
  }
  if (/(?:mentor|advisor|coach|career\s+guide|instructor|professor|lecturer)/i.test(clean)) {
    return 'Mentor';
  }
  if (/(?:peer|alumni|fellow|graduate|class\s+of|engineer|developer|designer|architect|scientist|product\s+manager|program\s+manager|analyst|devops|sre|qa|tester|consultant|specialist|lead)/i.test(clean)) {
    return 'Peer / Alumni';
  }
  return 'Other';
}

function cleanLinkedInTopCardHeadlineFallback(rawHeadline: string): string {
  if (!rawHeadline) return '';
  let cleaned = rawHeadline
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u2600-\u27BF\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  const pipeSegments = cleaned.split(/\s*[|•·]\s*/).map(s => s.trim()).filter(Boolean);
  if (pipeSegments.length > 1) {
    const firstSeg = pipeSegments[0];
    if (/(?:\bat\b|@)\s+/i.test(firstSeg) || /\([^)]*[-/,][^)]*\)/.test(cleaned) || pipeSegments.length >= 3 || cleaned.length > 68) {
      cleaned = firstSeg;
    }
  }

  cleaned = cleaned.replace(/\s+(?:@|\bat\b)\s+[^|•·,\n]+$/i, '').trim();
  return cleaned || rawHeadline.trim();
}

function parseLinkedInExperienceSection(docRoot: Document) {
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

  const MONTH_INDEX_MAP: Record<string, number> = {
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

  function parseStartYearMonth(dateLine: string) {
    if (!dateLine) return { startYear: 0, startMonth: 0 };
    const head = dateLine.split(/\s*[-–—·•]\s*/)[0] || dateLine;
    const yearMatch = head.match(/\b((?:19|20)\d{2})\b/);
    const startYear = yearMatch ? parseInt(yearMatch[1], 10) : 0;
    let startMonth = 0;
    const monthMatch = head.match(/([A-Za-zА-Яа-яÄÖÜäöüÉéÛû]{3,})/u);
    if (monthMatch) {
      const token = monthMatch[1].toLowerCase();
      if (token.startsWith('juin')) startMonth = 6;
      else if (token.startsWith('juil')) startMonth = 7;
      else startMonth = MONTH_INDEX_MAP[token.slice(0, 3)] || 0;
    }
    return { startYear, startMonth };
  }

  function findEnclosingExperienceCard(startEl: Element | null): Element | null {
    if (!startEl) return null;
    const closestSec = startEl.closest('section');
    if (closestSec && ROLE_DATE_RANGE_REGEX.test(closestSec.textContent || '')) {
      return closestSec;
    }
    let curr = startEl.parentElement;
    for (let depth = 0; depth < 8 && curr && curr !== docRoot.body && curr.tagName !== 'MAIN'; depth++) {
      const txt = curr.textContent || '';
      if (ROLE_DATE_RANGE_REGEX.test(txt)) {
        return curr;
      }
      curr = curr.parentElement;
    }
    return null;
  }

  let expSection: Element | null = null;
  const expAnchor = docRoot.querySelector('#experience');
  if (expAnchor) {
    expSection = findEnclosingExperienceCard(expAnchor);
  }
  if (!expSection) {
    const viewNameEl = docRoot.querySelector('section[data-view-name*="experience" i], div[data-view-name*="experience" i]');
    if (viewNameEl && ROLE_DATE_RANGE_REGEX.test(viewNameEl.textContent || '')) {
      expSection = viewNameEl;
    }
  }
  if (!expSection) {
    const headings = Array.from(docRoot.querySelectorAll('main section h2, section h2, main [role="heading"], main h2, main h3, section [role="heading"], h2, h3, [role="heading"]'));
    for (const h of headings) {
      const headingTxt = getCleanElementText(h);
      if (EXP_HEADING_REGEX.test(headingTxt)) {
        expSection = findEnclosingExperienceCard(h);
        if (expSection) break;
      }
    }
  }
  if (!expSection) {
    const sections = Array.from(docRoot.querySelectorAll('main section, section'));
    for (const sec of sections) {
      const firstLine = extractCleanLines(sec)[0] || '';
      if (EXP_HEADING_REGEX.test(firstLine) && ROLE_DATE_RANGE_REGEX.test(sec.textContent || '')) {
        expSection = sec;
        break;
      }
    }
  }
  if (!expSection) {
    const candidates = Array.from(docRoot.querySelectorAll('main span, main p, main div, span, p, div'));
    for (const el of candidates) {
      if (el.children.length > 2) continue;
      const rawTxt = (el.textContent || '').trim();
      if (!rawTxt || rawTxt.length > 48) continue;
      if (EXP_HEADING_REGEX.test(getCleanElementText(el))) {
        expSection = findEnclosingExperienceCard(el);
        if (expSection) break;
      }
    }
  }
  if (!expSection) return null;

  function cleanCompanyLine(rawLine: string) {
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

  function isLikelyLocationLine(line: string) {
    if (!line || line.length < 2 || line.length > 68) return false;
    if (ROLE_DATE_RANGE_REGEX.test(line) || TOTAL_DURATION_ONLY_REGEX.test(line)) return false;
    if (EMPLOYMENT_TYPE_REGEX.test(line) && !WORKPLACE_TYPE_REGEX.test(line)) return false;
    if (/^(?:skills|see more|show all|helped me|conducted|leading|built|developed|architected|managed|designed|responsible|working)\b/i.test(line)) return false;
    if (/\b(?:engineer|developer|architect|manager|director|lead|designer|consultant|specialist|analyst|scientist|intern|instructor|founder|co-founder|president|officer|vp|head|chief|coordinator|recruiter|talent|partner|associate)\b/i.test(line)) {
      return false;
    }
    if (WORKPLACE_TYPE_REGEX.test(line)) return true;
    if (/^\p{Lu}[\p{L}.\- '’]+,\s*\p{Lu}[\p{L}.\- ,'’]+$/u.test(line) && line.split(/\s+/).length <= 7) {
      return true;
    }
    return false;
  }

  function isLikelyDescriptionOrSkillsLine(line: string) {
    if (!line) return false;
    if (line.length > 75) return true;
    if (/^(?:Skills\s*:|Навыки\s*:|•|-|\*|\d+\.\s)/i.test(line)) return true;
    if (/[.!]$/.test(line) && line.split(/\s+/).length >= 6) return true;
    if ((line.match(/\s*[·•]\s*/g) || []).length >= 2 && !EMPLOYMENT_TYPE_REGEX.test(line)) return true;
    return false;
  }

  function cleanLocationLine(rawLine: string) {
    if (!rawLine) return '';
    return rawLine
      .replace(/\s*[·•]\s*(?:Hybrid|Remote|On-site|Onsite|Гибридный|Удаленно|Офис|На месте).*$/i, '')
      .replace(/\s*\b(?:Hybrid|Remote|On-site|Onsite|Гибридный|Удаленно|Офис|На месте)\s*$/i, '')
      .trim();
  }

  function normalizeExperienceLines(rawLines: string[], sliceToExperienceWindow = false) {
    const out: string[] = [];
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

  const parsedEntries: Array<{
    roleTitle: string;
    company: string;
    location: string;
    isCurrent: boolean;
    isFullTime: boolean;
    startYear: number;
    startMonth: number;
    domOrder: number;
  }> = [];

  function parseBlockLines(blockLines: string[], isIsolatedItem = false) {
    let activeGroupCompany = '';
    let activeGroupLocation = '';
    let activeGroupIsFullTime = false;
    let lastConsumedIdx = -1;

    for (let i = 0; i < blockLines.length; i++) {
      const line = blockLines[i];

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

      if (!ROLE_DATE_RANGE_REGEX.test(line)) continue;

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

  const topLevelLis = Array.from(expSection.querySelectorAll('li')).filter(li => {
    const parentLi = li.parentElement ? li.parentElement.closest('li') : null;
    if (parentLi && expSection!.contains(parentLi)) return false;
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

  if (parsedEntries.length === 0) return null;

  const sortByLatestExperience = (a: typeof parsedEntries[0], b: typeof parsedEntries[0]) => {
    if (a.startYear && b.startYear) {
      if (b.startYear !== a.startYear) return b.startYear - a.startYear;
      if (b.startMonth !== a.startMonth) return b.startMonth - a.startMonth;
    }
    if (a.isFullTime !== b.isFullTime) return a.isFullTime ? -1 : 1;
    return (a.domOrder || 0) - (b.domOrder || 0);
  };

  const currentEntries = parsedEntries.filter(e => e.isCurrent).slice().sort(sortByLatestExperience);
  const sortedAllEntries = parsedEntries.slice().sort(sortByLatestExperience);
  const candidates = currentEntries.length > 0 ? currentEntries : sortedAllEntries;
  const latestEntry = candidates[0] || parsedEntries[0];
  const fallbackCompanyEntry = candidates.find(c => Boolean(c.company)) || parsedEntries.find(c => Boolean(c.company)) || latestEntry;

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

function extractLinkedInProfileFromDoc(doc: Document, url: string) {
  const nameEl = doc.querySelector(
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
    const ogTitle = doc.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitle && ogTitle.content) {
      const parts = ogTitle.content.split(/\s*[-–|•]\s*/);
      if (parts[0]) fullName = cleanText(parts[0]);
    }
  }
  if (!fullName && doc.title) {
    const parts = doc.title.split(/\s*[-–|•]\s*/);
    if (parts[0] && !/^linkedin$/i.test(parts[0].trim())) {
      fullName = cleanText(parts[0]);
    }
  }
  if (fullName) {
    fullName = dedupeDoubledString(
      fullName
        .replace(/^\s*\(\d+\+?\)\s*/, '') // Strip notification counts like (1), (99+)
        .replace(/\s*[|–-]\s*LinkedIn.*$/i, '')
        .replace(/\s*(?:•\s*)?\b(1st|2nd|3rd)\b.*$/i, '')
        .replace(/\s*\((?:he|him|she|her|they|them|ze|hir)[^)]*\)/i, '')
        .replace(/\s*,\s*(?:Ph\.?D\.?|MBA|M\.?S\.?|B\.?S\.?|MD|PMP|CPA|Esq\.?|PE)\b.*$/i, '')
        .trim()
    );
  }

  const NOISE_PROFILE_LINE_REGEX = /^(?:1st|2nd|3rd|Following|Follow|Connect|Message|More|Pending|Edit profile|Add profile section|Open to|Enhance profile|Resources|Contact info|\d[\d,.]*\+?\s*(?:connections|followers|контакт.*|подписчик.*)|(?:\()?he\/him(?:\))?|(?:\()?she\/her(?:\))?|(?:\()?they\/them(?:\))?|•|·)$/i;

  const headlineEl = doc.querySelector(
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

  if (!topCardHeadline && fullName) {
    const candidateNameElements: Element[] = [];
    if (nameEl) candidateNameElements.push(nameEl);
    const allHeadingsAndSpans = Array.from(doc.querySelectorAll('h1, h2, [role="heading"], header span, main section:first-of-type span, div[class*="sticky"] span, div[style*="sticky"] span, div[style*="fixed"] span'));
    for (const el of allHeadingsAndSpans) {
      if (el !== nameEl && getCleanElementText(el).replace(/\s*\(\d+\+?\)\s*/, '').startsWith(fullName)) {
        candidateNameElements.push(el);
      }
    }

    for (const targetEl of candidateNameElements) {
      let ancestor = targetEl.parentElement;
      for (let depth = 0; depth < 4 && ancestor && ancestor !== doc.body && ancestor.tagName !== 'MAIN'; depth++) {
        const lines = extractCleanLines(ancestor);
        const nameIdx = lines.findIndex(l => l.toLowerCase().includes(fullName.toLowerCase()));
        if (nameIdx !== -1) {
          for (let i = nameIdx + 1; i < lines.length && i <= nameIdx + 4; i++) {
            const cand = lines[i];
            if (!cand || NOISE_PROFILE_LINE_REGEX.test(cand)) continue;
            if (/contact info/i.test(cand)) break;
            if (/^(?:About|Activity|Experience|Education|Skills|Highlights|Featured)$/i.test(cand)) break;
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

  // Experience section is the source of truth for Role / Headline and Company / Organization
  const expData = parseLinkedInExperienceSection(doc);
  const headline = (expData && expData.primaryRole)
    ? expData.primaryRole
    : cleanLinkedInTopCardHeadlineFallback(topCardHeadline);

  let organization = (expData && expData.organization) ? expData.organization : '';
  if (!organization) {
    const currentCompanyBtn = doc.querySelector(
      'button[aria-label^="Current company:"], ' +
      'div[aria-label="Current company"], ' +
      '.pv-top-card--experience-list-item, ' +
      '.pv-text-details__right-panel button, ' +
      '.pv-top-card__right-panel button'
    );
    if (currentCompanyBtn) {
      const aria = currentCompanyBtn.getAttribute('aria-label') || '';
      const match = aria.match(/Current company:\s*([^.]+?)(?:\.\s*Click|$)/i);
      organization = match ? cleanText(match[1]) : getCleanElementText(currentCompanyBtn);
    }
  }
  if (!organization && topCardHeadline) {
    const atMatch = topCardHeadline.match(/(?:\bat\b|@)\s+([^,|•·\n]+)/i);
    if (atMatch) {
      organization = cleanText(
        atMatch[1].replace(/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u2600-\u27BF\uFE0F]/gu, '')
      );
    }
  }

  const locEl = doc.querySelector(
    'span.text-body-small.inline.t-black--light.break-words, ' +
    '.pv-text-details__left-panel span.text-body-small, ' +
    '.top-card-layout__first-subline, ' +
    'div.pv-top-card--list-bullet > span, ' +
    '.pv-top-card-section__location'
  );
  let location = locEl ? getCleanElementText(locEl) : '';
  if (!location) {
    const contactInfoAnchor = doc.querySelector('a[href*="contact-info"]');
    if (contactInfoAnchor) {
      let container = contactInfoAnchor.parentElement;
      for (let depth = 0; depth < 3 && container && container !== doc.body; depth++) {
        const lines = extractCleanLines(container);
        const ciIdx = lines.findIndex(l => /contact info|контактная информация/i.test(l));
        if (ciIdx > 0) {
          const candidate = lines[ciIdx - 1].replace(/\s*[·•]\s*Contact info.*$/i, '').trim();
          if (candidate && candidate !== fullName && candidate !== topCardHeadline && candidate !== headline && !NOISE_PROFILE_LINE_REGEX.test(candidate)) {
            location = candidate;
            break;
          }
        }
        const rawContainerText = getCleanElementText(container);
        if (/contact info|контактная информация/i.test(rawContainerText)) {
          const beforeCi = rawContainerText.split(/\s*[·•]?\s*(?:Contact info|Контактная информация)/i)[0].trim();
          if (beforeCi && beforeCi.length >= 2 && beforeCi.length <= 65 && beforeCi !== fullName && beforeCi !== topCardHeadline && beforeCi !== headline) {
            location = beforeCi;
            break;
          }
        }
        container = container.parentElement;
      }
    }
  }
  if (!location && expData && expData.location) {
    location = expData.location;
  }
  if (location) {
    location = location
      .replace(/\s*[·•]?\s*Contact info.*$/i, '')
      .replace(/\s*[·•]\s*(?:Hybrid|Remote|On-site|Onsite).*$/i, '')
      .trim();
  }

  const avatarImg = doc.querySelector(
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
  ) as HTMLImageElement | null;
  let avatarUrl = avatarImg ? (avatarImg.src || '') : '';
  if (!avatarUrl && fullName) {
    const allImgs = Array.from(doc.querySelectorAll('main img, div[class*="sticky"] img, div[style*="sticky"] img, div[style*="fixed"] img')) as HTMLImageElement[];
    const matchedImg = allImgs.find(img => {
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      const src = (img.getAttribute('src') || '').toLowerCase();
      if (!src || src.includes('profile-displaybackgroundimage') || src.includes('company-logo') || src.includes('data:image/gif')) return false;
      return alt.includes(fullName.toLowerCase());
    });
    if (matchedImg) avatarUrl = matchedImg.src || '';
  }

  return {
    fullName,
    headline,
    role: headline,
    organization,
    location,
    avatarUrl,
    linkedInUrl: url,
    suggestedCategory: inferContactCategory(headline || topCardHeadline),
  };
}

function extractXProfileFromDoc(doc: Document, url: string) {
  const parsed = new URL(url);
  const segments = parsed.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const nonProfile = ['home', 'explore', 'notifications', 'messages', 'settings', 'i', 'search', 'compose', 'lists', 'bookmarks', 'communities', 'tos', 'privacy'];
  if (segments.length !== 1 || nonProfile.includes(segments[0].toLowerCase())) {
    return null;
  }
  const username = segments[0];

  const userNameContainer = doc.querySelector('[data-testid="UserName"]');
  let fullName = '';
  if (userNameContainer) {
    const span = userNameContainer.querySelector('span');
    if (span) fullName = cleanText(span.textContent || '');
  }
  if (!fullName) {
    const ogTitle = doc.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitle && ogTitle.content) {
      const match = ogTitle.content.match(/^([^(]+)/);
      if (match) fullName = cleanText(match[1]);
    }
  }

  const bioEl = doc.querySelector('[data-testid="UserDescription"]');
  const headline = cleanText(bioEl ? bioEl.textContent || '' : '');

  let organization = '';
  if (headline) {
    const match = headline.match(/(?:at|@|founder(?: at| of)?|engineer(?: at| @)?|lead(?: at| @)?)\s*([A-Za-z0-9_.-]+)/i);
    if (match) organization = cleanText(match[1]).replace(/[.,!;:]+$/, '');
  }

  const locEl = doc.querySelector('[data-testid="UserLocation"]');
  const location = cleanText(locEl ? locEl.textContent || '' : '');

  const avatarImg = doc.querySelector('[data-testid*="UserAvatar"] img') as HTMLImageElement | null;
  const avatarUrl = avatarImg ? avatarImg.src : '';

  return {
    fullName: fullName || username,
    headline,
    role: headline || `@${username}`,
    organization,
    location,
    avatarUrl,
    linkedInUrl: `https://x.com/${username}`,
    suggestedCategory: inferContactCategory(headline),
    platform: 'X',
  };
}

const HIRING_POST_INTENT_REGEX = /(?:we(?:'re|\s+are)\s+hiring|i(?:'m|\s+am)\s+hiring|my\s+team\s+(?:at\s+[A-Za-z0-9&.\-_ ]+\s+)?is\s+hiring|join\s+(?:our|my|the)\s+team|looking\s+for\s+(?:a|an)?|seeking\s+(?:a|an)?|now\s+hiring|open\s+role[s]?|job\s+opening[s]?|apply\s+(?:here|at|below|now)|dm\s+(?:me\s+)?if\s+interested|we\s+have\s+an?\s+opening|hiring\s+alert|excited\s+to\s+announce\s+we(?:'re|\s+are)\s+hiring|hiring\s+for\s+(?:a|an)?|(?:role|position|vacancy)\s*:)/i;

const POST_ROLE_TITLE_REGEX = /\b((?:(?:Senior|Sr\.?|Junior|Jr\.?|Lead|Principal|Staff|Founding|Head\s+of|VP\s+of|Director\s+of|Chief)\s+)*(?:(?:Software|Frontend|Front[- ]?End|Backend|Back[- ]?End|Full[- ]?Stack|Mobile|iOS|Android|Flutter|React(?:\s+Native)?|Angular|Vue|Node(?:\.js)?|Python|Go|Golang|Rust|Java|Kotlin|Swift|TypeScript|JavaScript|C\+\+|C#|\.NET|Ruby|Rails|PHP|Scala|Elixir|DevOps|Site\s+Reliability|SRE|Platform|Infrastructure|Cloud|Data|Machine\s+Learning|ML|AI|GenAI|LLM|Product|Growth|UX|UI|UI\/UX|System|Systems|Embedded|Firmware|Security|Cybersecurity|QA|Quality\s+Assurance|Automation|Test|Solutions|Support|Sales|Technical|Engineering|Design|Research|Marketing|Operations)\s+)+(?:Engineer|Developer|Designer|Architect|Manager|Lead|Specialist|Scientist|Consultant|Analyst|Researcher|Officer|Director|Intern|Instructor|Advocate|Evangelist|Associate)|(?:Engineering\s+Manager|Product\s+Manager|Project\s+Manager|Program\s+Manager|Technical\s+Program\s+Manager|Scrum\s+Master|Data\s+Scientist|Product\s+Designer|UX\s+Designer|UI\s+Designer|UX\s+Researcher|DevOps\s+Engineer|Site\s+Reliability\s+Engineer|Solutions\s+Architect|Mobile\s+Architect|Software\s+Architect|Security\s+Engineer|QA\s+Engineer|Data\s+Engineer|ML\s+Engineer|AI\s+Engineer))\b/i;

function extractRoleAndMetaFromPostText(rawText: string) {
  if (!rawText) return null;
  const normalizedLines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const multiLineText = normalizedLines.join('\n');
  const flatText = cleanText(rawText);

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
  if (!company && role) {
    const escapedRole = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const roleAtComp = flatText.match(new RegExp(escapedRole + '\\s+(?:at|@)\\s+([A-Z][A-Za-z0-9&.\\-_]+)', 'i'));
    if (roleAtComp && roleAtComp[1]) {
      company = cleanText(roleAtComp[1]).replace(/[.,!;]+$/, '');
    }
  }

  let workLocation: string | null = null;
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

  let salary = '';
  const salMatch = flatText.match(/(?:[$€£]\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?(?:\s*[-–]\s*[$€£]?\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?)?(?:\s*(?:\/\s*yr|\/\s*year|\/\s*mo|\/\s*hr|per\s+year|per\s+month|per\s+hour))?)/i);
  if (salMatch) {
    salary = cleanText(salMatch[0]);
  }

  return { role, company, location, workLocation, salary };
}

function extractXPostJobFromDoc(doc: Document, url: string) {
  const parsed = new URL(url);
  const isStatusUrl = parsed.pathname.includes('/status/');

  const modalTweet = doc.querySelector('[role="dialog"] article[data-testid="tweet"], [aria-modal="true"] article[data-testid="tweet"]');
  const tweetEl = modalTweet || doc.querySelector('article[data-testid="tweet"]');
  if (!tweetEl && !isStatusUrl) return null;

  const tweetTextEl = (tweetEl || doc).querySelector('[data-testid="tweetText"]');
  const rawTweetText = tweetTextEl ? (tweetTextEl.textContent || '') : '';
  const tweetText = cleanText(rawTweetText);
  if (!tweetText) return null;

  if (!HIRING_POST_INTENT_REGEX.test(tweetText) && !isStatusUrl) return null;
  const parsedMeta = extractRoleAndMetaFromPostText(rawTweetText);
  if (!parsedMeta) return null;

  let authorName = '';
  let authorHandle = '';
  const userContainer = (tweetEl || doc).querySelector('[data-testid="User-Name"], [data-testid="UserName"]');
  if (userContainer) {
    const spans = Array.from(userContainer.querySelectorAll('span')).map(s => cleanText(s.textContent || '')).filter(Boolean);
    if (spans.length > 0) authorName = spans[0];
    const handleSpan = spans.find(s => s.startsWith('@'));
    if (handleSpan) authorHandle = handleSpan.replace(/^@/, '');
  }

  const externalAnchors = Array.from((tweetEl || doc).querySelectorAll('a[href*="http"]')) as HTMLAnchorElement[];
  const validExternal = externalAnchors.filter(a => !a.href.includes('x.com') && !a.href.includes('twitter.com'));
  const applyLink = validExternal.length > 0 ? validExternal[0].href : url;

  let company = parsedMeta.company;
  if (!company) {
    const atCompMatch = tweetText.match(/(?:at\s+|@|join\s+(?:us\s+at\s+)?|hiring\s+at\s+|opening\s+at\s+)([A-Z][A-Za-z0-9&.\-_]+)/i);
    if (atCompMatch && atCompMatch[1]) company = cleanText(atCompMatch[1]);
  }
  if (!company && applyLink && applyLink !== url) {
    company = getDomainName(applyLink);
  }
  if (!company) company = authorName ? `${authorName}'s Team` : 'Company';

  return {
    title: parsedMeta.role || 'Open Role',
    company,
    location: parsedMeta.location,
    workLocation: parsedMeta.workLocation,
    salary: parsedMeta.salary,
    jobLink: applyLink,
    contact: {
      name: authorName,
      role: authorHandle ? `@${authorHandle}` : 'X User',
      linkedIn: authorHandle ? `https://x.com/${authorHandle}` : url,
      category: 'Recruiter'
    }
  };
}

function extractPeerlistProfileFromDoc(doc: Document, url: string) {
  const parsed = new URL(url);
  const segments = parsed.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  if (segments.length !== 1 || ['jobs', 'company', 'scroll', 'projects', 'explore', 'about', 'join'].includes(segments[0].toLowerCase())) {
    return null;
  }
  const username = segments[0];

  const nameEl = doc.querySelector('h1, [data-testid="user-profile-name"], .profile-name');
  const fullName = cleanText(nameEl ? nameEl.textContent || '' : '') || username;

  const roleEl = doc.querySelector('[data-testid="user-profile-tagline"], .profile-headline, h2');
  const headline = cleanText(roleEl ? roleEl.textContent || '' : '');

  const compEl = doc.querySelector('[data-testid="user-profile-company"], [class*="experience"] h3');
  const organization = cleanText(compEl ? compEl.textContent || '' : '');

  const locEl = doc.querySelector('[data-testid="user-location"], [class*="location"]');
  const location = cleanText(locEl ? locEl.textContent || '' : '');

  return {
    fullName,
    headline,
    organization,
    location,
    profileUrl: `https://peerlist.io/${username}`,
    suggestedCategory: inferContactCategory(headline),
    platform: 'Other'
  };
}

function extractJobFromModalDoc(doc: Document, pageUrl: string = 'https://example.com/careers') {
  const OVERLAY_SELECTORS = [
    'dialog[open]',
    '[role="dialog"]:not([aria-hidden="true"])',
    '[role="alertdialog"]:not([aria-hidden="true"])',
    '[aria-modal="true"]:not([aria-hidden="true"])',
    '[data-state="open"][role="dialog"]',
    '[data-headlessui-state="open"]',
    '.modal.show, .modal.open, .modal.active',
    'aside.drawer, aside[class*="drawer" i], aside[class*="modal" i], .drawer.open',
    '[class*="offcanvas"].show',
    '.slideover.open, .slideover.show',
    '[data-testid*="job-details"], [data-testid*="job-preview"], [data-testid*="job-drawer"], [data-testid*="selected-job"]'
  ];

  for (const selector of OVERLAY_SELECTORS) {
    const containers = Array.from(doc.querySelectorAll(selector));
    for (const container of containers) {
      if (container.querySelector('.feed-shared-update-v2, [data-urn*="activity"], article[data-testid="tweet"]')) {
        continue;
      }

      const titleEl = container.querySelector(
        '[class*="job-title" i], [class*="jobTitle" i], [class*="role-title" i], [data-testid*="job-title" i], h1, h2, h3'
      );
      const title = getCleanElementText(titleEl);
      if (!title || /^(?:sign in|log in|filter|search|settings|cookie|privacy|share|subscribe|menu|navigation|notifications|messages|people also viewed|linkedin news|who to follow)/i.test(title)) {
        continue;
      }

      const hasExplicitJobTitleAttr = Boolean(container.querySelector('[class*="job-title" i], [class*="jobTitle" i], [class*="role-title" i], [data-testid*="job-title" i], [class*="company-name" i], [data-testid*="company" i], [class*="location" i], [data-testid*="location" i]'));
      const hasApplyTrigger = Boolean(container.querySelector('a[href*="apply" i], button[class*="apply" i], a[class*="apply" i], a.btn-apply, iframe[src*="greenhouse.io"], iframe[src*="lever.co"]'));
      const hasRoleKeyword = /\b(?:engineer|developer|designer|architect|manager|director|lead|specialist|scientist|analyst|consultant|intern|coordinator|recruiter|head|vp|officer|instructor)\b/i.test(title);
      if (!hasExplicitJobTitleAttr && !hasApplyTrigger && !hasRoleKeyword) {
        continue;
      }

      const companyEl = container.querySelector('[class*="company-name"], [class*="employer"], [data-testid*="company"], a[href*="/company/"]');
      let company = getCleanElementText(companyEl);
      if (!company) {
        const pageCompEl = doc.querySelector('[data-testid="company-name"], .company-name, [class*="header"] [class*="logo"] img[alt]');
        if (pageCompEl) {
          company = cleanText(pageCompEl.getAttribute('alt') || pageCompEl.textContent || '');
        }
      }
      if (!company) {
        company = getDomainName(pageUrl);
      }

      const locEl = container.querySelector('[class*="location"], [data-testid*="location"]');
      const location = getCleanElementText(locEl);

      const text = cleanText(container.textContent || '').toLowerCase();
      let workLocation = null;
      if (text.includes('remote') || text.includes('work from home')) workLocation = 'Remote';
      else if (text.includes('hybrid')) workLocation = 'Hybrid';
      else if (location) workLocation = 'Onsite';

      const salaryMatch = text.match(/(?:[$€£]\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?(?:\s*[-–]\s*[$€£]?\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?)?(?:\s*(?:\/\s*yr|\/\s*year|\/\s*mo|\/\s*hr|per\s+year|per\s+month|per\s+hour))?)/i);
      const salary = salaryMatch ? cleanText(salaryMatch[0]) : '';

      const applyAnchor = container.querySelector('a[href*="apply"], a.btn-apply') as HTMLAnchorElement | null;
      let jobLink = applyAnchor ? applyAnchor.href : pageUrl;

      const iframe = container.querySelector('iframe[src*="greenhouse.io"], iframe[src*="lever.co"]') as HTMLIFrameElement | null;
      if (iframe && iframe.src) {
        jobLink = iframe.src;
      }

      return {
        title,
        company,
        location,
        workLocation,
        salary,
        jobLink,
        inModal: true,
      };
    }
  }

  return null;
}

function extractLinkedInPostJobFromDoc(doc: Document, url: string) {
  const textEl = doc.querySelector(
    '.update-components-text, .feed-shared-update-v2__description, .feed-shared-text-view, span.attributed-text-segment-list__content, [data-test-id*="commentary"]'
  );
  const rawPostText = textEl ? (textEl.textContent || '') : '';
  const postText = cleanText(rawPostText);
  if (!postText) return null;

  if (!HIRING_POST_INTENT_REGEX.test(postText)) return null;
  const parsedMeta = extractRoleAndMetaFromPostText(rawPostText);
  if (!parsedMeta) return null;

  const nameEl = doc.querySelector('.update-components-actor__name, .feed-shared-actor__name, a[href*="/in/"] span[dir="ltr"]');
  const headlineEl = doc.querySelector('.update-components-actor__description, .feed-shared-actor__description');
  const profileAnchor = doc.querySelector('a.update-components-actor__image[href*="/in/"], a[href*="/in/"]') as HTMLAnchorElement | null;
  const avatarImg = doc.querySelector('img.update-components-actor__avatar-image, a[href*="/in/"] img') as HTMLImageElement | null;

  let authorName = '';
  if (nameEl) {
    authorName = getCleanElementText(nameEl);
  }
  authorName = authorName
    .replace(/^(?:Message|Connect|Follow)\s*/i, '')
    .replace(/\s*(?:•\s*)?(?:1st|2nd|3rd)\b.*$/i, '')
    .replace(/\s*View\s+.*?profile.*$/i, '')
    .trim();

  const authorHeadline = headlineEl ? getCleanElementText(headlineEl) : '';
  const authorLinkedIn = profileAnchor ? profileAnchor.href.split('?')[0] : '';
  const authorAvatar = avatarImg ? avatarImg.src : '';

  let company = parsedMeta.company;
  if (!company && authorHeadline) {
    const atMatch = authorHeadline.match(/(?:\bat\b|@)\s+([^,|•·\n]+)/i);
    if (atMatch) company = cleanText(atMatch[1]);
  }

  const applyAnchor = doc.querySelector('a.update-components-article__link, a[href*="http"]:not([href*="linkedin.com"])') as HTMLAnchorElement | null;
  const jobLink = applyAnchor ? applyAnchor.href : url;

  return {
    title: parsedMeta.role || 'Open Role',
    company: company || (authorName ? `${authorName}'s Team` : 'LinkedIn Network'),
    location: parsedMeta.location,
    workLocation: parsedMeta.workLocation,
    salary: parsedMeta.salary,
    jobLink,
    contact: {
      name: authorName,
      role: authorHeadline || 'Hiring Team',
      linkedIn: authorLinkedIn,
      avatarUrl: authorAvatar,
      category: /(?:manager|director|lead|head|founder|cto|vp)/i.test(authorHeadline) ? 'Hiring Manager' : 'Recruiter',
    }
  };
}

describe('extensionAutoScrape', () => {
  describe('Helper getDomainName', () => {
    it('extracts company name cleanly from various career urls without errors', () => {
      expect(getDomainName('https://stripe.com/careers')).toBe('Stripe');
      expect(getDomainName('https://careers.airbnb.com/roles')).toBe('Airbnb');
      expect(getDomainName('https://jobs.lever.co/linear/123')).toBe('Linear');
      expect(getDomainName('https://apply.workable.com/resend/')).toBe('Resend');
      expect(getDomainName('invalid-url')).toBe('Company');
    });
  });

  describe('findJsonLdEntity helper', () => {
    it('finds Person inside @graph array structure', () => {
      const data = {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebSite', name: 'Example' },
          { '@type': 'Person', name: 'Alice Smith', jobTitle: 'Lead Engineer' }
        ]
      };
      const found = findJsonLdEntity(data, 'Person');
      expect(found).not.toBeNull();
      expect(found.name).toBe('Alice Smith');
    });

    it('finds JobPosting with schema.org URL prefix in @type', () => {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'http://schema.org/JobPosting',
        title: 'Senior Frontend Engineer',
        hiringOrganization: { name: 'Vercel' }
      };
      const found = findJsonLdEntity(data, 'JobPosting');
      expect(found).not.toBeNull();
      expect(found.title).toBe('Senior Frontend Engineer');
    });
  });

  describe('LinkedIn Profile Scraping', () => {
    it('strips notification counts like (1) or (99+) from document title and clean names', () => {
      document.title = '(3) Sarah Connor | LinkedIn';
      document.body.innerHTML = `
        <div class="pv-text-details__left-panel">
          <h1 class="text-heading-xlarge">Sarah Connor</h1>
          <div class="text-body-medium">Staff Software Engineer at Skynet</div>
        </div>
      `;

      const result = extractLinkedInProfileFromDoc(document, 'https://www.linkedin.com/in/sarah-connor/');
      expect(result.fullName).toBe('Sarah Connor');
      expect(result.organization).toBe('Skynet');
      expect(result.suggestedCategory).toBe('Peer / Alumni');
    });

    it('strips degree abbreviations (Ph.D., MBA) and pronouns (she/her)', () => {
      document.title = 'Jane Doe, Ph.D. (She/Her) | LinkedIn';
      document.body.innerHTML = `
        <div class="pv-text-details__left-panel">
          <h1 class="text-heading-xlarge">Jane Doe, Ph.D. (She/Her) 1st</h1>
          <div class="text-body-medium">Director of Talent Acquisition @ Stripe</div>
        </div>
      `;

      const result = extractLinkedInProfileFromDoc(document, 'https://www.linkedin.com/in/jane-doe/');
      expect(result.fullName).toBe('Jane Doe');
      expect(result.organization).toBe('Stripe');
      expect(result.suggestedCategory).toBe('Recruiter');
    });

    it('extracts current company from right panel experience buttons', () => {
      document.body.innerHTML = `
        <div class="pv-text-details__left-panel">
          <h1 class="text-heading-xlarge">David Kim</h1>
          <div class="text-body-medium">Engineering Manager</div>
        </div>
        <div class="pv-text-details__right-panel">
          <button>Figma</button>
        </div>
      `;

      const result = extractLinkedInProfileFromDoc(document, 'https://www.linkedin.com/in/david-kim/');
      expect(result.fullName).toBe('David Kim');
      expect(result.organization).toBe('Figma');
      expect(result.suggestedCategory).toBe('Hiring Manager');
    });

    it('uses the latest position in Experience as the unconditional source of truth over marketing headlines (Belal Ashraf Screenshot 2 scenario)', () => {
      document.title = '(2) Belal Ashraf | LinkedIn';
      document.body.innerHTML = `
        <div style="position: sticky; top: 0" class="scaffold-layout-toolbar">
          <img src="https://media.licdn.com/dms/image/v2/D4D03AQ/profile-displayphoto-shrink_200_200/0/belal.jpg" alt="Belal Ashraf" />
          <div class="_obf_lockup">
            <span>Belal Ashraf</span>
            <span>Senior Flutter Engineer @ Mazeed 🇵🇸 | Flutter (Mobile - Web - iOS - Android) | Native Android (Java - Kotlin) | CI/CD | Clean Architecture | AI-Powered Development</span>
          </div>
          <button>Message</button>
          <button>Follow</button>
          <button>More</button>
        </div>
        <main>
          <section class="artdeco-card">
            <div id="experience"></div>
            <h2>Experience</h2>
            <ul>
              <li class="pvs-list__paged-list-item">
                <a class="optional-action-target-wrapper" href="https://www.linkedin.com/company/mazeed/">
                  <div>
                    <span aria-hidden="true">Senior Software Engineer |||</span>
                    <span class="visually-hidden">Senior Software Engineer |||</span>
                  </div>
                  <div>
                    <span aria-hidden="true">mazeed · Full-time</span>
                  </div>
                  <div>
                    <span aria-hidden="true">Apr 2025 - Present · 1 yr 7 mos</span>
                  </div>
                  <div>
                    <span aria-hidden="true">Dubai, United Arab Emirates · Hybrid</span>
                  </div>
                </a>
              </li>
              <li class="pvs-list__paged-list-item">
                <a class="optional-action-target-wrapper" href="https://www.linkedin.com/company/other/">
                  <div>
                    <span aria-hidden="true">Senior Flutter Engineer</span>
                  </div>
                  <div>
                    <span aria-hidden="true">Part-time</span>
                  </div>
                  <div>
                    <span aria-hidden="true">Jan 2024 - Mar 2025 · 1 yr 3 mos</span>
                  </div>
                </a>
              </li>
            </ul>
          </section>
        </main>
      `;

      const result = extractLinkedInProfileFromDoc(document, 'https://www.linkedin.com/in/belalnayzak/');
      expect(result.fullName).toBe('Belal Ashraf');
      // Latest Experience entry (#1) is the unconditional source of truth for both Role/Headline and Organization
      expect(result.headline).toBe('Senior Software Engineer |||');
      expect(result.role).toBe('Senior Software Engineer |||');
      expect(result.organization).toBe('mazeed');
      expect(result.location).toBe('Dubai, United Arab Emirates');
      expect(result.avatarUrl).toContain('profile-displayphoto');
      expect(result.suggestedCategory).toBe('Peer / Alumni');
    });

    it('extracts full profile when scrolled to Experience section with sticky header and obfuscated SDUI classes (latest Experience position as source of truth)', () => {
      document.title = 'Alexander Bangert | LinkedIn';
      document.body.innerHTML = `
        <div style="position: sticky; top: 0" class="_obf_sticky_bar">
          <img src="https://media.licdn.com/dms/image/v2/D4D03AQ/profile-displayphoto-shrink_200_200/0/alex.jpg" alt="Alexander Bangert" />
          <div class="_obf_lockup">
            <span>Alexander Bangert</span>
            <span>Senior Flutter Developer | Mobile Architect | Flutter Team Lead</span>
          </div>
          <button>Message</button>
          <button>Follow</button>
          <button>More</button>
        </div>
        <main>
          <section class="_obf_exp_section">
            <h2>Experience</h2>
            <ul>
              <li class="_obf_item">
                <div>
                  <span aria-hidden="true">Flutter / Go Instructor</span>
                  <span class="visually-hidden">Flutter / Go Instructor</span>
                </div>
                <div>
                  <span aria-hidden="true">Attractor School Almaty · Part-time</span>
                </div>
                <div>
                  <span aria-hidden="true">Dec 2024 - Present · 1 yr 11 mos</span>
                </div>
                <div>
                  <span aria-hidden="true">Алматы, Казахстан · Hybrid</span>
                </div>
              </li>
              <li class="_obf_item">
                <div>
                  <span aria-hidden="true">Senior Flutter Developer</span>
                  <span class="visually-hidden">Senior Flutter Developer</span>
                </div>
                <div>
                  <span aria-hidden="true">NLS Kazakhstan · Full-time</span>
                </div>
                <div>
                  <span aria-hidden="true">Jun 2025 - Present · 1 yr 5 mos</span>
                </div>
                <div>
                  <span aria-hidden="true">Алматы, Казахстан · On-site</span>
                </div>
                <div>
                  <span aria-hidden="true">Leading and contributing to the development of 5+ commercial applications.</span>
                </div>
              </li>
              <li class="_obf_item">
                <div>
                  <span aria-hidden="true">Founder &amp; Flutter Engineer</span>
                  <span class="visually-hidden">Founder &amp; Flutter Engineer</span>
                </div>
                <div>
                  <span aria-hidden="true">BangertStudio · Self-employed</span>
                </div>
                <div>
                  <span aria-hidden="true">Nov 2024 - Present · 2 yrs</span>
                </div>
                <div>
                  <span aria-hidden="true">Almaty, Kazakhstan · Hybrid</span>
                </div>
              </li>
            </ul>
          </section>
        </main>
      `;

      const result = extractLinkedInProfileFromDoc(document, 'https://www.linkedin.com/in/alexander-bangert-b54705259');
      expect(result.fullName).toBe('Alexander Bangert');
      expect(result.headline).toBe('Senior Flutter Developer');
      expect(result.role).toBe('Senior Flutter Developer');
      expect(result.organization).toBe('NLS Kazakhstan');
      expect(result.location).toBe('Almaty, Kazakhstan');
      expect(result.avatarUrl).toContain('profile-displayphoto');
      expect(result.suggestedCategory).toBe('Peer / Alumni');
    });

    it('extracts clean role and organization from Experience over obfuscated SDUI Top Card marketing headline', () => {
      document.title = 'Elena Rostova | LinkedIn';
      document.body.innerHTML = `
        <main>
          <section class="_sdui_card_99">
            <div class="_sdui_row">
              <h1>Elena Rostova</h1>
              <span>1st</span>
            </div>
            <div class="_sdui_headline">Principal Mobile Architect | Kotlin &amp; Flutter</div>
            <div class="_sdui_sub">
              <span>Berlin, Germany</span>
              <span>·</span>
              <a href="/in/elena-rostova/overlay/contact-info/">Contact info</a>
            </div>
          </section>
          <section>
            <h2>Experience</h2>
            <ul>
              <li>
                <div>Principal Mobile Architect</div>
                <div>Zalando · Full-time</div>
                <div>Jan 2023 - Present · 3 yrs</div>
              </li>
            </ul>
          </section>
        </main>
      `;

      const result = extractLinkedInProfileFromDoc(document, 'https://www.linkedin.com/in/elena-rostova');
      expect(result.fullName).toBe('Elena Rostova');
      expect(result.headline).toBe('Principal Mobile Architect');
      expect(result.role).toBe('Principal Mobile Architect');
      expect(result.organization).toBe('Zalando');
      expect(result.location).toBe('Berlin, Germany');
      expect(result.suggestedCategory).toBe('Peer / Alumni');
    });

    it('correctly parses grouped multi-role company entries in Experience without mistaking standalone "Part-time" or "Full-time" for the company name', () => {
      document.title = 'Omar Hassan | LinkedIn';
      document.body.innerHTML = `
        <main>
          <section>
            <h2>Experience</h2>
            <div>
              <div>Careem</div>
              <div>Full-time · 3 yrs 4 mos</div>
              <div>Dubai, United Arab Emirates</div>
              <div>
                <div>Staff Mobile Engineer</div>
                <div>Part-time</div>
                <div>Jan 2025 - Present · 10 mos</div>
              </div>
              <div>
                <div>Senior Mobile Engineer</div>
                <div>Full-time</div>
                <div>Jul 2022 - Dec 2024 · 2 yrs 6 mos</div>
              </div>
            </div>
          </section>
        </main>
      `;

      const result = extractLinkedInProfileFromDoc(document, 'https://www.linkedin.com/in/omar-hassan');
      expect(result.fullName).toBe('Omar Hassan');
      expect(result.role).toBe('Staff Mobile Engineer');
      expect(result.organization).toBe('Careem');
    });
  });

  describe('Active Modal & Side Drawer Job Scraping', () => {
    it('extracts job details directly from an open modal dialog', () => {
      document.body.innerHTML = `
        <h1>Explore All Engineering Openings</h1>
        <div role="dialog" aria-modal="true" class="modal show">
          <h2 class="job-title">Senior Full Stack Engineer</h2>
          <div class="company-name">Linear</div>
          <div class="location">Remote - Worldwide</div>
          <div class="compensation">$150,000 - $180,000 / yr</div>
          <div class="job-description">We are seeking a senior engineer to build core workflow products.</div>
          <a class="btn-apply" href="https://jobs.lever.co/linear/12345">Apply Now</a>
        </div>
      `;

      const result = extractJobFromModalDoc(document);
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Senior Full Stack Engineer');
      expect(result?.company).toBe('Linear');
      expect(result?.location).toBe('Remote - Worldwide');
      expect(result?.workLocation).toBe('Remote');
      expect(result?.salary).toBe('$150,000 - $180,000 / yr');
      expect(result?.jobLink).toBe('https://jobs.lever.co/linear/12345');
      expect(result?.inModal).toBe(true);
    });

    it('falls back cleanly to site domain when modal lacks company element without crashing', () => {
      document.body.innerHTML = `
        <div role="dialog" class="modal show">
          <h2 class="job-title">Founding Backend Engineer</h2>
          <div class="location">San Francisco, CA</div>
        </div>
      `;

      const result = extractJobFromModalDoc(document, 'https://resend.com/careers');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Founding Backend Engineer');
      expect(result?.company).toBe('Resend');
      expect(result?.location).toBe('San Francisco, CA');
    });

    it('extracts job details from Radix / shadcn dialogs [data-state="open"]', () => {
      document.body.innerHTML = `
        <div role="dialog" data-state="open">
          <h3 class="job-title">Senior Infrastructure Engineer</h3>
          <span class="company-name">Supabase</span>
          <span class="location">Remote</span>
        </div>
      `;

      const result = extractJobFromModalDoc(document);
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Senior Infrastructure Engineer');
      expect(result?.company).toBe('Supabase');
      expect(result?.workLocation).toBe('Remote');
    });

    it('ignores generic non-job <aside> sidebars like People Also Viewed or LinkedIn News', () => {
      document.body.innerHTML = `
        <aside aria-label="LinkedIn News">
          <h2>LinkedIn News</h2>
          <ul><li>Tech hiring trends in 2026</li></ul>
        </aside>
      `;

      const result = extractJobFromModalDoc(document, 'https://www.linkedin.com/feed/');
      expect(result).toBeNull();
    });
  });

  describe('LinkedIn Post Job Scraping', () => {
    it('extracts author cleanly without visually-hidden profile card strings', () => {
      document.body.innerHTML = `
        <div class="feed-shared-update-v2">
          <div class="update-components-actor">
            <span class="update-components-actor__name">
              <span dir="ltr">
                <span aria-hidden="true">Alex Rivera</span>
                <span class="visually-hidden">View Alex Rivera’s profile</span>
              </span>
            </span>
            <span class="update-components-actor__description">VP of Engineering at Datadog</span>
            <a class="update-components-actor__image" href="https://www.linkedin.com/in/alex-rivera/">
              <img class="update-components-actor__avatar-image" src="https://media.licdn.com/alex.jpg" />
            </a>
          </div>
          <div class="update-components-text">
            We are hiring! My team at Datadog is looking for a Senior Frontend Engineer.
            100% remote friendly (US/Canada). Salary range: $160,000 - $200,000 / yr.
            Apply at https://datadoghq.com/careers/fe-eng or message me directly!
          </div>
          <a class="update-components-article__link" href="https://datadoghq.com/careers/fe-eng">Apply Link</a>
        </div>
      `;

      const result = extractLinkedInPostJobFromDoc(
        document,
        'https://www.linkedin.com/feed/update/urn:li:activity:7234567890123'
      );
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Senior Frontend Engineer');
      expect(result?.company).toBe('Datadog');
      expect(result?.workLocation).toBe('Remote');
      expect(result?.salary).toBe('$160,000 - $200,000 / yr');
      expect(result?.jobLink).toBe('https://datadoghq.com/careers/fe-eng');
      expect(result?.contact.name).toBe('Alex Rivera');
      expect(result?.contact.role).toBe('VP of Engineering at Datadog');
      expect(result?.contact.linkedIn).toBe('https://www.linkedin.com/in/alex-rivera/');
      expect(result?.contact.category).toBe('Hiring Manager');
    });

    it('extracts Flutter / Go tech-stack roles and multi-line structured fields from LinkedIn posts', () => {
      document.body.innerHTML = `
        <div class="feed-shared-update-v2">
          <div class="update-components-actor">
            <span class="update-components-actor__name"><span aria-hidden="true">Maria Chen</span></span>
            <span class="update-components-actor__description">Talent Acquisition Lead at Wise</span>
          </div>
          <div class="update-components-text">We're hiring!
Role: Senior Flutter Developer
Company: Wise
Location: London, UK (Hybrid)
Compensation: £95,000 - £120,000 / yr
DM me if interested!</div>
        </div>
      `;

      const result = extractLinkedInPostJobFromDoc(
        document,
        'https://www.linkedin.com/posts/maria-chen_hiring-flutter-activity-12345'
      );
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Senior Flutter Developer');
      expect(result?.company).toBe('Wise');
      expect(result?.location).toBe('London, UK');
      expect(result?.workLocation).toBe('Hybrid');
      expect(result?.salary).toBe('£95,000 - £120,000 / yr');
    });
  });

  describe('X / Twitter Job and Profile Scraping', () => {
    it('extracts X user profile correctly on 1-segment user handle URLs', () => {
      document.body.innerHTML = `
        <div data-testid="UserName">
          <span>Sarah Connor</span>
        </div>
        <div data-testid="UserDescription">
          Founder at Cyberdyne. Building next-gen autonomous systems.
        </div>
        <div data-testid="UserLocation">Los Angeles, CA</div>
      `;

      const result = extractXProfileFromDoc(document, 'https://x.com/sarahconnor');
      expect(result).not.toBeNull();
      expect(result?.fullName).toBe('Sarah Connor');
      expect(result?.organization).toBe('Cyberdyne');
      expect(result?.suggestedCategory).toBe('Hiring Manager');
    });

    it('rejects tweet /status/ URLs from being scraped as user profiles', () => {
      document.body.innerHTML = `
        <div data-testid="UserName"><span>Some User</span></div>
      `;
      const result = extractXProfileFromDoc(document, 'https://x.com/user/status/123456789');
      expect(result).toBeNull();
    });

    it('extracts hiring intent tweet as a job opening on X / Twitter', () => {
      document.body.innerHTML = `
        <article data-testid="tweet">
          <div data-testid="User-Name">
            <span>Guillermo Rauch</span>
            <span>@rauchg</span>
          </div>
          <div data-testid="tweetText">
            We are hiring a Senior Rust Engineer at Vercel!
            Remote friendly. Competitive pay: $180,000 - $220,000 / yr.
            Apply here: https://vercel.com/careers/rust-eng or DM me!
          </div>
          <a href="https://vercel.com/careers/rust-eng">Apply link</a>
        </article>
      `;

      const result = extractXPostJobFromDoc(document, 'https://x.com/rauchg/status/987654321');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Senior Rust Engineer');
      expect(result?.company).toBe('Vercel');
      expect(result?.workLocation).toBe('Remote');
      expect(result?.salary).toBe('$180,000 - $220,000 / yr');
      expect(result?.jobLink).toBe('https://vercel.com/careers/rust-eng');
      expect(result?.contact.name).toBe('Guillermo Rauch');
      expect(result?.contact.role).toBe('@rauchg');
    });
  });

  describe('Peerlist Profile Scraping', () => {
    it('extracts Peerlist developer profile cleanly', () => {
      document.body.innerHTML = `
        <h1 data-testid="user-profile-name">Alex Johnson</h1>
        <h2 data-testid="user-profile-tagline">Principal Engineer at Raycast</h2>
        <div data-testid="user-profile-company">Raycast</div>
        <div data-testid="user-location">London, UK</div>
      `;

      const result = extractPeerlistProfileFromDoc(document, 'https://peerlist.io/alexjohnson');
      expect(result).not.toBeNull();
      expect(result?.fullName).toBe('Alex Johnson');
      expect(result?.organization).toBe('Raycast');
      expect(result?.location).toBe('London, UK');
      expect(result?.suggestedCategory).toBe('Peer / Alumni');
    });
  });

  describe('Arc.dev & Job Board Registry', () => {
    it('correctly registers arc.dev as a known job board platform', () => {
      expect(isJobBoardOrAts('https://arc.dev/remote-jobs')).toBe(true);
      expect(isJobBoardOrAts('arc.dev')).toBe(true);
      expect(isJobBoardOrAts('https://arc.dev/@company')).toBe(true);
    });
  });

  describe('Live execution of extension/content.js and extension/popup.js', () => {
    it('executes real extension/content.js GET_PAGE_DATA on Belal Ashraf (Screenshot 2) and extracts Senior Software Engineer ||| at mazeed', () => {
      const contentScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/content.js'),
        'utf-8'
      );

      let messageListener: ((req: any, sender: any, sendResponse: (res: any) => void) => void) | null = null;
      (globalThis as any).chrome = {
        runtime: {
          onMessage: {
            addListener: (fn: any) => {
              messageListener = fn;
            },
          },
          sendMessage: () => Promise.resolve(),
        },
      };

      const originalUrl = window.location.href;
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://www.linkedin.com/in/belalnayzak/');
      } else {
        window.location.href = 'https://www.linkedin.com/in/belalnayzak/';
      }

      document.title = '(2) Belal Ashraf | LinkedIn';
      document.body.innerHTML = `
        <aside aria-label="People also viewed">
          <h2>People also viewed</h2>
        </aside>
        <div style="position: sticky; top: 0" class="_obf_sticky_bar">
          <img src="https://media.licdn.com/dms/image/v2/D4D03AQ/profile-displayphoto-shrink_200_200/0/belal.jpg" alt="Belal Ashraf" />
          <div class="_obf_lockup">
            <span>Belal Ashraf</span>
            <span>Senior Flutter Engineer @ Mazeed 🇵🇸 | Flutter (Mobile - Web - iOS - Android) | Native Android (Java - Kotlin) | CI/CD | Clean Architecture | AI-Powered Development</span>
          </div>
          <button>Message</button>
          <button>Follow</button>
        </div>
        <main>
          <section>
            <h2>Experience</h2>
            <ul>
              <li>
                <a class="optional-action-target-wrapper" href="https://www.linkedin.com/company/mazeed/">
                  <div><span aria-hidden="true">Senior Software Engineer |||</span></div>
                  <div><span aria-hidden="true">mazeed · Full-time</span></div>
                  <div><span aria-hidden="true">Apr 2025 - Present · 1 yr 7 mos</span></div>
                  <div><span aria-hidden="true">Dubai, United Arab Emirates · Hybrid</span></div>
                </a>
              </li>
              <li>
                <a class="optional-action-target-wrapper" href="https://www.linkedin.com/company/prev/">
                  <div><span aria-hidden="true">Senior Flutter Engineer</span></div>
                  <div><span aria-hidden="true">Part-time</span></div>
                  <div><span aria-hidden="true">Jan 2024 - Mar 2025 · 1 yr 3 mos</span></div>
                </a>
              </li>
            </ul>
          </section>
        </main>
      `;

      // Execute actual extension/content.js
      new Function(contentScriptCode)();
      expect(messageListener).not.toBeNull();

      let responseData: any = null;
      messageListener!({ action: 'GET_PAGE_DATA' }, {}, (res) => {
        responseData = res;
      });

      expect(responseData).not.toBeNull();
      expect(responseData.pageType).toBe('contact_profile');
      expect(responseData.profileData.fullName).toBe('Belal Ashraf');
      expect(responseData.profileData.headline).toBe('Senior Software Engineer |||');
      expect(responseData.profileData.role).toBe('Senior Software Engineer |||');
      expect(responseData.profileData.organization).toBe('mazeed');
      expect(responseData.profileData.location).toBe('Dubai, United Arab Emirates');
      expect(responseData.profileData.avatarUrl).toContain('profile-displayphoto');
      expect(responseData.profileData.suggestedCategory).toBe('Peer / Alumni');

      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL(originalUrl);
      }
    });

    it('executes real extension/popup.js, overrides marketing top-card headline with Experience role & company on scroll, and handles PAGE_CONTEXT_CHANGED', async () => {
      const popupHtml = fs.readFileSync(
        path.resolve(__dirname, '../../extension/popup.html'),
        'utf-8'
      );
      const popupScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/popup.js'),
        'utf-8'
      );

      const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyMarkup = (bodyMatch ? bodyMatch[1] : popupHtml).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      document.body.innerHTML = bodyMarkup;

      const runtimeMessageListeners: Array<(msg: any, sender?: any, sendResponse?: any) => void> = [];
      const activeTab = {
        id: 77,
        active: true,
        status: 'complete',
        url: 'https://www.linkedin.com/in/belalnayzak/',
        title: 'Belal Ashraf | LinkedIn',
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '1.1.1' }),
        } as any)) as any;

      let getPageDataCallCount = 0;
      (globalThis as any).chrome = {
        storage: {
          local: {
            get: (_keys: any, cb?: any) => {
              const res = { tracklet_web_origin: 'https://tracklet-eight.vercel.app' };
              if (cb) cb(res);
              return Promise.resolve(res);
            },
            set: (_items: any, cb?: any) => {
              if (cb) cb();
              return Promise.resolve();
            },
            remove: (_keys: any, cb?: any) => {
              if (cb) cb();
              return Promise.resolve();
            },
          },
          onChanged: {
            addListener: () => {},
          },
        },
        tabs: {
          query: (_q: any, cb?: any) => {
            if (cb) cb([activeTab]);
            return Promise.resolve([activeTab]);
          },
          get: (_id: number) => Promise.resolve(activeTab),
          sendMessage: (_tabId: number, msg: any, cb?: (res: any) => void) => {
            if (msg?.action === 'GET_PAGE_DATA' && cb) {
              getPageDataCallCount++;
              if (getPageDataCallCount === 1) {
                // Simulate initial top-card render before Experience section hydrates
                cb({
                  success: true,
                  pageType: 'contact_profile',
                  profileData: {
                    fullName: 'Belal Ashraf',
                    headline: 'Senior Flutter Engineer @ Mazeed 🇵🇸 | Flutter (Mobile - Web - iOS - Android)',
                    role: 'Senior Flutter Engineer',
                    organization: 'Mazeed',
                    experienceRole: '',
                    experienceOrganization: '',
                    hasExperienceData: false,
                    location: '',
                    avatarUrl: 'https://media.licdn.com/dms/image/belal.jpg',
                    linkedInUrl: 'https://www.linkedin.com/in/belalnayzak/',
                    suggestedCategory: 'Peer / Alumni',
                  },
                });
              } else {
                // Subsequent call after scrolling down to Experience section
                cb({
                  success: true,
                  pageType: 'contact_profile',
                  profileData: {
                    fullName: 'Belal Ashraf',
                    headline: 'Senior Software Engineer |||',
                    role: 'Senior Software Engineer |||',
                    organization: 'mazeed',
                    experienceRole: 'Senior Software Engineer |||',
                    experienceOrganization: 'mazeed',
                    hasExperienceData: true,
                    location: 'Dubai, United Arab Emirates',
                    avatarUrl: '',
                    linkedInUrl: 'https://www.linkedin.com/in/belalnayzak/',
                    suggestedCategory: 'Peer / Alumni',
                  },
                });
              }
            }
            return Promise.resolve();
          },
          onActivated: { addListener: () => {} },
          onUpdated: { addListener: () => {} },
        },
        scripting: {
          executeScript: () => Promise.resolve(),
        },
        runtime: {
          lastError: null,
          getManifest: () => ({ version: '1.1.1', name: 'Tracklet' }),
          sendMessage: () => Promise.resolve(),
          onMessage: {
            addListener: (fn: any) => {
              runtimeMessageListeners.push(fn);
            },
          },
        },
      };

      // Execute actual extension/popup.js and trigger DOMContentLoaded
      new Function(popupScriptCode)();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      // Wait for scheduleTabContextSwitch (60ms) + async storage reads
      await new Promise((r) => setTimeout(r, 120));

      const nameInput = document.getElementById('contact-name') as HTMLInputElement;
      const roleInput = document.getElementById('contact-role') as HTMLInputElement;
      const companyInput = document.getElementById('contact-organization') as HTMLInputElement;
      const locationInput = document.getElementById('contact-location') as HTMLInputElement;
      const linkedInInput = document.getElementById('contact-linkedin') as HTMLInputElement;
      const avatarImg = document.getElementById('contact-avatar-img') as HTMLImageElement;
      const categoryValueText = document.getElementById('contact-category-value-text') as HTMLElement;

      expect(nameInput.value).toBe('Belal Ashraf');
      expect(roleInput.value).toBe('Senior Flutter Engineer');
      expect(avatarImg.src).toBe('https://media.licdn.com/dms/image/belal.jpg');
      expect(categoryValueText.textContent).toBe('Peer / Alumni');

      // Now simulate user scrolling down to Experience section -> content.js sends PAGE_CONTEXT_CHANGED
      for (const listener of runtimeMessageListeners) {
        listener({
          action: 'PAGE_CONTEXT_CHANGED',
          payload: {
            url: 'https://www.linkedin.com/in/belalnayzak/',
            threadSignature: 'profile:::Belal Ashraf:::Senior Software Engineer |||:::mazeed:::Dubai, United Arab Emirates:::',
            data: {
              success: true,
              pageType: 'contact_profile',
              profileData: {
                fullName: 'Belal Ashraf',
                headline: 'Senior Software Engineer |||',
                role: 'Senior Software Engineer |||',
                organization: 'mazeed',
                experienceRole: 'Senior Software Engineer |||',
                experienceOrganization: 'mazeed',
                hasExperienceData: true,
                location: 'Dubai, United Arab Emirates',
                avatarUrl: '',
                linkedInUrl: 'https://www.linkedin.com/in/belalnayzak/',
                suggestedCategory: 'Peer / Alumni',
              },
            },
          },
        });
      }

      await new Promise((r) => setTimeout(r, 100));

      // Verify progressive merge: Experience role & organization overwrite top-card marketing headline, while avatar is preserved!
      expect(nameInput.value).toBe('Belal Ashraf');
      expect(roleInput.value).toBe('Senior Software Engineer |||');
      expect(companyInput.value).toBe('mazeed');
      expect(locationInput.value).toBe('Dubai, United Arab Emirates');
      expect(linkedInInput.value).toBe('https://www.linkedin.com/in/belalnayzak/');
      expect(avatarImg.src).toBe('https://media.licdn.com/dms/image/belal.jpg');
      expect(categoryValueText.textContent).toBe('Peer / Alumni');

      globalThis.fetch = originalFetch;
    });

    it('handles mixed aria-hidden/plain DOM, inline spans, stylesheet sticky bar, View my services/degree noise, pure-div Experience cards, and dynamic content.js re-injection without SyntaxError', () => {
      const contentScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/content.js'),
        'utf-8'
      );

      let messageListener: ((req: any, sender: any, sendResponse: (res: any) => void) => void) | null = null;
      (globalThis as any).chrome = {
        runtime: {
          onMessage: {
            addListener: (fn: any) => {
              messageListener = fn;
            },
          },
          sendMessage: () => Promise.resolve(),
        },
      };

      const originalUrl = window.location.href;
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://www.linkedin.com/in/alexander-bangert-b54705259');
      } else {
        window.location.href = 'https://www.linkedin.com/in/alexander-bangert-b54705259';
      }

      document.title = '(3) Alexander Bangert | LinkedIn';
      document.body.innerHTML = `
        <!-- Sticky bar styled via external CSS class (no inline style="sticky" or class*="sticky") -->
        <div class="scaffold-layout-toolbar _obf_bar">
          <div class="_obf_inner">
            <img src="https://media.licdn.com/dms/image/v2/D4D03AQ/alex-avatar.jpg" alt="" />
            <div class="_obf_text_col">
              <button class="_obf_name_btn"><span>Alexander</span> <span>Bangert</span></button>
              <span aria-hidden="true">· 2nd</span>
              <div>Senior Flutter Developer | Mobile Architect | Flutter Team Lead</div>
            </div>
            <div class="_obf_actions">
              <button>More</button>
              <a href="/services">View my services</a>
              <button>Message</button>
              <button>Connect</button>
            </div>
          </div>
        </div>
        <main>
          <!-- Pure-div SDUI Experience card where #experience is inside an empty anchor wrapper div and entries match Screenshot 1's exact 3 concurrent Present roles -->
          <div class="_obf_card">
            <div class="_obf_anchor_wrap"><div id="experience"></div></div>
            <h2>Experience</h2>
            <div class="_obf_exp_list">
              <div class="_obf_exp_row">
                <div>Flutter / Go Instructor</div>
                <div><span>Attractor School Almaty</span><span> · </span><span>Part-time</span></div>
                <div><span>Dec 2024</span> - <span>Present</span> · 1 yr 11 mos</div>
                <div><span aria-hidden="true">Алматы, Казахстан · Hybrid</span></div>
              </div>
              <div class="_obf_exp_row">
                <div>Senior Flutter Developer</div>
                <div><span>NLS Kazakhstan</span><span> · </span><span>Full-time</span></div>
                <div><span>Jun 2025</span> - <span>Present</span> · 1 yr 5 mos</div>
                <div><span aria-hidden="true">Алматы, Казахстан · On-site</span></div>
              </div>
              <div class="_obf_exp_row">
                <div>Founder &amp; Flutter Engineer</div>
                <div><span>BangertStudio</span><span> · </span><span>Self-employed</span></div>
                <div>Nov 2024 - Present · 2 yrs</div>
                <div>Almaty, Kazakhstan · Hybrid</div>
              </div>
            </div>
          </div>
        </main>
      `;

      // Execute content.js TWICE in the same context to verify dynamic re-injection via chrome.scripting.executeScript never throws SyntaxError
      expect(() => {
        (0, eval)(contentScriptCode);
        (0, eval)(contentScriptCode);
      }).not.toThrow();

      let responseData: any = null;
      messageListener!({ action: 'GET_PAGE_DATA' }, {}, (res) => {
        responseData = res;
      });

      expect(responseData).not.toBeNull();
      expect(responseData.pageType).toBe('contact_profile');
      expect(responseData.profileData.fullName).toBe('Alexander Bangert');
      expect(responseData.profileData.headline).toBe('Senior Flutter Developer');
      expect(responseData.profileData.role).toBe('Senior Flutter Developer');
      expect(responseData.profileData.organization).toBe('NLS Kazakhstan');
      expect(responseData.profileData.location).toBe('Almaty, Kazakhstan');
      expect(responseData.profileData.avatarUrl).toBe('https://media.licdn.com/dms/image/v2/D4D03AQ/alex-avatar.jpg');
      expect(responseData.profileData.suggestedCategory).toBe('Peer / Alumni');

      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL(originalUrl);
      }
    });

    it('isolates per-li Experience items with media captions ("Onyx IX ERP") and supports SDUI div/span Experience headings, span[role="heading"], strong tags, and stacked Part-time spans', () => {
      const contentScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/content.js'),
        'utf-8'
      );

      let messageListener: ((req: any, sender: any, sendResponse: (res: any) => void) => void) | null = null;
      (globalThis as any).chrome = {
        runtime: {
          onMessage: {
            addListener: (fn: any) => {
              messageListener = fn;
            },
          },
          sendMessage: () => Promise.resolve(),
        },
      };

      new Function(contentScriptCode)();
      const originalUrl = window.location.href;
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://www.linkedin.com/in/belalnayzak/');
      }

      // Case A: Experience card with pure <span>Experience</span> heading (no <section>, no <h2>/[role="heading"]),
      // <span role="heading"> and <span><strong>...</strong></span> on roles, media caption "Onyx IX ERP" at the end of item 1,
      // and stacked <span>Role</span><span>Part-time</span> on item 2
      document.title = '(2) Belal Ashraf | LinkedIn';
      document.body.innerHTML = `
        <div style="position: fixed; top: 0" class="_obf_sticky">
          <img src="https://media.licdn.com/dms/image/v2/D4D03AQ/belal.jpg" alt="Belal Ashraf" />
          <div>
            <p>Belal Ashraf</p>
            <p>Senior Flutter Engineer @ Mazeed 🇵🇸 | Flutter (Mobile - Web - iOS - Android)</p>
          </div>
        </div>
        <main>
          <div class="_obf_sdui_exp_card">
            <div class="_obf_header"><span>Experience</span></div>
            <ul>
              <li class="_obf_li_1">
                <div><span role="heading"><strong>Senior Software Engineer |||</strong></span></div>
                <div><span>mazeed</span><span>·</span><span>Full-time</span></div>
                <div><span>Apr 2025 - Present · 1 yr 7 mos</span></div>
                <div><span>Dubai, United Arab Emirates · Hybrid</span></div>
                <div class="_obf_media_thumb"><span>Onyx IX ERP</span></div>
              </li>
              <li class="_obf_li_2">
                <div><span>Senior Software Engineer</span><span>Part-time</span><span>Aug 2024 - Apr 2025 · 9 mos</span></div>
                <div><span>Jeddah, Makkah, Saudi Arabia · On-site</span></div>
              </li>
            </ul>
          </div>
          <div class="_obf_sdui_edu_card">
            <div><span>Education</span></div>
            <div><span>Cairo University</span></div>
            <div><span>2016 - 2020</span></div>
          </div>
        </main>
      `;

      let res: any = null;
      messageListener!({ action: 'GET_PAGE_DATA' }, {}, (r) => {
        res = r;
      });

      expect(res).not.toBeNull();
      expect(res.pageType).toBe('contact_profile');
      expect(res.profileData.fullName).toBe('Belal Ashraf');
      expect(res.profileData.headline).toBe('Senior Software Engineer |||');
      expect(res.profileData.role).toBe('Senior Software Engineer |||');
      expect(res.profileData.organization).toBe('mazeed');
      expect(res.profileData.location).toBe('Dubai, United Arab Emirates');

      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL(originalUrl);
      }
    });

    it('seeds rawExtractedProfileData from tracklet_active_tab_data and replaces cached marketing headline with live Experience role & company', async () => {
      const popupHtml = fs.readFileSync(
        path.resolve(__dirname, '../../extension/popup.html'),
        'utf-8'
      );
      const popupScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/popup.js'),
        'utf-8'
      );

      const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyMarkup = (bodyMatch ? bodyMatch[1] : popupHtml).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      document.body.innerHTML = bodyMarkup;

      const activeTab = {
        id: 88,
        active: true,
        status: 'complete',
        url: 'https://www.linkedin.com/in/belalnayzak/',
        title: 'Belal Ashraf | LinkedIn',
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '1.1.1' }),
        } as any)) as any;

      (globalThis as any).chrome = {
        storage: {
          local: {
            get: (_keys: any, cb?: any) => {
              const res = {
                tracklet_web_origin: 'https://tracklet-eight.vercel.app',
                // Cached by content.js when user initially loaded the top of the profile (marketing headline)
                tracklet_active_tab_data: {
                  url: 'https://www.linkedin.com/in/belalnayzak/',
                  timestamp: Date.now() - 5000,
                  data: {
                    success: true,
                    pageType: 'contact_profile',
                    profileData: {
                      fullName: 'Belal Ashraf',
                      headline: 'Senior Flutter Engineer @ Mazeed 🇵🇸 | Flutter (Mobile - Web - iOS - Android)',
                      role: 'Senior Flutter Engineer @ Mazeed 🇵🇸 | Flutter (Mobile - Web - iOS - Android)',
                      organization: '',
                      experienceRole: '',
                      experienceOrganization: '',
                      hasExperienceData: false,
                      location: '',
                      avatarUrl: 'https://media.licdn.com/dms/image/belal-topcard.jpg',
                      linkedInUrl: 'https://www.linkedin.com/in/belalnayzak/',
                      suggestedCategory: 'Peer / Alumni',
                    },
                  },
                },
              };
              if (cb) cb(res);
              return Promise.resolve(res);
            },
            set: (_items: any, cb?: any) => {
              if (cb) cb();
              return Promise.resolve();
            },
            remove: (_keys: any, cb?: any) => {
              if (cb) cb();
              return Promise.resolve();
            },
          },
          onChanged: { addListener: () => {} },
        },
        tabs: {
          query: (_q: any, cb?: any) => {
            if (cb) cb([activeTab]);
            return Promise.resolve([activeTab]);
          },
          get: (_id: number) => Promise.resolve(activeTab),
          sendMessage: (_tabId: number, msg: any, cb?: (res: any) => void) => {
            if (msg?.action === 'GET_PAGE_DATA' && cb) {
              // Simulate live response when user is scrolled down to Experience (top card unmounted, Experience parsed)
              cb({
                success: true,
                pageType: 'contact_profile',
                profileData: {
                  fullName: 'Belal Ashraf',
                  headline: 'Senior Software Engineer |||',
                  role: 'Senior Software Engineer |||',
                  organization: 'mazeed',
                  experienceRole: 'Senior Software Engineer |||',
                  experienceOrganization: 'mazeed',
                  hasExperienceData: true,
                  location: 'Dubai, United Arab Emirates',
                  avatarUrl: '',
                  linkedInUrl: 'https://www.linkedin.com/in/belalnayzak/',
                  suggestedCategory: 'Peer / Alumni',
                },
              });
            }
            return Promise.resolve();
          },
          onActivated: { addListener: () => {} },
          onUpdated: { addListener: () => {} },
        },
        scripting: { executeScript: () => Promise.resolve() },
        runtime: {
          lastError: null,
          getManifest: () => ({ version: '1.1.1', name: 'Tracklet' }),
          sendMessage: () => Promise.resolve(),
          onMessage: { addListener: () => {} },
        },
      };

      new Function(popupScriptCode)();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 220));

      expect((document.getElementById('contact-name') as HTMLInputElement).value).toBe('Belal Ashraf');
      expect((document.getElementById('contact-role') as HTMLInputElement).value).toBe('Senior Software Engineer |||');
      expect((document.getElementById('contact-organization') as HTMLInputElement).value).toBe('mazeed');
      expect((document.getElementById('contact-location') as HTMLInputElement).value).toBe('Dubai, United Arab Emirates');
      expect((document.getElementById('contact-avatar-img') as HTMLImageElement).src).toBe('https://media.licdn.com/dms/image/belal-topcard.jpg');

      globalThis.fetch = originalFetch;
    });

    it('supports AI_SCRAPE_BOOST in content.js (both job and contact modes) and ✨ AI Boost button clicks in popup.js without ReferenceError', async () => {
      const contentScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/content.js'),
        'utf-8'
      );

      let messageListener: ((req: any, sender: any, sendResponse: (res: any) => void) => void) | null = null;
      (globalThis as any).chrome = {
        runtime: {
          onMessage: {
            addListener: (fn: any) => {
              messageListener = fn;
            },
          },
          sendMessage: () => Promise.resolve(),
        },
      };

      const originalUrl = window.location.href;
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://careers.customstartup.io/openings/991');
      }

      document.title = 'Join CustomStartup';
      document.body.innerHTML = `
        <div class="unconventional-wrapper">
          <p>Position: Principal AI Systems Architect</p>
          <p>Organization: CustomStartup Labs</p>
          <p>Location: Zurich, Switzerland (Hybrid)</p>
          <p>Compensation: CHF 180,000 - CHF 220,000 / yr</p>
        </div>
      `;

      new Function(contentScriptCode)();
      expect(messageListener).not.toBeNull();

      const boostResponse: any = await new Promise((resolve) => {
        messageListener!({ action: 'AI_SCRAPE_BOOST', mode: 'job' }, {}, (res) => {
          resolve(res);
        });
      });

      expect(boostResponse).not.toBeNull();
      expect(boostResponse.success).toBe(true);
      expect(boostResponse.aiBoosted).toBe(true);
      expect(boostResponse.jobData.role).toBe('Principal AI Systems Architect');
      expect(boostResponse.jobData.company).toBe('CustomStartup Labs');
      expect(boostResponse.jobData.workLocation).toBe('Hybrid');

      // Also verify AI_SCRAPE_BOOST in contact mode merges contactBoost into response.profileData
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://www.linkedin.com/in/custom-founder/');
      }
      document.title = 'Nadia El-Masri | LinkedIn';
      document.body.innerHTML = `
        <main>
          <div class="custom-bio-block">
            <p>Role: Staff Distributed Systems Engineer</p>
            <p>Company: Cloudflare</p>
            <p>Location: Lisbon, Portugal</p>
          </div>
        </main>
      `;

      const contactBoostResponse: any = await new Promise((resolve) => {
        messageListener!({ action: 'AI_SCRAPE_BOOST', mode: 'contact' }, {}, (res) => {
          resolve(res);
        });
      });

      expect(contactBoostResponse.success).toBe(true);
      expect(contactBoostResponse.profileData.fullName).toBe('Nadia El-Masri');
      expect(contactBoostResponse.profileData.organization).toBe('Cloudflare');
      expect(contactBoostResponse.profileData.location).toBe('Lisbon, Portugal');

      // Now test clicking #btn-ai-boost-job in popup.js when workLocation ('Hybrid') and employmentType ('Full-time') are returned
      const popupHtml = fs.readFileSync(
        path.resolve(__dirname, '../../extension/popup.html'),
        'utf-8'
      );
      const popupScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/popup.js'),
        'utf-8'
      );
      const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyMarkup = (bodyMatch ? bodyMatch[1] : popupHtml).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      document.body.innerHTML = bodyMarkup;

      const activeJobTab = {
        id: 91,
        active: true,
        status: 'complete',
        url: 'https://careers.customstartup.io/openings/991',
        title: 'Join CustomStartup',
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '1.1.1' }),
        } as any)) as any;

      (globalThis as any).chrome = {
        storage: {
          local: {
            get: (_keys: any, cb?: any) => {
              const res = { tracklet_web_origin: 'https://tracklet-eight.vercel.app' };
              if (cb) cb(res);
              return Promise.resolve(res);
            },
            set: (_items: any, cb?: any) => {
              if (cb) cb();
              return Promise.resolve();
            },
            remove: (_keys: any, cb?: any) => {
              if (cb) cb();
              return Promise.resolve();
            },
          },
          onChanged: { addListener: () => {} },
        },
        tabs: {
          query: (_q: any, cb?: any) => {
            if (cb) cb([activeJobTab]);
            return Promise.resolve([activeJobTab]);
          },
          get: (_id: number) => Promise.resolve(activeJobTab),
          sendMessage: (_tabId: number, msg: any, cb?: (res: any) => void) => {
            if (msg?.action === 'GET_PAGE_DATA' && cb) {
              cb({
                success: true,
                pageType: 'generic_page',
                jobData: { company: '', role: '', location: '', workLocation: 'Remote', employmentType: 'Full-time' },
                atsResult: { formElementFound: false },
              });
            } else if (msg?.action === 'AI_SCRAPE_BOOST' && cb) {
              cb(boostResponse);
            }
            return Promise.resolve();
          },
          onActivated: { addListener: () => {} },
          onUpdated: { addListener: () => {} },
        },
        scripting: { executeScript: () => Promise.resolve() },
        runtime: {
          lastError: null,
          getManifest: () => ({ version: '1.1.1', name: 'Tracklet' }),
          sendMessage: () => Promise.resolve(),
          onMessage: { addListener: () => {} },
        },
      };

      new Function(popupScriptCode)();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 180));

      const aiBoostJobBtn = document.getElementById('btn-ai-boost-job') as HTMLButtonElement;
      expect(aiBoostJobBtn).not.toBeNull();
      aiBoostJobBtn.click();
      await new Promise((r) => setTimeout(r, 80));

      expect((document.getElementById('company') as HTMLInputElement).value).toBe('CustomStartup Labs');
      expect((document.getElementById('role') as HTMLInputElement).value).toBe('Principal AI Systems Architect');
      expect((document.getElementById('workplace-value-text') as HTMLElement).textContent).toBe('Hybrid');
      expect(aiBoostJobBtn.disabled).toBe(false);
      expect(aiBoostJobBtn.textContent).toContain('Boosted');

      globalThis.fetch = originalFetch;
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL(originalUrl);
      }
    });

    it('correctly extracts X profile organization with word boundaries, Wellfound profile, "<Company> is hiring" post, and Arc.dev open job drawer over background H1', () => {
      const contentScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/content.js'),
        'utf-8'
      );

      let messageListener: ((req: any, sender: any, sendResponse: (res: any) => void) => void) | null = null;
      (globalThis as any).chrome = {
        runtime: {
          onMessage: {
            addListener: (fn: any) => {
              messageListener = fn;
            },
          },
          sendMessage: () => Promise.resolve(),
        },
      };

      new Function(contentScriptCode)();
      const originalUrl = window.location.href;

      // 1. X profile where bio contains "Platform" (must NOT match "at" inside "Platform")
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://x.com/leeerob');
      }
      document.body.innerHTML = `
        <div data-testid="UserName"><span>Lee Robinson</span></div>
        <div data-testid="UserDescription">Platform Engineer at Vercel</div>
        <div data-testid="UserLocation">Des Moines, IA</div>
      `;
      let res1: any = null;
      messageListener!({ action: 'GET_PAGE_DATA' }, {}, (r) => { res1 = r; });
      expect(res1.pageType).toBe('contact_profile');
      expect(res1.profileData.fullName).toBe('Lee Robinson');
      expect(res1.profileData.organization).toBe('Vercel');

      // 2. Wellfound profile (wellfound.com/u/...)
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://wellfound.com/u/sarah-dev');
      }
      document.body.innerHTML = `
        <main>
          <h1>Sarah Jenkins</h1>
          <h2>Founding Product Designer at Linear</h2>
          <div data-testid="profile-location">San Francisco, CA</div>
        </main>
      `;
      let res2: any = null;
      messageListener!({ action: 'GET_PAGE_DATA' }, {}, (r) => { res2 = r; });
      expect(res2.pageType).toBe('contact_profile');
      expect(res2.profileData.fullName).toBe('Sarah Jenkins');
      expect(res2.profileData.organization).toBe('Linear');
      expect(res2.profileData.location).toBe('San Francisco, CA');

      // 3. LinkedIn post with "<Company> is hiring a ..."
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://www.linkedin.com/feed/');
      }
      document.body.innerHTML = `
        <div class="artdeco-modal" role="dialog">
          <div class="feed-shared-update-v2" data-urn="urn:li:activity:7999999999">
            <a href="https://www.linkedin.com/in/recruiter-jane">
              <span dir="ltr">Jane Doe</span>
            </a>
            <div class="update-components-text">
              Stripe is hiring a Senior Backend Engineer! Remote in US ($190,000 - $230,000 / yr). Send your CV!
            </div>
          </div>
        </div>
      `;
      let res3: any = null;
      messageListener!({ action: 'GET_PAGE_DATA' }, {}, (r) => { res3 = r; });
      expect(res3.pageType).toBe('job_posting');
      expect(res3.jobData.role).toBe('Senior Backend Engineer');
      expect(res3.jobData.company).toBe('Stripe');
      expect(res3.jobData.workLocation).toBe('Remote');

      // 4. Arc.dev open job drawer over background "Remote Developer Jobs" H1
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://arc.dev/remote-jobs');
      }
      document.body.innerHTML = `
        <main>
          <h1>Remote Developer Jobs</h1>
        </main>
        <div role="dialog" aria-modal="true">
          <h2 data-testid="job-title">Staff Mobile Engineer</h2>
          <div data-testid="company-name">Raycast</div>
          <div data-testid="location">Anywhere (Remote)</div>
          <p>$170,000 - $210,000 / yr · Full-time</p>
          <a href="https://jobs.ashbyhq.com/raycast/staff-mobile-apply">Apply Now</a>
        </div>
      `;
      let res4: any = null;
      messageListener!({ action: 'GET_PAGE_DATA' }, {}, (r) => { res4 = r; });
      expect(res4.pageType).toBe('job_posting');
      expect(res4.jobData.role).toBe('Staff Mobile Engineer');
      expect(res4.jobData.company).toBe('Raycast');
      expect(res4.jobData.workLocation).toBe('Remote');

      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL(originalUrl);
      }
    });

    it('accurately extracts all fields across Workable (fuseenergy), cosy.green/karriere, Arc.dev non-ARIA portal modal (UNIPREP), and late SPA description hydration', async () => {
      const registryCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/jobBoardRegistry.js'),
        'utf-8'
      );
      const contentScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/content.js'),
        'utf-8'
      );

      // Load JobBoardRegistry into global scope
      new Function(registryCode)();

      let messageListener: ((req: any, sender: any, sendResponse: (res: any) => void) => void) | null = null;
      const sentRuntimeMessages: any[] = [];
      (globalThis as any).chrome = {
        storage: {
          local: {
            get: (_k: any, cb?: any) => { if (cb) cb({}); return Promise.resolve({}); },
            set: () => Promise.resolve(),
          },
        },
        runtime: {
          onMessage: {
            addListener: (fn: any) => {
              messageListener = fn;
            },
          },
          sendMessage: (msg: any) => {
            sentRuntimeMessages.push(msg);
            return Promise.resolve();
          },
        },
      };

      new Function(contentScriptCode)();
      const originalUrl = window.location.href;

      // Benchmark 1: Workable (https://apply.workable.com/fuseenergy/j/17BE5C934E/)
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://apply.workable.com/fuseenergy/j/17BE5C934E/');
      }
      document.title = 'Senior Flutter Engineer (Middle East) - Fuse Energy';
      document.head.innerHTML = '';
      document.body.innerHTML = `
        <main>
          <div class="job-header">
            <a href="https://www.fuseenergy.com" target="_blank"><img alt="Fuse Energy" /></a>
            <h1 data-ui="job-title">Senior Flutter Engineer (Middle East)</h1>
            <div data-ui="job-location">
              <div>London, England, United Kingdom</div>
              <div>Dubai, Dubai, United Arab Emirates</div>
              <div>United States</div>
            </div>
            <p>Remote · Full time</p>
          </div>
          <section data-ui="job-description">
            <h2>Description</h2>
            <p>Fuse Energy is building the future of renewable energy grids and mobile consumer experiences across the UK and Middle East. We've raised over $200M from top-tier investors while working at home or across our global hubs.</p>
          </section>
          <section data-ui="job-requirements">
            <h2>Requirements</h2>
            <ul>
              <li>5+ years production mobile development with Flutter and Dart</li>
              <li>Experience with BLoC architecture and high-reliability state management</li>
            </ul>
          </section>
          <section data-ui="job-benefits">
            <h2>Benefits</h2>
            <ul>
              <li>Competitive equity and remote-first flexibility</li>
            </ul>
          </section>
        </main>
      `;

      let workableRes: any = null;
      messageListener!({ action: 'GET_PAGE_DATA' }, {}, (r) => { workableRes = r; });
      expect(workableRes.pageType).toBe('job_posting');
      expect(workableRes.jobData.role).toBe('Senior Flutter Engineer (Middle East)');
      expect(workableRes.jobData.company).toBe('Fuse Energy');
      expect(workableRes.jobData.companyDomain).toBe('fuseenergy.com');
      expect(workableRes.jobData.platform).toBe('Other');
      expect(workableRes.jobData.location).toBe('London, England, United Kingdom; Dubai, United Arab Emirates; United States');
      expect(workableRes.jobData.workLocation).toBe('Remote');
      expect(workableRes.jobData.employmentType).toBe('Full-time');
      expect(workableRes.jobData.salary).toBeUndefined();
      expect(workableRes.jobData.notes).toContain('Fuse Energy is building the future of renewable energy');
      expect(workableRes.jobData.notes).toContain('5+ years production mobile development with Flutter and Dart');
      expect(workableRes.jobData.notes).toContain('Competitive equity');

      // Benchmark 2: Cosy.green (https://cosy.green/karriere/senior-flutter-developer)
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://cosy.green/karriere/senior-flutter-developer');
      }
      document.title = 'Senior Flutter Developer – Karriere bei cosy.green';
      document.head.innerHTML = `
        <meta property="og:title" content="Senior Flutter Developer – Karriere bei cosy.green" />
        <meta property="og:site_name" content="Karriere bei cosy.green" />
      `;
      document.body.innerHTML = `
        <main>
          <div class="hero">
            <h2>JOB OPENING</h2>
            <div class="title-wrap">
              <h1>Senior Flutter Developer</h1>
            </div>
            <p>Remote, EU-wide · Full-time</p>
          </div>
          <section class="content-block">
            <h2>Deine Aufgaben</h2>
            <p>Du entwickelst unsere Smart-Home Klimasteuerungs-App in Flutter weiter und gestaltest eine intuitive User Experience.</p>
            <ul>
              <li>Architektur und Implementierung neuer Features in Flutter &amp; Dart</li>
              <li>Enge Zusammenarbeit mit unserem Hardware- und Cloud-Team</li>
            </ul>
            <h2>Dein Profil</h2>
            <ul>
              <li>Mehrjährige Erfahrung mit Flutter (iOS &amp; Android)</li>
              <li>Sehr gute Kenntnisse in Clean Architecture und modernen State-Management-Ansätzen</li>
            </ul>
          </section>
          <div class="fundernation-banner">Invest now from €100 in cosy.green via FunderNation!</div>
        </main>
      `;

      let cosyRes: any = null;
      messageListener!({ action: 'GET_PAGE_DATA' }, {}, (r) => { cosyRes = r; });
      expect(cosyRes.pageType).toBe('job_posting');
      expect(cosyRes.jobData.role).toBe('Senior Flutter Developer');
      expect(cosyRes.jobData.company).toBe('cosy.green');
      expect(cosyRes.jobData.companyDomain).toBe('cosy.green');
      expect(cosyRes.jobData.platform).toBe('Company Site');
      expect(cosyRes.jobData.location).toBe('Remote, EU-wide');
      expect(cosyRes.jobData.workLocation).toBe('Remote');
      expect(cosyRes.jobData.employmentType).toBe('Full-time');
      expect(cosyRes.jobData.salary).toBeUndefined();
      expect(cosyRes.jobData.notes).toContain('Deine Aufgaben');
      expect(cosyRes.jobData.notes).toContain('Architektur und Implementierung neuer Features in Flutter');
      expect(cosyRes.jobData.notes).not.toContain('JOB OPENING');

      // Benchmark 3: Arc.dev non-ARIA React portal modal inside #__next (https://arc.dev/dashboard/d/verified-jobs/pnbwza8npq)
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://arc.dev/dashboard/d/verified-jobs/pnbwza8npq');
      }
      document.title = 'Arc - Remote Developer Jobs';
      document.head.innerHTML = `<meta property="og:site_name" content="Arc" />`;
      document.body.innerHTML = `
        <div id="__next">
          <main>
            <h1>Verified Jobs</h1>
          </main>
          <div class="fixed inset-0 z-50 job-overlay">
            <div class="left-sidebar">
              <div class="text-xl font-bold">Remote - Software Developer</div>
              <div class="meta-grid">
                <div>
                  <span>Location</span>
                  <span>Remote anywhere</span>
                </div>
                <div>
                  <span>Salary</span>
                  <span>US$50K - 100K / yr</span>
                </div>
                <div>
                  <span>Job type</span>
                  <span>Full-time</span>
                </div>
              </div>
              <button>Fast apply ⚡</button>
            </div>
            <div class="job-prose">
              <h2>Join Our Team at UNIPREP</h2>
              <h3>About Us</h3>
              <p>Working at home should be empowering. At UNIPREP, we are an innovative ed-tech platform helping students worldwide master university admissions and standardized testing.</p>
              <h3>Role Overview</h3>
              <ul>
                <li>Build and maintain cross-platform Flutter and React applications for iOS, Android, and Web</li>
                <li>Optimize rendering performance and offline synchronization</li>
              </ul>
            </div>
          </div>
        </div>
      `;

      let arcRes: any = null;
      messageListener!({ action: 'GET_PAGE_DATA' }, {}, (r) => { arcRes = r; });
      expect(arcRes.pageType).toBe('job_posting');
      expect(arcRes.jobData.role).toBe('Remote - Software Developer');
      expect(arcRes.jobData.company).toBe('UNIPREP');
      expect(arcRes.jobData.platform).toBe('Other');
      expect(arcRes.jobData.location).toBe('Remote anywhere');
      expect(arcRes.jobData.workLocation).toBe('Remote');
      expect(arcRes.jobData.employmentType).toBe('Full-time');
      expect(arcRes.jobData.salary).toBe('US$50K - 100K / yr');
      expect(arcRes.jobData.notes).toContain('Join Our Team at UNIPREP');
      expect(arcRes.jobData.notes).toContain('Build and maintain cross-platform Flutter and React applications');
      expect(arcRes.jobData.notes).not.toContain('Fast apply');

      // Benchmark 3B: AI_SCRAPE_BOOST on non-ARIA React portal modal scopes snapshot to modal via findActiveJobModalContainer
      const arcBoostRes: any = await new Promise((resolve) => {
        messageListener!({ action: 'AI_SCRAPE_BOOST', mode: 'job' }, {}, (r) => resolve(r));
      });
      expect(arcBoostRes.success).toBe(true);
      expect(arcBoostRes.snapshot.hasActiveModal).toBe(true);
      expect(arcBoostRes.snapshot.modalLines.length).toBeGreaterThan(0);
      expect(arcBoostRes.jobData.role).toBe('Remote - Software Developer');
      expect(arcBoostRes.jobData.company).toBe('UNIPREP');

      // Benchmark 4: GET_CLEAN_PAGE_TEXT action preserves visible [aria-hidden="true"] spans and prioritizes modal text
      let cleanTextRes: any = null;
      messageListener!({ action: 'GET_CLEAN_PAGE_TEXT' }, {}, (r) => { cleanTextRes = r; });
      expect(cleanTextRes.success).toBe(true);
      expect(cleanTextRes.text).toContain('Join Our Team at UNIPREP');
      expect(cleanTextRes.text.length).toBeLessThanOrEqual(12000);

      // Benchmark 5: Serverless /api/scrape-job handler (graceful no-key fallback & Gemini schema extraction)
      const { default: scrapeJobHandler } = await import('../../api/scrape-job');
      const prevKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      let statusCode = 0;
      let jsonBody: any = null;
      const mockRes = {
        setHeader: () => {},
        status: (code: number) => {
          statusCode = code;
          return {
            json: (payload: any) => {
              jsonBody = payload;
              return payload;
            },
            end: () => {},
          };
        },
      };

      await scrapeJobHandler(
        { method: 'POST', body: { url: 'https://cosy.green/karriere/senior-flutter-developer', title: 'Senior Flutter Developer', text: 'Sample job text' } },
        mockRes
      );
      expect(statusCode).toBe(200);
      expect(jsonBody.fallbackAvailable).toBe(false);

      // Test with mocked GEMINI_API_KEY and mocked fetch
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      const origFetch = globalThis.fetch;
      globalThis.fetch = (async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      role: 'Remote - Software Developer',
                      company: 'UNIPREP',
                      companyDomain: 'uniprep.com',
                      location: 'Remote anywhere',
                      workLocation: 'Remote',
                      employmentType: 'Full-time',
                      salary: 'US$50K - 100K',
                      notes: '### Role Overview\n\n- Build cross-platform apps\n- Collaborate with product team',
                    }),
                  },
                ],
              },
            },
          ],
        }),
      })) as any;

      await scrapeJobHandler(
        { method: 'POST', body: { url: 'https://arc.dev/dashboard/d/verified-jobs/pnbwza8npq', title: 'Arc', text: 'Join Our Team at UNIPREP...' } },
        mockRes
      );
      expect(statusCode).toBe(200);
      expect(jsonBody.fallbackAvailable).toBe(true);
      expect(jsonBody.jobData.company).toBe('UNIPREP');
      expect(jsonBody.jobData.role).toBe('Remote - Software Developer');
      expect(jsonBody.jobData.workLocation).toBe('Remote');
      expect(jsonBody.jobData.employmentType).toBe('Full-time');

      globalThis.fetch = origFetch;
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
      else delete process.env.GEMINI_API_KEY;
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL(originalUrl);
      }
    });

    it('invokes /api/scrape-job from popup.js when job extraction is incomplete, upgrades low-confidence board company name, and protects userEditedJobFields', async () => {
      const popupHtml = fs.readFileSync(
        path.resolve(__dirname, '../../extension/popup.html'),
        'utf-8'
      );
      const popupScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/popup.js'),
        'utf-8'
      );

      const bodyMatch = popupHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyMarkup = (bodyMatch ? bodyMatch[1] : popupHtml).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      document.body.innerHTML = bodyMarkup;

      const activeTab = {
        id: 99,
        active: true,
        status: 'complete',
        url: 'https://arc.dev/dashboard/d/verified-jobs/pnbwza8npq',
        title: 'Arc - Verified Jobs',
      };

      let scrapeApiCalled = false;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (input: any) => {
        const urlStr = String(input);
        if (urlStr.includes('/api/scrape-job')) {
          scrapeApiCalled = true;
          // Simulate user typing into role input while AI request is in flight
          const roleEl = document.getElementById('role') as HTMLInputElement;
          if (roleEl) {
            roleEl.value = 'User Custom Role';
            roleEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return {
            ok: true,
            json: async () => ({
              fallbackAvailable: true,
              jobData: {
                company: 'UNIPREP',
                role: 'AI Overwrite Role',
                companyDomain: 'uniprep.com',
                location: 'Remote anywhere',
                workLocation: 'Remote',
                employmentType: 'Full-time',
                notes: '### Join Our Team at UNIPREP\n\nUNIPREP is an innovative ed-tech platform helping students worldwide master university admissions and standardized testing.',
              },
            }),
          } as any;
        }
        return {
          ok: true,
          json: async () => ({ version: '1.2.2' }),
        } as any;
      }) as any;

      (globalThis as any).chrome = {
        storage: {
          local: {
            get: (_keys: any, cb?: any) => {
              const res = { tracklet_web_origin: 'https://tracklet-eight.vercel.app' };
              if (cb) cb(res);
              return Promise.resolve(res);
            },
            set: (_items: any, cb?: any) => {
              if (cb) cb();
              return Promise.resolve();
            },
            remove: (_keys: any, cb?: any) => {
              if (cb) cb();
              return Promise.resolve();
            },
          },
          onChanged: { addListener: () => {} },
        },
        tabs: {
          query: (_q: any, cb?: any) => {
            if (cb) cb([activeTab]);
            return Promise.resolve([activeTab]);
          },
          get: (_id: number) => Promise.resolve(activeTab),
          sendMessage: (_tabId: number, msg: any, cb?: (res: any) => void) => {
            if (msg?.action === 'GET_PAGE_DATA' && cb) {
              cb({
                success: true,
                pageType: 'job_posting',
                jobData: {
                  role: 'Remote - Software Developer',
                  company: '', // Empty company triggers BOTH triggerAiScrapeBoost('job', false) and triggerAiJobFallback
                  platform: 'Other',
                  jobLink: activeTab.url,
                  notes: 'Short incomplete note',
                },
              });
            } else if (msg?.action === 'GET_CLEAN_PAGE_TEXT' && cb) {
              cb({
                success: true,
                url: activeTab.url,
                title: activeTab.title,
                text: 'Join Our Team at UNIPREP. Remote - Software Developer. Location: Remote anywhere. Salary: US$50K - 100K / yr. Full-time.',
              });
            } else if (msg?.action === 'AI_SCRAPE_BOOST' && cb) {
              // Simulate local AI_SCRAPE_BOOST resolving AFTER /api/scrape-job with low-confidence board name and conflicting workLocation
              setTimeout(() => {
                cb({
                  success: true,
                  aiBoosted: true,
                  aiResult: {
                    aiProvider: 'semantic_heuristics',
                    jobBoost: {
                      company: 'Arc.dev',
                      role: 'Remote Developer Jobs',
                      workLocation: 'Onsite',
                      employmentType: 'Contract',
                    },
                  },
                  unified: {
                    jobData: {
                      company: 'Arc',
                      role: 'Remote Developer Jobs',
                      workLocation: 'Onsite',
                      employmentType: 'Contract',
                    },
                  },
                });
              }, 60);
            }
            return Promise.resolve();
          },
          onActivated: { addListener: () => {} },
          onUpdated: { addListener: () => {} },
        },
        scripting: { executeScript: () => Promise.resolve() },
        runtime: {
          lastError: null,
          getManifest: () => ({ version: '1.2.2', name: 'Tracklet' }),
          sendMessage: () => Promise.resolve(),
          onMessage: { addListener: () => {} },
        },
      };

      new Function(popupScriptCode)();
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise((r) => setTimeout(r, 180));

      expect(scrapeApiCalled).toBe(true);
      // High-confidence "UNIPREP" from /api/scrape-job was preserved and NOT downgraded by late AI_SCRAPE_BOOST ("Arc.dev")
      expect((document.getElementById('company') as HTMLInputElement).value).toBe('UNIPREP');
      // User-edited role was preserved and NOT overwritten by AI or late AI_SCRAPE_BOOST ("Remote Developer Jobs")
      expect((document.getElementById('role') as HTMLInputElement).value).toBe('User Custom Role');
      // Missing domain, location, workLocation, and notes were populated by /api/scrape-job and NOT downgraded by late AI_SCRAPE_BOOST
      expect((document.getElementById('companyDomain') as HTMLInputElement).value).toBe('uniprep.com');
      expect((document.getElementById('location') as HTMLInputElement).value).toBe('Remote anywhere');
      expect((document.getElementById('workplace-value-text') as HTMLElement).textContent).toBe('Remote');
      expect((document.getElementById('notes') as HTMLTextAreaElement).value).toContain('Join Our Team at UNIPREP');

      // Also verify in content.js that an un-opened job board index page ("Remote Developer Jobs" + Arc.dev footer) stays generic_page
      const contentScriptCode = fs.readFileSync(
        path.resolve(__dirname, '../../extension/content.js'),
        'utf-8'
      );
      let csListener: ((req: any, sender: any, sendResponse: (res: any) => void) => void) | null = null;
      (globalThis as any).chrome.runtime.onMessage.addListener = (fn: any) => {
        csListener = fn;
      };
      const originalUrl = window.location.href;
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL('https://arc.dev/remote-jobs');
      }
      document.title = 'Arc - Remote Developer Jobs';
      document.head.innerHTML = `<meta property="og:site_name" content="Arc.dev" />`;
      document.body.innerHTML = `
        <main>
          <h1>Remote Developer Jobs</h1>
          <p>Browse verified remote openings around the world.</p>
        </main>
        <footer>© 2026 Arc.dev Inc. All rights reserved.</footer>
      `;
      new Function(contentScriptCode)();
      let indexRes: any = null;
      csListener!({ action: 'GET_PAGE_DATA' }, {}, (r) => { indexRes = r; });
      expect(indexRes.pageType).toBe('generic_page');
      expect(indexRes.jobData.role).toBe('');
      expect(indexRes.jobData.company).toBe('');

      globalThis.fetch = originalFetch;
      if ((window as any).happyDOM?.setURL) {
        (window as any).happyDOM.setURL(originalUrl);
      }
    });
  });
});

