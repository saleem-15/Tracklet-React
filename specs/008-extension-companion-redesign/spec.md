# Feature Specification: Extension Side Panel Redesign, Contact Clipper & Autofill Readiness

**Feature Branch**: `feat/extension-companion-redesign`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Redesign the extension as a persistent Chrome Side Panel (like Simplify, Apollo, Huntr) adhering to DESIGN.md. Do not rewrite extension code from scratch; preserve existing battle-tested logic. Make Email clipping a first-class feature. Add Contact Clip functionality focusing on LinkedIn profiles with category smart-defaulting, application linking, and Contacts Hub sync. Implement contextual auto-switching between tabs based on active web page. Enhance the Recruiter Micro-Card on job posts for seamless job-and-contact bundle saving. Include Autofill Hub with candidate profile display, ATS form detection (Greenhouse, Lever, Workday), and 1-click auto-fill. Preserve all existing working features—DO NOT DELETE ANY EXISTING FUNCTIONALITY."

**Related specs**:
- `004-contacts-hub`: Contacts Hub data model, categories, and application linking
- `006-extension-auth-sync`: Extension authentication, cloud sync, and offline persistence
- `007-extension-capture-quality`: Clean employer domain resolution, logo fallbacks, job board exclusion, and stage protection rules

## Clarifications

### Session 2026-10-05
- Q: How should users create and edit their Candidate Profile data (Name, Email, Phone, Links, Work Authorization) for the Autofill Hub? → A: Option A (Hybrid) — Side panel displays a compact profile summary card with an inline "Quick Edit" toggle for fast in-place adjustments, plus a link to open full profile settings in the Tracklet web app.
- Q: When a user triggers "⚡ Auto-Fill Application", how should Tracklet visually indicate which fields were populated on the target job application page? → A: Option B+ (Interactive Side Panel Checklist with Scroll-to-Field) — Host page styles remain untouched by default; the side panel renders an itemized checklist of populated fields. Clicking any item in the checklist smoothly scrolls the host webpage directly to that field, focusing it and temporarily highlighting it with a brief 1.5s halo.
- Q: How should the extension handle candidate CV/resume upload and linking for applications? → A: Tailored CV File Upload & Application Linking (New Feature) — The extension provides a dedicated CV upload dropzone/picker (and/or captures the file attached on the ATS form), persists the tailored CV file in storage, and links it directly to the Application record (storing file name, file size, upload timestamp, and preview/download capability) so the candidate can always access the exact customized CV submitted for that role.
- Q: How should the Contact Clipper handle LinkedIn profiles when the person is already recorded in the user's Contacts Hub? → A: Option A+ (Enrich & Update on Data Change Only) — Displays "Already in Contacts Hub"; the "Update Contact" action is shown ONLY if scraped fields (title, company, location) have changed compared to the stored record, while strictly preserving private notes and application links.
- Q: When the Webmail Companion matches an incoming recruiter email to multiple applications at the same company, how should it prioritize the default match? → A: Option A (Active Stage & Recency Ranking) — Automatically targets the active pipeline application prioritizing Interview > Screening > Applied > Saved (newest first, ignoring Archived/Rejected), while displaying a badge showing the match count with a 1-click "Switch Job" popover.

---

## 1. Architectural Foundation & Code Preservation Principles

### A. Non-Negotiable Existing Features Preservation Mandate (Zero Regression Guarantee)
The redesign is strictly a **UI/UX modernization and capability expansion** of the existing extension. **UNDER NO CIRCUMSTANCES SHALL ANY OF THE FOLLOWING 13 EXISTING WORKING CAPABILITIES BE REMOVED OR REGRESSED:**

1. **Live Web App Tab Sync**: When Tracklet is open in another tab, saved applications and logged emails MUST continue to broadcast in real time via `window.postMessage` / `chrome.runtime.sendMessage`, triggering live toast notifications and instant state refresh in the web app.
2. **Offline Queue & Auto-Recovery**: If Tracklet is closed or the user is offline, saved applications (`pending_applications`) and logged emails (`pending_emails`) MUST continue to be safely stored in `chrome.storage.local` and auto-synchronized the moment Tracklet is opened.
3. **Right-Click Context Menu ("Save Job to Tracklet")**: Right-clicking selected text on any web page MUST continue to offer "Save Job to Tracklet", creating a clip pre-filled with the selected text as notes via `background.js`.
4. **Global Keyboard Shortcuts**: `Alt + Shift + A` (Mac: `Option + Shift + A`) to summon the companion; `Enter ↵` to submit; formatting shortcuts (`Ctrl+B`, `Ctrl+I`) in the notes editor.
5. **Pipeline Stage Safety & History Preservation**:
   - New job clips MUST remain restricted to `Saved` and `Applied`.
   - Existing applications in later stages (`Screening`, `Interview`, `Offer`, `Rejected`, `Archived`) MUST render as immutable read-only badges, preserving existing stage history entries (`history`) without accidental demotion or erasure.
