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

function inferContactCategory(headline: string): string {
  if (!headline) return 'Other';
  const clean = headline.trim().toLowerCase();
  if (/(?:talent|recruiter|recruiting|sourcer|staffing|people\s+ops|technical\s+sourcer)/i.test(clean)) {
    return 'Recruiter';
  }
  if (/(?:vp|vice\s+president|director|head\s+of|engineering\s+manager|cto|ceo|coo|cpo|chief|founder|co-founder|tech\s+lead\s+manager)/i.test(clean)) {
    return 'Hiring Manager';
  }
  if (/(?:mentor|advisor|coach|career\s+guide)/i.test(clean)) {
    return 'Mentor';
  }
  if (/(?:peer|alumni|fellow|graduate|class\s+of|engineer|developer|designer)/i.test(clean)) {
    return 'Peer / Alumni';
  }
  return 'Other';
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
    'main h1'
  );
  let fullName = nameEl ? cleanText(nameEl.textContent || '') : '';
  if (!fullName) {
    const ogTitle = doc.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitle && ogTitle.content) {
      const parts = ogTitle.content.split(/\s*[-–|•]\s*/);
      if (parts[0]) fullName = cleanText(parts[0]);
    }
  }
  if (!fullName && doc.title) {
    const parts = doc.title.split(/\s*[-–|•]\s*/);
    if (parts[0]) fullName = cleanText(parts[0]);
  }
  if (fullName) {
    fullName = fullName
      .replace(/^\s*\(\d+\+?\)\s*/, '') // Strip notification counts like (1), (99+)
      .replace(/\s*\b(1st|2nd|3rd)\b.*$/i, '')
      .replace(/\s*\((?:he|him|she|her|they|them|ze|hir)[^)]*\)/i, '')
      .replace(/\s*,\s*(?:Ph\.?D\.?|MBA|M\.?S\.?|B\.?S\.?|MD|PMP|CPA|Esq\.?|PE)\b.*$/i, '')
      .trim();
  }

  const headlineEl = doc.querySelector(
    '.text-body-medium.break-words, ' +
    '.pv-text-details__left-panel .text-body-medium, ' +
    'div.pv-top-card-section__headline, ' +
    'div.top-card-layout__headline, ' +
    '[data-anonymize="headline"], ' +
    '.pv-top-card--list-bullet + div, ' +
    '[data-generated-suggestion-target]'
  );
  let headline = headlineEl ? cleanText(headlineEl.textContent || '') : '';

  let organization = '';
  const currentCompanyBtn = doc.querySelector(
    'button[aria-label^="Current company:"], ' +
    'div[aria-label="Current company"], ' +
    '.pv-text-details__right-panel button, ' +
    '.pv-top-card--experience-list-item'
  );
  if (currentCompanyBtn) {
    const aria = currentCompanyBtn.getAttribute('aria-label') || '';
    const match = aria.match(/Current company:\s*([^.]+)/i);
    organization = match ? cleanText(match[1]) : cleanText(currentCompanyBtn.textContent || '');
  }
  if (!organization && headline) {
    const atMatch = headline.match(/(?:at|@|\||-)\s+([^,|•·\n]+)/i);
    if (atMatch) organization = cleanText(atMatch[1]);
  }

  const locEl = doc.querySelector(
    'span.text-body-small.inline.t-black--light.break-words, ' +
    '.top-card-layout__first-subline, ' +
    'div.pv-top-card--list-bullet > span, ' +
    '.pv-top-card-section__location'
  );
  let location = locEl ? cleanText(locEl.textContent || '') : '';

  const avatarImg = doc.querySelector(
    'img.pv-top-card-profile-picture__image, ' +
    'img.evi-image, ' +
    'img.profile-photo-edit__preview, ' +
    'img[alt*="profile photo" i], ' +
    'img.presence-entity__image'
  ) as HTMLImageElement | null;
  const avatarUrl = avatarImg ? (avatarImg.src || '') : '';

  return {
    fullName,
    headline,
    organization,
    location,
    avatarUrl,
    linkedInUrl: url,
    suggestedCategory: inferContactCategory(headline),
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

function extractXPostJobFromDoc(doc: Document, url: string) {
  const parsed = new URL(url);
  const isStatusUrl = parsed.pathname.includes('/status/');

  const modalTweet = doc.querySelector('[role="dialog"] article[data-testid="tweet"], [aria-modal="true"] article[data-testid="tweet"]');
  const tweetEl = modalTweet || doc.querySelector('article[data-testid="tweet"]');
  if (!tweetEl && !isStatusUrl) return null;

  const tweetTextEl = (tweetEl || doc).querySelector('[data-testid="tweetText"]');
  const tweetText = cleanText(tweetTextEl ? tweetTextEl.textContent || '' : '');
  if (!tweetText) return null;

  const HIRING_INTENT_REGEX = /(?:we(?:'re|\s+are)\s+hiring|i(?:'m|\s+am)\s+hiring|my\s+team\s+is\s+hiring|join\s+(?:our|my|the)\s+team|looking\s+for\s+(?:a|an)?|seeking\s+(?:a|an)?|now\s+hiring|open\s+role[s]?|job\s+opening[s]?|apply\s+(?:here|at)|dm\s+(?:me\s+)?if\s+interested|we\s+have\s+an?\s+opening|hiring\s+alert)/i;
  if (!HIRING_INTENT_REGEX.test(tweetText) && !isStatusUrl) return null;

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

  let company = '';
  const atCompMatch = tweetText.match(/(?:at\s+|@|join\s+(?:us\s+at\s+)?|hiring\s+at\s+|opening\s+at\s+)([A-Z][A-Za-z0-9&.\-_]+)/i);
  if (atCompMatch && atCompMatch[1]) company = cleanText(atCompMatch[1]);
  if (!company && applyLink && applyLink !== url) {
    company = getDomainName(applyLink);
  }
  if (!company) company = authorName ? `${authorName}'s Team` : 'Company';

  let role = '';
  const explicitMatch = tweetText.match(/(?:Role|Position|Job(?:\s+Title)?|Opening)\s*:\s*([A-Za-z0-9 /#+.-]+?)(?:\.|\n|,|$)/i);
  if (explicitMatch && explicitMatch[1]) role = cleanText(explicitMatch[1]);
  if (!role) {
    const lookingMatch = tweetText.match(/(?:looking\s+for\s+(?:a|an)?|seeking\s+(?:a|an)?|hiring\s+(?:a|an)?)\s+([A-Za-z0-9 /#+.-]+?(?:Engineer|Developer|Designer|Architect|Manager|Lead|Specialist|Scientist|Consultant|Analyst|Intern|Director|Head|VP))/i);
    if (lookingMatch && lookingMatch[1]) role = cleanText(lookingMatch[1]);
  }
  if (!role) {
    const titleRegex = /\b((?:Senior|Junior|Lead|Principal|Staff|Head of|VP of|Director of|Chief)?\s*(?:Software|Frontend|Backend|Full[- ]?Stack|Mobile|iOS|Android|DevOps|Site Reliability|SRE|Cloud|Data|Machine Learning|ML|AI|Product|UX|UI|UI\/UX|System|Security|QA|Quality Assurance|Engineering)?\s*(?:Engineer|Developer|Designer|Architect|Manager|Lead|Specialist|Scientist|Consultant|Analyst|Researcher|Officer|Director|Intern|Associate))\b/i;
    const match = tweetText.match(titleRegex);
    if (match && match[1]) role = cleanText(match[1]);
  }

  let workLocation = null;
  const lower = tweetText.toLowerCase();
  if (lower.includes('remote') || lower.includes('wfh') || lower.includes('work from home')) workLocation = 'Remote';
  else if (lower.includes('hybrid')) workLocation = 'Hybrid';
  else if (lower.includes('on-site') || lower.includes('onsite')) workLocation = 'Onsite';

  let salary = '';
  const salMatch = tweetText.match(/(?:[$€£]\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?(?:\s*-\s*[$€£]?\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?)?(?:\s*(?:\/\s*yr|\/\s*year|\/\s*mo|\/\s*hr|per\s+year|per\s+month|per\s+hour))?)/i);
  if (salMatch) salary = cleanText(salMatch[0]);

  return {
    title: role || 'Open Role',
    company,
    workLocation,
    salary,
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
  let fullName = cleanText(nameEl ? nameEl.textContent || '' : '') || username;

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
    'aside.drawer, .drawer.open',
    '[class*="offcanvas"].show',
    '.slideover.open, .slideover.show',
    '.jobs-search__job-details',
    'details[open]',
    '[aria-expanded="true"]'
  ];

  for (const selector of OVERLAY_SELECTORS) {
    const container = doc.querySelector(selector);
    if (!container) continue;

    const titleEl = container.querySelector('h1, h2, h3, [class*="job-title"], [data-testid*="job-title"]');
    const title = cleanText(titleEl ? titleEl.textContent || '' : '');
    if (!title || /^(?:sign in|filter|search|settings)/i.test(title)) continue;

    const companyEl = container.querySelector('[class*="company-name"], [class*="employer"], [data-testid*="company"], a[href*="/company/"]');
    let company = cleanText(companyEl ? companyEl.textContent || '' : '');
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
    const location = cleanText(locEl ? locEl.textContent || '' : '');

    const text = cleanText(container.textContent || '').toLowerCase();
    let workLocation = null;
    if (text.includes('remote') || text.includes('work from home')) workLocation = 'Remote';
    else if (text.includes('hybrid')) workLocation = 'Hybrid';
    else if (location) workLocation = 'Onsite';

    const salaryMatch = text.match(/(?:[$€£]\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?(?:\s*-\s*[$€£]?\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?)?(?:\s*(?:\/\s*yr|\/\s*year|\/\s*mo|\/\s*hr|per\s+year|per\s+month|per\s+hour))?)/i);
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

  return null;
}

function extractLinkedInPostJobFromDoc(doc: Document, url: string) {
  const textEl = doc.querySelector(
    '.update-components-text, .feed-shared-update-v2__description, .feed-shared-text-view, span.attributed-text-segment-list__content, [data-test-id*="commentary"]'
  );
  const postText = cleanText(textEl ? textEl.textContent || '' : '');
  if (!postText) return null;

  const HIRING_INTENT_REGEX = /(?:we(?:'re|\s+are)\s+hiring|i(?:'m|\s+am)\s+hiring|my\s+team\s+is\s+hiring|join\s+(?:our|my|the)\s+team|looking\s+for\s+(?:a|an)?|seeking\s+(?:a|an)?|now\s+hiring|open\s+role[s]?|job\s+opening[s]?|apply\s+here|dm\s+me\s+if\s+interested|excited\s+to\s+announce\s+we(?:'re|\s+are)\s+hiring)/i;
  if (!HIRING_INTENT_REGEX.test(postText)) return null;

  const nameEl = doc.querySelector('.update-components-actor__name, .feed-shared-actor__name, a[href*="/in/"] span[dir="ltr"]');
  const headlineEl = doc.querySelector('.update-components-actor__description, .feed-shared-actor__description');
  const profileAnchor = doc.querySelector('a.update-components-actor__image[href*="/in/"], a[href*="/in/"]') as HTMLAnchorElement | null;
  const avatarImg = doc.querySelector('img.update-components-actor__avatar-image') as HTMLImageElement | null;

  let authorName = '';
  if (nameEl) {
    const visibleSpan = nameEl.querySelector('span[aria-hidden="true"]');
    authorName = cleanText((visibleSpan || nameEl).textContent || '');
  }
  authorName = authorName
    .replace(/^(?:Message|Connect|Follow)\s*/i, '')
    .replace(/\s*(?:•\s*)?(?:1st|2nd|3rd)\b.*$/i, '')
    .replace(/\s*View\s+.*?profile.*$/i, '')
    .trim();

  const authorHeadline = cleanText(headlineEl ? headlineEl.textContent || '' : '');
  const authorLinkedIn = profileAnchor ? profileAnchor.href.split('?')[0] : '';
  const authorAvatar = avatarImg ? avatarImg.src : '';

  let company = '';
  if (authorHeadline) {
    const atMatch = authorHeadline.match(/(?:at|@)\s+([^,|•·\n]+)/i);
    if (atMatch) company = cleanText(atMatch[1]);
  }

  let role = '';
  const lookingMatch = postText.match(/(?:looking\s+for\s+(?:a|an)?|seeking\s+(?:a|an)?|hiring\s+(?:a|an)?)\s+([A-Za-z0-9 /#+.-]+?(?:Engineer|Developer|Designer|Architect|Manager|Lead|Specialist|Scientist|Consultant|Analyst|Intern|Director|Head|VP))/i);
  if (lookingMatch) role = cleanText(lookingMatch[1]);

  let workLocation = null;
  const lower = postText.toLowerCase();
  if (lower.includes('remote') || lower.includes('wfh')) workLocation = 'Remote';
  else if (lower.includes('hybrid')) workLocation = 'Hybrid';

  let salary = '';
  const salMatch = postText.match(/(?:[$€£]\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?(?:\s*-\s*[$€£]?\s*[0-9]{2,3}(?:,[0-9]{3})*(?:\s*(?:k|usd|eur|gbp))?)?(?:\s*(?:\/\s*yr|\/\s*year|\/\s*mo|\/\s*hr|per\s+year|per\s+month|per\s+hour))?)/i);
  if (salMatch) salary = cleanText(salMatch[0]);

  const applyAnchor = doc.querySelector('a.update-components-article__link, a[href*="http"]:not([href*="linkedin.com"])') as HTMLAnchorElement | null;
  const jobLink = applyAnchor ? applyAnchor.href : url;

  return {
    title: role || 'Open Role',
    company: company || (authorName ? `${authorName}'s Team` : 'LinkedIn Network'),
    workLocation,
    salary,
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
});
