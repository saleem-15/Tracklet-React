# Legacy Contacts Migration Removal Guide

This guide describes how to clean up one-time legacy migration code introduced during **Feature 004: Unified Contacts & Mentorship Hub**.

---

## When to Remove
Once your accounts have logged in and existing job applications with embedded contacts have been converted to standalone contact records in Firestore and LocalStorage.

---

## Instructions for Any Future AI

Whenever you want an AI to remove the migration, you can simply say:
> **"Remove legacy contact migration code using the `remove-legacy-contacts-migration` skill."**

Or follow these steps manually:

### 1. Delete `src/lib/contactMigration.ts`
Delete the file:
```bash
rm src/lib/contactMigration.ts
```

### 2. Update `src/App.tsx`
- Remove: `import { migrateLegacyEmbeddedContacts } from './lib/contactMigration';`
- In `loadData()`: Remove the calls to `migrateLegacyEmbeddedContacts(...)`. Set loaded data directly:
  ```ts
  setApplications(loadedApps);
  setContacts(loadedContacts);
  ```

### 3. Clean up `Application` Interface in `src/types.ts`
- Remove `contacts?: Contact[];` from `Application` interface.

### 4. Verify Build
```bash
npx tsc --noEmit
npm run build
```
