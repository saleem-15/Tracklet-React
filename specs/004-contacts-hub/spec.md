# Feature Specification: Unified Contacts & Mentorship Hub

**Feature Branch**: `004-contacts-hub`

**Created**: 2026-09-01

**Status**: Draft

**Input**: User description: "Add a unified contacts and mentorship hub with a dedicated ContactRepository, search-first typeahead combobox for application linking, and support for standalone mentors/networking contacts."

## Clarifications

### Session 2026-09-01

- Q: What should happen to contacts currently stored as embedded objects inside each application's `contacts[]` array? → A: Auto-migrate. On first load after the feature ships, existing embedded contacts are extracted, deduplicated by name, saved as standalone Contact entities, and linked back to their original applications. The embedded `contacts[]` array is cleared after migration.
- Q: Should the Contacts directory default to a card/grid layout or a compact table layout? → A: Both modes with a layout toggle. Card grid is the default display. Users can switch to a compact table view via a toggle. Both modes are built in v1.
- Q: Should the follow-up reminder badge threshold be user-configurable or fixed at 48 hours? → A: Reuse the existing configurable `ExpiryNotificationSettings` threshold from Settings. The follow-up badge uses the same user-configured hours value that task expiry already uses.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse & Manage All Contacts (Priority: P1)

A job seeker navigates to the **Contacts** tab in the sidebar to view every contact they have recorded — mentors, recruiters, referrals, and hiring managers — in one centralised directory. They can search by name, role, or organisation, filter by category (Mentor, Recruiter, etc.), and add new contacts directly from this view.

**Why this priority**: Without a place to see and manage contacts independently of job applications, every subsequent feature (linking, follow-ups, search) has no foundation. This is the minimum viable slice.

**Independent Test**: Can be fully tested by opening the Contacts tab, adding a new contact with name/category/organisation, verifying it appears in the directory, editing it, and deleting it.

**Acceptance Scenarios**:

1. **Given** the user has no contacts yet, **When** they navigate to the Contacts tab, **Then** they see an empty-state illustration with a prompt "Add your first contact" and a primary action button.
2. **Given** the user has 12 contacts, **When** they type "TAP" into the search bar, **Then** only contacts whose name, role, or organisation match "TAP" are displayed instantly (client-side filter, no server round-trip).
3. **Given** the user clicks "+ Add Contact", **When** they fill in name, category, and organisation and submit, **Then** the contact is persisted and appears in the directory immediately.
4. **Given** the user clicks a contact card, **When** the contact detail drawer opens, **Then** they can edit every field, and changes are saved on confirm.
5. **Given** the user deletes a contact, **When** a confirmation snackbar with "Undo" appears, **Then** clicking Undo restores the contact.
6. **Given** the user is viewing the Contacts directory in card grid mode, **When** they click the layout toggle, **Then** the view switches to a compact table layout. The selected layout preference persists across sessions.

---

### User Story 2 — Link Existing Contact to a Job Application via Search (Priority: P1)

While viewing a job application's detail panel, the user wants to associate an existing contact (e.g., a mentor who referred them) with this application. They click "Attach Contact", a search-first typeahead input opens, they type a few characters, select the matching contact in one click, and the link is established.

**Why this priority**: This is the highest-value UX improvement over the current system. Today contacts are duplicated per application; linking eliminates redundancy and makes the mentorship connection visible.

**Independent Test**: Can be fully tested by creating a contact in the Contacts tab, opening a job application detail panel, attaching the contact via search, and verifying the contact appears under the application's contacts section.

**Acceptance Scenarios**:

1. **Given** the user has contacts "John Doe — TAP Mentor" and "Sarah Chen — Stripe Recruiter", **When** they click "Attach Contact" on a job detail panel and type "Jo", **Then** a dropdown shows "John Doe — Career Mentor · TAP Program" as a match.
2. **Given** the search input is focused, **When** the user types a query with no matches, **Then** an inline option "➕ Create new contact '[query]'" appears at the bottom of the dropdown, allowing instant creation.
3. **Given** "John Doe" is already linked to this application, **When** the search dropdown opens, **Then** "John Doe" does not appear in the results (no duplicate linking).
4. **Given** the user selects a contact from the dropdown and the link succeeds, **Then** a success snackbar appears and the contact is displayed in the application's contact section immediately.

---

### User Story 3 — View & Navigate Linked Applications from a Contact (Priority: P2)

When viewing a contact's detail drawer, the user can see every job application that contact is linked to. They can click any application to jump directly to that application's detail panel.

