import { Contact, ContactCategory } from '../types';

export interface ContactFollowUpInfo {
  contact: Contact;
  hoursLeft: number; // Positive = hours until due, Negative = hours overdue
  formattedTimeLeft: string;
}

/**
 * Filter contacts by search query (matching name, role, or organization), category, and follow-up due state.
 */
export function filterContacts(
  contacts: Contact[],
  query: string,
  category: ContactCategory | 'All',
  onlyFollowUpDue: boolean = false,
  thresholdHours: number = 48
): Contact[] {
  const normalizedQuery = query.trim().toLowerCase();

  return contacts.filter((contact) => {
    // Follow-up due filter (due in <= thresholdHours or overdue within 120h)
    if (onlyFollowUpDue) {
      if (!contact.nextFollowUpDate) return false;
      const hours = getContactFollowUpHoursRemaining(contact.nextFollowUpDate);
      if (hours === null || hours > thresholdHours) return false;
    }

    // Category match
    if (category !== 'All' && contact.category !== category) {
      return false;
    }

    // Query match
    if (normalizedQuery) {
      const nameMatch = contact.name.toLowerCase().includes(normalizedQuery);
      const roleMatch = Boolean(contact.role?.toLowerCase().includes(normalizedQuery));
      const orgMatch = Boolean(contact.organization?.toLowerCase().includes(normalizedQuery));
      const emailMatch = Boolean(contact.email?.toLowerCase().includes(normalizedQuery));
      if (!nameMatch && !roleMatch && !orgMatch && !emailMatch) {
        return false;
      }
    }

    return true;
  });
}

export type ContactSortField = 'name' | 'organization' | 'category' | 'nextFollowUpDate' | 'createdAt';
export type ContactSortOrder = 'asc' | 'desc';

/**
 * Pure function to sort contacts by field and order.
 */
export function sortContacts(
  contacts: Contact[],
  field: ContactSortField = 'name',
  order: ContactSortOrder = 'asc'
): Contact[] {
  return [...contacts].sort((a, b) => {
    let comp = 0;

    switch (field) {
      case 'name':
        comp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        break;
      case 'organization': {
        const orgA = a.organization || '';
        const orgB = b.organization || '';
        comp = orgA.localeCompare(orgB, undefined, { sensitivity: 'base' });
        break;
      }
      case 'category': {
        const catA = a.category || 'Other';
        const catB = b.category || 'Other';
        comp = catA.localeCompare(catB, undefined, { sensitivity: 'base' });
        break;
      }
      case 'nextFollowUpDate': {
        const dateA = a.nextFollowUpDate || '9999-99-99';
        const dateB = b.nextFollowUpDate || '9999-99-99';
        comp = dateA.localeCompare(dateB);
        break;
      }
      case 'createdAt': {
        const createdA = a.createdAt || '';
        const createdB = b.createdAt || '';
        comp = createdA.localeCompare(createdB);
        break;
      }
    }

    return order === 'asc' ? comp : -comp;
  });
}

/**
 * Calculates hours remaining for a contact's next follow-up date.
 * If contact has no nextFollowUpDate, returns null.
 */
export function getContactFollowUpHoursRemaining(
  dueDateStr?: string,
  now = new Date()
): number | null {
  if (!dueDateStr) return null;
  // Parse date string e.g. "2026-07-28" treating as end of that day in local time
  const due = new Date(dueDateStr.includes('T') ? dueDateStr : `${dueDateStr}T23:59:59`);
  if (isNaN(due.getTime())) return null;

  const diffMs = due.getTime() - now.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return hours;
}

export function formatContactHoursLeft(hours: number): string {
  if (hours < 0) {
    const absHours = Math.abs(hours);
    if (absHours < 24) {
      return `${Math.round(absHours)}h overdue`;
    }
    const days = Math.floor(absHours / 24);
    return `${days}d overdue`;
  }
  if (hours < 1) {
    return 'Due in < 1h';
  }
  if (hours < 24) {
    return `Due in ${Math.round(hours)}h`;
  }
  const days = Math.round(hours / 24);
  return `Due in ${days}d`;
}

/**
 * Returns all contacts with follow-ups due within thresholdHours or overdue.
 */
export function getContactsFollowUpDueSoon(
  contacts: Contact[],
  thresholdHours: number,
  now = new Date()
): ContactFollowUpInfo[] {
  const result: ContactFollowUpInfo[] = [];

  contacts.forEach((contact) => {
    if (!contact.nextFollowUpDate) return;

    const hoursLeft = getContactFollowUpHoursRemaining(contact.nextFollowUpDate, now);
    if (hoursLeft !== null) {
      // Due within thresholdHours, or overdue
      if (hoursLeft <= thresholdHours) {
        result.push({
          contact,
          hoursLeft,
          formattedTimeLeft: formatContactHoursLeft(hoursLeft),
        });
      }
    }
  });

  // Sort by urgency: most overdue/soonest first
  return result.sort((a, b) => a.hoursLeft - b.hoursLeft);
}

