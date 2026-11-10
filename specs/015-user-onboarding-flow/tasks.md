# Implementation Tasks: Intent-Driven User Onboarding Flow & Capability Discovery

**Feature**: `015-user-onboarding-flow`  
**Branch**: `015-user-onboarding-flow`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup & Data Model Foundations

- [x] **T001** [P]: Update `src/types.ts`
  - Added `OnboardingIntent` (`'migrator' | 'hunter' | 'explorer'`).
  - Added `UserOnboardingState` interface (`completed`, `completedAt`, `dismissed`, `dismissedAt`, `intent`, `lastStepViewed`).
  - Extended `UserEntitlementProfile` with optional `onboarding?: UserOnboardingState`.
- [x] **T002** [P]: Update `src/lib/constants.ts`
  - Added `ONBOARDING_COMPLETED_PREFIX` (`tracklet_onboarding_completed_`) and `ONBOARDING_SUPPRESSED_SESSION_PREFIX` (`tracklet_onboarding_suppressed_`) to `LOCAL_STORAGE_KEYS`.
- [x] **T003** [P]: Update `src/lib/entitlementRepository.ts`
  - Updated `getOrCreateProfile()` and `getProfile()` to deserialize and map `raw.onboarding` to `profile.onboarding`.
  - Implemented `EntitlementRepository.updateOnboardingState(userId, state)` to persist onboarding metadata to Firestore `users/{userId}` with `{ merge: true }`.
- [x] **T004**: Extend `src/context/NavigationContext.tsx`
  - Added `isOnboardingModalOpen`, `openOnboardingModal(initialStep?: number)`, and `closeOnboardingModal()`.
  - Added `isImportModalOpen`, `openImportModal()`, and `closeImportModal()`.
  - Exposed `onboardingInitialStep` state for targeted deep-linking.

---

## Phase 2: User Story 1 (P1) - Intent-Driven Welcome Modal Core

- [x] **T005**: Create `src/components/onboarding/OnboardingModal.tsx`
  - Built accessible modal dialog (< 250 lines) with `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
  - Implemented `useEscapeKey` listener, backdrop dismissal, step dot progression (`Step X of 3`), and footer controls ("Back", "Next", "Skip for now").
- [x] **T006**: Create `src/components/onboarding/steps/IntentSelectionStep.tsx`
  - Built Step 1 card selector (< 150 lines) presenting 3 archetypes:
    1. **Migrator**: "I have an existing spreadsheet or tracker" (highlighting instant CSV/JSON import).
    2. **Job Hunter**: "I'm browsing jobs right now" (highlighting 1-click Chrome Extension capture).
    3. **Explorer**: "I'm starting fresh / Just exploring" (highlighting sample data or clean canvas).
- [x] **T007**: Create `src/hooks/useOnboardingTrigger.ts`
  - Built safe evaluation hook: checks `!isLoading`, `profile !== null`, `user?.emailVerified`, `totalAppCount === 0`, `!profile?.onboarding?.completed`, and local dual-persistence caches.
  - Implemented React 19 StrictMode idempotency guard (`hasTriggeredRef`) and `storage` event listener for instantaneous cross-tab synchronization.
  - Automatically triggers `openOnboardingModal()` when eligible without flashing on loading states.
- [x] **T008**: Mount `OnboardingModal` in `src/components/layout/AppModals.tsx` & integrate in `src/components/layout/WorkspaceContent.tsx`
  - Passed required callbacks (`onImportCSV`, `onBatchImportJSON`, `onSeedDemoData`, `onOpenAddModal`).
  - Wired `useOnboardingTrigger` into `WorkspaceContent.tsx`.

---

## Phase 3: User Story 2 (P1) - Chrome Extension Live Handshake & Setup Guide

- [x] **T009**: Create `src/components/onboarding/steps/ExtensionGuideStep.tsx`
  - Consumed `useExtensionContext()` to reactively render extension state.
  - If disconnected: Show 1-click download button for `tracklet-extension.zip` and 2-step setup summary with link to open `ExtensionModal`.
  - If connected: Render a reactive green badge `Companion Connected (v{version})`, pin recommendation, and shortcut guide (`Alt+S` / `Cmd+Shift+S`).
- [x] **T010**: Wire Extension Step into `OnboardingModal.tsx`
  - Routed user to Extension step when selecting "Job Hunter" intent, or as Step 2 of the guided tour.

---

## Phase 4: User Story 3 (P2) - Data Portability & Superpowers Discovery

- [x] **T011**: Create `src/components/onboarding/steps/DataPortabilityStep.tsx`
  - Built unified file dropzone accepting `.json` (instant workspace restore via `validateAndParseJSONBackup`) and `.csv` (opens `ImportCSVModal`).
  - Reassured user on zero vendor lock-in with clear summary that CSV and 1:1 JSON full backups can be exported anytime in Settings.
- [x] **T012**: Create `src/components/onboarding/steps/CapabilitiesStep.tsx`
  - Highlighted buried superpowers in compact visual callouts:
    1. Rich Markdown notes with slash commands (`/meeting`, `/prep`, `/code`).
    2. Stage velocity analytics (automatic Days-in-Stage tracking).
    3. Recruiter contact and email logging.

---

## Phase 5: User Story 4 (P2) - Empty-State Quick-Start Hub & Navigation Access

- [x] **T013**: Upgrade `src/components/OnboardingEmptyState.tsx`
  - Replaced basic buttons with a high-craft 4-card quickstart grid:
    - 🌟 **Take the Tour** (launches `openOnboardingModal()`).
    - ➕ **Add First Job** (launches `openAddModal()`).
    - 🪄 **Explore Sample Data** (calls `onSeedDemoData()`).
    - 📥 **Import File** (launches `ImportCSVModal` / dropzone).
  - Included data portability reassurance footer note.
- [x] **T014**: Update `src/components/Sidebar.tsx`
  - Added "Getting Started Tour" button inside desktop collapsed/expanded footer and mobile slide-in drawer.
  - Ensured mobile click executes `if (isMobileView && onCloseMobile) onCloseMobile();` cleanly before calling `nav.openOnboardingModal();`.

---

## Phase 6: Telemetry, Verification & Tests

- [x] **T015**: Instrument PostHog telemetry in `src/lib/posthog.ts`
  - Logged `onboarding_opened`, `onboarding_intent_selected`, `onboarding_step_viewed`, `onboarding_completed`, `onboarding_dismissed`.
- [x] **T016**: Create automated tests in `tests/unit/onboarding.test.tsx`
  - Tested auto-trigger condition respects `emailVerified` and `totalAppCount === 0`.
  - Tested modal dismissal via Escape key and backdrop click.
  - Tested reactive transition when `extensionState.status` changes from `'not_installed'` to `'connected'`.
  - Tested that returning users with `onboarding.completed === true` are not prompted.
- [x] **T017**: Execute verification checks
  - Ran `npx tsc --noEmit` -> Passed with 0 errors.
  - Ran `npm test` -> 75 test files passed, 740 tests passed.
  - Ran `npm run build` -> Passed cleanly in 12.23s, packaged extension v1.3.3 zip.
