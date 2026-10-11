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

    // 2. LinkedIn
    if (host.includes('linkedin.com')) {
      if (path.startsWith('/in/') || path.includes('/in/') || path.startsWith('/pub/') || path.includes('/pub/')) {
        return 'contact';
      }
      if (path.startsWith('/jobs/') || path.includes('/jobs/')) {
        return 'job';
      }
      if (path.includes('/feed/update/') || path.startsWith('/posts/') || path.includes('/posts/')) {
        return 'job';
      }
    }

    // 3. X / Twitter Profiles & Hiring Posts
    if (host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com')) {
      if (path.includes('/status/')) {
        return 'job';
      }
      const nonProfilePaths = ['home', 'explore', 'notifications', 'messages', 'settings', 'i', 'search', 'compose', 'lists', 'bookmarks', 'communities', 'tos', 'privacy', 'jobs'];
      const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);
      if (segments.length === 1 && !nonProfilePaths.includes(segments[0])) {
        return 'contact';
      }
    }

    // Peerlist Profiles & Jobs
    if (host.includes('peerlist.io')) {
      const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);
      if (segments.length === 1 && !['jobs', 'company', 'scroll', 'projects', 'explore', 'about', 'join'].includes(segments[0].toLowerCase())) {
        return 'contact';
      }
      if (path.includes('/jobs')) {
        return 'job';
      }
    }

    // Wellfound / AngelList Profiles
    if (host.includes('wellfound.com') || host.includes('angel.co')) {
      if (path.startsWith('/u/')) {
        return 'contact';
      }
      return 'job';
    }

    // 4. GitHub Profiles
    if (host === 'github.com' || host.endsWith('.github.com')) {
      const nonProfilePaths = ['features', 'pricing', 'pulls', 'issues', 'explore', 'trending', 'marketplace', 'topics', 'settings', 'orgs', 'login', 'join', 'about', 'site', 'contact', 'security', 'notifications'];
      const segments = path.replace(/^\/+/, '').split('/').filter(Boolean);
      if (segments.length === 1 && !nonProfilePaths.includes(segments[0])) {
        return 'contact';
      }
    }

    // 5. Known Job Boards and ATS Platforms
    const jobHosts = [
      'lever.co',
      'greenhouse.io',
      'workday.com',
      'workdayjobs.com',
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
      'rippling-ats.com',
      'workable.com',
      'bamboohr.com',
      'personio.de',
      'personio.com',
      'teamtailor.com',
      'breezy.hr',
      'icims.com',
      'jazzhr.com',
      'pinpointhq.com',
      'applytojob.com',
      'glassdoor.com',
      'builtin.com',
      'monster.com',
      'dice.com',
      'ziprecruiter.com',
      'simplyhired.com',
      'careerbuilder.com',
      'arc.dev',
      'himalayas.app',
      'remotive.com',
      'jobright.ai',
      'trueup.io',
      'workatastartup.com',
      'techstars.com',
      'remoteok.com',
      'weworkremotely.com',
    ];

    if (jobHosts.some(jh => host === jh || host.endsWith('.' + jh))) {
      return 'job';
    }

    // 6. Career page indicators in path or query
    if (
      path.includes('/career') ||
      path.includes('/karriere') ||
      path.includes('/stellenangebote') ||
      path.includes('/offene-stellen') ||
      path.includes('/join-us') ||
      path.includes('/work-with-us') ||
      path.includes('/jobs') ||
      path.includes('/openings') ||
      path.includes('/job/') ||
      path.includes('/j/') ||
      path.includes('/roles') ||
      path.includes('/positions') ||
      path.includes('/opportunities') ||
      path.includes('/vacancies') ||
      path.includes('/verified-jobs/') ||
      path.includes('/apply')
    ) {
      return 'job';
    }

    return 'generic';
  } catch {
    return 'generic';
  }
}

/**
 * Checks if a domain or page-category transition should break the user's manual tab selection anchor.
 */
