import { describe, it, expect } from 'vitest';
import { Contact, ContactCategory, Application } from '../../src/types';

export interface ScrapedRecruiter {
  name: string;
  role: string;
  linkedIn?: string;
  avatarUrl?: string;
  category: ContactCategory;
  email?: string;
}

/**
 * Extracts recruiter or hiring team member from the DOM of a job post.
 */
export function extractRecruiterFromDom(container: Document | HTMLElement, host: string = ''): ScrapedRecruiter | null {
  const isLinkedIn = host.includes('linkedin.') || container.querySelector?.('.jobs-unified-top-card, .job-details-jobs-unified-top-card__job-poster, .hirer-card__hirer-information');

  if (isLinkedIn) {
    // 1. Modern LinkedIn Unified Top Card Poster or Hiring Team Card
    const posterCard = container.querySelector(
      '.job-details-jobs-unified-top-card__job-poster, .hirer-card__hirer-information, [data-view-name="job-details-hiring-team"], .hiring-team__member, .jobs-poster__name, .jobs-box__html--with-bottom-action'
    );

    if (posterCard) {
      const nameEl = posterCard.querySelector('.jobs-poster__name, strong, a[href*="/in/"], .hiring-team__member-name, [class*="member-name"]');
      const titleEl = posterCard.querySelector('.jobs-poster__job-title, .hirer-card__job-title, .hiring-team__member-title, span.t-14, [class*="job-title"]');
      const profileAnchor = posterCard.querySelector('a[href*="/in/"]');
      const avatarImg = posterCard.querySelector('img[src*="profile"], img.presence-entity__image, img[alt*="profile"]');

      let name = (nameEl?.textContent || '').trim().replace(/\s+/g, ' ');
      // Strip action noise like "Message", "1st", "2nd", etc.
      name = name.replace(/^(?:Message|Connect|Follow)\s*/i, '').replace(/\s*(?:•\s*)?(?:1st|2nd|3rd)\s*$/i, '').trim();

      if (name && name.length >= 2 && !name.toLowerCase().includes('message')) {
        const role = (titleEl?.textContent || '').trim().replace(/\s+/g, ' ') || 'Recruiter';
        let linkedIn = (profileAnchor as HTMLAnchorElement)?.href || '';
        if (linkedIn) {
          linkedIn = linkedIn.split('?')[0].replace(/\/+$/, '');
        }
        const avatarUrl = (avatarImg as HTMLImageElement)?.src || '';

        const isHiringManager = /(?:manager|director|lead|head|vp|vice\s+president|founder|cto|partner)/i.test(role);
        return {
          name,
          role,
          linkedIn: linkedIn || undefined,
          avatarUrl: avatarUrl || undefined,
          category: isHiringManager ? 'Hiring Manager' : 'Recruiter',
        };
      }
    }
  }

  // 2. ATS or generic job postings (Greenhouse, Lever, etc.)
  const atsContactCard = container.querySelector(
    '[class*="recruiter"], [class*="hiring-team"], [class*="contact-person"], [data-qa="recruiter-info"], .posting-contact, .job-contact'
  );
  if (atsContactCard) {
    const nameEl = atsContactCard.querySelector('strong, h3, h4, [class*="name"]');
    const titleEl = atsContactCard.querySelector('p, span, [class*="title"], [class*="role"]');
    const mailtoAnchor = atsContactCard.querySelector('a[href^="mailto:"]') as HTMLAnchorElement | null;
    const name = (nameEl?.textContent || '').trim().replace(/\s+/g, ' ');
    if (name && name.length >= 2) {
      const role = (titleEl?.textContent || '').trim().replace(/\s+/g, ' ') || 'Recruiter';
      const email = mailtoAnchor ? mailtoAnchor.href.replace(/^mailto:/i, '').split('?')[0].trim() : undefined;
      return {
        name,
        role,
        email,
        category: /(?:manager|director|lead|head|vp)/i.test(role) ? 'Hiring Manager' : 'Recruiter',
      };
    }
  }

  return null;
}

/**
 * Atomic bundle-on-save logic: creates or updates contact, links contact to application,
 * and links application to contact mutually.
 */