**Why this priority**: Adds bidirectional navigability (contact → applications), which is essential for mentors linked to multiple jobs but is not needed for the core MVP to be usable.

**Independent Test**: Can be fully tested by linking a contact to two different job applications, opening the contact detail, and clicking each linked application to verify navigation.

**Acceptance Scenarios**:

1. **Given** "John Doe" is linked to "Stripe — Frontend Engineer" and "Google — SWE Intern", **When** the user opens John Doe's contact detail, **Then** both applications appear as clickable pills under a "Linked Applications" section.
2. **Given** the user clicks "Stripe — Frontend Engineer" pill, **Then** the contact drawer closes and the application detail panel for that job opens.
3. **Given** a contact has no linked applications, **Then** the "Linked Applications" section shows "No linked applications" with an option to attach one.

---

### User Story 4 — Standalone Mentor / Networking Contact with Follow-up Date (Priority: P2)

A user manages mentors from programs like TAP who are not tied to any specific job application. They add a contact with category "Mentor", set an optional "Next Follow-up" date, and record meeting agenda notes. The follow-up date surfaces as a reminder in the sidebar badge.

**Why this priority**: Core value proposition for mentorship programs, but the contacts hub is usable without follow-up tracking.

**Independent Test**: Can be fully tested by creating a mentor contact, setting a follow-up date to tomorrow, and verifying a badge appears in the sidebar.

**Acceptance Scenarios**:

1. **Given** the user creates a contact with category "Mentor" and sets next follow-up to tomorrow, **When** they view the sidebar, **Then** the Contacts tab badge shows "1" (or increments by 1).
2. **Given** a mentor contact has no follow-up date, **Then** no badge count is contributed from this contact.
3. **Given** the follow-up date has passed, **Then** the contact card in the directory shows a visual "overdue" indicator.

---

### User Story 5 — Unlink a Contact from a Job Application (Priority: P3)

The user removes the association between a contact and a specific job application without deleting the contact from the global directory.

**Why this priority**: Less frequent action; users will primarily link, not unlink.

**Independent Test**: Can be fully tested by linking a contact to an application, unlinking it, and verifying the contact still exists in the Contacts tab but no longer appears under the application.

**Acceptance Scenarios**:

1. **Given** "Sarah Chen" is linked to "Stripe — Frontend Engineer", **When** the user clicks the unlink icon next to Sarah's name in the application detail panel, **Then** Sarah is removed from this application's contacts but remains in the global Contacts directory.
2. **Given** the unlink action completes, **Then** a snackbar with "Undo" appears; clicking Undo restores the link.

---

### User Story 6 — Inline-Create a New Contact from the Application Detail Panel (Priority: P3)

While attaching a contact to a job application, if the person doesn't exist yet, the user can create them inline without leaving the application detail view. The new contact is simultaneously added to the global directory and linked to the current application.

**Why this priority**: Convenience flow; users can always create contacts from the Contacts tab first and then link them.

**Independent Test**: Can be fully tested by opening an application detail panel, clicking "Attach Contact", typing a name that doesn't exist, selecting "Create new", filling in details, and verifying the contact appears both in the application's contacts and the global Contacts tab.

**Acceptance Scenarios**:

1. **Given** the user types "Alex Kim" in the typeahead and no match exists, **When** they click "➕ Create new contact 'Alex Kim'", **Then** an inline form expands with the name pre-filled.
2. **Given** the user fills in category and role and submits, **Then** the contact is saved to the global directory AND linked to the current application.
3. **Given** the inline create form is open, **When** the user clicks cancel, **Then** the form collapses and no contact is created.

---

### Edge Cases