export interface HumanFollowUpInfo {
  urgency: 'overdue' | 'due-today' | 'due-soon' | 'upcoming';
  shortLabel: string;
  relativeLabel: string;
  formattedDate: string;
  dateStr: string;
}

/**
 * Pure function to format a contact follow-up date into humanized labels and urgency levels.
 */
export function getHumanFollowUpInfo(
  dueDateStr?: string,
  now = new Date()
): HumanFollowUpInfo | null {
  if (!dueDateStr) return null;
  const parts = dueDateStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const dueDate = new Date(year, month, day);
  if (isNaN(dueDate.getTime())) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const formattedDate = `${dayNames[dueDate.getDay()]}, ${monthNames[month]} ${day}`;
  const shortDate = `${monthNames[month]} ${day}`;

  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return {
      urgency: 'overdue',
      shortLabel: `Overdue (${daysOverdue}d)`,
      relativeLabel: daysOverdue === 1 ? 'Overdue by 1 day' : `Overdue by ${daysOverdue} days`,
      formattedDate,
      dateStr: dueDateStr,
    };
  }

  if (diffDays === 0) {
    return {
      urgency: 'due-today',
      shortLabel: 'Today',
      relativeLabel: 'Due today',
      formattedDate,
      dateStr: dueDateStr,
    };
  }

  if (diffDays === 1) {
    return {
      urgency: 'due-soon',
      shortLabel: 'Tomorrow',
      relativeLabel: 'Due tomorrow',
      formattedDate,
      dateStr: dueDateStr,
    };
  }

  if (diffDays <= 6) {
    return {
      urgency: diffDays <= 2 ? 'due-soon' : 'upcoming',
      shortLabel: `In ${diffDays}d`,
      relativeLabel: `In ${diffDays} days`,
      formattedDate,
      dateStr: dueDateStr,
    };
  }

  return {
    urgency: 'upcoming',
    shortLabel: shortDate,
    relativeLabel: `On ${shortDate}`,
    formattedDate,
    dateStr: dueDateStr,
  };
}

/**
 * Calculates a local YYYY-MM-DD date string shifted by daysAhead.
 * Formats directly from local date parts to prevent UTC midnight shifts.
 */
export function getPresetDate(daysAhead: number, baseDate = new Date()): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + daysAhead);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether a candidate contact matches any existing contact in the list.
 * Match criteria:
 * 1. Email match (case-insensitive, trimmed) if both have an email.
 * 2. Name + Organization match (normalized text) if both have name and the same organization.
 * 3. Identical Name match if both have the same name and neither specifies an organization.
 * 4. Phone match if both have non-empty phone numbers (digits only, >= 7 digits).
 *
 * @param candidate The contact fields being added or evaluated.
 * @param existingContacts The current contacts list.
 * @param excludeContactId Optional ID to exclude from matching (useful when editing).
 * @returns The matching duplicate contact, or null if no duplicate is found.
 */
export function findDuplicateContact(
  candidate: {
    name?: string;
    email?: string;
    phone?: string;
    organization?: string;
  },
  existingContacts: Contact[],
  excludeContactId?: string
): Contact | null {
  const normCandName = candidate.name ? candidate.name.toLowerCase().trim().replace(/\s+/g, ' ') : '';
  const normCandEmail = candidate.email ? candidate.email.toLowerCase().trim() : '';
  const normCandOrg = candidate.organization ? candidate.organization.toLowerCase().trim().replace(/\s+/g, ' ') : '';
  const candDigits = candidate.phone ? candidate.phone.replace(/\D/g, '') : '';

  for (const existing of existingContacts) {
    if (excludeContactId && existing.id === excludeContactId) {
      continue;
    }

    const normExistEmail = existing.email ? existing.email.toLowerCase().trim() : '';
    // 1. Exact Email Match (strongest identifier)
    if (normCandEmail && normExistEmail && normCandEmail === normExistEmail) {
      return existing;
    }

    const normExistName = existing.name ? existing.name.toLowerCase().trim().replace(/\s+/g, ' ') : '';
    const normExistOrg = existing.organization ? existing.organization.toLowerCase().trim().replace(/\s+/g, ' ') : '';

    // 2. Name match
    if (normCandName && normExistName && normCandName === normExistName) {
      // If both specify organization and they match
      if (normCandOrg && normExistOrg && normCandOrg === normExistOrg) {
        return existing;
      }
      // If neither specifies an organization
      if (!normCandOrg && !normExistOrg) {
        return existing;
      }
    }

    // 3. Phone match (normalized digits, min 7 digits, handles optional country code e.g. +1)
    const existDigits = existing.phone ? existing.phone.replace(/\D/g, '') : '';
    if (candDigits && existDigits && candDigits.length >= 7 && existDigits.length >= 7) {
      const phoneMatches =
        candDigits === existDigits ||
        (candDigits.length === 10 && existDigits.length === 11 && existDigits.endsWith(candDigits)) ||
        (existDigits.length === 10 && candDigits.length === 11 && candDigits.endsWith(existDigits));
      if (phoneMatches) {
        return existing;
      }
    }
  }

  return null;
}
