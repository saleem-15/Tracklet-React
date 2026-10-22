# Implementation Tasks: SaaS Auth Unification, Guest Mode Sunset & API Hardening

**Feature**: `013-saas-auth-guest-sunset`  
**Branch**: `013-saas-auth-guest-sunset`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup & Foundational Data Models

- [x] **T001** [P]: Update `src/types.ts`
  - Add `PlanTier` (`'free' | 'pro'`) and `SubscriptionStatus` (`'none' | 'active' | 'past_due' | 'canceled' | 'trialing'`).
  - Add `UserQuotas` interface (`scrapesUsedThisMonth`, `autofillsUsedThisMonth`, `quotaResetAt`).
  - Add `UserEntitlementProfile` interface for `users/{userId}`.
  - Add `PaywallTriggerContext` and `PaywallModalProps` interfaces.
  - Add `ExtensionUserSession` interface.
- [x] **T002** [P]: Update `src/lib/constants.ts`
  - Define `SAAS_LIMITS` (`SANDBOX_MAX_APPS = 3`, `SANDBOX_MAX_CONTACTS = 3`, `FREE_MAX_ACTIVE_APPS = 20`, `FREE_MONTHLY_SCRAPES = 20`, `PRO_MONTHLY_SCRAPES = 500`).
  - Define `DEFAULT_USER_QUOTAS`.
  - Add `SANDBOX_MODE` and `SANDBOX_CONVERSION_SHOWN` to `LOCAL_STORAGE_KEYS`.
- [x] **T003** [P]: Create `src/lib/entitlementRepository.ts`
  - Implement `EntitlementRepository.getOrCreateProfile(userId, email, displayName)` to fetch or initialize `users/{userId}` in Firestore.
  - Implement `EntitlementRepository.incrementScrapeUsage(userId)` and quota reset checking.
- [x] **T004** [P]: Update `firestore.rules`
  - Add rules for `match /users/{userId}`: permit owner read, permit initial create with `planTier == 'free'` and `subscriptionStatus == 'none'`, and forbid client mutations modifying `planTier` or `subscriptionStatus`.

---

## Phase 2: User Story 1 (P1) - Capped 3-Card Sandbox Preview & Seamless Cloud Migration

- [x] **T005** [P]: Create `src/components/layout/SandboxBanner.tsx`
  - Implement a persistent, calm banner (< 120 lines) shown when unauthenticated and in sandbox mode.
  - Display card count (`X / 3`), benefits of creating a free account, and a "Create Free Account" CTA button.
  - Ensure full WCAG AA contrast compliance (avoid `text-slate-400`).
- [x] **T006**: Update `src/hooks/useApplications.ts` and `src/components/AddApplicationModal.tsx`
  - In Sandbox mode, verify current count `< SAAS_LIMITS.SANDBOX_MAX_APPS` before opening `AddApplicationModal` or creating a card.
  - When reaching 3 cards, trigger the Account Conversion modal (`mode: 'signup'`) with contextual copy.
  - Gate CSV bulk import in Sandbox mode with conversion prompt.
- [x] **T007**: Update `src/components/auth/LoginView.tsx` and `src/components/auth/SignupView.tsx`
  - Replace legacy "Continue as guest" link with "Explore sandbox preview →".
  - Add contextual conversion headers when opened from the sandbox limit or paywall.
- [x] **T008**: Update `src/hooks/useGuestMigration.ts` for Sandbox Conversion
  - When user signs in or registers, detect 1–3 sandbox applications + contacts.
  - Batch-import cards to Firestore at `/users/{userId}/applications` and contacts at `/users/{userId}/contacts`.
  - Initialize the `UserEntitlementProfile` in Firestore.
  - Purge sandbox `localStorage` keys and dispatch a success toast receipt.

---

## Phase 3: User Story 2 (P1) - Non-Destructive Legacy Guest Migration & Grandfathered Pipeline

- [x] **T009**: Detect Legacy Guest Data in `src/hooks/useGuestMigration.ts`
  - Differentiate between new Sandbox sessions (<= 3 cards) and legacy guest data (`> 3` cards in `tracklet_guest_apps_v1`).
  - Auto-trigger `GuestMigrationModal` on initial mount when legacy data is detected.
- [x] **T010**: Refactor `src/components/GuestMigrationModal.tsx`
  - Update copy to explain the transition to Tracklet Cloud Sync.
  - Ensure 100% preservation of applications, embedded status history, contacts, and email logs.
  - Implement Escape key dismissal via `useEscapeKey`.
- [x] **T011**: Implement Grandfathered Pipeline Access
  - If a legacy guest imports `> 20` active applications, allow full read, edit, search, and export access for all imported cards.
  - Block adding new active cards until active count drops below 20 (or user upgrades to Pro).

---

## Phase 4: User Story 3 (P1) - Unified Web & Chrome Extension Authentication

- [x] **T012**: Create `src/lib/authBridge.ts`
  - Implement `broadcastAuthToExtension(user, planTier)` to dispatch `TRACKLET_AUTH_SYNC` message to content scripts on sign-in, token refresh, and sign-out.
  - Call `broadcastAuthToExtension` inside `src/context/AuthContext.tsx`.
