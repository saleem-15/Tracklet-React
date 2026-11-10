# Feature Specification: Intent-Driven User Onboarding Flow & Capability Discovery

**Feature Branch**: `015-user-onboarding-flow`  
**Created**: 2026-10-25  
**Status**: Ready for Review / Planning  
**Input**: User request: "I want to do an onboarding flow. For example, I want the onboarding to be simple, friendly, and onboard the user with ease. Onboard him about the extension and its capabilities, that he can import his data, and he can export it also, and any other important thing that may not be obvious because something like an import and export is buried in the settings. I want you to think deeply about this."

---

## Overview & Strategic Rationale

When a new user signs up for Tracklet, they face an empty workspace. Without guidance, users may fail to discover Tracklet's most potent time-saving capabilities:
1. **The Browser Extension**: 1-click job clipping on LinkedIn, Indeed, Greenhouse, and Lever with ATS form autofill.
2. **Data Portability & Import/Export**: The ability to migrate existing spreadsheets (CSV) or restore full database snapshots (JSON), as well as the freedom to export all data at any time without vendor lock-in (currently tucked away inside Settings).
3. **Buried Workflow Superpowers**: Rich Markdown notes with slash commands (`/meeting`, `/prep`, `/code`), stage velocity tracking (days in stage), and recruiter contact linking.

This feature introduces a welcoming, intent-driven onboarding experience that guides users based on their immediate goal (migrating existing applications, actively clipping new roles, or exploring the interface) without disrupting their workflow.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Intent-Driven Welcome Tour for New Verified Users (Priority: P1)

As a newly registered and verified Tracklet user, I want a welcoming, lightweight introduction that asks where I am starting my job search today, so that I am guided directly to the features relevant to my immediate goal rather than wading through a generic slideshow.

**Why this priority**: First impressions and Time-to-Value (TTV) determine whether a new user activates or abandons the platform. Offering clear intent paths (Migrator, Job Hunter, Explorer) maximizes activation.

**Independent Test**:
1. Log in with a freshly created, email-verified user account with zero existing applications.
2. Verify that the welcome dialog displays automatically with friendly copy and three distinct intent cards.
3. Verify that the user can dismiss the tour at any point via "Skip for now", close button, or the `Escape` key, transitioning cleanly to the workspace.

**Acceptance Scenarios**:
1. **Given** a user with a verified account and zero applications, **When** they first enter the workspace after initial data loading, **Then** the Welcome Onboarding dialog appears centered on the screen.
2. **Given** the Welcome Onboarding dialog is open, **When** the user clicks "Skip for now" or presses `Escape`, **Then** the dialog closes, the preference is recorded so it does not auto-open again, and the user lands on the active pipeline board.
3. **Given** an existing user who previously completed or dismissed onboarding, **When** they log in or reload the page, **Then** the onboarding dialog does not auto-appear.

---

### User Story 2 - Chrome Extension Discovery & Real-Time Connection Guide (Priority: P1)

As an active job seeker hunting for roles across job boards, I want to learn about the Tracklet Companion browser extension and receive clear instructions on how to install, pin, and use 1-click job capture, with immediate visual feedback if the extension is already running.

**Why this priority**: The browser extension is the primary top-of-funnel capture tool that eliminates manual data entry. Demonstrating it during onboarding drives daily active usage.

**Independent Test**:
1. Open the onboarding guide to the Extension step with the browser extension not installed.
2. Verify that the step explains 1-click clipping, ATS autofill, and duplicate detection, offering a direct download link and installation steps.
3. Install the extension in another tab or simulate connection; verify the step dynamically updates to a connected confirmation badge with usage instructions.

**Acceptance Scenarios**:
1. **Given** the user is viewing the Extension onboarding step and the companion extension is not installed, **When** the screen renders, **Then** it presents the extension benefits, a 1-click download button, and a 2-step setup summary.
2. **Given** the companion extension is detected or becomes active while viewing the step, **When** the connection state updates, **Then** the view reactively displays a green "Companion Connected" badge, a browser pin recommendation, and the keyboard capture shortcut.

---

### User Story 3 - Data Portability Discovery (Import, Export & Zero Lock-in) (Priority: P2)

As a user migrating from a spreadsheet or another job tracker, I want to easily import my existing data from the onboarding flow, and be reassured that I can export my full pipeline to CSV or complete JSON backup at any time.

**Why this priority**: Users are hesitant to invest time in a new platform if they fear data lock-in or face tedious manual transcription of dozens of existing applications.

**Independent Test**:
1. From the onboarding intent selection, choose "I have an existing spreadsheet or backup".
2. Verify that the user can drop a CSV or JSON file directly or launch the existing Import tool.
3. Verify that the onboarding highlights the continuous availability of 1:1 JSON backup and CSV export in Settings.

**Acceptance Scenarios**:
1. **Given** the user selects the "Migrate existing tracker" path, **When** they proceed, **Then** they are presented with an import dropzone that supports CSV mapping and instant JSON workspace restore.
2. **Given** the user views the Data Portability section, **When** they read the summary, **Then** they see clear confirmation that all applications, notes, tasks, and contact histories can be exported at any time from Settings without restrictions.

