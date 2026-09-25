# Tasks: Follow-Up Engine & Customizable Email Templates

**Input**: Design artifacts from `specs/005-followup-templates/` (`plan.md`, `spec.md`, `research.md`, `data-model.md`)

---

## Dependencies & Phase Order

```text
Phase 1: Foundational (Types, Constants, Utilities, Repository)
    │
    ├── Phase 2: P1 - Follow-Up Launcher Modal & 1-Click Actions
    │       │
    │       └── Phase 3: P2 - Template Management (In-Modal + Settings)
    │               │
    │               └── Phase 4: P3 - Contact Auto-Sync & Timeline Markers
    │                       │
    │                       └── Phase 5: Polish & Full Verification
```

---

## Phase 1: Foundational (Prerequisites)

- [x] **T001**: Define `FollowUpCategory` and `FollowUpTemplate` interfaces in `src/types.ts`.
- [x] **T002**: Add `DEFAULT_FOLLOWUP_TEMPLATES` constant in `src/lib/constants.ts` with the 4 curated situational templates.
- [x] **T003**: Create `src/lib/templateUtils.ts` with `interpolateTemplate(templateText, context)` handling `{company}`, `{role}`, `{contactName}`, `{dateApplied}` with graceful fallbacks.
- [x] **T004**: Create unit test suite `tests/unit/templateUtils.test.ts` validating token replacement, fallback values, and edge cases.
- [x] **T005**: Create `src/lib/templateRepository.ts` supporting `loadTemplates()`, `saveTemplate()`, `deleteTemplate()`, and `resetDefaultTemplates()` (localStorage for guest, Firestore for auth).

---

## Phase 2: User Story 1 (P1) - 1-Click Follow-Up Launcher

- [x] **T006**: Create `src/components/templates/FollowUpModal.tsx`:
  - Recruiter/Recipient selector (auto-selects primary, allows switching).
  - Situational template tabs/pills (Post-Application, Interview Thank-You, Status Inquiry, Offer).
  - Dynamic live preview with interpolated subject & body.
  - 1-click **"Open in Mail"** (`mailto:`) and **"Copy Text"** buttons with receipt toasts.
  - 5-day reminder task checkbox (`☑ Add reminder task in 5 days`).
  - Escape key listener and accessible ARIA modal dialog.
- [x] **T007**: Wire `FollowUpModal` into `src/components/detail/ApplicationQuickLinks.tsx` on the "Follow-up" button.

---

## Phase 3: User Story 2 (P2) - Template Customization & Library Management

- [x] **T008**: Create `src/components/templates/TemplateEditorModal.tsx` allowing users to create or edit template title, subject, category, and body with interactive variable placeholder chips.
- [x] **T009**: Create `src/components/templates/TemplateManagerSection.tsx` providing a full template list with edit, delete, create, and "Reset Defaults" actions.
- [x] **T010**: Integrate `TemplateManagerSection` into `src/components/SettingsView.tsx` under a dedicated "Follow-Up Templates" card.
- [x] **T011**: Add an inline "Manage Templates" trigger inside `FollowUpModal.tsx` so users can customize templates without leaving their active application.

---

## Phase 4: User Story 3 (P3) - Contact Sync & Timeline Activity Markers

- [x] **T012**: Update `ApplicationQuickLinks.tsx` to automatically resolve the primary recruiter email and name from `app.contacts` / `allContacts` when `app.contactEmail` is not explicitly set.
- [x] **T013**: Add a 1-click **"Follow-up"** button on contact cards in `src/components/detail/ContactCard.tsx` and `src/components/ContactDetailPanel.tsx` that opens `FollowUpModal` pre-locked to that contact.
- [x] **T014**: When a follow-up is triggered (copied or opened in mail), log an activity touchpoint marker to `app.history` (`Follow-up sent to [Contact] ([Template]) • [Date]`).
- [x] **T015**: When the 5-day reminder checkbox is active on trigger, automatically inject a follow-up task into `app.tasks` with `dueDate` set to 5 business days in the future.

---

## Phase 5: Verification & Polish

- [x] **T016**: Run TypeScript type checks (`npx tsc --noEmit`) to verify zero errors across all components.
- [x] **T017**: Run Vitest test suite (`npm test`) and ensure all test files pass cleanly.
- [x] **T018**: Run Vite production build (`npm run build`) to ensure bundle integrity.
- [x] **T019**: Test end-to-end user workflows on `http://localhost:3001/` (modal launcher, template editing, contact card buttons, timeline entry, and task generation).