export function shouldClearManualOverride(previousUrl: string, currentUrl: string): boolean {
  if (!previousUrl || !currentUrl) return true;
  try {
    const prevHost = new URL(previousUrl).hostname.replace(/^www\./, '').toLowerCase();
    const currHost = new URL(currentUrl).hostname.replace(/^www\./, '').toLowerCase();
    if (prevHost !== currHost) return true;
    const prevCategory = classifyTabUrl(previousUrl);
    const currCategory = classifyTabUrl(currentUrl);
    if (currCategory !== 'generic' && prevCategory && currCategory !== prevCategory) {
      return true;
    }
    return false;
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
      expect(classifyTabUrl('https://www.linkedin.com/pub/alexander-bangert/12/34/56')).toBe('contact');
    });

    it('classifies LinkedIn job postings into job tab', () => {
      expect(classifyTabUrl('https://www.linkedin.com/jobs/view/39281928/')).toBe('job');
      expect(classifyTabUrl('https://www.linkedin.com/jobs/collections/recommended/')).toBe('job');
    });

    it('classifies ATS and job board URLs into job tab', () => {
      expect(classifyTabUrl('https://jobs.lever.co/stripe/abc-123')).toBe('job');
      expect(classifyTabUrl('https://boards.greenhouse.io/figma/jobs/456')).toBe('job');
      expect(classifyTabUrl('https://stripe.myworkdayjobs.com/en-US/careers/job/123')).toBe('job');
      expect(classifyTabUrl('https://apply.workable.com/fuseenergy/j/17BE5C934E/')).toBe('job');
      expect(classifyTabUrl('https://cosy.green/karriere/senior-flutter-developer')).toBe('job');
      expect(classifyTabUrl('https://acme.de/offene-stellen/backend-engineer')).toBe('job');
      expect(classifyTabUrl('https://startup.io/join-us/product-engineer')).toBe('job');
      expect(classifyTabUrl('https://studio.co/work-with-us')).toBe('job');
      expect(classifyTabUrl('https://customboard.io/d/verified-jobs/pnbwza8npq')).toBe('job');
      expect(classifyTabUrl('https://arc.dev/dashboard/d/verified-jobs/pnbwza8npq')).toBe('job');
      expect(classifyTabUrl('https://indeed.com/viewjob?jk=12345')).toBe('job');
      expect(classifyTabUrl('https://arc.dev/remote-jobs/senior-frontend-engineer')).toBe('job');
      expect(classifyTabUrl('https://arc.dev/@company')).toBe('job');
      expect(classifyTabUrl('https://example.com/careers/frontend-engineer')).toBe('job');
      expect(classifyTabUrl('https://example.com/roles/product-designer')).toBe('job');
      expect(classifyTabUrl('https://www.linkedin.com/feed/update/urn:li:activity:7248192837192')).toBe('job');
      expect(classifyTabUrl('https://www.linkedin.com/posts/johndoe_hiring-remote-engineer-activity-7248192837192')).toBe('job');
      expect(classifyTabUrl('https://x.com/rauchg/status/987654321')).toBe('job');
    });

    it('classifies X/Twitter, GitHub, Peerlist, and Wellfound profiles correctly into contact tab', () => {
      expect(classifyTabUrl('https://x.com/sarahconnor')).toBe('contact');
      expect(classifyTabUrl('https://twitter.com/sama')).toBe('contact');
      expect(classifyTabUrl('https://github.com/torvalds')).toBe('contact');
      expect(classifyTabUrl('https://peerlist.io/johndoe')).toBe('contact');
      expect(classifyTabUrl('https://peerlist.io/jobs/senior-frontend-engineer')).toBe('job');
      expect(classifyTabUrl('https://wellfound.com/u/sarah-dev')).toBe('contact');
      expect(classifyTabUrl('https://angel.co/u/alex-dev')).toBe('contact');
      expect(classifyTabUrl('https://wellfound.com/jobs')).toBe('job');
      expect(classifyTabUrl('https://x.com/home')).toBe('generic');
      expect(classifyTabUrl('https://x.com/explore')).toBe('generic');
    });

    it('classifies general web pages as generic', () => {
      expect(classifyTabUrl('https://github.com/microsoft/vscode')).toBe('generic');
      expect(classifyTabUrl('https://news.ycombinator.com/')).toBe('generic');
      expect(classifyTabUrl('https://en.wikipedia.org/wiki/React_(software)')).toBe('generic');
      expect(classifyTabUrl('')).toBe('generic');
    });
  });

  describe('shouldClearManualOverride', () => {
    it('preserves manual tab anchor on same domain navigations within the same category', () => {
      const prev = 'https://jobs.lever.co/stripe/engineer-1';
      const curr = 'https://jobs.lever.co/stripe/engineer-2';
      expect(shouldClearManualOverride(prev, curr)).toBe(false);
    });

    it('clears manual tab anchor when navigating to a different web domain', () => {
      const prev = 'https://jobs.lever.co/stripe/engineer-1';
      const curr = 'https://mail.google.com/mail/u/0/#inbox';
      expect(shouldClearManualOverride(prev, curr)).toBe(true);
    });

    it('clears manual tab anchor when navigating between different page categories on the same multi-mode domain', () => {
      expect(
        shouldClearManualOverride(
          'https://www.linkedin.com/jobs/view/39281928/',
          'https://www.linkedin.com/in/alexander-bangert-b54705259/'
        )
      ).toBe(true);
      expect(
        shouldClearManualOverride(
          'https://x.com/rauchg/status/987654321',
          'https://x.com/rauchg'
        )
      ).toBe(true);
    });
  });
});
