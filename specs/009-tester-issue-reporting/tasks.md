# Tasks: Tester Issue & Feedback Reporting System

**Input**: Design documents from `specs/009-tester-issue-reporting/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/api-report-issue.json`, `quickstart.md`)

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `data-model.md`, `contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, types, constants, and shared configuration

- [x] T001 Define `TesterReportCategory`, `TesterReportSeverity`, `TesterReportStatus`, `DiagnosticContext`, `TesterAttachment`, and `TesterIssueReport` interfaces in `src/types.ts`
- [x] T002 [P] Define `TESTER_REPORT_CATEGORIES`, `TESTER_REPORT_SEVERITIES`, and `DEFAULT_TESTER_DIAGNOSTICS` constants in `src/lib/constants.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure, pure utility engines, and repository persistence required by all user stories

**⚠️ CRITICAL**: Must be completed before user stories can begin

- [x] T003 Create `src/lib/diagnosticUtils.ts` with `collectDiagnosticContext()` capturing browser, OS, viewport, active route, auth mode, and sanitized error log snippet
- [x] T004 [P] Create unit test suite `tests/unit/diagnosticUtils.test.ts` validating OS/browser detection, viewport parsing, and error sanitization
- [x] T005 [P] Create `src/lib/imageUtils.ts` for clipboard image extraction (`extractImageFromClipboard`), file size validation (< 2MB), and canvas WebP compression (< 300KB)
- [x] T006 [P] Create unit test suite `tests/unit/imageUtils.test.ts` verifying MIME validation, size limits, and canvas compression fallbacks
- [x] T007 Create `src/lib/feedbackRepository.ts` supporting `saveReport(report)`, `loadReports()`, and `saveDraft(draft)` / `loadDraft()` using Firestore (`tester_feedback`) and `localStorage`
- [x] T008 [P] Create unit test suite `tests/unit/feedbackRepository.test.ts` verifying Firestore persistence, offline draft saving, and mock dispatch

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 (P1) - In-App Issue Reporting with Auto-Captured Diagnostics 🎯 MVP

**Goal**: Deliver an accessible modal and entry points where testers can report bugs with category, severity, title, description, optional name/email, and automated diagnostic environment metadata.

**Independent Test**: Can be verified by opening the modal from Settings or the Sidebar, entering a title and description, and submitting. System captures diagnostics, saves report to Firestore, and displays confirmation receipt.

### Implementation for User Story 1

- [x] T009 [P] [US1] Create `src/components/feedback/DiagnosticSummaryCard.tsx` collapsible accordion displaying captured environment details with a 1-click "Copy Diagnostics" button
- [x] T010 [US1] Create `src/components/feedback/TesterReportModal.tsx` accessible modal dialog with category dropdown (`CustomSelectDropdown`), title, description, severity selector, optional reporter name/email, `useEscapeKey` dismissal, and submission receipt
- [x] T011 [P] [US1] Create `src/components/feedback/FeedbackSettingsCard.tsx` Help & Feedback card for SettingsView with launcher button and system diagnostics overview
- [x] T012 [US1] Integrate `FeedbackSettingsCard` into `src/components/SettingsView.tsx` under a dedicated "Help & Feedback" section
- [x] T013 [US1] Add "Report Issue" action to `src/components/Sidebar.tsx` footer (desktop sidebar and mobile drawer) and wire modal state into `src/context/NavigationContext.tsx`

**Checkpoint**: User Story 1 complete — full working MVP for reporting bugs and diagnostics in-app

---

## Phase 4: User Story 2 (P2) - Visual Evidence via Clipboard Paste & File Upload

**Goal**: Allow testers to attach screenshots via `Ctrl + V` keyboard paste, drag-and-drop, or native file picker with instant client-side preview, enlargement viewer, and remove controls.

**Independent Test**: Can be verified by copying an image to the clipboard (`Win + Shift + S`), opening `TesterReportModal`, pressing `Ctrl + V`, inspecting thumbnail preview and file size, and submitting the report with the attachment.

### Implementation for User Story 2

