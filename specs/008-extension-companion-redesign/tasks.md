---
description: "Task list for feature 008-extension-companion-redesign implementation"
---

# Tasks: Extension Side Panel Redesign, Contact Clipper & Autofill Readiness

**Input**: Design documents from `/specs/008-extension-companion-redesign/`  
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)  
**Tests**: Focused unit test suites included in `tests/unit/` for classification, ATS detection, CV metadata, and tab routing heuristics.  
**Organization**: Tasks are grouped strictly by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., `[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`, `[US6]`)
- Every task includes exact file paths in descriptions.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared infrastructure and type model extensions supporting side panel capabilities, tailored CVs, and storage contracts.

- [X] T001 Extend `Application` interface in `src/types.ts` with optional tailored CV metadata attributes (`resumeFileName`, `resumeFileSize`, `resumeBlobId`, `resumeUploadedAt`)
- [X] T002 Update `ApplicationRepository` in `src/lib/applicationRepository.ts` to normalize and persist optional tailored CV metadata attributes in Firestore and local storage
- [X] T003 [P] Update CSV export in `src/lib/exportCsv.ts` and CSV import in `src/lib/importCsv.ts` to include optional tailored CV metadata columns
- [X] T004 [P] Update Manifest V3 declaration in `extension/manifest.json` with permissions (`"sidePanel"`, `"tabs"`, `"storage"`) and declare `"side_panel"` with default path `"popup.html"`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core extension runtime infrastructure, storage contracts, and background routing that MUST be complete before user stories can execute.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Implement IndexedDB storage utility `TrackletExtensionDB` in `extension/indexedDbResumeStorage.js` with `tailored_resumes` object store adhering to `contracts/candidate-profile-storage.md`
- [X] T006 [P] Implement `CandidateProfile` storage helpers in `extension/profileStorage.js` supporting `chrome.storage.sync` (key: `tracklet_candidate_profile_v1`) with local fallback per `contracts/candidate-profile-storage.md`
- [X] T007 [P] Configure side panel panel behavior (`chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`) and message dispatch router in `extension/background.js` adhering to `contracts/side-panel-messaging.md`
- [X] T008 Implement unified runtime message receiver in `extension/content.js` to dispatch `GET_PAGE_DATA`, `DETECT_ATS_FORM`, `EXECUTE_AUTOFILL`, and `SCROLL_TO_FIELD` actions per `contracts/side-panel-messaging.md`

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel or sequentially.

---

## Phase 3: User Story 1 - Persistent Chrome Side Panel Shell & Contextual Auto-Switching (Priority: P1) 🎯 MVP

**Goal**: Transform extension from ephemeral popup to a persistent Chrome Side Panel docked next to active web pages, showing live account status, 4-tab segmented navigation (`[📥 Job]`, `[👤 Contact]`, `[✉️ Email]`, `[⚡ Autofill]`), contextual auto-switching based on active tab URL, and tab draft memory preserving in-progress edits.

**Independent Test**: Click extension icon; companion docks on right as persistent Side Panel. Navigate across a job board, a LinkedIn profile (`linkedin.com/in/*`), and Gmail (`mail.google.com`); companion auto-switches to matching tab within 150ms. Edit notes on Job tab, switch tabs, and verify draft text remains fully intact.

### Tests for User Story 1

- [X] T009 [P] [US1] Add unit tests for tab URL classification heuristics (LinkedIn profile vs. job board vs. webmail vs. generic) in `tests/unit/extensionTabContext.test.ts`

### Implementation for User Story 1

- [X] T010 [US1] Add tab lifecycle listeners (`chrome.tabs.onActivated`, `chrome.tabs.onUpdated`) in `extension/background.js` and `extension/popup.js` to detect active tab context changes
- [X] T011 [US1] Implement Contextual Auto-Switching controller in `extension/popup.js` routing `linkedin.com/in/*` to Contact, webmail to Email, and job boards to Job tab
- [X] T012 [US1] Implement Tab Draft Memory manager in `extension/popup.js` saving and restoring uncommitted form inputs across tab transitions in session memory
- [X] T013 [US1] Implement manual override anchoring in `extension/popup.js` so explicit tab clicks remain active until the user navigates to an entirely different web domain

