import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectAtsType,
  resolveFormFields,
  detectManualAlerts,
  injectAutofillValues,
  highlightAndScrollToField,
  CandidateProfile,
} from '../../src/lib/atsFormDetection';

describe('ATS Form Detection & 4-Tier Field Resolution (US6 / T035)', () => {
  const sampleProfile: CandidateProfile = {
    fullName: 'Saleem Dev',
    firstName: 'Saleem',
    lastName: 'Dev',
    email: 'saleem@example.com',
    phone: '+1 555-0199',
    location: 'San Francisco, CA',
    linkedInUrl: 'https://linkedin.com/in/saleem-dev',
    githubUrl: 'https://github.com/saleem-dev',
    portfolioUrl: 'https://saleem.dev',
    workAuthorization: 'US Citizen / Authorized to work',
  };

  describe('detectAtsType', () => {
    it('detects Greenhouse from domain and markup', () => {
      const div = document.createElement('div');
      div.innerHTML = `<form id="application_form"><input id="first_name" /></form>`;
      
      const res = detectAtsType(div, 'https://boards.greenhouse.io/stripe/jobs/123');
      expect(res.ats).toBe('greenhouse');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.formElement).not.toBeNull();
    });

    it('detects Lever from domain and markup', () => {
      const div = document.createElement('div');
      div.innerHTML = `<form class="application-form"><input name="name" /></form>`;

      const res = detectAtsType(div, 'https://jobs.lever.co/figma/abc-123');
      expect(res.ats).toBe('lever');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.formElement).not.toBeNull();
    });

    it('detects Workday from automation attributes and domain', () => {
      const div = document.createElement('div');
      div.innerHTML = `<div data-automation-id="application-form"><input data-automation-id="legalNameSection_firstName" /></div>`;

      const res = detectAtsType(div, 'https://netflix.wd1.myworkdayjobs.com/en-US/careers/job/123');
      expect(res.ats).toBe('workday');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.formElement).not.toBeNull();
    });

    it('detects generic career forms when standard inputs are present', () => {
      const div = document.createElement('div');
      div.innerHTML = `<form><input name="email" /><input name="phone" /></form>`;

      const res = detectAtsType(div, 'https://careers.example.com/apply');
      expect(res.ats).toBe('generic');
      expect(res.confidence).toBe(0.65);
    });

    it('returns null when no form or ATS marker is found', () => {
      const div = document.createElement('div');
      div.innerHTML = `<article><h1>Article about engineering</h1></article>`;

      const res = detectAtsType(div, 'https://techblog.com/post-1');
      expect(res.ats).toBeNull();
      expect(res.confidence).toBe(0);
    });
  });

  describe('4-Tier Field Resolution Hierarchy', () => {
    it('Tier 1: resolves Greenhouse specific selectors with highest precedence', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form id="application_form">
          <input id="first_name" name="job_application[first_name]" />
          <input id="last_name" name="job_application[last_name]" />
          <input id="email" name="job_application[email]" />
          <input id="phone" name="job_application[phone]" />
          <input id="job_application_location" />
          <input id="job_application_answers_attributes_linkedin" name="answers[linkedin]" />
        </form>
      `;

      const matches = resolveFormFields(container, sampleProfile, 'greenhouse');
      expect(matches.length).toBeGreaterThanOrEqual(5);

      const fn = matches.find(m => m.fieldKey === 'firstName');
      expect(fn?.tier).toBe('ats-specific');
      expect(fn?.value).toBe('Saleem');

      const ln = matches.find(m => m.fieldKey === 'lastName');
      expect(ln?.tier).toBe('ats-specific');
      expect(ln?.value).toBe('Dev');

      const em = matches.find(m => m.fieldKey === 'email');
      expect(em?.tier).toBe('ats-specific');
      expect(em?.value).toBe('saleem@example.com');
    });

    it('Tier 1: resolves Lever full-name and URL arrays', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form class="application-form">
          <input name="name" />
          <input name="email" />
          <input name="phone" />
          <input name="urls[LinkedIn]" />
          <input name="urls[GitHub]" />
        </form>
      `;

      const matches = resolveFormFields(container, sampleProfile, 'lever');
      const fullNameMatch = matches.find(m => m.fieldKey === 'fullName');
      expect(fullNameMatch?.tier).toBe('ats-specific');
      expect(fullNameMatch?.value).toBe('Saleem Dev');

      const liMatch = matches.find(m => m.fieldKey === 'linkedInUrl');
      expect(liMatch?.tier).toBe('ats-specific');
      expect(liMatch?.value).toBe('https://linkedin.com/in/saleem-dev');
    });

    it('Tier 2: resolves HTML5 standard autocomplete attributes', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form>
          <input autocomplete="given-name" />
          <input autocomplete="family-name" />
          <input autocomplete="email" />
          <input autocomplete="tel" />
          <input autocomplete="address-level2" />
        </form>
      `;

      const matches = resolveFormFields(container, sampleProfile, 'generic');
      const fn = matches.find(m => m.fieldKey === 'firstName');
      expect(fn?.tier).toBe('autocomplete');
      expect(fn?.value).toBe('Saleem');

      const email = matches.find(m => m.fieldKey === 'email');
      expect(email?.tier).toBe('autocomplete');
      expect(email?.value).toBe('saleem@example.com');
    });

    it('Tier 3: resolves semantic name, id, and placeholder heuristics', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form>
          <input id="user_first_name_input" />
          <input name="candidate_surname" />
          <input placeholder="Enter your email address" />
          <input placeholder="Mobile phone number" />
        </form>
      `;

      const matches = resolveFormFields(container, sampleProfile, 'generic');
      const fn = matches.find(m => m.fieldKey === 'firstName');
      expect(fn?.tier).toBe('semantic');

      const em = matches.find(m => m.fieldKey === 'email');
      expect(em?.tier).toBe('semantic');
      expect(em?.value).toBe('saleem@example.com');
    });

    it('Tier 4: resolves label proximity text matching', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form>
          <div>
            <label for="f_name_custom">First Name</label>
            <input id="f_name_custom" />
          </div>
          <div>
            <label>
              <span>Email Address</span>
              <input type="text" />
            </label>
          </div>
        </form>
      `;

      const matches = resolveFormFields(container, sampleProfile, 'generic');
      const fn = matches.find(m => m.fieldKey === 'firstName');
      expect(fn?.tier).toBe('label-proximity');
      expect(fn?.value).toBe('Saleem');

      const em = matches.find(m => m.fieldKey === 'email');
      expect(em?.tier).toBe('label-proximity');
      expect(em?.value).toBe('saleem@example.com');
    });
  });

  describe('Manual Alerts Detection', () => {
    it('detects file inputs and prompts for resume attachment review', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <form>
          <input type="file" id="resume_upload" />
          <select required><option value="">Select work authorization</option></select>
        </form>
      `;

      const alerts = detectManualAlerts(container);
      expect(alerts).toContain('Resume file attachment required');
      expect(alerts).toContain('Review required dropdown questions');
    });
  });

  describe('Safe Autofill Value Injection', () => {
    it('injects values using native property setters and dispatches synthetic input, change, blur events', () => {
      const input = document.createElement('input');
      const inputEvents: string[] = [];
      ['input', 'change', 'blur'].forEach(evt => {
        input.addEventListener(evt, () => inputEvents.push(evt));
      });

      const matchedFields = [
        {
          fieldKey: 'firstName' as const,
          label: 'First Name',
          selector: '#first_name',
          value: 'Saleem',
          tier: 'ats-specific' as const,
          element: input
        }
      ];

      const res = injectAutofillValues(matchedFields);
      expect(res.populatedCount).toBe(1);
      expect(input.value).toBe('Saleem');
      expect(inputEvents).toEqual(['input', 'change', 'blur']);
    });

    it('never submits the parent form automatically', () => {
      const form = document.createElement('form');
      const submitSpy = vi.fn();
      form.submit = submitSpy;

      const input = document.createElement('input');
      form.appendChild(input);

      injectAutofillValues([
        {
          fieldKey: 'email' as const,
          label: 'Email',
          selector: 'input',
          value: 'test@example.com',
          tier: 'semantic' as const,
          element: input
        }
      ]);

      expect(submitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Scroll and Highlight Halo (FR-031)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('smoothly scrolls to target input, focuses it, and applies 1.5s halo outline', () => {
      const input = document.createElement('input');
      input.scrollIntoView = vi.fn();
      input.focus = vi.fn();

      const success = highlightAndScrollToField(input);
      expect(success).toBe(true);
      expect(input.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      expect(input.focus).toHaveBeenCalled();
      expect(input.style.outline).toContain('solid');
      expect(input.style.outline).toContain('2px');

      // Fast-forward 1.5s
      vi.advanceTimersByTime(1500);
      expect(input.style.outline).toBe('');
    });
  });
});