- [x] T014 [P] [US2] Create `src/components/feedback/AttachmentDropzone.tsx` supporting drag-and-drop, native file picker, and modal `Ctrl + V` clipboard paste listeners
- [x] T015 [US2] Integrate `AttachmentDropzone` into `src/components/feedback/TesterReportModal.tsx` with thumbnail preview, file size display, full-screen image preview overlay, and remove button
- [x] T016 [US2] Wire `AttachmentDropzone` to `src/lib/imageUtils.ts` to automatically compress attached screenshots client-side before submission

**Checkpoint**: User Stories 1 AND 2 complete — bug reporting paired with instant visual evidence

---

## Phase 5: User Story 3 (P3) - GitHub Issue Routing via Vercel Serverless Function & Cloud Persistence

**Goal**: Automatically route submitted reports to GitHub Issues with raw title, severity labels, diagnostic tables, and screenshot embeds via Vercel Serverless Function on the free Hobby tier (no credit card).

**Independent Test**: Can be verified by submitting a report and verifying the creation of a GitHub Issue in the repository with labels (`bug`, `tester-feedback`, `severity: high`) and markdown diagnostics, or viewing the 1-click GitHub URL fallback in local dev.

### Implementation for User Story 3

- [x] T017 [P] [US3] Create Vercel Serverless Function `api/report-issue.ts` using GitHub REST API to create issues with raw title, labels (`bug`, `tester-feedback`, severity), formatted diagnostic tables, and optional reporter details
- [x] T018 [US3] Update `src/lib/feedbackRepository.ts` to dispatch submissions to `/api/report-issue` with graceful fallback to Firestore storage and 1-click GitHub Issue URL generator for local development
- [x] T019 [US3] Update `src/components/feedback/TesterReportModal.tsx` confirmation receipt to display linked GitHub Issue number/URL when returned by the API

**Checkpoint**: All user stories complete — reports land directly in GitHub repository and Firestore

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Global shortcuts, draft resilience, and full verification

- [x] T020 [P] Implement global `?` keyboard shortcut in `src/App.tsx` (when not focused on editable inputs) to summon `TesterReportModal`
- [x] T021 [P] Implement offline draft auto-save and restoration (`localStorage`) in `src/components/feedback/TesterReportModal.tsx` so unsubmitted text survives network drops or page reloads
- [x] T022 Run TypeScript type check (`npx tsc --noEmit`) to verify zero errors across all components
- [x] T023 Run Vitest test suite (`npm test`) across all unit tests
- [x] T024 Run Vite production build (`npm run build`) to ensure bundle compiles cleanly
- [x] T025 Execute `quickstart.md` manual validation walkthrough end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1: Setup (T001 - T002)
    │
    ▼
Phase 2: Foundational (T003 - T008)  [BLOCKS all user stories]
    │
    ├─────────────────────────────┬─────────────────────────────┐
    ▼                             ▼                             ▼
Phase 3: User Story 1 (P1)   Phase 4: User Story 2 (P2)   Phase 5: User Story 3 (P3)
  (T009 - T013) 🎯 MVP         (T014 - T016)                (T017 - T019)
    │                             │                             │
    └─────────────────────────────┼─────────────────────────────┘
                                  ▼
                     Phase 6: Polish (T020 - T025)
```

### Parallel Opportunities

- **Setup & Foundational**:
  - `T002` [P] can run in parallel with `T001`.
  - `T004`, `T005`, `T006`, and `T008` can run in parallel once `T003` and `T007` interfaces are outlined.
- **User Stories (post-foundational)**:
  - `T009` and `T011` can be built in parallel with `T010`.
  - `T014` and `T017` can run in parallel as distinct components/endpoints.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (User Story 1: In-App Reporter Modal + Settings Card + Sidebar action).
3. **STOP and VALIDATE**: Verify tester can open modal, type title/description, see auto-diagnostics, and submit.
4. Deploy/Demo as a functional MVP.

### Incremental Delivery
1. Add User Story 2: Paste screenshots via `Ctrl + V` and file picker.
2. Add User Story 3: Vercel Serverless Function `/api/report-issue` to auto-generate GitHub Issues.
3. Polish: Hotkey `?`, draft auto-save, and full build validation.
