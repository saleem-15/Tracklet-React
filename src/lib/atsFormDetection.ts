/**
 * ATS Form Detection & Field Resolution Engine
 * Implements 4-tier resolution hierarchy:
 * 1. ATS-Specific Selectors (Greenhouse, Lever, Workday)
 * 2. Standard HTML5 autocomplete attributes
 * 3. Semantic name / id / placeholder heuristics
 * 4. Label proximity text matching
 */

export type AtsType = 'greenhouse' | 'lever' | 'workday' | 'generic';

export type CandidateFieldKey =
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'location'
  | 'linkedInUrl'
  | 'githubUrl'
  | 'portfolioUrl'
  | 'workAuthorization';

export interface CandidateProfile {
  id?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  location?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  targetTitle?: string;
  workAuthorization?: string;
  preferredResumeName?: string;
  updatedAt?: string;
}

export interface MatchedField {
  fieldKey: CandidateFieldKey;
  label: string;
  selector: string;
  value: string;
  tier: 'ats-specific' | 'autocomplete' | 'semantic' | 'label-proximity';
  element?: HTMLElement | HTMLInputElement;
  isPopulated?: boolean;
}

export interface FormDetectionResult {
  ats: AtsType | null;
  formFound: boolean;
  formElement?: HTMLFormElement | HTMLElement | null;
  confidence: number;
  matchedFields: MatchedField[];
  unmatchedCandidateFields: string[];
  manualAlerts: string[];
}

/**
 * Detects ATS platform from hostname, DOM markers, or form attributes.
 */
export function detectAtsType(
  container: Document | HTMLElement,
  url: string = ''
): { ats: AtsType | null; confidence: number; formElement: HTMLElement | null } {
  const host = (url ? new URL(url.startsWith('http') ? url : `https://${url}`).hostname : '').toLowerCase();

  // 1. Greenhouse Detection
  if (
    host.includes('greenhouse.io') ||
    container.querySelector?.('#application_form, #embedded_job_board, form[action*="greenhouse.io"], #grnhse_app')
  ) {
    const form = (container.querySelector?.('#application_form, form[action*="greenhouse"], form') as HTMLElement) || null;
    return { ats: 'greenhouse', confidence: 0.95, formElement: form };
  }

  // 2. Lever Detection
  if (
    host.includes('lever.co') ||
    container.querySelector?.('.application-form, #application-form, form[action*="lever.co"], [data-qa="btn-apply"]')
  ) {
    const form = (container.querySelector?.('.application-form, #application-form, form[action*="lever"], form') as HTMLElement) || null;
    return { ats: 'lever', confidence: 0.95, formElement: form };
  }

  // 3. Workday Detection
  if (
    host.includes('workdayjobs.com') ||
    host.includes('myworkday.com') ||
    container.querySelector?.('[data-automation-id*="legalNameSection"], [data-automation-id="application-form"]')
  ) {
    const form = (container.querySelector?.('[data-automation-id="application-form"], form, [role="main"]') as HTMLElement) || null;
    return { ats: 'workday', confidence: 0.92, formElement: form };
  }

  // 4. Generic Careers Form
  const genericForm = container.querySelector?.('form:not([role="search"])') as HTMLElement | null;
  if (genericForm) {
    const hasInputs = genericForm.querySelectorAll('input:not([type="hidden"]):not([type="submit"])').length >= 2;
    if (hasInputs) {
      return { ats: 'generic', confidence: 0.65, formElement: genericForm };
    }
  }

  return { ats: null, confidence: 0, formElement: null };
}

/**
 * ATS-specific selector registry (Tier 1).
 */
const ATS_SELECTORS: Record<
  string,
  Partial<Record<CandidateFieldKey, string[]>>
> = {
  greenhouse: {
    firstName: ['#first_name', 'input[name="job_application[first_name]"]'],
    lastName: ['#last_name', 'input[name="job_application[last_name]"]'],
    email: ['#email', 'input[name="job_application[email]"]'],
    phone: ['#phone', 'input[name="job_application[phone]"]'],
    location: ['#job_application_location', 'input[name="job_application[location]"]'],
    linkedInUrl: ['input[autocomplete="custom-question-linkedin"]', 'input[id*="linkedin" i]', 'input[name*="linkedin" i]'],
    githubUrl: ['input[id*="github" i]', 'input[name*="github" i]'],
    portfolioUrl: ['input[id*="website" i]', 'input[name*="website" i]', 'input[name*="portfolio" i]'],
  },
  lever: {
    fullName: ['input[name="name"]', '#name'],
    email: ['input[name="email"]', '#email'],
    phone: ['input[name="phone"]', '#phone'],
    location: ['input[name="location"]'],
    linkedInUrl: ['input[name="urls[LinkedIn]"]', 'input[name*="LinkedIn"]'],
    githubUrl: ['input[name="urls[GitHub]"]', 'input[name*="GitHub"]'],
    portfolioUrl: ['input[name="urls[Portfolio]"]', 'input[name="urls[Other]"]'],
  },
  workday: {
    firstName: ['input[data-automation-id="legalNameSection_firstName"]', '[data-automation-id="legalNameSection_firstName"] input'],
    lastName: ['input[data-automation-id="legalNameSection_lastName"]', '[data-automation-id="legalNameSection_lastName"] input'],
    email: ['input[data-automation-id="email"]', '[data-automation-id="email"] input'],
    phone: ['input[data-automation-id="phone-number"]', '[data-automation-id="phone-number"] input'],
    location: ['input[data-automation-id="addressSection_city"]', '[data-automation-id="addressSection_city"] input'],
    linkedInUrl: ['input[data-automation-id*="linkedin" i]'],
    portfolioUrl: ['input[data-automation-id*="website" i]'],
  }
};