6. **Duplicate Detection & Dual-Action Routing**:
   - Inline duplicate warning banner ("Already tracked in Tracklet") with "Open" shortcut.
   - Dedicated "Already Saved View" displaying company, role, current stage, applied date, "Open in Tracklet Workspace" button, and "Save as separate application" button for different roles at the same employer.
7. **Employer Identity & Logo Resolution Pipeline**:
   - `jobBoardRegistry.js`: Canonical rejection of 100+ job board and ATS domains.
   - Google Favicon API (`sz=128`) resolution.
   - Deterministic SVG Monogram fallback with brand-aligned pastel background palettes.
   - Real-time live logo preview updating dynamically as the user edits the company domain input.
8. **Structured Application Fields**:
   - Company Name (required with autocomplete off)
   - Company Website / Domain input with live logo preview
   - Job Role / Title (required)
   - Location (city, region, country)
   - Workplace arrangement chips (`Remote`, `Hybrid`, `Onsite`)
   - Employment type chips (`Full-time`, `Part-time`, `Contract`, `Internship`)
   - Platform selector (`LinkedIn`, `Indeed`, `Bayt`, `Lever`, `Greenhouse`, `Otta`, `Wellfound`, `Company Site`, `Referral`, `Other` + custom text input)
   - Date Applied date picker (defaults to today)
   - Job URL deep link input
9. **WYSIWYG Notes & Bidirectional Markdown Engine**:
   - Contenteditable editor supporting Bold, Italic, Heading 3, and Bullet Lists.
   - Bidirectional converter (`htmlToMarkdown` / `markdownToHtml`).
   - Toggle button to inspect/edit raw Markdown code and a 1-click Clear action.
10. **Recruiter Contact Detection on Job Postings**:
    - Auto-detection of recruiter/job poster from page markup with opt-in checkbox to save to Contacts Hub.
11. **First-Class Webmail Companion (Gmail & Outlook)**:
    - Contextual header badge (`Gmail` / `Outlook`).
    - Inbound/Outbound direction toggle (`Received` vs `Sent`).
    - Subject input and Counterparty (From/To) input.
    - Date and Time pickers.
    - Sanitized message snippet textarea.
    - Matched application card with "Switch Job" searchable popover (`app-selector-popover`, `app-search-input`, `app-selector-list`, and "Log to a new application instead").
    - In-flight pipeline stage advancement on email log.
    - Recruiter discovery checkbox ("Add [name] as recruiter contact").
    - Escape hatch: "Not an email update? Clip as job posting instead".
12. **Firebase Auth & Local Guest Mode**:
    - Cloud Mode: Synchronizes with Firebase Auth (`users/{userId}/applications` and `users/{userId}/contacts`).
    - Guest Mode: Unauthenticated local mode with `user-account-badge` ("Guest Mode (Local Only)" / "Local Mode") allowing instant clipping without mandatory login.
13. **Success Feedback & Auto-Dismissal**:
    - Success badge checkmark, confirmation copy, "Open Tracklet Workspace" deep link, and animated progress bar with smooth transition.

---

### B. Chrome Side Panel Form Factor
- Replaces the ephemeral popup with a persistent browser side panel via Manifest V3 `chrome.sidePanel` API (modeled after industry benchmarks like Simplify, Apollo.io, and Huntr).
- Docks seamlessly to the side of the browser, remaining open as the user navigates across multiple tabs, job postings, recruiter profiles, and webmail messages without abrupt dismissal.
- Responsive width (360px – 440px, default ~400px) with 100vh fluid vertical layout.
- Maintains popup fallback capability where side panels are unavailable.

---