**Checkpoint**: At this point, User Story 1 is fully functional and delivers the complete Side Panel shell MVP.

---

## Phase 4: User Story 2 - LinkedIn Contact Clipper with Category Smart-Defaulting (Priority: P1)

**Goal**: Extract LinkedIn profile information (`linkedin.com/in/*`) into Tracklet Contacts Hub, with intelligent headline-based category smart-defaulting, active job application linking, and change detection with an "Update Contact" button.

**Independent Test**: Navigate to a LinkedIn profile ("Senior Technical Recruiter at Stripe"); open `[👤 Contact]` tab; observe pre-filled name, headline, company, and LinkedIn URL; observe category automatically pre-selected as `Recruiter`; link to an active Stripe application; click "Save Contact to Tracklet"; verify contact created in Contacts Hub; re-inspecting profile shows "✓ Saved in Contacts Hub" badge or "Update Contact" if headline/company changed.

### Tests for User Story 2

- [X] T014 [P] [US2] Add unit tests for headline keyword regex classification (`Recruiter`, `Hiring Manager`, `Mentor`, `Other`) and contact deduplication diffing in `tests/unit/contactClipper.test.ts`

### Implementation for User Story 2

- [X] T015 [US2] Implement LinkedIn profile DOM extractor in `extension/content.js` extracting full name, headline, current organization, location, and canonical LinkedIn URL
- [X] T016 [P] [US2] Implement Category Smart-Defaulting inference engine in `extension/popup.js` matching headline keywords to `Recruiter`, `Hiring Manager`, and `Mentor`
- [X] T017 [US2] Build Contact Clipper UI in `extension/popup.html` and `extension/popup.css` (contact avatar, name/role/org inputs, category pill selector, application link dropdown)
- [X] T018 [US2] Implement contact deduplication, diffing, and "Update Contact" state handling in `extension/popup.js` adhering to `data-model.md`
- [X] T019 [US2] Implement Firestore `/users/{uid}/contacts` persistence and offline sync queue fallback for captured contacts in `extension/popup.js`

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently and seamlessly together.

---

## Phase 5: User Story 3 - Recruiter Micro-Card on Job Posts (Priority: P1)

**Goal**: Detect recruiter or job poster on job postings (LinkedIn, Greenhouse, Lever) and display a Recruiter Micro-Card on the Job Clipper tab that bundles contact creation and bidirectional application linking directly into the "Save Application" action.

**Independent Test**: Open a LinkedIn job post displaying a job poster; in the side panel's Job tab, inspect the Recruiter Micro-Card displaying their name and role with a checked "Add as recruiter contact" checkbox; click "Save Application"; verify both the application and the contact are created and mutually linked (`contactIds` on application, `applicationIds` on contact).

### Tests for User Story 3

- [X] T020 [P] [US3] Add unit tests for recruiter/job poster DOM parsing heuristics across LinkedIn and ATS job postings in `tests/unit/recruiterDetection.test.ts`

### Implementation for User Story 3

- [X] T021 [US3] Implement job poster DOM extraction in `extension/content.js` for LinkedIn job postings (`.job-details-jobs-unified-top-card__job-poster`, hiring team cards) and ATS hosts
- [X] T022 [US3] Refine Recruiter Micro-Card component in `extension/popup.html` and `extension/popup.css` with recruiter avatar, headline badge, and checked-by-default opt-in toggle
- [X] T023 [US3] Implement atomic bundle-on-save transaction in `extension/popup.js` creating the contact, saving the application, and establishing bidirectional `contactIds`/`applicationIds` linking
- [X] T024 [US3] Add "View Contact Details" transition action on Recruiter Micro-Card in `extension/popup.js` transferring scraped profile state directly into the `[👤 Contact]` tab for editing

**Checkpoint**: User Story 3 provides single-transaction job and recruiter bundle saving with zero extra clicks.

---

## Phase 6: User Story 4 - First-Class Webmail Companion (Gmail & Outlook) (Priority: P1)

