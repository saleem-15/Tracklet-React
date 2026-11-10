# Implementation Plan: Intent-Driven User Onboarding Flow & Capability Discovery

**Branch**: `015-user-onboarding-flow` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

---

## Summary

Build an accessible, intent-driven onboarding experience for Tracklet that activates new users according to their immediate goal, surfaces the Chrome Extension with real-time reactive handshake detection, demystifies buried data portability features (1:1 JSON backup and CSV export), and persistently tracks onboarding completion in Firestore with optimistic local caching.

---

## Technical Context

**Language/Version**: TypeScript 5.8+, React 19  
**Primary Dependencies**: Vite, TailwindCSS v4, Lucide React, Firebase Auth & Firestore Client SDK, PostHog, Sentry  
**Storage**: Firestore `/users/{userId}` (`onboarding` attribute on `UserEntitlementProfile`) + `localStorage` for optimistic suppression  
**Testing**: Vitest (`npm test`), TypeScript check (`npx tsc --noEmit`), Vite production build (`npm run build`)  
**Target Platform**: Modern desktop and mobile evergreen browsers  
**Project Type**: Single-page web application (React 19)  
**Performance Goals**: Instant optimistic modal transitions (<16ms frame), zero layout shift (`CLS < 0.05`), WCAG 2.1 AA compliance  
**Constraints**: Components under 300 lines, WCAG AA contrast compliance (no `text-slate-400` on light surfaces), zero browser dialogs (`window.alert`/`confirm`), responsive modal support for mobile viewports, strict `Escape` key listeners  

---

## Constitution & Core Guidelines Check

- [x] **I. Cloud-First, User-Scoped Persistence**: Onboarding completion status is stored on the authenticated user profile in Firestore at `users/{userId}`. Local storage is strictly used for optimistic UI cache to prevent flickering.
- [x] **II. Entitlement & Tier-First Design**: Onboarding is educational and accessible to both Free and Pro users. Pro upgrade triggers and quotas remain completely respected.
- [x] **III. Authenticated & Rate-Limited Endpoints**: No unauthenticated endpoints are introduced.
- [x] **IV. Extension & Web Parity**: Directly integrates with the real-time `useExtensionStatus()` handshake to provide live feedback on companion status.
- [x] **V. High-Craft UI/UX & Performance**:
  - Follows `UI_TOKENS` and design system tokens in `DESIGN.md`.
  - Implements keyboard accessibility (`Escape` key, focus trapping, `aria-modal="true"`).
  - Outbound links use `target="_blank" rel="noopener noreferrer"`.
  - Action-only navigation badges respected (no noisy badges added to top navigation tabs).

---

## Project Structure & Planned Modifications

### Documentation
```text
specs/015-user-onboarding-flow/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this document)
├── research.md          # Phase 0 architectural decisions & findings
├── data-model.md        # Phase 1 data models & contracts
├── quickstart.md        # Manual verification guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Actionable task list (generated in next phase)
```

### Source Code Modifications
```text
src/
├── types.ts                                     # Add OnboardingIntent, UserOnboardingState, update UserEntitlementProfile
├── lib/
│   ├── constants.ts                             # Add ONBOARDING storage keys
│   ├── entitlementRepository.ts                 # Add updateOnboardingState() method
│   └── posthog.ts                               # Add onboarding telemetry event types
├── context/
│   └── NavigationContext.tsx                    # Add isOnboardingModalOpen, openOnboardingModal, closeOnboardingModal
├── hooks/
│   └── useOnboardingTrigger.ts                  # Evaluates auto-trigger conditions safely
├── components/
│   ├── layout/
│   │   ├── AppModals.tsx                        # Mount OnboardingModal alongside ExtensionModal and PaywallModal
│   │   └── WorkspaceContent.tsx                 # Wire auto-trigger hook
│   ├── onboarding/
│   │   ├── OnboardingModal.tsx                  # Accessible modal shell, steppers, navigation (<200 lines)
│   │   └── steps/
│   │       ├── IntentSelectionStep.tsx          # 3 Intent cards: Migrator, Job Hunter, Explorer (<150 lines)
│   │       ├── IntentActionStep.tsx             # Contextual dropzone / live extension status (<200 lines)
│   │       └── CapabilitiesStep.tsx             # Buried gems: Export, Notes, Velocity (<160 lines)
│   ├── OnboardingEmptyState.tsx                 # Upgrade empty state to 4-card quick-start hub
│   └── Sidebar.tsx                              # Add permanent "Getting Started Tour" trigger in desktop & mobile footer
tests/unit/
└── onboarding.test.tsx                          # Vitest tests: auto-trigger, escape key, intent branching, reactivity
```

---

## Deliverables Status
- [x] `spec.md`: Completed & Validated
- [x] `research.md`: Phase 0 Completed
- [x] `data-model.md`: Phase 1 Completed
- [x] `quickstart.md`: Phase 1 Completed
- [x] `plan.md`: Completed