### C. Contextual Auto-Switching with Draft Memory
- The side panel companion listens to active tab navigation (`chrome.tabs.onActivated` and URL transitions) and intelligently highlights/switches to the relevant companion tab:
  - **LinkedIn Profile (`linkedin.com/in/*`)** $\rightarrow$ Auto-activates **`[👤 Contact]`** tab
  - **Webmail (`mail.google.com`, `outlook.live.com`, `outlook.office.com`)** $\rightarrow$ Auto-activates **`[✉️ Email]`** tab
  - **Job Posting or ATS Form** $\rightarrow$ Auto-activates **`[📥 Job]`** tab (with contextual badge if form detected for **`[⚡ Autofill]`**)
- **Draft Preservation**: Any unsaved inputs, notes, or edits in active tabs are preserved in local session memory during tab auto-switches so user text is never lost.
- **Manual Override Stability**: If the user explicitly selects a tab, their selection remains anchored during that browsing session until navigating to a completely distinct domain.

---

## 2. User Scenarios & Testing *(mandatory)*

### User Story 1 - Persistent Chrome Side Panel Shell & Contextual Auto-Switching (Priority: P1)

When a user clicks the Tracklet toolbar icon or presses `Alt+Shift+A`, Tracklet opens as a persistent Chrome Side Panel docked alongside their web page. The panel maintains design token parity with `DESIGN.md` (Outfit headings, Plus Jakarta Sans body, JetBrains Mono data labels, Tracklet Command Blue `#2563eb`), showing live cloud sync status, account badge, and a high-clarity 4-tab segmented navigation bar:
`[📥 Job]` · `[👤 Contact]` · `[✉️ Email]` · `[⚡ Autofill]`.
As the user switches browser tabs, the side panel automatically switches to the relevant tab while preserving all draft data.

**Why this priority**: Solves the biggest friction of popup extensions (unexpected popup closure on outside clicks) and provides an intelligent, seamless assistant that adapts to what the user is looking at.

**Independent Test**: Click extension icon. Observe side panel opening smoothly on the right. Navigate across 3 tabs (a LinkedIn job, a LinkedIn profile, and an email). The side panel remains open, auto-switches to the matching tab, and switches within 150ms without layout jitter.

**Acceptance Scenarios**:

1. **Given** the extension is installed, **When** the user clicks the Tracklet action icon in Chrome, **Then** Chrome opens the Tracklet Side Panel docked next to the active tab.
2. **Given** the side panel is open, **When** the user clicks outside or interacts with the main web page, **Then** the side panel remains stably docked and active without closing.
3. **Given** the user switches browser tabs to a LinkedIn profile (`linkedin.com/in/*`), **When** the tab activates, **Then** the side panel automatically navigates to the `[👤 Contact]` tab with profile data extracted.
4. **Given** the user switches browser tabs to Gmail or Outlook, **When** the tab activates, **Then** the side panel automatically navigates to the `[✉️ Email]` tab with email details extracted.
5. **Given** the user was typing notes on the Job tab and switches tabs, **When** they return to the Job tab, **Then** their draft notes and field edits remain fully intact.

---

### User Story 2 - LinkedIn Contact Clipper with Category Smart-Defaulting (Priority: P1)

When a user visits a person's LinkedIn profile (e.g. `linkedin.com/in/*`), the side panel's **`[👤 Contact]`** tab activates. The companion extracts the person's name, headline/title, current company, location, and LinkedIn URL. Based on their headline, the category is smart-defaulted (`Recruiter`, `Hiring Manager`, etc.), and the user can link them to an active Tracklet job application in one click.

**Why this priority**: Networking is central to modern job search. Capturing recruiters and hiring managers directly from LinkedIn into Contacts Hub with intelligent classification eliminates tedious manual entry.

**Independent Test**: Navigate to a LinkedIn profile with the headline "Senior Technical Recruiter at Stripe". Open the Contact tab. Name, title, company, and LinkedIn URL are pre-filled. The category is automatically pre-selected as "Recruiter". Select an active Stripe application from the dropdown, and click "Save Contact". The contact is created in Tracklet Contacts Hub and linked to the application.

**Acceptance Scenarios**:

1. **Given** a LinkedIn profile page (`linkedin.com/in/*`), **When** the user opens the `[👤 Contact]` tab, **Then** the extension extracts the person's Full Name, Headline, Current Company, Location, and canonical LinkedIn URL.
2. **Given** the extracted headline contains recruiter keywords (`talent`, `recruiter`, `sourcer`, `talent acquisition`, `staffing`), **When** the category is evaluated, **Then** the category pill is automatically smart-defaulted to `Recruiter`.
3. **Given** the extracted headline contains leadership/management keywords (`vp`, `director`, `engineering manager`, `head of`, `lead`, `manager`, `cto`), **When** evaluated, **Then** the category pill is automatically smart-defaulted to `Hiring Manager`.
4. **Given** the user wishes to change the category, **When** clicking another category pill (`Referral`, `Mentor`, `Peer / Alumni`, `Other`), **Then** the selection updates instantly with smooth 150ms visual feedback.
5. **Given** the application linking selector, **When** clicked, **Then** a searchable dropdown displays the user's active Tracklet job applications, allowing one-click association of the contact to a specific job. If the contact's company matches an active application, that application is suggested at the top of the list.
6. **Given** the contact already exists in Tracklet (matched by LinkedIn URL or name), **When** inspected, **Then** if scraped data matches stored data, it shows a serene "✓ Saved in Contacts Hub" badge; if data has changed (headline, company, location), it displays an "Update Contact" button that updates only changed attributes while strictly preserving private notes and job links.

---

### User Story 3 - Recruiter Micro-Card on Job Posts (Priority: P1)

When browsing a job posting (on LinkedIn, Greenhouse, Lever, etc.) that mentions or displays a recruiter or job poster, the **`[📥 Job]`** tab renders a dedicated **Recruiter Micro-Card**. This card displays the recruiter's name, title, and avatar, and provides an opt-in checkbox that bundles contact creation and bidirectional linking directly into the "Save Application" action.

**Why this priority**: Users frequently find jobs where the poster is displayed. Saving both the job and the recruiter in two separate flows is jarring; the micro-card bundles them into a single 1-click operation.

**Independent Test**: Open a LinkedIn job posting that shows "Job poster: John Doe · Talent Partner". In the side panel's Job tab, the Recruiter Micro-Card displays John's details with a checked "Add John Doe as Recruiter to Contacts Hub and link to this job" checkbox. Clicking "Save Application" creates both the application and the contact linked to each other.

**Acceptance Scenarios**:

1. **Given** a job posting displaying a recruiter or job poster, **When** viewed in the Job tab, **Then** a compact Recruiter Micro-Card appears directly below the role details, showing the person's name, role/title, and avatar/badge.
2. **Given** the Recruiter Micro-Card, **When** rendered, **Then** it presents a checked-by-default checkbox: "Add [Name] as contact in Contacts Hub and link to this application".
3. **Given** the user keeps the checkbox checked and clicks "Save Application", **When** saving completes, **Then**:
   - The job application is created in Tracklet.
   - A new Contact is created in Contacts Hub with name, title, organization, LinkedIn profile URL, and category `Recruiter` (or `Hiring Manager`).
   - The contact's `applicationIds` includes the new job ID, and the application's `contactIds` includes the new contact ID.
4. **Given** the user wants to view or edit the recruiter's full details before saving, **When** they click "View Contact Details" on the micro-card, **Then** the companion transitions to the `[👤 Contact]` tab with the recruiter pre-loaded for full editing.
5. **Given** the recruiter already exists in Tracklet (matched by LinkedIn URL), **When** rendered on the job post, **Then** the card displays a badge: "✓ Already in Contacts Hub · Will link to this job" and avoids duplicate creation.

---

### User Story 4 - First-Class Webmail Companion (Gmail & Outlook) (Priority: P1)

When a user is viewing an email thread in Gmail (`mail.google.com`) or Outlook (`outlook.live.com` / `office.com`), the **`[✉️ Email]`** tab activates. The companion extracts the sender, recipient, subject, sanitized body snippet, and timestamp, suggests matching job applications from the user's pipeline, and allows the user to log the correspondence and advance the application's pipeline stage (e.g. to `Interview` or `Offer`) in one click.

**Why this priority**: Preserves and elevates existing webmail capabilities in the side panel, preventing any regression of existing email-logging workflows.

**Independent Test**: Open an interview invitation email in Gmail. The side panel's Email tab shows extracted sender, subject, and snippet, auto-matches to the company's application, offers stage advancement to "Interview", and logs the email thread upon clicking "Log Email to Tracklet".

**Acceptance Scenarios**:

1. **Given** an open email in Gmail or Outlook, **When** the user views the `[✉️ Email]` tab, **Then** the companion extracts sender, recipient, subject line, date/time sent, and sanitized snippet without manual typing.
2. **Given** the extracted email data, **When** evaluated against applications at that company, **Then** the companion auto-selects the best match using active stage and recency ranking (prioritizing Interview > Screening > Applied > Saved, newest first), displays a count badge if multiple applications exist, and provides an instant "Switch Job" searchable popover.
3. **Given** an interview invite or offer email, **When** logging the email, **Then** the user can choose to advance the application's pipeline stage on the fly (e.g. from `Applied` to `Screening` or `Interview`).
4. **Given** a recruiter who is not yet in the user's Contacts Hub, **When** logging the email, **Then** an opt-in checkbox offers to "Save sender as contact in Contacts Hub".
5. **Given** an email that contains a job listing instead of correspondence, **When** the user clicks "Clip as Job Posting instead", **Then** the view transitions smoothly to the Job Clipper tab with pre-filled company and snippet data.

---

### User Story 5 - Modernized Job Clipper Hierarchy & Stage Safety (Priority: P1)

When browsing any job posting (LinkedIn, Indeed, Greenhouse, Lever, etc.), the **`[📥 Job]`** tab provides an executive-level clipping experience: 40×40px hero employer avatar (clean Google favicon `sz=128` or monogram fallback, strictly rejecting job board logos), mutually exclusive `Saved` / `Applied` stage pills (with immutable preservation for later pipeline stages), a compact 2×2 metadata matrix, and a rich WYSIWYG notes editor with bidirectional Markdown syncing.

**Why this priority**: Core high-velocity workflow of Tracklet; requires high information density and zero visual fatigue.

**Independent Test**: Save a job posting on LinkedIn or Greenhouse. Company avatar, company name, domain, role title, location, workplace arrangement, and employment type render cleanly. Clicking "Save Application" persists the record and shows immediate visual confirmation.

**Acceptance Scenarios**:

1. **Given** a job posting, **When** viewed in the Job tab, **Then** the employer's true branding is displayed via a 40×40px avatar box, resolving the company's main domain rather than the job board's domain.
2. **Given** a new job clip, **When** selecting pipeline stage, **Then** choices are strictly limited to `Saved` and `Applied` pills.
3. **Given** an existing application currently at a later stage (`Screening`, `Interview`, `Offer`), **When** opened, **Then** the stage renders as a read-only badge that guarantees existing pipeline progress and stage history are never overwritten.
4. **Given** the metadata section, **When** rendered, **Then** Platform, Location, Workplace Arrangement (`Remote` / `Hybrid` / `Onsite`), and Employment Type (`Full-time` / `Part-time` / `Contract` / `Intern`) appear in a compact 2×2 matrix.
5. **Given** the notes section, **When** used, **Then** the user can format rich text or toggle directly to raw Markdown code.
6. **Given** a customized CV tailored for this specific role, **When** the user uploads it via the companion's CV dropzone (or selects it on the host ATS form), **Then** the extension captures the file, displays an attachment chip with file name and size, and links it to the saved Application record so the user can preview or download the exact CV variant later.

---

### User Story 6 - Autofill Hub: Candidate Profile & ATS Form Detection (Priority: P2)

When viewing an ATS application page (Greenhouse, Lever, Workday) or opening the **`[⚡ Autofill]`** tab, the companion displays the candidate's active profile summary, provides a real-time form detection status pill (e.g. `⚡ Greenhouse Form Detected · 7 fields mapped`), and offers a 1-click "Auto-Fill Application" button that safely populates inputs with synthetic event dispatch.

**Why this priority**: Eliminates repetitive manual form filling while strictly avoiding premature submissions.

**Independent Test**: Navigate to a live Greenhouse or Lever application page. The Autofill tab shows "Greenhouse Form Detected" with green pulse badge, maps candidate profile fields (Name, Email, Phone, LinkedIn), and fills them upon clicking "Auto-Fill Application" without submitting the form.

**Acceptance Scenarios**:

1. **Given** the `[⚡ Autofill]` tab, **When** opened, **Then** it renders a condensed profile card summarizing Full Name, Email, Phone, Location, Portfolio/LinkedIn URLs, and Resume status, with an inline "Quick Edit" toggle for in-place modifications and a link to full web app settings.
2. **Given** an active application form on the page (Greenhouse, Lever, Workday), **When** inspected, **Then** a prominent status pill displays the detected ATS brand badge and count of fillable fields.
3. **Given** the user clicks "⚡ Auto-Fill Application", **When** field injection runs, **Then** matched inputs are populated and standard DOM events (`input`, `change`, `blur`) are dispatched to notify reactive frontend frameworks.
4. **Given** the completion of autofill, **When** returned to the side panel, **Then** an interactive checklist displays all populated fields (e.g. "✓ Full Name", "✓ Email", "✓ Phone") and alerts for manual inputs (e.g. "⚠ Resume file attachment"). Clicking any item in the checklist smoothly scrolls the host page to that specific input element, briefly highlighting it for 1.5 seconds and setting focus.
5. **Given** form safety requirements, **When** autofill runs, **Then** the extension NEVER clicks submit buttons or submits the form automatically.