export function bundleRecruiterAndApplication(
  application: Partial<Application> & { id: string },
  scrapedRecruiter: ScrapedRecruiter,
  existingContacts: Contact[]
): {
  updatedApplication: Partial<Application>;
  contactToSave: Contact;
  isExistingContact: boolean;
} {
  const normLinkedIn = scrapedRecruiter.linkedIn?.toLowerCase();
  const normName = scrapedRecruiter.name.toLowerCase();

  // Find existing match by LinkedIn URL or Name
  const existing = existingContacts.find(c => {
    if (normLinkedIn && c.linkedIn && c.linkedIn.toLowerCase() === normLinkedIn) return true;
    return c.name.toLowerCase() === normName;
  });

  if (existing) {
    // Existing contact: link new application ID without duplicating
    const existingAppIds = existing.applicationIds || [];
    const updatedAppIds = existingAppIds.includes(application.id)
      ? existingAppIds
      : [...existingAppIds, application.id];

    const contactToSave: Contact = {
      ...existing,
      applicationIds: updatedAppIds,
      updatedAt: new Date().toISOString(),
    };

    const existingContactIds = application.contactIds || [];
    const updatedContactIds = existingContactIds.includes(existing.id)
      ? existingContactIds
      : [...existingContactIds, existing.id];

    return {
      updatedApplication: {
        ...application,
        contactIds: updatedContactIds,
      },
      contactToSave,
      isExistingContact: true,
    };
  }

  // New contact creation
  const newContactId = `contact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const contactToSave: Contact = {
    id: newContactId,
    name: scrapedRecruiter.name,
    role: scrapedRecruiter.role,
    organization: application.company || '',
    category: scrapedRecruiter.category,
    linkedIn: scrapedRecruiter.linkedIn,
    email: scrapedRecruiter.email,
    applicationIds: [application.id],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingContactIds = application.contactIds || [];
  return {
    updatedApplication: {
      ...application,
      contactIds: [...existingContactIds, newContactId],
    },
    contactToSave,
    isExistingContact: false,
  };
}

describe('recruiterDetection', () => {
  describe('extractRecruiterFromDom', () => {
    it('extracts recruiter from modern LinkedIn job poster card', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="job-details-jobs-unified-top-card__job-poster">
          <a href="https://www.linkedin.com/in/sarah-connor-talent?trackingId=xyz123">
            <img class="presence-entity__image" src="https://media.licdn.com/dms/image/v2/avatar.jpg" alt="Sarah Connor profile">
            <strong class="jobs-poster__name">Sarah Connor • 1st</strong>
          </a>
          <span class="jobs-poster__job-title">Senior Technical Recruiter at Stripe</span>
        </div>
      `;

      const result = extractRecruiterFromDom(div, 'www.linkedin.com');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Sarah Connor');
      expect(result?.role).toBe('Senior Technical Recruiter at Stripe');
      expect(result?.linkedIn).toBe('https://www.linkedin.com/in/sarah-connor-talent');
      expect(result?.avatarUrl).toBe('https://media.licdn.com/dms/image/v2/avatar.jpg');
      expect(result?.category).toBe('Recruiter');
    });

    it('extracts hiring manager from LinkedIn hiring team card and infers category', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div data-view-name="job-details-hiring-team">
          <div class="hiring-team__member">
            <a href="https://www.linkedin.com/in/alex-murphy">
              <span class="hiring-team__member-name">Alex Murphy</span>
            </a>
            <span class="hiring-team__member-title">Director of Engineering</span>
          </div>
        </div>
      `;

      const result = extractRecruiterFromDom(div, 'www.linkedin.com');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Alex Murphy');
      expect(result?.role).toBe('Director of Engineering');
      expect(result?.linkedIn).toBe('https://www.linkedin.com/in/alex-murphy');
      expect(result?.category).toBe('Hiring Manager');
    });

    it('extracts recruiter with email from ATS job postings', () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="job-contact-person">
          <h4 class="name">Jessica Pearson</h4>
          <p class="role">Talent Partner</p>
          <a href="mailto:jessica@pearsonhardman.com?subject=Application">Email Jessica</a>
        </div>
      `;

      const result = extractRecruiterFromDom(div, 'jobs.lever.co');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Jessica Pearson');
      expect(result?.role).toBe('Talent Partner');
      expect(result?.email).toBe('jessica@pearsonhardman.com');
      expect(result?.category).toBe('Recruiter');
    });

    it('returns null when no recruiter or job poster elements exist', () => {
      const div = document.createElement('div');
      div.innerHTML = `<div class="job-description">Standard job description without poster info</div>`;

      const result = extractRecruiterFromDom(div, 'www.linkedin.com');
      expect(result).toBeNull();
    });
  });

  describe('bundleRecruiterAndApplication', () => {
    it('creates a new contact with bidirectional linking when contact does not exist', () => {
      const app = {
        id: 'app_stripe_123',
        company: 'Stripe',
        role: 'Frontend Engineer',
        contactIds: [],
      };

      const scraped: ScrapedRecruiter = {
        name: 'Sarah Connor',
        role: 'Senior Technical Recruiter',
        linkedIn: 'https://www.linkedin.com/in/sarah-connor',
        category: 'Recruiter',
      };

      const result = bundleRecruiterAndApplication(app, scraped, []);

      expect(result.isExistingContact).toBe(false);
      expect(result.contactToSave.name).toBe('Sarah Connor');
      expect(result.contactToSave.organization).toBe('Stripe');
      expect(result.contactToSave.applicationIds).toEqual(['app_stripe_123']);
      expect(result.updatedApplication.contactIds).toEqual([result.contactToSave.id]);
    });

    it('links to existing contact without creating duplicate when matched by LinkedIn URL', () => {
      const existingContact: Contact = {
        id: 'contact_sarah_999',
        name: 'Sarah Connor',
        role: 'Technical Recruiter',
        organization: 'Stripe',
        linkedIn: 'https://www.linkedin.com/in/sarah-connor',
        category: 'Recruiter',
        applicationIds: ['app_old_456'],
      };

      const app = {
        id: 'app_stripe_123',
        company: 'Stripe',
        role: 'Staff Engineer',
        contactIds: [],
      };

      const scraped: ScrapedRecruiter = {
        name: 'Sarah Connor',
        role: 'Technical Recruiter',
        linkedIn: 'https://www.linkedin.com/in/sarah-connor',
        category: 'Recruiter',
      };

      const result = bundleRecruiterAndApplication(app, scraped, [existingContact]);

      expect(result.isExistingContact).toBe(true);
      expect(result.contactToSave.id).toBe('contact_sarah_999');
      expect(result.contactToSave.applicationIds).toEqual(['app_old_456', 'app_stripe_123']);
      expect(result.updatedApplication.contactIds).toEqual(['contact_sarah_999']);
    });
  });
});
