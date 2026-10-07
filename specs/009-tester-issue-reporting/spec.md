# Feature Specification: Tester Issue & Feedback Reporting System

**Feature Branch**: `009-tester-issue-reporting`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "I want to give my product to some testers and I want to make a feature about reporting an issue and maybe have some screenshot or something like this. I don't know exactly, but run a spec it for this feature."

## Clarifications & Design Decisions

### Session 2026-10-07

- **Q1: How should testers capture or attach screenshots when reporting an issue?**
  - **Decision**: **Manual Only (File Upload & Clipboard Paste `Ctrl+V`)**.
  - **Rationale**: Avoids aggressive browser screen-recording permission prompts, eliminates canvas cross-origin taint issues, and works with 100% reliability across all desktop and mobile browsers. Testers can use familiar system shortcuts (e.g., `Win + Shift + S` or `Cmd + Shift + 4`) and simply paste directly into the reporter modal (`Ctrl+V`) or drag/drop an image file.

- **Q2: Where should submitted tester issue reports and diagnostics be stored or routed?**
  - **Decision**: **GitHub Issues Integration backed by Native Cloud Persistence**.
  - **Comparison & Analysis**:
    1. *GitHub Issues (Primary Hub)*: Issues land directly where code and development happen. Provides automatic markdown formatting, triage labels (`bug`, `tester-feedback`, `severity`), issue assignment, and commit closing syntax (`fixes #...`).
    2. *Cloud Persistence (Firestore `tester_feedback`)*: Guarantees zero lost reports even if the GitHub API rate-limits, fails, or credentials need rotation; preserves full diagnostic snapshots and image blobs.
    3. *External Webhooks (Discord / Slack)*: Great for instant mobile push notifications, but poor as an issue tracker because messages get buried in chat history.
    - **Synthesized Architecture**: Reports are persisted in Firestore (`tester_feedback`) and dispatched to GitHub Issues (either via pre-configured GitHub API / webhook dispatcher, or via a 1-click formatted GitHub Issue URL pre-fill fallback).

- **Q3: How should testers access and trigger the issue reporting dialog in the app?**
  - **Decision**: **Settings Hub Section + Sidebar Quick Access**.
  - **Industry Benchmark Analysis**:
    - *Settings Hub Section (Standard across Vercel, Linear, Figma)*: A dedicated "Feedback & Diagnostics" card in Settings where testers can submit bugs, view submission status, and copy debug information.
    - *Sidebar Footer Quick Action*: A subtle "Report Issue" / "Feedback" link in the bottom utility area of the sidebar (next to Settings and Auth) allowing immediate 1-click access without disrupting workflow or cluttering the primary canvas with floating badges.
    - *Global Hotkey*: Optional `?` or `Ctrl+Alt+B` shortcut for power-testers to summon the reporter modal from anywhere.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Frictionless In-App Issue Reporting with Auto-Captured Diagnostics (Priority: P1)

As a beta tester evaluating Tracklet, I encounter unexpected behavior, a visual glitch, or a broken button while organizing applications. I want to report the issue immediately from within the application without composing a manual email or searching for developer contact info. The system should automatically capture relevant diagnostic environment information (browser, OS, viewport, current view route, and recent error logs) so I only need to describe what went wrong and submit.

**Why this priority**: P1 is the foundation of the feature. Without a lightweight in-app reporting flow with automated environment diagnostics, testers face high friction, leading to unreported bugs or vague reports that developers cannot reproduce.

**Independent Test**: Can be tested by opening the issue reporting modal from either the Settings view or the Sidebar, entering a summary and description, and submitting. The system generates a report record containing the description, category, and auto-detected diagnostics, returning an immediate receipt to the tester.

**Acceptance Scenarios**:

1. **Given** a tester is anywhere in the application (authenticated or in guest mode), **When** they click "Report Issue" in the Sidebar or open the Feedback section in Settings, **Then** a modal opens with pre-filled diagnostic details (current view route, browser/OS metadata) and fields for category, title, description, and severity.
2. **Given** a tester fills out a bug title and description and clicks "Submit Report", **When** the submission succeeds, **Then** a clear confirmation receipt with a report reference ID is displayed and the modal closes cleanly.
3. **Given** a tester is offline or the network request fails, **When** they attempt to submit, **Then** an informative error message is displayed, and the drafted content (title, description, attachments) is preserved without data loss.

---

