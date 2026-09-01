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
  onlyFollowUpDue: boolean = false
): Contact[] {
  const normalizedQuery = query.trim().toLowerCase();

  return contacts.filter((contact) => {
    // Follow-up due filter (due in <= 48h or overdue within 120h)
    if (onlyFollowUpDue) {
      if (!contact.nextFollowUpDate) return false;
      const hours = getContactFollowUpHoursRemaining(contact.nextFollowUpDate);
      if (hours === null || hours > 48 || hours < -120) return false;
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
 * Returns all contacts with follow-ups due within thresholdHours (or overdue up to 120h).
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
      // Due within thresholdHours, or overdue up to 5 days
      if (hoursLeft <= thresholdHours && hoursLeft >= -120) {
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
