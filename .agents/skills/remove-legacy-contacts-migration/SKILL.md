---
name: remove-legacy-contacts-migration
description: Step-by-step instructions for safely removing legacy embedded contacts auto-migration logic from Tracklet once all user accounts have migrated to the standalone Contacts Hub model.
---

# Skill: Removing Legacy Contacts Migration Code

Use this skill when all user accounts and devices have completed the transition to the standalone Contacts & Mentors Hub (Feature `004-contacts-hub`) and you want to clean up one-time legacy migration logic.

---

## Pre-requisites Before Removal
- Both/all user accounts have logged in at least once so their legacy embedded `application.contacts` arrays were converted to standalone records in `/users/{userId}/contacts` (and `tracklet_guest_contacts_v1`).

---

## Step 1: Delete Migration Utility File
Delete the isolated migration file:
- **Delete**: `src/lib/contactMigration.ts`

---

## Step 2: Remove Migration Call in `src/App.tsx`
In `src/App.tsx`:
1. Remove the import:
   ```ts
   // Remove this line:
   import { migrateLegacyEmbeddedContacts } from './lib/contactMigration';
   ```
2. In `loadData()`:
   Remove the migration execution blocks under both `if (user && user.emailVerified)` and `else if (!user)`:
   ```ts
   // Remove this block:
   const { migratedContacts, updatedApplications, migratedCount } = migrateLegacyEmbeddedContacts(
     loadedApps,
     loadedContacts
   );
   if (migratedCount > 0) {
     loadedApps = updatedApplications;
     loadedContacts = migratedContacts;
     for (const newC of migratedContacts) {
       ContactRepository.addContact(newC, user.uid).catch(() => {});
     }
   }
   ```
   Directly set the state with the loaded data:
   ```ts
   setApplications(loadedApps);
   setContacts(loadedContacts);
   ```

---

## Step 3: (Optional Cleanup) Remove Deprecated Embedded Field from Data Model
1. In `src/types.ts`:
   - Under the `Application` interface, remove the deprecated `contacts?: Contact[];` field (leaving `contactIds?: string[];`).
2. In `src/components/detail/ContactManagerSection.tsx`:
   - Remove the `legacyContacts?: Contact[];` prop and rely solely on `linkedContactIds` and `allContacts`.
3. In `src/components/ApplicationDetailPanel.tsx`:
   - Remove `legacyContacts={app.contacts || []}` from the `<ContactManagerSection />` JSX invocation.

---

## Step 4: Verification
Execute the verification suite to ensure zero compiler errors:
```bash
npx tsc --noEmit
npm run build
```
Verify the build finishes with exit code `0`.
