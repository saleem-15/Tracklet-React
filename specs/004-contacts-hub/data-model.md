# Data Model: Unified Contacts & Mentorship Hub

**Feature**: 004-contacts-hub | **Date**: 2026-09-01

## Entities

### Contact (NEW)

First-class entity stored in `/users/{userId}/contacts` (Firestore) or `tracklet_contacts` (localStorage).

| Field            | Type                | Required | Default       | Notes                                                    |
| ---------------- | ------------------- | -------- | ------------- | -------------------------------------------------------- |
| `id`             | `string`            | Yes      | Auto-generated| Firestore doc ID or `guest-contact-{timestamp}`          |
| `userId`         | `string`            | Yes      | From auth     | Owner user ID or `'guest'`                               |
| `name`           | `string`            | Yes      | —             | Only required field. Trimmed, non-empty.                 |
| `role`           | `string`             | No       | `undefined`   | e.g., "Senior Staff Engineer", "Career Mentor"           |
| `organization`   | `string`             | No       | `undefined`   | e.g., "TAP Program", "Google", "Independent"             |
| `category`       | `ContactCategory`   | No       | `'Other'`     | See `ContactCategory` union type below                   |
| `email`          | `string`             | No       | `undefined`   | Email address                                            |
| `phone`          | `string`             | No       | `undefined`   | Phone number                                             |
| `linkedIn`       | `string`             | No       | `undefined`   | LinkedIn profile URL                                     |
| `notes`          | `string`             | No       | `undefined`   | Free-text notes (meeting agendas, prep, etc.)            |
| `nextFollowUpDate` | `string`           | No       | `undefined`   | `YYYY-MM-DD` format. Drives sidebar badge.               |
| `applicationIds` | `string[]`          | No       | `[]`          | IDs of linked Application entities                       |
| `createdAt`      | `string`            | Yes      | ISO now       | ISO 8601 timestamp                                       |
| `updatedAt`      | `string`            | Yes      | ISO now       | ISO 8601 timestamp                                       |

### ContactCategory (NEW type)

```typescript
export type ContactCategory =
  | 'Mentor'
  | 'Recruiter'
  | 'Hiring Manager'
  | 'Referral'
  | 'Peer / Alumni'
  | 'Other';
```

### Application (MODIFIED)

Changes to the existing `Application` interface:

| Field          | Change    | Type       | Notes                                                        |
| -------------- | --------- | ---------- | ------------------------------------------------------------ |
| `contacts`     | **REMOVE** | —          | Legacy embedded array. Cleared after migration.              |
| `contactIds`   | **ADD**   | `string[]` | References to standalone Contact entity IDs. Default `[]`.   |
| `contactEmail` | **KEEP**  | `string`   | Retained for backward compatibility (standalone quick-email). |

### Relationship: Contact ↔ Application

```
Contact.applicationIds[]  ←→  Application.contactIds[]
```

- **Cardinality**: Many-to-many
- **Consistency**: Both sides updated atomically during link/unlink operations
- **Cascade on delete**: Deleting a Contact removes its ID from all linked Application `contactIds[]` arrays

## State Transitions

Contacts have no formal state machine (no status lifecycle). The only lifecycle events are:

1. **Created** → Entity persisted (Firestore or localStorage)
2. **Linked** → `applicationIds` updated on Contact, `contactIds` updated on Application
3. **Unlinked** → Reverse of link
4. **Updated** → Any field change, `updatedAt` refreshed
5. **Deleted** → Entity removed, cascade cleans `contactIds` on all linked applications

## Validation Rules

| Rule                                    | Scope        | Enforcement         |
| --------------------------------------- | ------------ | ------------------- |
| `name` must be non-empty after trim     | Contact      | Form validation + Repository guard |
| `email` must be valid format if provided | Contact     | Form validation (regex) |
| `linkedIn` must be valid URL if provided | Contact     | Form validation     |
| `nextFollowUpDate` must be `YYYY-MM-DD` | Contact     | Date picker enforces |
| `applicationIds` must reference existing apps | Contact | Best-effort (stale IDs cleaned on read) |
| No duplicate links (same contact-app pair) | Link operation | Guard in link function |

## Migration Schema

### Legacy → New (one-time, on first load)

```
Application.contacts[] (embedded Contact objects)
  ↓ extract + deduplicate by normalized name
Contact entities (standalone, in /users/{userId}/contacts)
  ↓ link back
Application.contactIds[] (reference IDs)
  ↓ clear
Application.contacts[] → removed
```

**Deduplication key**: `name.trim().toLowerCase()`

When two embedded contacts across different applications share the same normalized name, they are merged into a single standalone Contact. Fields from the first occurrence are used; non-empty fields from subsequent occurrences fill any gaps.

**Migration flag**: `localStorage.getItem('tracklet_contacts_migrated')` — set to `'true'` after successful migration. For authenticated users, also stored as a Firestore user profile field to prevent re-migration across devices.