**Goal**: Elevate existing Gmail and Outlook email thread clipping with active stage & recency ranking for multi-application company matches, 1-click stage advancement on email log, and recruiter contact capture from email senders.

**Independent Test**: Open an interview invite email in Gmail; Email tab extracts sender, subject, date, and sanitized snippet; companion prioritizes active application in `Interview`/`Screening` stage; offers 1-click pipeline advance to "Interview"; click "Log Email to Tracklet"; verify email logged and application stage updated.

### Tests for User Story 4

- [X] T025 [P] [US4] Extend `tests/unit/webmailCompanion.test.ts` with test cases verifying multi-application active stage & recency ranking (`Interview > Screening > Applied > Saved`, newest first)

### Implementation for User Story 4

- [X] T026 [US4] Implement active stage and recency ranking algorithm in `extension/popup.js` to automatically target the best application match when multiple applications exist for an employer
- [X] T027 [US4] Implement multi-match indicator badge and "Switch Job" searchable popover (`app-selector-popover`, `app-search-input`, `app-selector-list`) in `extension/popup.html` and `extension/popup.js`
- [X] T028 [US4] Implement in-flight pipeline stage advancement on email log in `extension/popup.js` updating application status and recording stage history entries
- [X] T029 [US4] Implement opt-in "Add sender as recruiter contact in Contacts Hub" checkbox in `extension/popup.html` and `extension/popup.js`

**Checkpoint**: User Story 4 preserves 100% of existing webmail features while upgrading multi-match precision.

---

## Phase 7: User Story 5 - Modernized Job Clipper Hierarchy & Tailored CV Storage (Priority: P1)

**Goal**: Deliver an executive-level job clipping experience with 40×40px brand avatar (clean Google favicon `sz=128`, brand rejection of 100+ job board domains in `jobBoardRegistry.js`, SVG monogram fallback), stage safety (`Saved`/`Applied` pills, read-only for later stages), compact 2×2 metadata matrix, rich WYSIWYG notes with bidirectional Markdown, and tailored CV upload dropzone linked to applications.

**Independent Test**: Save a job posting on Greenhouse; drop a tailored resume file `Custom_Resume.pdf` into the CV dropzone; save application; verify resume filename/size metadata in application record and binary payload stored in IndexedDB `TrackletExtensionDB` with preview/download access.

### Tests for User Story 5

- [X] T030 [P] [US5] Add unit tests for tailored CV metadata validation, file size limits (max 10MB), and IndexedDB binary conversion in `tests/unit/tailoredCv.test.ts`

### Implementation for User Story 5

- [X] T031 [US5] Implement tailored CV upload dropzone, file input picker, and attachment chip in `extension/popup.html` and `extension/popup.css`
- [X] T032 [US5] Implement tailored CV file capture, binary storage in IndexedDB `TrackletExtensionDB`, and metadata linking (`resumeFileName`, `resumeFileSize`, `resumeBlobId`, `resumeUploadedAt`) in `extension/popup.js`
- [X] T033 [US5] Implement stage safety locks in `extension/popup.js` (mutually exclusive `Saved`/`Applied` pills for new clips; immutable read-only badge for `Screening`, `Interview`, `Offer`, `Rejected`, `Archived`)
- [X] T034 [US5] Verify employer brand identity resolution in `extension/popup.js` (Google Favicon `sz=128`, canonical rejection of job board domains via `jobBoardRegistry.js`, and SVG monogram fallback)

**Checkpoint**: User Story 5 ensures job clipping is modern, bulletproof, and preserves exact submitted CV variants.

---

## Phase 8: User Story 6 - Autofill Hub: Candidate Profile & ATS Form Detection (Priority: P2)

**Goal**: Provide candidate profile summary card with inline quick-edit, real-time ATS form detection for Greenhouse, Lever, and Workday, 1-click safe autofill with synthetic event dispatch, and an interactive checklist in the side panel with 1.5s scroll-to-field highlight on the host webpage.

**Independent Test**: Open a Greenhouse job application page; open `[⚡ Autofill]` tab; observe green "Greenhouse Form Detected (7 fields mapped)" status pill; click "⚡ Auto-Fill Application"; standard fields populate with synthetic events; checklist displays populated fields; click "Phone" item; host page smoothly scrolls to phone input with 1.5s accent halo; form is not submitted.

