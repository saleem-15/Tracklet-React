import { Application, Contact } from '../types';

export interface MigrationResult {
  migratedContacts: Contact[];
  updatedApplications: Application[];
  migratedCount: number;
  hasChanges: boolean;
}

/**
 * Migrates legacy embedded `application.contacts` into standalone `Contact` entities,
 * linking them bidirectionally via `application.contactIds` and `contact.applicationIds`.
 */
export function migrateLegacyEmbeddedContacts(
  applications: Application[],
  existingContacts: Contact[] = []
): MigrationResult {
  const contactMap = new Map<string, Contact>();
  
  // Seed map with existing standalone contacts
  for (const contact of existingContacts) {
    contactMap.set(contact.id, { ...contact, applicationIds: [...(contact.applicationIds || [])] });
  }

  let migratedCount = 0;
  let hasChanges = false;

  const updatedApplications: Application[] = applications.map((app) => {
    const embeddedContacts = app.contacts;
    if (!embeddedContacts || embeddedContacts.length === 0) {
      return app;
    }

    hasChanges = true;
    const currentContactIds = new Set(app.contactIds || []);

    for (const legacy of embeddedContacts) {
      if (!legacy.name && !legacy.email) continue;

      const legacyEmail = legacy.email?.trim().toLowerCase();
      const legacyName = legacy.name?.trim().toLowerCase();

      // Check if contact already exists by ID, email, or trimmed name
      let match: Contact | undefined;
      for (const c of contactMap.values()) {
        if (c.id === legacy.id) {
          match = c;
          break;
        }
        if (legacyEmail && c.email && c.email.trim().toLowerCase() === legacyEmail) {
          match = c;
          break;
        }
        if (legacyName && c.name && c.name.trim().toLowerCase() === legacyName) {
          match = c;
          break;
        }
      }

      if (match) {
        // Merge non-empty legacy fields into matching contact if empty
        if (!match.role && legacy.role) match.role = legacy.role;
        if (!match.organization && (legacy.organization || app.company)) {
          match.organization = legacy.organization || app.company;
        }
        if (!match.phone && legacy.phone) match.phone = legacy.phone;
        if (!match.linkedIn && legacy.linkedIn) match.linkedIn = legacy.linkedIn;
        if (!match.notes && legacy.notes) match.notes = legacy.notes;
        if (!match.nextFollowUpDate && legacy.nextFollowUpDate) match.nextFollowUpDate = legacy.nextFollowUpDate;

        // Link match to this application if not already linked
        if (!match.applicationIds) match.applicationIds = [];
        if (!match.applicationIds.includes(app.id)) {
          match.applicationIds.push(app.id);
          hasChanges = true;
        }
        currentContactIds.add(match.id);
      } else {
        // Create new standalone contact
        const newContactId = legacy.id || `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newContact: Contact = {
          id: newContactId,
          name: legacy.name?.trim() || 'Contact',
          role: legacy.role?.trim() || undefined,
          organization: legacy.organization?.trim() || app.company?.trim() || undefined,
          category: legacy.category || 'Other',
          email: legacy.email?.trim() || undefined,
          phone: legacy.phone?.trim() || undefined,
          linkedIn: legacy.linkedIn?.trim() || undefined,
          notes: legacy.notes,
          nextFollowUpDate: legacy.nextFollowUpDate,
          applicationIds: [app.id],
          createdAt: legacy.createdAt || app.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        contactMap.set(newContactId, newContact);
        currentContactIds.add(newContactId);
        migratedCount++;
        hasChanges = true;
      }
    }

    return {
      ...app,
      contacts: [],
      contactIds: Array.from(currentContactIds),
    };
  });

  return {
    migratedContacts: Array.from(contactMap.values()),
    updatedApplications,
    migratedCount,
    hasChanges,
  };
}
