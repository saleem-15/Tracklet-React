# Implementation Plan: Contact Email Log with Bidirectional Application Visibility

**Branch**: `feat/contact-email-log` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

## Summary

Enable first-class email milestone logging on standalone and mentor contacts in Tracklet. When an email pertains to a company where the contact is linked, maintain synchronized visibility across both the Contact drawer and Application detail panel, while preserving strict privacy for general/mentor communications.

## Technical Context

**Language/Version**: TypeScript 5.8+, React 19  
**Primary Dependencies**: Vite, TailwindCSS v4, Lucide React, Firebase Firestore  
**Storage**: Firestore `/users/{userId}/contacts` & `/users/{userId}/applications` + `localStorage` fallback (Guest Mode)  
**Testing**: Vitest (`npm test`), TypeScript check (`npx tsc --noEmit`), Vite build (`npm run build`)  
**Target Platform**: Modern desktop and mobile evergreen browsers  
**Project Type**: Single-page web application  
**Performance Goals**: Instant UI response (<16ms frame), optimistic local state updates with background cloud persistence  
**Constraints**: Components under 300 lines, WCAG AA compliance, zero alert/confirm dialogs  

## Constitution Check

- [x] Repository pattern: All storage operations routed through `ApplicationRepository` and `ContactRepository`.
- [x] Single notification system: Receipts via `addToast` with `Undo` support.
- [x] Reusable primitives: CustomSelectDropdown, RichTextEditor for notes, escape key listeners.
- [x] Component length limit (<300 lines): Extracted `EmailLogForm.tsx` to keep `EmailLogSection.tsx` and `ContactEmailLogSection.tsx` modular.

## Project Structure

### Documentation
```text
specs/012-contact-email-log/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan
├── research.md          # Architecture decisions
├── data-model.md        # Type schemas & entity relationships
├── quickstart.md        # Manual test verification guide
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Actionable task list
```

### Source Code Modifications
```text
src/
├── types.ts                                     # Extend Contact & EmailLog interfaces
├── components/
│   ├── ContactDetailPanel.tsx                  # Integrate ContactEmailLogSection with application navigation
│   ├── contacts/
│   │   └── ContactEmailLogSection.tsx           # Contact-specialized email timeline section
│   └── detail/
│       ├── EmailLogCard.tsx                     # Add optional application badge & navigation support
│       ├── EmailLogForm.tsx                     # Extracted modular form component (<180 lines)
│       └── EmailLogSection.tsx                  # Refactored to use EmailLogForm (<250 lines)
├── lib/
│   ├── backupJson.ts                            # Add contact emails serialize/deserialize
│   ├── emailCounterpartyUtils.ts                # Support contact & application context resolution
│   └── sampleData.ts                            # Add initial email logs to sample mentors
└── context/
    ├── ContactsContext.tsx                      # Add email log handler helpers if necessary
    └── ApplicationsContext.tsx
```

## Phase 0 & Phase 1 Deliverables
- `research.md`: Complete
- `data-model.md`: Complete
- `quickstart.md`: Complete
- `plan.md`: Complete
