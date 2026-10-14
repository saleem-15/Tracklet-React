# Implementation Tasks: Contact Email Log with Bidirectional Application Visibility

**Feature**: `012-contact-email-log`  
**Branch**: `feat/contact-email-log`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup & Foundational Data Model

- [x] **T001** [P]: Update `src/types.ts`
  - Add `emails?: EmailLog[]` to the `Contact` interface.
  - Add optional `contactId?: string` and `applicationId?: string` to `EmailLog`.
- [x] **T002** [P]: Update `src/lib/backupJson.ts`
  - In `parseContactPayload` / export logic, serialize and deserialize `emails` on contacts without data loss.
- [x] **T003** [P]: Update `src/lib/sampleData.ts`
  - Add sample `emails` to initial contacts (e.g., Dr. Marcus Chen / mentor persona) to provide realistic test data.

---

## Phase 2: User Story 1 (P1) - Standalone Contact Email Logging

- [x] **T004** [P]: Extract `src/components/detail/EmailLogForm.tsx`
  - Create a dedicated, reusable email log form (< 180 lines) containing direction toggle, subject, counterparty, date, URL, body, and optional application dropdown selector.
- [x] **T005**: Refactor `src/components/detail/EmailLogSection.tsx`
  - Use `EmailLogForm` inside `EmailLogSection.tsx`, reducing its file length from 430 lines to < 250 lines while preserving all existing behaviors.
- [x] **T006**: Create `src/components/contacts/ContactEmailLogSection.tsx`
  - Implement a specialized contact email log section (< 250 lines) rendering the timeline spine, `EmailLogCard` list, empty state, and `EmailLogForm`.
- [x] **T007**: Integrate `ContactEmailLogSection` into `src/components/ContactDetailPanel.tsx`
  - Add `ContactEmailLogSection` below Linked Applications and above Notes in view mode.
  - Implement handlers for adding, updating, and deleting contact emails, utilizing `onUpdateContact` and `onShowToast` with an Undo receipt.

---

## Phase 3: User Story 2 (P2) - Cross-Visibility for Application-Linked Emails

- [x] **T008**: Implement Unified Email Derivation in `src/components/ContactDetailPanel.tsx`
  - Combine direct `contact.emails` with all emails from `applications` where `email.contactId === contact.id` or counterparty matches `contact.email`.
  - Deduplicate by `email.id` and sort newest first by `timestamp || date`.
- [x] **T009**: Enable Application Linking in Contact Email Form
  - When a contact has linked applications, populate the "Associate with Job Application" dropdown in `EmailLogForm`.
  - When an application is selected, save the email to the chosen application via `onUpdateApplication` (tagged with `contactId` and `applicationId`).
  - When "None" is selected, save directly to `contact.emails`.
- [x] **T010**: Tag Contact Attribution in `ApplicationDetailPanel.tsx`
  - When an email is logged on an application and the counterparty matches an existing contact or chip, automatically attach `contactId: contact.id`.

---

## Phase 4: User Story 3 (P3) - Context Badges & Cross-Navigation

- [x] **T011**: Add Application Badge & Navigation in `src/components/detail/EmailLogCard.tsx`
  - When `email.applicationId` is present, display a clickable company badge (`Company · Stage`).
  - When clicked, trigger `onNavigateToApplication(appId)` to open that application's detail panel.

---

## Phase 5: Verification & Quality Assurance

- [x] **T012**: Run Typecheck & Tests
  - Run `npx tsc --noEmit` and resolve any type errors.
  - Run `npm test` to ensure zero regressions across all unit tests.
- [x] **T013**: Production Build Verification
  - Run `npm run build` to confirm clean compilation and asset packaging.