- [x] **T013**: Update `extension/background.js`
  - Require valid `tracklet_user_session` in `chrome.storage.local` before permitting job saves or cloud duplicate checks.
  - Implement silent token refresh using `https://securetoken.googleapis.com/v1/token` when token expires.
  - Remove legacy local guest persistence (`tracklet_guest_apps_v1`) in extension; write directly to Firestore cloud.
- [x] **T014**: Update `extension/popup.html` and `extension/popup.js`
  - Implement unauthenticated state: render "Sign in to Tracklet" CTA linking to `/login?source=extension`.
  - When authenticated, render user email and `Free Tier` / `Pro Tier` badge in header.
  - Enforce 20 active card limit in extension: block saving 21st active card on Free tier with upgrade prompt.

---

## Phase 5: User Story 4 (P2) - User Entitlement Profile, Free Tier Pipeline Cap & Upgrade Paywall

- [x] **T015**: Create `src/hooks/useEntitlement.ts`
  - Calculate active applications count using `ACTIVE_STATUSES` (`Saved`, `Applied`, `Screening`, `Interview`, `Offer`), excluding `TERMINAL_STATUSES` (`Rejected`, `Archived`).
  - Load `UserEntitlementProfile` from `EntitlementRepository`.
  - Manage `<UpgradePaywallModal />` open state and trigger context.
- [x] **T016**: Create `src/components/paywall/UpgradePaywallModal.tsx`
  - Build canonical modal (< 250 lines) with trigger contexts: `'pipeline_cap'`, `'scrape_limit'`, `'autofill_limit'`, and `'feature_gate'`.
  - Display comparison between Free (20 active cards, 20 scrapes) vs Pro (unlimited active cards, 500 scrapes, priority AI).
  - Include "Join Early Access Pro Waitlist" CTA button logging conversion intent and showing receipt toast.
  - Implement Escape key listener via `useEscapeKey`.
- [x] **T017**: Mount `<UpgradePaywallModal />` in `src/components/layout/AppModals.tsx`
  - Connect paywall state to `App.tsx` and wire triggers from drag-and-drop column transitions and "Add Application".
- [x] **T018**: Integrate Quota Indicator in `src/components/ActivePipelineBoard.tsx`
  - Display `X / 20 Active` with a subtle visual progress bar in the Pipeline toolbar.
  - Strictly adhere to ADR 0010: do NOT place inventory numbers on global navigation tabs.
- [x] **T019**: Update `src/components/AccountSettingsCard.tsx`
  - Display current subscription plan badge (`Free Plan` / `Pro Plan`), active card quota meter, and monthly scrape usage.
  - Include an "Upgrade to Pro" button opening `<UpgradePaywallModal />`.

---

## Phase 6: User Story 5 (P2) - Authenticated & Rate-Limited Serverless API Routes

- [x] **T020**: Create `api/lib/verifyFirebaseToken.ts`
  - Implement lightweight Bearer token verification compatible with serverless Edge/Node runtimes using Firebase Auth REST tokeninfo or Google JWKS public keys.
- [x] **T021**: Harden `api/scrape-job.ts`
  - Mandate `Authorization: Bearer <idToken>` header; return HTTP 401 if missing/invalid.
  - Check caller's monthly scrape quota against user profile; return HTTP 429 `QUOTA_EXCEEDED` if exhausted.
  - Increment `scrapesUsedThisMonth` on successful AI scrape.
- [x] **T022**: Harden `api/report-issue.ts`
  - Mandate `Authorization: Bearer <idToken>` header; return HTTP 401 if missing/invalid.
  - Populate reporter `userId` and verified `email` directly from the token claims to prevent identity spoofing.

---

## Phase 7: Telemetry, Verification & Quality Assurance

- [x] **T023**: Update `src/lib/posthog.ts`
  - Add SaaS conversion events: `sandbox_session_started`, `sandbox_limit_reached`, `sandbox_migration_completed`, `paywall_modal_viewed`, `paywall_upgrade_clicked`.
  - Preserve ADR 0004 conditional guards (`Boolean(dsn) && isProd`) to prevent console errors in self-hosted or test environments.
- [x] **T024**: Create Unit Tests in `tests/unit/entitlementRepository.test.ts` and `tests/unit/upgradePaywallModal.test.tsx`
  - Verify entitlement initialization, default quotas, and paywall trigger rendering.
- [x] **T025**: Create Unit Tests in `tests/unit/sandboxQuota.test.tsx`
  - Verify 3-card sandbox ceiling, blocked 4th card, and migration cleanup.
- [x] **T026**: Create Unit Tests in `tests/unit/apiAuthHardening.test.ts`
  - Verify HTTP 401 rejection for unauthenticated requests and HTTP 429 quota rejection.
- [x] **T027**: Run Full Verification Suite
  - Run `npm test` across all unit tests.
  - Run typecheck and production build to verify zero compile errors.