---

### Edge Cases

- **LinkedIn Private / Restricted Profiles**: If LinkedIn restricts profile data behind a login wall, the extension captures whatever data is in the DOM and leaves unavailable fields clearly editable.
- **Multiple Contacts with Same Name**: Deduplication evaluates LinkedIn profile URL first, then email, then name + organization to avoid duplicate records.
- **Side Panel Tab Switching While Preserving Form Drafts**: When switching between `Job`, `Contact`, `Email`, and `Autofill` tabs, entered form draft data must persist in session memory so users do not lose text.
- **Multi-Frame ATS Forms (iFrames)**: Greenhouse or Workday forms embedded in company career page iframes are queried recursively via `content.js` across same-origin frames.
- **Offline / Disconnected State**: All clipped jobs, logged emails, and captured contacts are queued in `chrome.storage.local` and synchronized automatically when reconnection or Tracklet web app opens.

---

## 3. Requirements *(mandatory)*

### Functional Requirements

#### Side Panel Shell & Contextual Navigation
- **FR-001**: The extension MUST operate primarily as a persistent Chrome Side Panel (`chrome.sidePanel` API) docked to the browser window.
- **FR-002**: The extension MUST retain ALL 13 existing working capabilities listed in Section 1.A without regressions; ground-up rewrites are strictly prohibited.
- **FR-003**: The side panel styling MUST strictly adhere to `DESIGN.md`, utilizing `Outfit` for display headers, `Plus Jakarta Sans` for body copy, `JetBrains Mono` for metadata tags, and Tracklet Command Blue (`#2563eb`).
- **FR-004**: The side panel MUST implement a persistent 4-segment navigation bar: `[📥 Job]`, `[👤 Contact]`, `[✉️ Email]`, and `[⚡ Autofill]`.
- **FR-005**: The side panel MUST implement Contextual Auto-Switching based on the active tab's URL:
  - `mail.google.com/*` or `outlook.*/*` $\rightarrow$ auto-switches to `[✉️ Email]` tab
  - `linkedin.com/in/*` $\rightarrow$ auto-switches to `[👤 Contact]` tab
  - Supported job boards/ATS domains $\rightarrow$ auto-switches to `[📥 Job]` tab
- **FR-006**: When auto-switching tabs, all in-progress draft inputs and notes MUST be preserved in session memory without data loss.
- **FR-007**: All UI transitions MUST use stable `150ms` transitions (`transition-colors duration-150`) with fixed font weights and border widths to maintain zero Cumulative Layout Shift (CLS = 0).

#### LinkedIn & Recruiter Contact Clipper
- **FR-008**: When browsing LinkedIn profiles (`linkedin.com/in/*`), the extension MUST extract Full Name, Headline / Role, Current Organization, Location, and LinkedIn profile URL.
- **FR-009**: The Contact Clipper MUST implement Category Smart-Defaulting based on headline parsing:
  - Headlines matching `/talent|recruiter|recruiting|sourcer|staffing|people\s+ops/i` MUST pre-select `Recruiter`.
  - Headlines matching `/vp|vice\s+president|director|head\s+of|lead|manager|engineering\s+manager|cto/i` MUST pre-select `Hiring Manager`.
  - Headlines matching `/mentor|advisor|coach/i` MUST pre-select `Mentor`.
  - All category pills (`Recruiter`, `Hiring Manager`, `Referral`, `Mentor`, `Peer / Alumni`, `Other`) MUST remain one-click selectable for immediate user adjustment.
- **FR-010**: The Contact Clipper MUST provide a searchable dropdown to link the contact directly to an active Tracklet job application, auto-suggesting jobs that match the contact's company.
- **FR-011**: The Contact Clipper MUST check existing contacts in Tracklet by LinkedIn URL or name to detect duplicates. If data is identical, it MUST display a serene "✓ Saved in Contacts Hub" badge; if data has changed (headline, company, location), it MUST display an "Update Contact" button to refresh the changed fields while strictly preserving personal notes and application associations.
- **FR-012**: Captured contacts MUST be saved to Firestore and local storage adhering to the Tracklet `Contact` schema in `src/types.ts`.

