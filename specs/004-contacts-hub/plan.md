# Implementation Plan: Unified Contacts & Mentorship Hub

**Branch**: `004-contacts-hub` | **Date**: 2026-09-01 | **Spec**: [spec.md](file:///d:/Programming/Tracklet/specs/004-contacts-hub/spec.md)

**Input**: Feature specification from `specs/004-contacts-hub/spec.md`

## Summary

Promote contacts from embedded sub-objects on applications to first-class entities with their own persistence layer, sidebar tab, directory view (card grid + table toggle), search-first typeahead linking in the application detail panel, standalone mentor support with follow-up dates, and automatic migration of legacy embedded contacts.

## Technical Context

**Language/Version**: TypeScript 5.x (React 19, Vite 6.4)

**Primary Dependencies**: React 19, TailwindCSS v4, Firebase SDK (Firestore), Lucide React (icons)

**Storage**: Firestore (`/users/{userId}/contacts` sub-collection) + localStorage fallback (`tracklet_contacts` key)

**Testing**: `npx tsc --noEmit` (type check), `npm run build` (production build), manual browser verification

**Target Platform**: Web (desktop + mobile responsive)

**Project Type**: Single-page web application (SPA)

**Performance Goals**: Directory interactive in <1s for 200 contacts, typeahead search <100ms response, link/unlink operations <500ms visual feedback

**Constraints**: Client-side only (no server functions), WCAG AA compliance, zero `window.alert/confirm/prompt`, all destructive actions with Undo snackbar

**Scale/Scope**: Typical user: 10–50 contacts, upper bound: ~200 contacts (client-side filtering sufficient)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No project-specific constitution is defined (template placeholder only). Gate passes by default. Standard Tracklet architecture rules from `AGENTS.md` apply:

- ✅ Repository Pattern for all persistence (ContactRepository)
- ✅ Constants in `constants.ts` (contact categories, storage keys)
- ✅ Pure utility functions in dedicated files (contactUtils.ts)
- ✅ No business logic in view components
- ✅ Components under 300 lines
- ✅ Single notification system via `addToast` / `onShowToast`
- ✅ Zero browser dialogs

## Project Structure

### Documentation (this feature)

```text
specs/004-contacts-hub/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (repository root)

```text
src/
├── types.ts                              # [MODIFY] Add Contact, ContactCategory types; add contactIds to Application
├── lib/
│   ├── constants.ts                      # [MODIFY] Add CONTACT_CATEGORIES, LOCAL_STORAGE_KEYS.GUEST_CONTACTS, CONTACTS_LAYOUT_KEY
│   ├── contactRepository.ts             # [NEW]    CRUD + link/unlink + guest migration for contacts
│   ├── contactUtils.ts                  # [NEW]    Pure search, filter, follow-up badge calculation helpers
│   ├── contactMigration.ts              # [NEW]    One-time legacy embedded contacts → standalone migration
│   ├── applicationRepository.ts         # [MODIFY] Add contactIds field handling in sanitization
│   ├── expiryUtils.ts                   # [MODIFY] Add getContactsFollowUpDueSoon() reusing threshold
│   ├── routeUtils.ts                    # [MODIFY] Add /contacts path ↔ 'contacts' tab mapping
│   ├── exportCsv.ts                     # [MODIFY] Include contactIds in CSV export
│   ├── importCsv.ts                     # [MODIFY] Handle contactIds in CSV import
│   └── sampleData.ts                    # [MODIFY] Add sample contacts for demo seeding
├── components/
│   ├── ContactsView.tsx                 # [NEW]    Main contacts directory (grid + table + search + filter)
│   ├── ContactDetailPanel.tsx           # [NEW]    Slide-over drawer for contact profile & linked apps
│   ├── ContactSearchPicker.tsx          # [NEW]    Reusable typeahead combobox for attach/link flow
│   ├── contacts/
│   │   ├── ContactCardGrid.tsx          # [NEW]    Card grid layout for contacts directory
│   │   ├── ContactTable.tsx             # [NEW]    Table layout for contacts directory
│   │   └── ContactEmptyState.tsx        # [NEW]    Empty state illustration & CTA
│   ├── detail/
│   │   └── ContactManagerSection.tsx    # [MODIFY] Replace inline forms with ContactSearchPicker
│   ├── Sidebar.tsx                      # [MODIFY] Add Contacts tab with follow-up badge
│   ├── GuestMigrationModal.tsx          # [MODIFY] Extend to show guest contacts alongside apps
│   └── AddApplicationModal.tsx          # [MODIFY] Update contacts section to use ContactSearchPicker
├── App.tsx                              # [MODIFY] Add contacts state, contacts tab routing, pass contacts to children
└── main.tsx                             # (no changes)
```

**Structure Decision**: Follows the established Tracklet single-project SPA layout. New `contacts/` sub-directory under `components/` groups the directory-specific view components. The `ContactSearchPicker` lives at the top of `components/` because it is reused across both the detail panel and add-application modal.