/**
 * Standard Autocomplete Selectors (Tier 2).
 */
const AUTOCOMPLETE_SELECTORS: Partial<Record<CandidateFieldKey, string[]>> = {
  fullName: ['input[autocomplete="name"]'],
  firstName: ['input[autocomplete="given-name"]'],
  lastName: ['input[autocomplete="family-name"]'],
  email: ['input[autocomplete="email"]', 'input[type="email"]'],
  phone: ['input[autocomplete="tel"]', 'input[type="tel"]'],
  location: ['input[autocomplete="address-level2"]', 'input[autocomplete="address-line1"]'],
};

/**
 * Semantic Regex Heuristics (Tier 3).
 */
const SEMANTIC_PATTERNS: Record<CandidateFieldKey, RegExp> = {
  fullName: /\b(?:full\s*name|candidate\s*name|your\s*name)\b/i,
  firstName: /\b(?:first\s*name|given\s*name|fname)\b/i,
  lastName: /\b(?:last\s*name|family\s*name|surname|lname)\b/i,
  email: /\b(?:email|e-mail)\b/i,
  phone: /\b(?:phone|mobile|tel|telephone)\b/i,
  location: /\b(?:location|city|address|residence)\b/i,
  linkedInUrl: /\blinkedin\b/i,
  githubUrl: /\bgithub\b/i,
  portfolioUrl: /\b(?:portfolio|website|personal\s*url|link)\b/i,
  workAuthorization: /\b(?:work\s*auth|authorized|visa|sponsorship)\b/i,
};

/**
 * Friendly label names for display.
 */
export const FIELD_LABELS: Record<CandidateFieldKey, string> = {
  fullName: 'Full Name',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email Address',
  phone: 'Phone Number',
  location: 'Location',
  linkedInUrl: 'LinkedIn Profile',
  githubUrl: 'GitHub Profile',
  portfolioUrl: 'Portfolio Website',
  workAuthorization: 'Work Authorization',
};

/**
 * Resolves candidate profile fields across the 4-tier hierarchy.
 */