#### Recruiter Micro-Card on Job Posts
- **FR-013**: When viewing a job posting that displays a recruiter or job poster, the `[📥 Job]` tab MUST render a Recruiter Micro-Card displaying their name, role/title, and profile link.
- **FR-014**: The Recruiter Micro-Card MUST provide an opt-in checkbox (default: checked) to create the contact in Contacts Hub and bidirectionally link it to the application upon clicking "Save Application".
- **FR-015**: The Recruiter Micro-Card MUST recognize if the recruiter already exists in Contacts Hub by LinkedIn URL, displaying a "✓ Already in Contacts Hub" badge and linking without creating duplicates.
- **FR-016**: The Recruiter Micro-Card MUST provide an affordance to jump directly to the `[👤 Contact]` tab for in-depth profile editing if desired.

#### First-Class Webmail Companion (Gmail & Outlook)
- **FR-017**: The extension MUST maintain full parity with existing webmail clipping capabilities on Gmail (`mail.google.com`) and Outlook (`outlook.live.com` / `office.com`).
- **FR-018**: When an email thread is detected, the `[✉️ Email]` tab MUST automatically extract sender name, email address, subject line, date/time, and sanitized body snippet.
- **FR-019**: The Email companion MUST intelligently match emails to Tracklet applications based on company name, employer domain, and recruiter email. If multiple applications match, it MUST prioritize the default selection by active stage and recency (Interview > Screening > Applied > Saved, newest first), displaying a match count badge with a 1-click "Switch Job" searchable popover.
- **FR-020**: The Email companion MUST allow users to advance the application's pipeline stage (e.g. to `Screening`, `Interview`, or `Offer`) while logging the email.
- **FR-021**: The Email companion MUST provide an opt-in checkbox to save new recruiter email senders as contacts in the Contacts Hub.

#### Job Clipper Tab & Stage Protection
- **FR-022**: The Job Clipper MUST display a 40×40px hero employer avatar resolving the company's true brand domain via `JobBoardRegistry` and Google Favicons (`sz=128`), strictly rejecting job board domains.
- **FR-023**: New job clips MUST be restricted to `Saved` and `Applied` stage pills.
- **FR-024**: Existing applications currently at later stages (`Screening`, `Interview`, `Offer`, etc.) MUST render as immutable read-only badges to prevent accidental pipeline demotion or history corruption.
- **FR-025**: The metadata matrix MUST present Platform, Location, Workplace Arrangement (`Remote` / `Hybrid` / `Onsite`), and Employment Type (`Full-time` / `Part-time` / `Contract` / `Intern`) in a compact 2×2 layout.
- **FR-026**: The notes editor MUST provide rich text formatting with bidirectional Markdown syncing.

#### Autofill Hub & ATS Form Detection
- **FR-027**: The Autofill Hub MUST store and render candidate profile data (`fullName`, `firstName`, `lastName`, `email`, `phone`, `location`, `linkedInUrl`, `githubUrl`, `portfolioUrl`, `targetTitle`, `workAuthorization`) in `chrome.storage.sync` with local fallback, providing both an expandable inline "Quick Edit" mode in the side panel for immediate adjustments and a deep link to Tracklet's full web app profile settings.
- **FR-028**: The extension MUST detect ATS application forms on Greenhouse (`boards.greenhouse.io`), Lever (`jobs.lever.co`), Workday (`myworkdayjobs.com`), and standard HTML5 career forms.
- **FR-029**: Field matching MUST resolve candidate fields using a prioritized 4-tier strategy: ATS selectors $\rightarrow$ `autocomplete` attributes $\rightarrow$ semantic `name`/`id` heuristics $\rightarrow$ label proximity text.
- **FR-030**: The "⚡ Auto-Fill Application" button MUST populate matched inputs and dispatch synthetic `input`, `change`, and `blur` events without submitting the form, followed by an itemized checklist in the side panel showing populated and manual fields.
- **FR-031**: When the user clicks any field item in the side panel's autofill checklist, the extension MUST smoothly scroll the host page to that target element, set focus, and apply a transient highlight outline (e.g. 2px accent halo) that automatically fades after 1.5 seconds.
- **FR-032**: The extension MUST provide a tailored CV file attachment dropzone (and/or detect host ATS file selection), capturing the uploaded CV file payload and metadata (`resumeFileName`, `resumeFileSize`, `resumeBlobId`, `resumeUploadedAt`), persisting it in storage, and linking it directly to the saved Application record with download/preview access.
- **FR-033**: The extension MUST NEVER automatically trigger form submission; final review and submission remain under direct user control.