### Tests for User Story 6

- [X] T035 [P] [US6] Add unit tests for ATS form selector matching (Greenhouse, Lever, Workday) and 4-tier field resolution hierarchy in `tests/unit/atsFormDetection.test.ts`

### Implementation for User Story 6

- [X] T036 [US6] Build Candidate Profile summary card with inline Quick Edit drawer and field validation in `extension/popup.html`, `extension/popup.css`, and `extension/popup.js`
- [X] T037 [US6] Implement ATS form detection engine in `extension/content.js` identifying Greenhouse (`boards.greenhouse.io`), Lever (`jobs.lever.co`), Workday (`myworkdayjobs.com`), and generic forms
- [X] T038 [US6] Implement non-destructive autofill injector in `extension/content.js` setting native element values and dispatching synthetic `input`, `change`, and `blur` events with zero auto-submissions
- [X] T039 [US6] Build interactive populated fields checklist in `extension/popup.html` and `extension/popup.js` displaying populated items (`✓`) and manual alerts (`⚠`)
- [X] T040 [US6] Implement `SCROLL_TO_FIELD` action in `extension/content.js` executing smooth scroll-into-view, input focus, and 1.5s transient accent halo outline

**Checkpoint**: Autofill Hub is fully functional, safe, non-destructive, and provides tactile scroll-to-field visual verification.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: System-wide quality assurance, zero-regression audit across all 13 preserved extension features, test suites, and documentation updates.

- [X] T041 [P] Verify 13 preserved features zero-regression checklist in `extension/` (live tab sync, offline queue, context menus, global shortcuts, stage safety, duplicate detection, logo pipeline, structured fields, Markdown engine, recruiter detection, webmail companion, auth sync/guest mode, and auto-dismissal)
- [X] T042 Run full automated verification suite: `npm test` and `npx tsc --noEmit`
- [X] T043 Run production build verification: `npm run build`
- [X] T044 Execute manual end-to-end verification across all 6 scenarios in `specs/008-extension-companion-redesign/quickstart.md`
- [X] T045 [P] Update `extension/README.md` with Side Panel usage, keyboard shortcuts, Autofill Hub instructions, and tailored CV attachment documentation

---

## Phase 9: User Story 7 - Real-Time In-Page SPA Route Reactivity & Context Retention (Priority: P1)

**Goal**: Automatically detect when a user clicks between jobs on a job board (LinkedIn, Indeed), between email threads in Gmail/Outlook, or between recruiter profiles, immediately switching tabs and extracting content in real time with a smooth 150ms subtle transition, retaining the last viewed item on exit/inbox, cleanly discarding unsubmitted edits, and strictly guaranteeing zero automatic background saves.

**Independent Test**: Navigate to LinkedIn job search, click Job 1, then click Job 2; side panel immediately refreshes to Job 2 with subtle transition without full page reload. Navigate to Gmail, open Email 1, then Email 2; side panel refreshes to Email 2. Return to Gmail inbox list; side panel retains Email 2. Verify zero writes occur in Firestore or local queues without clicking Save.

### Implementation for User Story 7

- [X] T046 [P] [US7] Implement in-page History API wrapper (`pushState`, `replaceState`), `hashchange`, `popstate` listeners, and debounced thread DOM observer in `extension/content.js` to dispatch `PAGE_CONTEXT_CHANGED` per `contracts/side-panel-messaging.md`
- [X] T047 [P] [US7] Update `chrome.tabs.onUpdated` in `extension/background.js` to broadcast `ACTIVE_TAB_UPDATED` on `changeInfo.url` for SPA route transitions without waiting for `status === 'complete'`
- [X] T048 [US7] Implement live reactive transition coordinator in `extension/popup.js` to extract data on context change, cleanly discard unsubmitted edits, and trigger smooth 150ms subtle transition
- [X] T049 [US7] Implement Idle / Exit Context Retention in `extension/popup.js` to retain the last viewed item on screen when returning to webmail inbox list or navigating to generic pages
- [X] T050 [US7] Enforce strict Zero Auto-Save guarantee in `extension/popup.js` ensuring page navigation and tab context switching never trigger background database writes