### User Story 2 - Visual Evidence via Clipboard Paste and File Upload (Priority: P2)

As a tester reporting a visual glitch or layout bug, I want to attach a screenshot by pasting directly from my clipboard (`Ctrl+V`) or dragging an image file into the modal, so that the developer has direct visual proof of what broke.

**Why this priority**: Visual evidence eliminates reproduction ambiguity for UI regressions, responsive styling bugs, and unexpected application states.

**Independent Test**: Can be tested by copying a screenshot to the system clipboard, opening the report modal, pressing `Ctrl+V` (or selecting an image file via the file picker), verifying the instant preview and file size indicator, and submitting the report with the attachment linked.

**Acceptance Scenarios**:

1. **Given** the issue reporting modal is open, **When** the tester presses `Ctrl+V` with an image in their clipboard, **Then** the image is immediately pasted as an attachment with a thumbnail preview, file size, and remove button.
2. **Given** the tester prefers using a file picker, **When** they drag-and-drop or select an image (`.png`, `.jpg`, `.jpeg`, `.webp`), **Then** the image is attached and previewed in the modal.
3. **Given** an attached screenshot is present in the modal, **When** the tester clicks the thumbnail, **Then** an enlarged preview is shown so they can verify that no private or sensitive information is accidentally included before submission.
4. **Given** an attached file exceeds 2MB or is not a valid image format, **When** the tester attempts to attach it, **Then** an inline validation warning is displayed and the invalid file is rejected safely.

---

### User Story 3 - GitHub Issue Routing & Central Persistence (Priority: P3)

As a product developer receiving tester feedback, I want submitted reports to automatically create GitHub Issues in the project repository with clear diagnostic tables and screenshot embeds, while also being archived in the cloud backend (`tester_feedback`), so that bugs can be directly triaged, assigned, and closed in GitHub.

**Why this priority**: Connects tester feedback directly to developer workflows without requiring a custom admin backend or manual copy-pasting of tester emails into GitHub.

**Independent Test**: Can be tested by submitting a sample bug report and verifying that a structured issue is generated in the repository with labels (`bug`, `tester-report`, severity) and markdown-formatted diagnostics.

**Acceptance Scenarios**:

1. **Given** a tester submits a report, **When** the report is processed, **Then** an issue is created in GitHub with structured headings (Description, Environment, Steps to Reproduce, Attachments) and categorized labels.
2. **Given** the tester is in guest mode without a personal GitHub account, **When** they submit, **Then** the issue is created seamlessly via the backend service without prompting the tester for GitHub login credentials.
3. **Given** GitHub API services are temporarily unreachable, **When** a tester submits, **Then** the report is safely stored in native cloud storage (`tester_feedback`) and queued for subsequent synchronization.

---

### Edge Cases

- **Network Disconnection / Timeout**: What happens when the tester hits "Submit" while offline or during a server timeout? The system MUST preserve the draft locally, alert the user with a retry button, and prevent any loss of typed notes or attached images.
- **Large Image Files**: How does the system handle high-resolution screenshots? The system MUST compress images client-side before submission to ensure payloads remain under 1.5MB and upload quickly.
- **Sensitive Data & Privacy**: What happens if the screen contains personal contact or resume data? The system MUST provide an explicit preview of the attachment and clear disclosure of what diagnostic metadata is being submitted, allowing the tester to remove attachments or redact sensitive details.
- **Accidental Dismissal**: What happens if the tester accidentally clicks the modal backdrop or presses Escape after typing a detailed report? The system MUST display an unsaved changes confirmation prompt before discarding the draft.
- **Rapid Multi-Click Submissions**: The submission button MUST disable immediately with an active loading indicator to prevent duplicate report creation.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide accessible entry points for testers to trigger the issue reporting flow via:
  1. A dedicated "Help & Feedback" card in the Settings view (`SettingsView.tsx`).
  2. A "Report Issue" action in the Sidebar footer next to Settings.
  3. An optional global keyboard shortcut (`?` or `Ctrl+Alt+B`).
