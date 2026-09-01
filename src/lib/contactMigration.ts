import { Application, Contact } from '../types';

export interface MigrationResult {
  migratedContacts: Contact[];
  updatedApplications: Application[];
  migratedCount: number;
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

  const updatedApplications: Application[] = applications.map((app) => {
    const embeddedContacts = app.contacts;
    if (!embeddedContacts || embeddedContacts.length === 0) {
      return app;
    }

    const currentContactIds = new Set(app.contactIds || []);

    for (const legacy of embeddedContacts) {
      if (!legacy.name && !legacy.email) continue;

      // Check if contact already exists by ID, email, or exact name
      let match: Contact | undefined;
      for (const c of contactMap.values()) {
        if (c.id === legacy.id) {
          match = c;
          break;
        }
        if (legacy.email && c.email && legacy.email.toLowerCase() === c.email.toLowerCase()) {
          match = c;
          break;
        }
        if (legacy.name && c.name && legacy.name.toLowerCase() === c.name.toLowerCase()) {
          match = c;
          break;
        }
      }

      if (match) {
        // Link match to this application if not already linked
        if (!match.applicationIds) match.applicationIds = [];
        if (!match.applicationIds.includes(app.id)) {
          match.applicationIds.push(app.id);
        }
        currentContactIds.add(match.id);
      } else {
        // Create new standalone contact
        const newContactId = legacy.id || `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newContact: Contact = {
          id: newContactId,
          name: legacy.name || 'Contact',
          role: legacy.role,
          organization: legacy.organization || app.company,
          category: legacy.category || 'Other',
          email: legacy.email,
          phone: legacy.phone,
          linkedIn: legacy.linkedIn,
          notes: legacy.notes,
          nextFollowUpDate: legacy.nextFollowUpDate,
          applicationIds: [app.id],
          createdAt: legacy.createdAt || app.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        contactMap.set(newContactId, newContact);
        currentContactIds.add(newContactId);
        migratedCount++;
      }
    }

    return {
      ...app,
      contactIds: Array.from(currentContactIds),
    };
  });

  return {
    migratedContacts: Array.from(contactMap.values()),
    updatedApplications,
    migratedCount,
  };
}
