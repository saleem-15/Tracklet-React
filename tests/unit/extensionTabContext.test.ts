import { describe, it, expect } from 'vitest';

/**
 * Tab classification and contextual routing heuristics for Tracklet companion extension.
 * Replicates the logic used in extension/popup.js.
 */
export function classifyTabUrl(url: string): 'job' | 'contact' | 'email' | 'generic' {
  if (!url) return 'generic';

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    // 1. Webmail
    if (host.includes('mail.google.com') || host.includes('outlook.live.com') || host.includes('outlook.office.com') || host.includes('outlook.office365.com')) {
      return 'email';
    }

    // 2. LinkedIn Profile (must be /in/*, not /jobs/* or /feed)
    if (host.includes('linkedin.com')) {
      if (path.startsWith('/in/') || path.includes('/in/')) {
        return 'contact';
      }
      if (path.startsWith('/jobs/') || path.includes('/jobs/')) {
        return 'job';
      }
    }

    // 3. Known Job Boards and ATS Platforms
    const jobHosts = [
      'lever.co',
      'greenhouse.io',
      'workday.com',
      'myworkdayjobs.com',
      'indeed.com',
      'bayt.com',
      'otta.com',
      'wellfound.com',
      'ashbyhq.com',
      'smartrecruiters.com',
      'jobvite.com',
      'recruitee.com',
      'rippling.com',
      'glassdoor.com',
      'builtin.com',
      'monster.com',
      'dice.com'
    ];

    if (jobHosts.some(jh => host === jh || host.endsWith('.' + jh))) {
      return 'job';
    }

    // Career page indicators in path or query
    if (path.includes('/careers') || path.includes('/jobs') || path.includes('/openings') || path.includes('/job/')) {
      return 'job';
    }

    return 'generic';
  } catch {
    return 'generic';
  }
}

/**
 * Checks if a domain transition should break the user's manual tab selection anchor.
 */
export function shouldClearManualOverride(previousUrl: string, currentUrl: string): boolean {
  if (!previousUrl || !currentUrl) return true;
  try {
    const prevHost = new URL(previousUrl).hostname.replace(/^www\./, '').toLowerCase();
    const currHost = new URL(currentUrl).hostname.replace(/^www\./, '').toLowerCase();
    return prevHost !== currHost;
  } catch {
    return true;
  }
}

describe('extensionTabContext', () => {
  describe('classifyTabUrl', () => {
    it('classifies webmail URLs correctly into email tab', () => {
      expect(classifyTabUrl('https://mail.google.com/mail/u/0/#inbox/FMfcgz')).toBe('email');
      expect(classifyTabUrl('https://outlook.live.com/mail/0/inbox/id/AQMkAD')).toBe('email');
      expect(classifyTabUrl('https://outlook.office.com/mail/inbox')).toBe('email');
    });

    it('classifies LinkedIn profiles correctly into contact tab', () => {
      expect(classifyTabUrl('https://www.linkedin.com/in/sarah-connor/')).toBe('contact');
      expect(classifyTabUrl('https://linkedin.com/in/johndoe?miniProfileUrn=urn')).toBe('contact');
    });

    it('classifies LinkedIn job postings into job tab', () => {
      expect(classifyTabUrl('https://www.linkedin.com/jobs/view/39281928/')).toBe('job');
      expect(classifyTabUrl('https://www.linkedin.com/jobs/collections/recommended/')).toBe('job');
    });

    it('classifies ATS and job board URLs into job tab', () => {
      expect(classifyTabUrl('https://jobs.lever.co/stripe/abc-123')).toBe('job');
      expect(classifyTabUrl('https://boards.greenhouse.io/figma/jobs/456')).toBe('job');
      expect(classifyTabUrl('https://stripe.myworkdayjobs.com/en-US/careers/job/123')).toBe('job');
      expect(classifyTabUrl('https://indeed.com/viewjob?jk=12345')).toBe('job');
      expect(classifyTabUrl('https://example.com/careers/frontend-engineer')).toBe('job');
    });

    it('classifies general web pages as generic', () => {
      expect(classifyTabUrl('https://github.com/microsoft/vscode')).toBe('generic');
      expect(classifyTabUrl('https://news.ycombinator.com/')).toBe('generic');
      expect(classifyTabUrl('https://en.wikipedia.org/wiki/React_(software)')).toBe('generic');
      expect(classifyTabUrl('')).toBe('generic');
    });
  });

  describe('shouldClearManualOverride', () => {
    it('preserves manual tab anchor on same domain navigations', () => {
      const prev = 'https://jobs.lever.co/stripe/engineer-1';
      const curr = 'https://jobs.lever.co/stripe/engineer-2';
      expect(shouldClearManualOverride(prev, curr)).toBe(false);
    });

    it('clears manual tab anchor when navigating to a different web domain', () => {
      const prev = 'https://jobs.lever.co/stripe/engineer-1';
      const curr = 'https://mail.google.com/mail/u/0/#inbox';
      expect(shouldClearManualOverride(prev, curr)).toBe(true);
    });
  });
});
