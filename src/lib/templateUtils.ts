/**
 * Pure utilities for follow-up email template interpolation, variable extraction, and formatting.
 */

export interface TemplateInterpolationContext {
  company?: string;
  role?: string;
  contactName?: string;
  dateApplied?: string;
}

export interface TemplateVariableDescriptor {
  tag: string;
  label: string;
  description: string;
  fallback: string;
}

export const TEMPLATE_VARIABLES: TemplateVariableDescriptor[] = [
  { tag: '{contactName}', label: 'Contact Name', description: 'Name of the recruiter or contact', fallback: 'Hiring Team' },
  { tag: '{company}', label: 'Company', description: 'Name of the company', fallback: 'your company' },
  { tag: '{role}', label: 'Role', description: 'Target job title / position', fallback: 'the open position' },
  { tag: '{dateApplied}', label: 'Date Applied', description: 'Application submission date', fallback: 'recently' },
];

/**
 * Resolves contact name for friendly salutation.
 * e.g., "Karla Lindqvist" -> "Karla", or fallback to "Hiring Team".
 */
export function getSalutationName(contactName?: string): string {
  if (!contactName || !contactName.trim()) return 'Hiring Team';
  const clean = contactName.trim();
  // If email address passed as name, return "Hiring Team"
  if (clean.includes('@')) return 'Hiring Team';
  // Use first name if full name
  const parts = clean.split(/\s+/);
  return parts[0] || 'Hiring Team';
}

/**
 * Replaces `{tag}` placeholders in template text with concrete context values or sensible fallbacks.
 */
export function interpolateTemplate(
  templateText: string,
  context: TemplateInterpolationContext
): string {
  if (!templateText) return '';

  const salutationName = getSalutationName(context.contactName);
  const company = context.company?.trim() || 'your company';
  const role = context.role?.trim() || 'the open position';
  const dateApplied = context.dateApplied?.trim() || 'recently';

  return templateText
    .replace(/\{contactName\}/gi, () => salutationName)
    .replace(/\{company\}/gi, () => company)
    .replace(/\{role\}/gi, () => role)
    .replace(/\{dateApplied\}/gi, () => dateApplied);
}

/**
 * Encodes recipient, subject, and body into a RFC-compliant mailto URI.
 */
export function encodeMailtoUrl(to: string, subject: string, body: string): string {
  const cleanTo = (to || '').trim();
  const encodedSubject = encodeURIComponent(subject.trim());
  const encodedBody = encodeURIComponent(body.trim());
  return `mailto:${cleanTo}?subject=${encodedSubject}&body=${encodedBody}`;
}