---

## 4. Key Entities

- **Captured Contact (`Contact`)**:
  - `id`: Unique identifier
  - `name`: Full name
  - `role`: Current headline or job title
  - `organization`: Company or employer
  - `category`: `Recruiter` | `Hiring Manager` | `Referral` | `Mentor` | `Peer / Alumni` | `Other`
  - `linkedIn`: Profile URL
  - `email`: Optional contact email
  - `phone`: Optional telephone number
  - `notes`: Personal notes or observations
  - `applicationIds`: Array of associated application IDs
- **Captured Email Log (`EmailLog`)**:
  - `id`: Unique identifier
  - `subject`: Email subject line
  - `sender`: Sender name & email address
  - `recipient`: Recipient email
  - `date`: YYYY-MM-DD
  - `timestamp`: ISO timestamp
  - `direction`: `inbound` | `outbound`
  - `snippet`: Sanitized preview text
  - `emailUrl`: Deep link to webmail thread
- **Candidate Profile (`CandidateProfile`)**:
  - `id`, `fullName`, `firstName`, `lastName`, `email`, `phone`, `location`, `linkedInUrl`, `githubUrl`, `portfolioUrl`, `targetTitle`, `workAuthorization`
- **ATS Form Detection Result (`FormDetectionResult`)**:
  - `ats`: `'greenhouse' | 'lever' | 'workday' | 'generic' | null`
  - `confidence`: 0.0 to 1.0
  - `formElementFound`: boolean
  - `fieldsMatched`: Array of `MatchedField`
  - `unmatchedFields`: Array of strings
- **Captured Job Record (`Application`)**:
  - Fields from Tracklet `Application` model in `src/types.ts`, extended with tailored CV attachment fields: `resumeFileName` (string), `resumeFileSize` (bytes number), `resumeBlobId` (or storage reference string), and `resumeUploadedAt` (ISO timestamp).

---

## 5. Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **Side Panel Stability**: Extension operates as a persistent Chrome Side Panel without unexpected dismissal during page interaction, maintaining 100% token parity with `DESIGN.md`.
- **SC-002**: **Contextual Switching Accuracy**: Auto-switching identifies Gmail/Outlook, LinkedIn profiles, and job pages correctly in $\ge 95\%$ of tab switches, with 0 lost draft inputs.
- **SC-003**: **Category Smart-Default Precision**: For LinkedIn profiles, headline smart-defaulting correctly selects `Recruiter` or `Hiring Manager` in $\ge 90\%$ of benchmark profiles.
- **SC-004**: **Recruiter Micro-Card Bundle Execution**: 100% of jobs saved with the recruiter micro-card checked create both the job application and the linked contact in a single user transaction.
- **SC-005**: **Code & Feature Preservation**: 100% of the 13 existing working capabilities cataloged in Section 1.A remain fully functional with 0 regressions.
- **SC-006**: **Zero Premature Submissions**: 100% of autofill operations populate inputs safely with synthetic events without submitting the form.
- **SC-007**: **Tailored CV Capture Fidelity**: 100% of applications saved with an attached CV successfully persist the file payload and metadata, enabling instant preview and download directly from Tracklet.

---

## 6. Assumptions & Scope Boundaries

- **Code Preservation**: The redesign builds directly upon existing extension files (`popup.html` / `sidepanel.html`, `popup.js`, `content.js`, `background.js`, `jobBoardRegistry.js`), modernizing the layout and adding new capabilities without discarding existing logic.
- **Chrome Side Panel Compatibility**: Manifest V3 `sidePanel` API is supported in Chrome 114+. Edge and Brave also support side panels. For environments where side panels are restricted, the view can also be accessed via popup fallback.
- **LinkedIn DOM Resiliency**: LinkedIn occasionally updates class names; scrapers prioritize semantic attributes (`h1`, `a[href*="/company/"]`, profile section landmarks) over fragile CSS class selectors.
- **Non-Destructive Autofill**: Autofill fills text, email, tel, and select inputs. It never bypasses CAPTCHAs, solves bot challenges, or clicks "Submit".
