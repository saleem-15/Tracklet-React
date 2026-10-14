# Feature Specification: Contact Email Log with Application Cross-Visibility

**Feature Branch**: `feat/contact-email-log`
**Spec Directory**: `specs/012-contact-email-log`
**Created**: 2026-10-13
**Status**: Ready for Planning

## Overview

Tracklet currently supports logging email threads within individual Job Applications (`ApplicationDetailPanel`). However, users maintain relationships with career coaches, mentors, alumni, and industry peers who are not linked to any specific job application. Currently, users are forced to paste email communications into the contact's freeform notes area.

This feature introduces a dedicated **Email Log** for Contacts (`ContactDetailPanel`), allowing users to record inbound and outbound emails directly on any contact record. Crucially, when a contact is linked to one or more job applications, emails designated for that company/application must have bidirectional visibility across both the Contact and Application email logs, while non-application emails (such as personal mentorship advice) remain strictly isolated to the contact.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log Email Communications for Standalone Contacts (Priority: P1)

As a job seeker with mentors and career coaches not linked to any job application,
I want to log inbound and outbound email milestones directly on their contact profile,
So that I can maintain a chronological audit trail of communication without cluttering my contact notes.

**Why this priority**:
Solves the primary user pain point: copy-pasting email threads into the notes section for standalone mentors and advisors.

**Independent Test**:
Create a contact with category "Mentor" (with no linked applications). Open their contact detail panel, click "Log Email", input subject, direction, date, and body snippet, and save. Verify the email appears in the contact's email timeline. Verify the contact's notes section remains clean and unpolluted.

**Acceptance Scenarios**:
1. **Given** a contact with no linked job applications, **When** the user logs an email from the contact detail panel, **Then** the email is saved directly to the contact and appears in the contact's email timeline sorted chronologically.
2. **Given** an existing contact email entry, **When** the user edits the subject, counterparty, date, or body, **Then** the contact's email entry updates immediately and reflects the changes.
3. **Given** an existing contact email entry, **When** the user deletes the email log entry, **Then** the item is removed with an undo receipt snackbar.

---

### User Story 2 - Cross-Visibility for Application-Linked Emails (Priority: P2)

As a job seeker emailing a recruiter or hiring manager who is linked to a job application,
I want company-related emails to be visible in both the contact's profile and the application's email timeline,
So that I have a complete communication history in both contexts without manual duplication.

**Why this priority**:
Ensures seamless consistency across the app so the user never has to copy an email between an application and its associated contact.

**Independent Test**:
Link Contact "Alice (Recruiter)" to Application "Acme Corp (Frontend Engineer)". Log an email on Acme Corp addressed to Alice. Open Alice's contact profile; verify the Acme Corp email appears with an "Acme Corp" application badge. Conversely, log an email from Alice's profile selecting "Acme Corp" as the associated application; verify the email appears in Acme Corp's email log.

**Acceptance Scenarios**:
1. **Given** an application with a linked contact, **When** an email is logged on the application that targets the linked contact (by contact association or email matching), **Then** that email automatically appears in the contact's email timeline with an application reference tag.
2. **Given** a contact linked to one or more applications, **When** logging an email from the contact profile, **Then** the user is offered an optional "Link to Job Application" dropdown showing their linked applications (plus "None / General Communication").
3. **Given** a user selects a linked application when logging an email on the contact, **Then** the email appears in both the contact's email timeline and the target application's email timeline.
4. **Given** a user selects "None" (or the contact has no linked applications), **Then** the email remains strictly on the contact and does NOT appear on any application's timeline.

---

### User Story 3 - Filtering and Context Badges in Contact Email Timeline (Priority: P3)

As a job seeker reviewing communication history with a multi-context contact,
I want clear visual indicators distinguishing general mentorship emails from company-specific job application emails,
So that I can quickly understand the context of each communication touchpoint.

**Why this priority**:
Provides cognitive clarity when a single contact (e.g., an industry mentor who also referred the user to a company) has both personal and company-related threads.

**Independent Test**:
On a contact with 1 general mentorship email and 1 Acme Corp referral email, open the contact detail panel. Verify the Acme Corp email displays a clickable badge navigating to Acme Corp, while the mentorship email displays standard contact metadata.

**Acceptance Scenarios**:
1. **Given** an email in the contact timeline associated with a job application, **Then** an application badge (Company Name · Stage) is displayed alongside the email details.
2. **Given** an email badge for a linked application, **When** clicked, **Then** the user is navigated directly to that application's detail panel.

---

## Edge Cases

- **Unlinked Contact**: What happens if an application-linked email is logged, and the user later unlinks the contact from the application?
  - Existing emails explicitly linked via `applicationId` and `contactId` remain preserved on both entities. The badge reflects the historic company name.
- **Multiple Linked Applications**: What happens if a contact is linked to multiple job applications (e.g., an external agency recruiter placing the user at 2 companies)?
  - The email log creation form in the contact profile allows selecting among all linked applications or "None".
- **Empty / Guest State**: How does email logging work for guest users?
  - Operates identically in guest mode with instant local storage persistence and full undo capability.
- **Counterparty Auto-population**: When opening "Log Email" on a contact profile:
  - If outbound ("Sent"), the counterparty defaults to the contact's email or name.
  - If inbound ("Received"), the counterparty defaults to the contact's email or name.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Contact records MUST support a native `emails?: EmailLog[]` collection.
- **FR-002**: `ContactDetailPanel` MUST include an Email Log section rendered below linked applications and above/below notes, using the unified timeline design language established in `EmailLogSection`.
- **FR-003**: The contact email logging form MUST support `direction` (Received/Sent), `subject`, `counterparty` (pre-filled with contact name/email), `date`, `emailUrl`, `body`, and an optional `applicationId` selector when the contact has linked applications.
- **FR-004**: If an email is logged on an Application with a recipient/sender matching a linked contact (or explicitly tagged with `contactId`), it MUST appear in that contact's email timeline.
- **FR-005**: If an email is logged on a Contact with an associated `applicationId`, it MUST appear in that application's email timeline.
- **FR-006**: If an email is logged on a Contact with NO associated application (or "None" selected), it MUST NOT appear on any application's email timeline.
- **FR-007**: Deleting an email from either surface MUST safely remove the email and offer an Undo snackbar.
- **FR-008**: Editing an email from either surface MUST update all view representations consistently.
- **FR-009**: JSON backup and restore (`src/lib/backupJson.ts`) MUST serialize and deserialize `emails` on contacts without data loss.

---

### Key Entities

- **Contact**: Represents a person in the user's network. Gains an `emails?: EmailLog[]` attribute for direct email history.
- **EmailLog**: Represents an email interaction record (`id`, `subject`, `sender`, `recipient`, `date`, `timestamp`, `direction`, `snippet`, `body`, `emailUrl`, optional `contactId`, optional `applicationId`).
- **Application**: Represents a job application, which references `contactIds` and contains `emails?: EmailLog[]`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can log an email on a standalone contact profile in under 15 seconds without leaving the contact drawer.
- **SC-002**: 100% of emails logged with a selected application appear in both the contact drawer and the application modal with zero data duplication conflicts.
- **SC-003**: 100% of emails logged without an application association remain strictly private to the contact and do not appear on any job application.
- **SC-004**: Zero regressions in existing application email logging, CSV import/export, or backup/restore workflows.

---

## Assumptions

- Users manually log or clip emails using Tracklet's built-in forms or browser companion extension.
- Full two-way email sync uses lightweight, durable references (`contactId` and `applicationId` on `EmailLog`) supported by existing Firestore and localStorage persistence layers.
