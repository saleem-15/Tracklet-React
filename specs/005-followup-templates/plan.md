# Implementation Plan: Follow-Up Engine & Customizable Email Templates

**Branch**: `feat/streamlined-communication-quicklinks` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-followup-templates/spec.md`

## Summary

Build a high-velocity follow-up engine that empowers job seekers to draft, customize, and dispatch contextual recruiter follow-ups in seconds. The system introduces:
1. Curated built-in templates (Post-Application Check-In, Interview Thank-You, Status Inquiry, Offer Discussion).
2. Full customization freedom: create, edit, delete, and reset templates with dynamic `{company}`, `{role}`, `{contactName}`, and `{dateApplied}` placeholders.
3. Dual-surface management: quick in-modal template manager + comprehensive Settings view manager.
4. Seamless contact integration: auto-detects primary contact from linked contacts, enables 1-click follow-up on every contact card, and pairs email actions with a timeline touchpoint and an optional 5-day reminder task.

---

## Technical Context

**Language/Version**: TypeScript 5.8+ / React 19  
**Primary Dependencies**: Vite 6, TailwindCSS v4, Lucide React (unified blue/slate tokens)  
**Storage**: Firestore `/users/{userId}/templates` for authenticated users; `localStorage` (`tracklet_followup_templates`) for guests  
**Testing**: Vitest (`npm test`)  
**Target Platform**: Web (Desktop & Mobile responsive)  
**Performance Goals**: <10s to pick and dispatch follow-up; zero UI layout shifts  
**Constraints**: Zero external SMTP dependencies; client-side interpolation; WCAG AA contrast compliance  

---

## Constitution Check

- [x] **Repository Pattern**: All persistence goes through `TemplateRepository` (Firestore + localStorage).
- [x] **Single Source of Truth**: Default templates stored in `src/lib/constants.ts`.
- [x] **Pure Utility Functions**: Dynamic interpolation and placeholder logic in `src/lib/templateUtils.ts`.
- [x] **Modal Dismissal**: `FollowUpModal` and editors implement `useEscapeKey` and backdrop click dismissal.
- [x] **Design Tokens**: Strict compliance with `DESIGN.md` (no rogue purple, cohesive blue/slate tokens).
- [x] **Component Line Limits**: Modular sub-components kept under 300 lines.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-followup-templates/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Storage & interpolation research
├── data-model.md        # Entity schemas & default templates
├── quickstart.md        # Verification walkthrough
└── checklists/
    └── requirements.md  # Spec completeness checklist
```

### Source Code

```text
src/
├── types.ts                                    # FollowUpTemplate, FollowUpCategory
├── lib/
│   ├── constants.ts                            # DEFAULT_FOLLOWUP_TEMPLATES constant
│   ├── templateRepository.ts                   # Unified template persistence (Firestore/localStorage)
│   └── templateUtils.ts                        # Pure placeholder interpolation & validation
├── components/
│   ├── templates/
│   │   ├── FollowUpModal.tsx                   # Interactive launcher (picker, recipient, mailto, copy, 5-day task)
│   │   ├── TemplateManagerModal.tsx            # Full CRUD modal for creating & editing templates
│   │   └── TemplateEditorCard.tsx              # Single template editor with placeholder chips
│   ├── detail/
│   │   ├── ApplicationQuickLinks.tsx           # Auto-detects primary contact & launches FollowUpModal
│   │   ├── ContactCard.tsx                     # 1-click Follow-up button on contact cards
│   │   └── ContactManagerSection.tsx           # Passes follow-up action to contact cards
│   ├── SettingsView.tsx                        # Follow-Up Templates management section
│   └── ApplicationDetailPanel.tsx              # Connects follow-up state, timeline marker, & 5-day task creation
tests/
└── unit/
    ├── templateUtils.test.ts                   # Test variable interpolation, edge cases, fallbacks
    └── templateRepository.test.ts              # Test CRUD, localStorage caching, and default resets
```

---

## Verification Plan

### Automated Tests
- Run `npm test tests/unit/templateUtils.test.ts`
- Run `npm test` across the full test suite (all 21+ files must pass)
- Run `npx tsc --noEmit` (zero type errors)
- Run `npm run build` (production build succeeds)

### Manual Verification
- Test follow-up launcher from Application QuickLinks on Linear & Stripe.
- Test follow-up button on Contact cards in the Contacts section.
- Test template creation and editing with `{company}`, `{role}`, and `{contactName}`.
- Test "Copy Text" and "Open in Mail Client" (`mailto:`).
- Verify 5-day reminder task checkbox creates task in `app.tasks`.
- Verify timeline activity marker appears on `StatusHistoryTimeline`.
