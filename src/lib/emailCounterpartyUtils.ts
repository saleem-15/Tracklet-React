import { Contact, Application, EmailLog } from '../types';

export interface ParsedCounterparty {
  name?: string;
  email?: string;
}

/**
 * Extracts displayName and email from counterparty strings such as:
 * - "LABHOUSE Hiring Team <no-reply@ashbyhq.com>"
 * - "no-reply@ashbyhq.com"
 * - "LABHOUSE Hiring Team"
 */
export function parseCounterpartyString(raw?: string): ParsedCounterparty {
  if (!raw) return {};
  const trimmed = raw.trim();
  if (!trimmed) return {};

  // Check RFC format: Name <email@domain.com>
  const rfcMatch = trimmed.match(/^([^<]+)<([^>]+)>$/);
  if (rfcMatch) {
    const name = rfcMatch[1].trim();
    const email = rfcMatch[2].trim();
    return {
      name: name || undefined,
      email: email || undefined,
    };
  }

  // Check if purely an email address
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { email: trimmed };
  }

  // Purely a name or organization
  return { name: trimmed };
}

/**
 * Resolves the 2-tier sender / recipient presentation:
 * - primaryLabel: Strong display name (e.g. "LABHOUSE Hiring Team", "To: LABHOUSE Hiring Team")
 * - secondaryEmail: Muted email address (e.g. "no-reply@ashbyhq.com")
 */
export function resolveEmailCounterparty({
  isInbound,
  sender,
  recipient,
  contacts = [],
  companyName,
}: {
  isInbound: boolean;
  sender?: string;
  recipient?: string;
  contacts?: Contact[];
  companyName?: string;
}): { primaryLabel: string; secondaryEmail?: string } {
  // If inbound, target the sender. If outbound, target the recipient.
  const rawTarget = isInbound ? sender : recipient;
  const parsed = parseCounterpartyString(rawTarget);

  let displayName = parsed.name;
  let emailAddr = parsed.email;

  // If we only have an email, search contacts for a matching name
  if (emailAddr && !displayName && contacts.length > 0) {
    const matchedContact = contacts.find(
      (c) => c.email && c.email.toLowerCase() === emailAddr?.toLowerCase()
    );
    if (matchedContact?.name) {
      displayName = matchedContact.name;
    }
  }

  // Fallback if neither found or if displayName equals the email address
  if (!displayName && emailAddr) {
    // If companyName is present and email domain aligns or this is the only application contact, fallback gracefully
    if (companyName && !/gmail|yahoo|hotmail|outlook/i.test(emailAddr)) {
      displayName = `${companyName} Team`;
    }
  }

  if (isInbound) {
    // Received format: Name on top, email below
    const primary = displayName || emailAddr || companyName || 'Unknown Sender';
    const secondary = emailAddr && emailAddr !== primary ? emailAddr : undefined;
    return { primaryLabel: primary, secondaryEmail: secondary };
  } else {
    // Sent format: "To: Name" on top, email below
    const rawName = displayName || emailAddr || companyName || 'Recipient';
    const primary = rawName.startsWith('To:') ? rawName : `To: ${rawName}`;
    const secondary = emailAddr && emailAddr !== rawName ? emailAddr : undefined;
    return { primaryLabel: primary, secondaryEmail: secondary };
  }
}

/**
 * Pure projection helper that aggregates direct contact emails and linked application emails
 * matching the contact by ID or RFC counterparty, deduplicates by ID, and sorts newest-first.
 * Preserves source contactId on application emails, including when absent.
 */
export function aggregateContactEmails(
  contact: Contact | null | undefined,
  applications: Application[] = []
): EmailLog[] {
  if (!contact) return [];
  const directEmails = contact.emails || [];

  const linkedAppIds = new Set(contact.applicationIds || []);
  const contactEmailLower = contact.email?.toLowerCase();

  const appEmails: EmailLog[] = [];
  applications.forEach((app) => {
    (app.emails || []).forEach((e) => {
      const isLinkedApp = linkedAppIds.has(app.id);
      const matchesContactId = e.contactId === contact.id;

      const sParsed = parseCounterpartyString(e.sender);
      const rParsed = parseCounterpartyString(e.recipient);
      const sEmail = sParsed.email?.toLowerCase();
      const rEmail = rParsed.email?.toLowerCase();

      const matchesEmail =
        contactEmailLower &&
        (sEmail === contactEmailLower ||
          rEmail === contactEmailLower ||
          e.sender.toLowerCase() === contactEmailLower ||
          (e.recipient && e.recipient.toLowerCase() === contactEmailLower));

      if (matchesContactId || (isLinkedApp && matchesEmail)) {
        appEmails.push({
          ...e,
          applicationId: e.applicationId || app.id,
          contactId: e.contactId,
        });
      }
    });
  });

  const seen = new Set<string>();
  const combined: EmailLog[] = [];
  [...directEmails, ...appEmails].forEach((e) => {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      combined.push(e);
    }
  });

  return combined.sort((a, b) => {
    const timeA = new Date(a.timestamp || a.date).getTime();
    const timeB = new Date(b.timestamp || b.date).getTime();
    return (isNaN(timeA) ? 0 : timeA) < (isNaN(timeB) ? 0 : timeB) ? 1 : -1;
  });
}