- What happens when a contact is deleted from the global directory while it is linked to one or more applications? The link references are cleaned up, and the contact is removed from all applications' contact sections.
- What happens if the user tries to create a contact with only a name and no other fields? The contact is created successfully — name is the only required field.
- What happens when the user is in guest mode (unauthenticated)? Contacts are stored in localStorage with the same guest-mode pattern used for applications. Upon sign-in, guest contacts are migrated alongside guest applications.
- What happens if the search typeahead input is opened but the user has zero contacts? The dropdown shows only the "Create new contact" fallback option.
- How does the system handle very long contact lists (e.g., 200+ contacts)? The Contacts directory uses client-side virtual scrolling or paginated rendering. The search typeahead shows a maximum of 10 results at a time.
- What happens to legacy embedded contacts already stored in applications' `contacts[]` arrays? They are auto-migrated into the new standalone Contacts directory on first load, deduplicated by name, linked back to their originating applications, and the legacy embedded array is cleared after successful migration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated "Contacts" tab in the sidebar navigation that displays a count badge for contacts with follow-up dates due within the user-configured expiry threshold (reusing the existing `ExpiryNotificationSettings` hours value from Settings).
- **FR-002**: System MUST persist contacts as first-class entities, independent of job applications, with their own dedicated storage collection (Firestore sub-collection and localStorage fallback).
- **FR-003**: Users MUST be able to create, view, edit, and delete contacts from the Contacts directory view.
- **FR-004**: Each contact MUST have a required "name" field and optional fields: role, organisation, category, email, phone, LinkedIn URL, notes, and next follow-up date.
- **FR-005**: System MUST support categorising contacts as: Mentor, Recruiter, Hiring Manager, Referral, Peer / Alumni, or Other.
- **FR-006**: Users MUST be able to link an existing contact to a job application via a search-first typeahead combobox within the application detail panel.
- **FR-007**: The typeahead search MUST filter contacts by name, role, and organisation and MUST exclude contacts already linked to the current application.
- **FR-008**: The typeahead MUST display a "Create new contact" fallback option when no matches are found, pre-filling the search query as the contact name.
- **FR-009**: Users MUST be able to unlink a contact from a job application without deleting the contact from the global directory.
- **FR-010**: The contact detail drawer MUST display all job applications that a contact is linked to, with clickable navigation to each application's detail panel.
- **FR-011**: Deleting a contact from the global directory MUST automatically remove all link references from every associated application.
- **FR-012**: All destructive actions (delete contact, unlink contact) MUST display a snackbar with an "Undo" callback.
- **FR-013**: Guest-mode (unauthenticated) contacts MUST be stored in localStorage and migrated to Firestore upon sign-in, following the same migration pattern as guest applications.
- **FR-014**: System MUST provide search and category filtering in the Contacts directory view (client-side).
- **FR-015**: On first load after the feature ships, the system MUST automatically migrate existing embedded contacts from each application's `contacts[]` array into the new standalone Contacts directory. Contacts are deduplicated by name during migration, linked back to their originating applications, and the legacy embedded `contacts[]` array is cleared after successful migration.
- **FR-016**: The Contacts directory MUST support two display modes — card grid (default) and compact table — switchable via a layout toggle. The user's layout preference MUST persist across sessions.

### Key Entities

- **Contact**: A person the user interacts with during their job search. Key attributes: name (required), role, organisation, category, email, phone, LinkedIn URL, notes, next follow-up date, list of linked application IDs. A contact can exist independently of any job application (e.g., a standalone mentor) or be linked to one or more applications.
- **Contact ↔ Application Link**: A many-to-many relationship between contacts and applications. One contact can be linked to multiple applications. One application can have multiple linked contacts. The link is stored as an array of application IDs on the contact entity and as an array of contact IDs on the application entity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new contact and see it in the directory in under 10 seconds.
- **SC-002**: Users can find and link an existing contact to a job application in under 5 seconds using the search typeahead (measured from clicking "Attach Contact" to the link being confirmed).
- **SC-003**: Navigating between a contact's detail view and a linked application's detail view takes no more than one click.
- **SC-004**: All contact operations (create, edit, delete, link, unlink) provide immediate visual feedback via snackbars or inline status indicators within 500ms of the action.
- **SC-005**: The Contacts directory renders and becomes interactive within 1 second for up to 200 contacts.
- **SC-006**: Guest-mode contacts are fully migrated to the user's account on first sign-in without data loss.

## Assumptions

- The existing authentication and guest-mode infrastructure (AuthContext, GuestMigrationModal) is reused and extended for contacts without rebuilding auth.
- The existing sidebar navigation component supports adding a new tab entry without structural changes.
- Contacts are stored in a separate persistence collection from applications (dedicated Firestore sub-collection `/users/{userId}/contacts` and distinct localStorage key `tracklet_contacts`), following the principle of single responsibility.
- The contact-to-application linking is maintained bidirectionally: the contact entity stores an array of application IDs, and the application entity stores an array of contact IDs.
- Mobile-responsive layout for the Contacts view follows the same breakpoint patterns already established in the All Applications table and Pipeline board.
- No third-party contact import (e.g., Google Contacts, LinkedIn export) is included in this version.
- Legacy embedded `contacts[]` arrays on existing applications will be migrated and cleared. After migration, the `contacts[]` field on the Application entity is replaced by a `contactIds[]` field referencing standalone Contact entities.
- The follow-up badge threshold reuses the existing `ExpiryNotificationSettings` infrastructure from Settings, sharing the same configurable hours value used for task expiry notifications.