---

### User Story 4 - Empty-State Quick-Start Hub & Permanent Re-Access (Priority: P2)

As a user navigating an empty pipeline board, I want actionable quick-start choices on the board itself, and the ability to re-open the onboarding guide at any time from the navigation menu if I need a refresher.

**Why this priority**: Users who skip the initial modal still need an obvious, frictionless path to get started; users who completed it may later want to review extension setup or shortcuts.

**Independent Test**:
1. View the pipeline board with 0 applications after dismissing the modal.
2. Verify that the empty board displays four clear action cards: "Take the Tour", "Add First Application", "Load Sample Data", and "Import Spreadsheet".
3. Click the "Getting Started Tour" button in the sidebar footer and verify the onboarding guide reopens.

**Acceptance Scenarios**:
1. **Given** an empty pipeline board, **When** rendered, **Then** it displays an upgraded quick-start grid featuring tour launch, manual addition, sample data seeding, and spreadsheet import.
2. **Given** any screen in the application, **When** the user clicks the "Getting Started" or "Tour" entry in the sidebar (desktop or mobile drawer), **Then** the Onboarding modal opens from Step 1.

---

## Edge Cases

- **Unverified Email Users**: Users who register via email/password are held at the Email Verification screen. The onboarding flow must strictly wait until their email is verified and they enter the main workspace before triggering.
- **Offline / Network Delay during Profile Load**: If cloud user profile data is delayed or fails to load, the system must not flash the onboarding modal erroneously to returning users. It must use local optimistic caching.
- **Mobile Viewport Navigation**: On mobile screens, opening the onboarding guide from the slide-out navigation drawer must close the drawer automatically so the modal is unobstructed.
- **Pre-existing Applications**: If a user already has 1 or more applications (e.g. from prior guest migration or mobile capture), the onboarding modal must not auto-trigger, but remains available on demand via the sidebar.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST automatically present the Onboarding Guide to email-verified users who have 0 applications and have not previously completed or dismissed onboarding.
- **FR-002**: The Onboarding Guide MUST offer three distinct intent branches: "Migrate existing tracker" (CSV/JSON), "Browsing jobs now" (Browser Extension), and "Starting fresh / Exploring" (Sample Data or blank canvas).
- **FR-003**: The Extension onboarding step MUST display live connection status reactively, showing installation steps when disconnected and usage tips when connected.
- **FR-004**: The system MUST provide direct access to data import capabilities without requiring the user to navigate through Settings.
- **FR-005**: The system MUST communicate zero vendor lock-in by explaining that full CSV and JSON database exports are accessible anytime in Settings.
- **FR-006**: The system MUST feature a 3-step visual progress indicator, "Back", "Next", "Skip for now", and close controls.
- **FR-007**: The Onboarding Guide MUST support dismissal via the `Escape` key, backdrop click, or close button.
- **FR-008**: The user's onboarding completion or dismissal state MUST be persisted to their cloud profile and synchronized locally.
- **FR-009**: The empty pipeline and inventory states MUST be upgraded to display an actionable quick-start grid (Tour, Add Job, Sample Data, Import).
- **FR-010**: A persistent entry point labeled "Getting Started" or "Welcome Tour" MUST be accessible in the application navigation footer across desktop and mobile.
- **FR-011**: The system MUST log privacy-preserving telemetry events for onboarding lifecycle milestones (opened, intent selected, step viewed, completed, dismissed).

---

### Key Entities

- **User Onboarding Profile**: Represents the user's onboarding progress, including:
  - `completed` (boolean): Whether the user finished the onboarding flow.
  - `completedAt` (timestamp): When completion occurred.
  - `dismissed` (boolean): Whether the user skipped or dismissed the flow.
  - `selectedIntent` (string): The persona path selected (`migrator`, `hunter`, `explorer`).
  - `lastStep` (integer): The last step viewed in the multi-step guide.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New users can complete or dismiss the onboarding flow in under 90 seconds.
- **SC-002**: 100% of new users who select the "Migrator" intent can access the spreadsheet import dialog in 1 click from the onboarding screen.
- **SC-003**: 100% of users with an active extension receive immediate visual confirmation of connection without manual page refreshes.
- **SC-004**: Returning users who have completed or dismissed onboarding experience 0 instances of unwanted modal popups upon page load.
- **SC-005**: Zero accessibility violations under WCAG 2.1 AA standards for modal dialogs (color contrast, ARIA roles, focus management, keyboard operability).

---

## Assumptions

- Users accessing the onboarding flow are authenticated with verified email status.
- The existing CSV import and JSON backup mechanisms remain the underlying processors for data migration.
- The existing browser extension handshake mechanism remains the authoritative source for extension presence.
- Pro tier upgrade gates remain independent; onboarding is educational and available to all users regardless of plan tier.