- **FR-002**: The issue reporter MUST allow testers to classify their feedback by category (`Bug Report`, `Visual Glitch`, `Feature Suggestion`, `General Feedback`).
- **FR-003**: The issue reporter MUST collect a required Title and Description, providing helpful placeholder hints (e.g., "What happened? What did you expect to happen?").
- **FR-004**: The issue reporter MUST allow testers to select a severity level (`Low`, `Medium`, `High`, `Blocker`) with `Medium` as the default.
- **FR-005**: The system MUST automatically capture sanitized diagnostic environment metadata when the report is triggered:
  - Application version / build identifier
  - Active page/view route and active tab (e.g., `pipeline`, `table`, `contacts`, `settings`)
  - Browser name, major version, and operating system
  - Viewport dimensions (width × height) and device pixel ratio
  - User authentication state (Signed In vs Guest Mode)
  - Recent uncaught client errors or console warnings (sanitized to remove tokens or credentials)
- **FR-006**: The system MUST allow testers to attach visual evidence via clipboard paste (`Ctrl+V`), drag-and-drop, or native file picker, supporting PNG, JPEG, and WebP formats up to 2MB with instant client-side preview and removal controls.
- **FR-007**: The system MUST persist submitted reports in the native cloud database (`tester_feedback`) and route them to GitHub Issues with structured markdown formatting and triage labels.
- **FR-008**: The reporter modal MUST implement accessible interactions, including focus trapping, Escape key dismissal (with unsaved changes check), and WCAG-compliant color contrast.
- **FR-009**: The reporter MUST display an instant submission receipt upon completion, including a unique reference ID and a confirmation snackbar.
- **FR-010**: If the submission fails due to network issues, the system MUST retain all user input and provide a 1-click retry option without data loss.

---

### Key Entities *(include if feature involves data)*

- **IssueReport**:
  - `id`: Unique identifier for the report (e.g., `TRK-BUG-101`)
  - `type`: Category (`bug`, `visual_glitch`, `feature_request`, `general_feedback`)
  - `title`: Short summary of the issue
  - `description`: Detailed explanation of what occurred and steps to reproduce
  - `severity`: Urgency ranking (`low`, `medium`, `high`, `blocker`)
  - `reporterName`: Optional tester name
  - `reporterEmail`: Optional tester email for follow-up notifications
  - `status`: Lifecycle state (`new`, `under_review`, `resolved`, `dismissed`)
  - `githubIssueUrl`: Direct URL to created GitHub Issue (if linked)
  - `diagnostics`: Associated `DiagnosticContext`
  - `attachments`: List of associated `ReportAttachment`
  - `createdAt`: ISO 8601 creation timestamp

- **DiagnosticContext**:
  - `appVersion`: Tracklet application version
  - `activeRoute`: Current URL path / active workspace tab
  - `browser`: Browser engine and name
  - `os`: Client operating system
  - `viewport`: Viewport width and height (e.g., `1440x900`)
  - `screenResolution`: Physical screen resolution and pixel ratio
  - `authMode`: `authenticated` or `guest`
  - `errorLogSummary`: Recent client runtime warnings or exceptions (sanitized)

- **ReportAttachment**:
  - `id`: Unique attachment ID
  - `fileName`: Original file name or auto-generated name
  - `mediaType`: MIME type (`image/png`, `image/jpeg`, `image/webp`)
  - `fileSizeBytes`: Attachment size in bytes
  - `urlOrData`: Storage URL or base64 data preview
  - `source`: Capture method (`clipboard_paste`, `file_upload`)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Testers can initiate, complete, and submit an issue report in under 45 seconds on average.
- **SC-002**: 100% of submitted bug reports include verified diagnostic environment metadata without requiring any manual effort from the tester.
- **SC-003**: Zero report loss: 100% of report drafts are preserved across intermittent connectivity failures, allowing seamless retry.
- **SC-004**: Attached screenshots are previewable and verifiable by the tester before dispatch in 100% of submission flows.
- **SC-005**: Visual evidence upload payload size is automatically optimized to under 1.5MB per image to guarantee rapid submission even on throttled mobile or guest connections.
- **SC-006**: 100% of submitted reports are successfully tracked as GitHub Issues or stored in cloud persistence with diagnostic context intact.

---

## Assumptions

- Target audience consists of invited beta testers, team members, and pilot job seekers using desktop and mobile browsers.
- Testers may use either authenticated Firebase accounts or unauthenticated Guest Mode; both personas must have full access to report issues without mandatory login barriers.
- Client diagnostic capture strictly omits sensitive personal data such as candidate resume text, passwords, auth tokens, or private application notes.
- Beta testers will have internet connectivity at the time of report submission, with client-side retry handling for temporary dropouts.
