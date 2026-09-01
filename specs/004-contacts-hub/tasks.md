# Tasks: Unified Contacts & Mentorship Hub

**Input**: Design documents from `specs/004-contacts-hub/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`)

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Define core data types, constants, and routing helpers needed across all contact features.

- [X] T001 Update data types in `src/types.ts` to add `ContactCategory`, update `Contact` interface (with `organization`, `category`, `nextFollowUpDate`, `applicationIds`, `createdAt`, `updatedAt`), update `Application` interface with `contactIds: string[]`, and add `'contacts'` to `ActiveTab`
- [X] T002 [P] Add contact categories (`CONTACT_CATEGORIES`), storage keys (`LOCAL_STORAGE_KEYS.GUEST_CONTACTS`, `CONTACTS_LAYOUT_KEY`), and category styling tokens in `src/lib/constants.ts`
- [X] T003 [P] Add route mappings for `/contacts` path ↔ `'contacts'` tab in `src/lib/routeUtils.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data layer, persistence repository, and utility helpers that MUST be completed before UI story implementation.

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete.

- [X] T004 Implement `ContactRepository` in `src/lib/contactRepository.ts` with static methods: `loadContacts()`, `saveContact()`, `deleteContact()`, `batchDelete()`, `seedDemoContacts()`, `loadGuestContacts()`, `saveGuestContacts()`, `purgeUserData()`, and `migrateGuestContacts()`
- [X] T005 [P] Implement pure contact utility helpers in `src/lib/contactUtils.ts`: filter by query (name, role, org), filter by category, sort contacts, and calculate upcoming follow-ups due within configured threshold
- [X] T006 [P] Update `src/lib/applicationRepository.ts` sanitization to handle `contactIds: string[]` on application creation, updates, batch imports, and demo seeding
- [X] T007 Add contacts top-level state, contact repository loading, and pass-through handlers in `src/App.tsx` (supporting authenticated Firestore sync and guest localStorage mode)

**Checkpoint**: Data layer foundation ready — user story UI implementation can now begin.

---

## Phase 3: User Story 1 — Browse & Manage All Contacts (Priority: P1) 🎯 MVP

**Goal**: Job seeker can navigate to the Contacts tab, view all contacts in a card grid or compact table, search/filter them, add new contacts, edit existing contacts, and delete contacts with an Undo snackbar.

**Independent Test**: Navigate to Contacts tab, create a contact with name/category/org, verify it appears in card grid, toggle to table view, edit details, and delete with Undo confirmation.

- [X] T008 [P] [US1] Create empty state illustration and call-to-action component in `src/components/contacts/ContactEmptyState.tsx`
- [X] T009 [P] [US1] Create card grid component in `src/components/contacts/ContactCardGrid.tsx` rendering avatar initials, role, organisation badge, category chip, and quick-action communication links
- [X] T010 [P] [US1] Create compact table component in `src/components/contacts/ContactTable.tsx` for dense directory scanning with column sorting
- [X] T011 [US1] Create main `ContactsView` container component in `src/components/ContactsView.tsx` with search bar, category filter chips, layout toggle (grid/table), and "+ Add Contact" modal trigger
- [X] T012 [US1] Add "Contacts" tab entry with `Users` icon and count badge to sidebar navigation in `src/components/Sidebar.tsx`
- [X] T013 [US1] Wire `ContactsView` tab rendering into `src/App.tsx` layout when `activeTab === 'contacts'`

**Checkpoint**: User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 2 — Link Existing Contact to Job Application via Search (Priority: P1)

**Goal**: Inside an application detail panel or add modal, user can click "Attach Contact", type in a search-first combobox, and link an existing contact in 1 click without duplicate associations.

**Independent Test**: Open an application detail panel, click "Attach Contact", search for an existing contact by name/org, select it, and verify the contact appears linked to that application.

- [X] T014 [US2] Implement link and unlink repository methods `linkContactToApplication()` and `unlinkContactFromApplication()` in `src/lib/contactRepository.ts` (updating both `contact.applicationIds` and `application.contactIds` atomically)
- [X] T015 [US2] Create reusable `ContactSearchPicker` typeahead combobox in `src/components/ContactSearchPicker.tsx` (filtering by name, role, org; excluding already-linked contacts; keyboard navigation with Arrow/Enter/Escape)
- [X] T016 [US2] Refactor `ContactManagerSection` in `src/components/detail/ContactManagerSection.tsx` to integrate `ContactSearchPicker` for attaching existing contacts and displaying linked contact cards
- [X] T017 [US2] Update `AddApplicationModal` in `src/components/AddApplicationModal.tsx` and `src/components/add-modal/AddApplicationContactsSection.tsx` to use `ContactSearchPicker` for linking contacts during new job creation

**Checkpoint**: User Story 2 is functional and contacts can be linked via search-first typeahead.

---

## Phase 5: User Story 3 — View & Navigate Linked Applications from Contact (Priority: P2)

**Goal**: When viewing a contact's detail drawer, user can see all job applications that contact is linked to and click any application to navigate directly to its detail panel.

**Independent Test**: Link a contact to 2 applications, open the contact's detail drawer, verify both applications appear as clickable pills, click one, and verify the app detail panel opens.

- [X] T018 [US3] Create `ContactDetailPanel` slide-over drawer in `src/components/ContactDetailPanel.tsx` with full contact profile editor, meeting notes area, and "Linked Applications" list
- [X] T019 [US3] Wire 1-click navigation in `src/components/ContactDetailPanel.tsx` and `src/App.tsx` to switch views and open the selected application's detail panel (`setSelectedAppId`)
- [X] T020 [US3] Connect card and table row click events in `src/components/ContactsView.tsx` to open `ContactDetailPanel`

**Checkpoint**: User Stories 1, 2, and 3 are functional with seamless bidirectional navigation.

---

## Phase 6: User Story 4 — Standalone Mentors with Follow-up Date Reminders (Priority: P2)

**Goal**: Support standalone mentors and networking contacts with next follow-up dates that surface in the sidebar Contacts tab badge (reusing the user-configured expiry threshold from Settings).

**Independent Test**: Create a mentor contact with a follow-up date due tomorrow, verify the sidebar badge shows an incremented count, and verify overdue indicators display on the contact card.

- [X] T021 [US4] Add `getContactsFollowUpDueSoon()` in `src/lib/contactUtils.ts` reusing `ExpiryNotificationSettings.expiryThresholdHours` from `src/lib/expiryUtils.ts`
- [X] T022 [US4] Wire follow-up due count into the sidebar Contacts tab badge in `src/components/Sidebar.tsx`
- [X] T023 [US4] Add visual due/overdue status badges on contact cards in `src/components/contacts/ContactCardGrid.tsx` and `src/components/contacts/ContactTable.tsx`

**Checkpoint**: Standalone mentors with follow-up tracking and dynamic sidebar badge work end-to-end.

---

## Phase 7: User Story 5 — Unlink Contact from Job Application (Priority: P3)

**Goal**: User can remove a contact's association from a specific job application without deleting the contact from the global directory, with Undo capability.

**Independent Test**: Unlink a contact in application detail panel, verify it disappears from the application but remains in Contacts tab; click Undo to restore link.

- [X] T024 [US5] Implement explicit "Unlink" action in `src/components/detail/ContactManagerSection.tsx` with clear tooltip and label (`"Unlink from this application"`)
- [X] T025 [US5] Implement Undo toast notification on unlink in `src/App.tsx` via `addToast('info', 'Contact unlinked', ..., { label: 'Undo' })`
- [X] T026 [US5] Implement cascade cleanup on permanent contact delete in `src/lib/contactRepository.ts` (`deleteContact` removes contact ID from all linked applications)

**Checkpoint**: Unlink and cascade cleanups work safely with Undo snackbar receipts.

---

## Phase 8: User Story 6 — Inline-Create Contact from Detail Panel Typeahead (Priority: P3)

**Goal**: If a contact does not exist when searching in `ContactSearchPicker`, user can click "➕ Create new contact '[query]'" to expand an inline creation form that saves to global directory and links immediately.

**Independent Test**: Open attach typeahead in job detail, type "Alex Kim" (non-existent), click "Create new", submit, and verify Alex Kim is both created globally and linked to this job.

- [X] T027 [US6] Add "➕ Create new contact '[searchQuery]'" dropdown option in `src/components/ContactSearchPicker.tsx` when no exact match exists
- [X] T028 [US6] Implement inline quick-create form (Name prefilled, Category, Org, Role, Email, Phone) inside `src/components/ContactSearchPicker.tsx` that calls `onCreateAndLink`

**Checkpoint**: Inline contact creation from within job applications functions seamlessly.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: One-time legacy migration, CSV import/export synchronization, guest migration extension, demo data seeding, and build verification.

- [X] T028 Implement one-time legacy embedded contacts auto-migration on first load in `src/lib/contactMigration.ts` (extract embedded contacts, deduplicate by name, save as standalone contacts, link back to apps, and clear legacy embedded arrays)
- [X] T029 Wire migration execution on app startup in `src/App.tsx` (gated by migration flag)
- [X] T030 [P] Update CSV export in `src/lib/exportCsv.ts` and CSV import in `src/lib/importCsv.ts` to support contact references
- [X] T031 [P] Extend `GuestMigrationModal` in `src/components/GuestMigrationModal.tsx` to display and migrate guest contacts to Firestore upon sign-in
- [X] T032 [P] Add realistic sample contacts (mentors, recruiters, hiring managers) to demo data seeding in `src/lib/sampleData.ts`
- [X] T033 Run validation checklist from `specs/004-contacts-hub/quickstart.md`, execute `npx tsc --noEmit` and `npm run build` to verify zero type errors and clean production build

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup (T001-T003)
   ↓
Phase 2: Foundational (T004-T007)
   ↓
┌─────────────────────────────────────────────────────────────┐
│ User Story Phases (can proceed in priority order)          │
│                                                             │
│ Phase 3: US1 - Browse & Manage Contacts (T008-T013) 🎯 MVP  │
│    ↓                                                        │
│ Phase 4: US2 - Link Contact via Search Typeahead (T014-T017)│
│    ↓                                                        │
│ Phase 5: US3 - View Linked Apps from Contact (T018-T020)    │
│    ↓                                                        │
│ Phase 6: US4 - Standalone Mentors & Follow-ups (T021-T023)  │
│    ↓                                                        │
│ Phase 7: US5 - Unlink Contact & Cascade (T024-T025)         │
│    ↓                                                        │
│ Phase 8: US6 - Inline-Create from Typeahead (T026-T027)     │
└─────────────────────────────────────────────────────────────┘
   ↓
Phase 9: Polish & Cross-Cutting (T028-T033)
```

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel
- **Phase 2**: T005 and T006 can run in parallel
- **Phase 3**: T008, T009, and T010 can be built in parallel
- **Phase 9**: T030, T031, and T032 can run in parallel

---

## Implementation Strategy

### MVP First (Phases 1, 2, and 3)
1. Complete **Phase 1** (Setup) and **Phase 2** (Foundational data layer).
2. Complete **Phase 3** (User Story 1: Directory view with grid/table, search, add, edit, delete).
3. **Validate MVP**: Test standalone contacts creation, directory rendering, layout toggle, and search.

### Incremental Feature Delivery
4. Add **Phase 4** (User Story 2: `ContactSearchPicker` typeahead linking inside jobs).
5. Add **Phase 5** (User Story 3: `ContactDetailPanel` with linked applications navigation).
6. Add **Phase 6** (User Story 4: Follow-up badge and overdue indicators).
7. Add **Phase 7 & 8** (User Stories 5 & 6: Unlink with undo, inline creation).
8. Complete **Phase 9** (Legacy migration, CSV, guest sync, demo seeding, and full verification).
