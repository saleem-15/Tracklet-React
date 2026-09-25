# Feature Specification: Customizable Follow-Up Engine & Email Templates

**Feature Branch**: `feat/streamlined-communication-quicklinks`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "I think the user should have to make templates, his own templates. Pre-made templates that we provide, and the user can edit them, edit their title, their body, or even delete them, or add his own with full freedom. Integrated with contacts so any contact can be followed up with, and seamless email actions."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 1-Click Follow-Up Launcher with Built-In Templates (Priority: P1)

A job seeker reviewing an application or a recruiter contact wants to follow up quickly without writing an email from scratch or wondering what etiquette to follow. They click "Follow-up", pick a situational template (e.g. Post-Application Check-In or Post-Interview Thank You), review the populated placeholders (`{company}`, `{role}`, `{contactName}`), and launch their email client or copy the text in one click.

**Why this priority**: Solves the immediate paralysis of email writing for job seekers, providing instant tactical value directly from the application cockpit and contact cards.

**Independent Test**: Can be tested by opening an application with a contact, clicking "Follow-up", selecting a pre-made template, and verifying that `mailto:` or copied text contains correctly interpolated names and job details.

**Acceptance Scenarios**:

1. **Given** an application with company "Linear", role "Senior Frontend Engineer", and recruiter contact "Karla Lindqvist", **When** the user clicks "Follow-up", **Then** a modal opens displaying situational template options with recipient "Karla Lindqvist (karla@linear.app)".
2. **Given** the user selects "Post-Application Check-In", **When** the template loads, **Then** the subject is pre-filled with "Following up on Senior Frontend Engineer application - Linear" and the body addresses "Hi Karla,".
3. **Given** the template is displayed, **When** the user clicks "Open Mail Client", **Then** the default email client opens with the encoded subject and body; **When** they click "Copy Text", **Then** clean text is copied to the clipboard with visual confirmation.

---

### User Story 2 - Full Template Customization & Management (Priority: P2)

A job seeker has their own personal tone or specialized outreach messages. They want the freedom to edit the pre-made templates, create custom follow-up templates, organize their template library, and reset back to defaults whenever needed.

**Why this priority**: Different industries, seniority levels, and communication styles require distinct outreach templates; giving full freedom ensures Tracklet adapts to the user rather than forcing rigid scripts.

**Independent Test**: Can be tested by navigating to the template management interface, editing an existing template, creating a new custom template with dynamic placeholders, saving, and verifying it appears immediately in the Follow-up launcher.

**Acceptance Scenarios**:

1. **Given** the template management interface, **When** the user edits the title, subject, or body of a template and saves, **Then** the updated template persists across sessions.
2. **Given** the template management interface, **When** the user clicks "New Template", **Then** they can define a Title, Subject, Category, and Body containing dynamic placeholder chips (`{company}`, `{role}`, `{contactName}`, `{myRole}`).
3. **Given** a user has modified or deleted built-in templates, **When** they click "Reset Default Templates", **Then** the original curated default templates are restored without losing custom-created templates.

---

### User Story 3 - Contact Auto-Sync & Multi-Contact Outreach (Priority: P3)

An application has multiple linked contacts (e.g. Recruiter, Hiring Manager, Peer). The user wants the QuickLinks card to automatically reflect the primary recruiter without duplicate typing, and wants a 1-click Follow-up action directly on each individual contact card in the Contacts section.

**Why this priority**: Eliminates data duplication and awkward synchronization between the Application's `contactEmail` and the Contacts Hub.

**Independent Test**: Can be tested by linking a new contact to an application and verifying that the primary contact card and Follow-up action appear automatically without editing application info.

**Acceptance Scenarios**:

1. **Given** an application with one or more linked contacts, **When** viewing Application QuickLinks, **Then** the primary contact email and name are automatically derived from the linked contacts list.
2. **Given** multiple contacts linked to an application, **When** clicking "Follow-up" from QuickLinks, **Then** the user can toggle between recipients in a single dropdown.
3. **Given** any contact card in the Contact Manager section with a valid email, **When** viewing the card, **Then** a dedicated "Follow-up" button is visible alongside the copy and compose actions.

---

