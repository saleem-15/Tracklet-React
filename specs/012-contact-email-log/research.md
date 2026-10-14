# Research: Contact Email Log with Bidirectional Application Visibility

## Architectural Analysis & Decisions

### 1. Data Model Extension: Contact & EmailLog
- **Context**: Tracklet defines `Contact` in `src/types.ts` without an `emails` field. `Application` defines `emails?: EmailLog[]`.
- **Decision**: Add `emails?: EmailLog[]` to `Contact`. Extend `EmailLog` with optional relation metadata:
  ```ts
  export interface EmailLog {
    id: string;
    subject: string;
    sender: string;
    recipient?: string;
    date: string;
    timestamp?: string;
    direction?: 'inbound' | 'outbound';
    snippet?: string;
    body?: string;
    emailUrl?: string;
    contactId?: string;      // ID of associated Contact
    applicationId?: string;  // ID of associated Application
  }
  ```
- **Rationale**: 
  - Allows standalone contacts (mentors, career coaches) to store email threads directly.
  - Adding `contactId` and `applicationId` to `EmailLog` provides definitive attribution when linking communications between contacts and applications.

---

### 2. Dual-Surface Visibility vs Duplication
- **Challenge**: The user requested that if a contact is linked to a job application and an email is sent to the company for that contact, the email appears in both logs. However, non-company emails (e.g., mentorship) must NOT appear on the application log.
- **Options Evaluated**:
  1. *Physical Duplication*: Copy the email object into both `contact.emails` and `application.emails`.
     - *Cons*: Prone to desync on edit/delete, double storage in Firestore, merge conflicts.
  2. *Unified Hybrid Derivation (Recommended)*:
     - Emails tagged with an `applicationId` reside on `application.emails` (with `contactId: contact.id`).
     - Standalone / direct contact emails reside on `contact.emails`.
     - When viewing `ContactDetailPanel`, the contact's email list is resolved by combining:
       1. `contact.emails || []` (direct emails)
       2. Any emails from applications where `email.contactId === contact.id` OR `email.sender/recipient` matches `contact.email`.
     - Deduplication by `id` ensures every email appears exactly once.
     - When editing or deleting an email:
       - If `email.applicationId` is present, it delegates to `onUpdateApp` / `handleUpdateApplication`.
       - If purely a contact email, it delegates to `onUpdateContact` / `handleUpdateContact`.
     - When logging from `ContactDetailPanel`:
       - If user chooses a linked application: it is saved to that application's emails (with `contactId: contact.id` and `applicationId: app.id`).
       - If user chooses "None" (default): it is saved to `contact.emails`.
- **Benefits**:
  - Zero desynchronization: A single authoritative copy exists.
  - Instant live updates across both drawers in React state.
  - Automatically shows emails logged on `ApplicationDetailPanel` in the contact's timeline if the counterparty is that contact!

---

### 3. Component Modularization (< 300 Lines Rule)
- **Challenge**: `EmailLogSection.tsx` is currently 430 lines because it combines the timeline list, card layout, and an extensive create/edit form.
- **Decision**:
  1. Extract `src/components/detail/EmailLogForm.tsx` (~160 lines): A reusable form for creating/editing email logs, supporting optional `applicationOptions` (when logging from a contact) or quick contact chips (when logging from an application).
  2. Refactor `EmailLogSection.tsx` to use `EmailLogForm.tsx`, bringing `EmailLogSection.tsx` well under 250 lines.
  3. Create `src/components/contacts/ContactEmailLogSection.tsx` (or configure `EmailLogSection`) cleanly styled for the contact drawer.
  4. Ensure all modals and forms follow accessibility rules (WCAG AA contrast, `useEscapeKey`, clear tap targets).

---

### 4. Firestore & LocalStorage Persistence
- **Audit**:
  - `ContactRepository.updateContact` uses `sanitizeForFirestore`, which recursively serializes arrays of objects (`emails: EmailLog[]`).
  - Guest mode uses `saveGuestContacts` (`localStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS)`), which seamlessly serializes `emails`.
  - Backup & Restore (`backupJson.ts`):
    Add `emails` parsing and validation to `parseContactPayload` to preserve full contact history in JSON exports/imports.