export function resolveFormFields(
  container: Document | HTMLElement,
  profile: CandidateProfile,
  ats: AtsType | null
): MatchedField[] {
  const matched: MatchedField[] = [];
  const claimedElements = new Set<Element>();

  const fieldKeys: CandidateFieldKey[] = [
    'firstName',
    'lastName',
    'fullName',
    'email',
    'phone',
    'location',
    'linkedInUrl',
    'githubUrl',
    'portfolioUrl',
    'workAuthorization',
  ];

  function tryMatch(
    key: CandidateFieldKey,
    val: string | undefined,
    selector: string,
    tier: MatchedField['tier']
  ): boolean {
    if (!val) return false;
    const el = container.querySelector(selector) as HTMLInputElement | null;
    if (el && !claimedElements.has(el) && el.type !== 'hidden' && el.type !== 'submit') {
      claimedElements.add(el);
      matched.push({
        fieldKey: key,
        label: FIELD_LABELS[key],
        selector,
        value: val,
        tier,
        element: el,
      });
      return true;
    }
    return false;
  }

  // Derive firstName and lastName if only fullName is given
  const derivedFirstName = profile.firstName || (profile.fullName ? profile.fullName.split(/\s+/)[0] : '');
  const derivedLastName = profile.lastName || (profile.fullName ? profile.fullName.split(/\s+/).slice(1).join(' ') : '');

  const profileValues: Record<CandidateFieldKey, string | undefined> = {
    fullName: profile.fullName,
    firstName: derivedFirstName,
    lastName: derivedLastName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedInUrl: profile.linkedInUrl,
    githubUrl: profile.githubUrl,
    portfolioUrl: profile.portfolioUrl,
    workAuthorization: profile.workAuthorization,
  };

  for (const key of fieldKeys) {
    const val = profileValues[key];
    if (!val) continue;

    // Tier 1: ATS Selectors
    if (ats && ATS_SELECTORS[ats] && ATS_SELECTORS[ats][key]) {
      let matchedTier1 = false;
      for (const sel of ATS_SELECTORS[ats][key]!) {
        if (tryMatch(key, val, sel, 'ats-specific')) {
          matchedTier1 = true;
          break;
        }
      }
      if (matchedTier1) continue;
    }

    // Tier 2: Standard Autocomplete
    if (AUTOCOMPLETE_SELECTORS[key]) {
      let matchedTier2 = false;
      for (const sel of AUTOCOMPLETE_SELECTORS[key]!) {
        if (tryMatch(key, val, sel, 'autocomplete')) {
          matchedTier2 = true;
          break;
        }
      }
      if (matchedTier2) continue;
    }

    // Tier 3: Semantic name / id / placeholder attribute matching
    const inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="file"]), textarea')) as HTMLInputElement[];
    let matchedTier3 = false;
    for (const input of inputs) {
      if (claimedElements.has(input)) continue;
      const rawAttrs = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''} ${input.getAttribute('aria-label') || ''}`;
      const normalizedAttrs = rawAttrs.replace(/[_\.-]/g, ' ');
      if (SEMANTIC_PATTERNS[key].test(normalizedAttrs)) {
        claimedElements.add(input);
        const escapedId = input.id ? (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(input.id) : input.id.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1')) : '';
        matched.push({
          fieldKey: key,
          label: FIELD_LABELS[key],
          selector: input.id ? `#${escapedId}` : input.name ? `[name="${input.name}"]` : 'input',
          value: val,
          tier: 'semantic',
          element: input,
        });
        matchedTier3 = true;
        break;
      }
    }
    if (matchedTier3) continue;

    // Tier 4: Label Proximity text matching
    const labels = Array.from(container.querySelectorAll('label')) as HTMLLabelElement[];
    for (const label of labels) {
      const labelText = (label.textContent || '').trim();
      if (SEMANTIC_PATTERNS[key].test(labelText)) {
        let targetInput: HTMLInputElement | null = null;
        if (label.htmlFor) {
          const doc = container instanceof Document ? container : container.ownerDocument;
          const docEl = doc?.getElementById(label.htmlFor);
          if (docEl && container.contains(docEl) && docEl instanceof HTMLInputElement) {
            targetInput = docEl;
          }
        }
        if (!targetInput) {
          targetInput = label.querySelector('input') || (label.nextElementSibling as HTMLInputElement | null);
        }

        if (targetInput && !claimedElements.has(targetInput) && targetInput.tagName === 'INPUT') {
          claimedElements.add(targetInput);
          const escapedId = targetInput.id ? (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(targetInput.id) : targetInput.id.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1')) : '';
          matched.push({
            fieldKey: key,
            label: FIELD_LABELS[key],
            selector: targetInput.id ? `#${escapedId}` : `label:contains("${labelText.slice(0, 10)}") + input`,
            value: val,
            tier: 'label-proximity',
            element: targetInput,
          });
          break;
        }
      }
    }
  }

  return matched;
}

/**
 * Scans page for manual review items (e.g. resume attachment dropzone, custom dropdowns).
 */
export function detectManualAlerts(container: Document | HTMLElement): string[] {
  const alerts: string[] = [];

  const fileInputs = container.querySelectorAll('input[type="file"], [class*="resume-upload"], [class*="attach-resume"]');
  if (fileInputs.length > 0) {
    alerts.push('Resume file attachment required');
  }

  const customDropdowns = container.querySelectorAll('select[required], [role="combobox"][aria-required="true"]');
  if (customDropdowns.length > 0) {
    alerts.push('Review required dropdown questions');
  }

  return alerts;
}

/**
 * Safely injects values into elements and dispatches synthetic reactive events.
 * Strictly NEVER submits the form.
 */
export function injectAutofillValues(matchedFields: MatchedField[]): { populatedCount: number; errors: string[] } {
  let populatedCount = 0;
  const errors: string[] = [];

  for (const field of matchedFields) {
    const el = field.element;
    if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      continue;
    }

    try {
      // Use native value setter to ensure React / Angular / Vue track change
      const prototype = el instanceof HTMLInputElement ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

      if (descriptor && descriptor.set) {
        descriptor.set.call(el, field.value);
      } else {
        el.value = field.value;
      }

      // Dispatch standard synthetic reactive events
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));

      field.isPopulated = true;
      populatedCount++;
    } catch (err: any) {
      errors.push(`Failed to fill ${field.label}: ${err?.message || err}`);
    }
  }

  return { populatedCount, errors };
}

/**
 * Highlights a specific field on the page with a smooth scroll and a 1.5s accent halo outline.
 */
export function highlightAndScrollToField(el: HTMLElement | null): boolean {
  if (!el) return false;

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus({ preventScroll: true });

  const originalOutline = el.style.outline;
  const originalBoxShadow = el.style.boxShadow;
  const originalTransition = el.style.transition;

  el.style.transition = 'box-shadow 0.2s ease, outline 0.2s ease';
  el.style.outline = '2px solid #2563eb';
  el.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.28)';

  setTimeout(() => {
    el.style.outline = originalOutline;
    el.style.boxShadow = originalBoxShadow;
    el.style.transition = originalTransition;
  }, 1500);

  return true;
}