---

## Phase 10: User Story 8 - Smart Multi-Entity Duplicate Recognition & Dirty-Gated Update (Priority: P1)

**Goal**: Automatically recognize when an opened job, email, or contact already exists in Tracklet. Display clear "Already Tracked" / "Already Logged" / "Already in Contacts Hub" status banners, switch the action button to "Update", and keep it disabled until form fields deviate from baseline stored data.

**Independent Test**: Open a job already saved in Tracklet; side panel displays "Already tracked in Tracklet" banner and "Update Application" button is disabled. Edit notes or salary; button immediately enables. Open a webmail email already logged to the matched application; banner displays "Already logged to this job" and "Update Email Log" is disabled until edited. Open a LinkedIn profile already in Contacts Hub (matching by URL, email, or Full Name); banner displays "Already in Contacts Hub" and "Update Contact" is disabled until edited.

### Implementation for User Story 8

- [X] T051 [P] [US8] Implement scoped Webmail Email Duplicate Recognition in `extension/popup.js` checking currently matched application's `emails` list by `emailUrl` or `subject` + `date`
- [X] T052 [P] [US8] Implement Contact Multi-Identifier Deduplication in `extension/popup.js` matching against Contacts Hub (`tracklet_contacts_index`) by canonical LinkedIn URL, email address, OR case-insensitive Full Name
- [X] T053 [US8] Implement Form Dirty State Tracker in `extension/popup.js` across Job, Email, and Contact forms comparing live inputs against baseline extracted snapshot to activate "Update" buttons only on edit
- [X] T054 [P] [US8] Add UI styling tokens for duplicate status banners, matched pills, and subtle transition animations in `extension/popup.css` and `extension/popup.html`

---

## Phase 11: Polish & Comprehensive Verification

**Purpose**: Verify TypeScript compilation, production build, and end-to-end workflows across all new reactive capabilities.

- [X] T055 Run type check verification: `npx tsc --noEmit`
- [X] T056 Run production build verification: `npm run build`
- [X] T057 Execute manual verification across Scenarios 7, 8, and 9 in `specs/008-extension-companion-redesign/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phases 1–8**: Completed foundational side panel capabilities.
- **Phase 9 (US7: Reactivity)**: Depends on Phase 1–8 shell; can execute in parallel with Phase 10 groundwork.
- **Phase 10 (US8: Duplicates & Dirty Tracking)**: Integrates with US7 reactive extraction lifecycle in `popup.js`.
- **Phase 11 (Polish & Verification)**: Runs after Phase 9 and Phase 10 completion.

### User Story Dependencies

```mermaid
graph TD
    Foundation[Phases 1-8: Extension Companion Foundation] --> US7[Phase 9: US7 Real-Time SPA Route Reactivity]
    Foundation --> US8[Phase 10: US8 Multi-Entity Duplicate Recognition & Dirty Update]
    US7 --> US8
    US7 --> Polish[Phase 11: Final Polish & Verification]
    US8 --> Polish
```

### Parallel Opportunities

- **Phase 9 (US7)**: T046 (`content.js` SPA hooks) and T047 (`background.js` URL listener) can be implemented in parallel.
- **Phase 10 (US8)**: T051 (Email duplicate check), T052 (Contact deduplication), and T054 (`popup.css` styling) can execute in parallel before T053 (unified dirty tracker).

---

## Implementation Strategy

### Incremental Delivery (Current Milestone)

1. **Increment 1 (Reactivity)**: Hook `content.js` and `background.js` into SPA navigation and thread changes, delivering real-time tab switching with clean discard and idle retention (US7).
2. **Increment 2 (Smart Duplicates & Dirty Tracking)**: Implement scoped email duplicate recognition, multi-identifier contact matching, and baseline input dirty tracking gating the "Update" buttons (US8).
3. **Increment 3 (Verification)**: Full type check, production build, and quickstart validation of Scenarios 7, 8, and 9 (Phase 11).