### Edge Cases

- **No contact linked to application**: If an application has no linked contacts, the Follow-up modal allows typing a one-off recipient email or offers a "+ Link a Contact" shortcut.
- **Contact has no person name**: If a contact only has an email (e.g. `careers@company.com`), `{contactName}` gracefully falls back to "Hiring Team" rather than leaving a blank or broken token.
- **URL encoding limits in mailto**: Long template bodies can exceed mailto URI length limits (~2000 chars) in some web browsers; the UI MUST prominently offer "Copy Text" and warn or default to clipboard copy if content is long.
- **Missing application fields**: If `{role}` or `{company}` is not set on the application, templates use sensible fallback phrasing (e.g., "my application" instead of "undefined application").

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide curated built-in follow-up email templates:
  - *Post-Application Check-In* (7–14 days no response)
  - *Post-Interview Thank You* (within 24 hours of conversation)
  - *Status Inquiry* (5–7 days following interview/assessment)
  - *Offer Discussion / Counter-Offer*
- **FR-002**: System MUST interpolate dynamic variables in template subjects and bodies:
  - `{company}`: Target company name
  - `{role}`: Target role title
  - `{contactName}`: Contact first name or full name (fallback: "Hiring Team")
  - `{dateApplied}`: Formatted date applied
- **FR-003**: Users MUST be able to launch `mailto:` with URI-encoded subject and body, or copy formatted text with one click.
- **FR-004**: Users MUST be able to create new custom templates with custom title, subject, body, and category.
- **FR-005**: Users MUST be able to edit and delete existing templates.
- **FR-006**: System MUST provide a "Reset Defaults" action to restore factory templates.
- **FR-007**: Template storage MUST persist locally (localStorage) for guests and synchronize with user profile in Firestore for authenticated users.
- **FR-008**: System MUST support template management in **both** surfaces:
  - Inside the **Follow-Up Launcher Modal** via an inline "Manage / Custom Templates" view for fast in-context creation and editing.
  - Inside the **Settings View** via a dedicated "Follow-Up Templates" card for full library management, reordering, and default resets.
- **FR-009**: When a follow-up email is launched or copied, the system MUST:
  - Record a timestamped interaction milestone on the application timeline (`Follow-up sent to [Contact] ([Template Name])`).
  - Provide an optional 1-click action (or in-modal checkbox) to automatically generate a follow-up reminder task due in 5 business days (`Follow up with [Contact] if no response`).
- **FR-010**: All UI components and buttons MUST adhere strictly to Tracklet's design tokens (slate/blue palette, no rogue purple, WCAG AA contrast).
- **FR-011**: Application QuickLinks MUST auto-resolve the primary contact from the application's linked contacts list if `contactEmail` is not explicitly set.
- **FR-012**: Contact cards in `ContactManagerSection` and `ContactDetailPanel` MUST display a 1-click Follow-up button when an email is present.

---

### Key Entities

- **FollowUpTemplate**:
  - `id`: string (e.g. `tmpl-thank-you`)
  - `title`: string (e.g. "Post-Interview Thank You")
  - `subject`: string (e.g. "Thank you for your time today - {role}")
  - `body`: string (markdown/plaintext template with `{variable}` tags)
  - `category`: string ("Post-Application" | "Interview" | "Offer" | "Networking" | "Custom")
  - `isBuiltIn`: boolean (flags factory defaults)
  - `createdAt`: ISO timestamp string
  - `updatedAt`: ISO timestamp string

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open an application, select a follow-up template, and copy/open it in their email client in under **10 seconds**.
- **SC-002**: Creating a new custom template with dynamic placeholders takes under **60 seconds**.
- **SC-003**: 100% of interpolated variables render cleanly without broken braces or "undefined" values across all edge cases.
- **SC-004**: Zero UI layout shifts or color token mismatches with existing Tracklet design standards.

---

## Assumptions

- Users use external webmail (Gmail, Outlook, Superhuman) or desktop mail clients (Apple Mail, Thunderbird). Tracklet does not send SMTP emails directly.
- Template interpolation happens client-side at the moment of modal launch or preview.
- Default templates are stored in a constants registry and copied to editable storage upon user customization.
