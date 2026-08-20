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

// 1. Listen for runtime messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_PAGE_DATA') {
    const data = extractPageData();
    sendResponse(data);
  } else if (request.action === 'TRACKLET_EXT_INCOMING_APP') {
    // Deliver newly saved application directly to Tracklet web app running in this tab
    window.postMessage({
      type: 'TRACKLET_EXT_ADD_APPLICATION',
      payload: request.payload,
      persistedToCloud: request.persistedToCloud
    }, '*');
    sendResponse({ received: true });
  }
  return true;
});

// 2. Listen for auth session and config sync from Tracklet web app window
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
  }
});
