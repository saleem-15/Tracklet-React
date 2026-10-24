# Feature Specification: SaaS Auth Unification, Guest Mode Sunset & API Hardening

**Feature Branch**: `013-saas-auth-guest-sunset`  
**Spec Directory**: `specs/013-saas-auth-guest-sunset`  
**Created**: 2026-10-22  
**Status**: Ready for Planning  
**Input**: Pivot Tracklet from open-source local-first Guest Mode to a commercial Cloud SaaS model with a capped 3-card Sandbox preview, unified Web + Chrome Extension authentication, Free vs. Pro entitlement schema initialization, and authenticated `/api` endpoints.

---

## Overview & Strategic Rationale

Tracklet is transitioning its cloud deployment (`Tracklet Cloud`) from an unrestricted, local-first anonymous guest tracker to a commercial Product-Led Growth (PLG) SaaS model. Previously, unauthenticated users could use the app indefinitely via `localStorage`, which created severe monetization leakage, prevented user account retention, and exposed serverless resources (`/api/scrape-job`, `/api/report-issue`) to unmetered, anonymous compute costs.

This feature executes the foundational SaaS pivot across five interconnected domains:

1. **Capped 3-Card Sandbox Mode**: Replaces unlimited Guest Mode for new visitors with a frictionless, temporary 3-card sandbox preview. Visitors can explore the pipeline immediately without up-front sign-up friction. When attempting to add a 4th application, they hit a conversion gate prompting free account creation.
2. **Non-Destructive Legacy Guest Migration**: Safely detects returning users with existing local guest data (applications, contacts, notes, status history) and migrates 100% of their data to Firestore upon sign-up, ensuring zero data loss and grandfathering pre-existing volume.
3. **Unified Web & Extension Authentication**: Establishes a synchronized authentication bridge between the web app and Chrome Extension (`extension/`). The extension requires an authenticated Firebase session, eliminating disconnected local extension storage and enabling direct cloud pipeline reads and writes.
4. **User Entitlement & Free Tier Pipeline Cap (20 Active Cards)**: Introduces the `UserEntitlementProfile` model at `users/{userId}`. Free tier accounts are capped at **20 active applications** (`Saved`, `Applied`, `Screening`, `Interview`, `Offer`), while terminal states (`Rejected`, `Archived`) are excluded from the quota to encourage clean pipeline hygiene. An `<UpgradePaywallModal />` component provides context-specific upgrade prompts.
5. **Hardened Serverless API Endpoints**: Secures `/api/scrape-job` and `/api/report-issue` by mandating Firebase Auth Bearer token verification and enforcing monthly per-user tier quotas (20 scrapes/mo on Free, 500/mo on Pro).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mandatory Cloud Authentication & Guest/Sandbox Sunset (Priority: P1)

As an unauthenticated visitor arriving at Tracklet, I am prompted to create a free account or sign in to access the job tracker, so that all job applications, contacts, and AI features are securely managed in my cloud account with zero monetization leakage from unauthenticated usage.

**Why this priority**: Eliminating unrestricted guest mode and local sandbox silos ensures all users are registered cloud tenants, protecting unit economics and enabling SaaS monetization.

**Independent Test**:
1. Open Tracklet in a clean browser session without an active session.
2. Verify you are immediately redirected to the authentication gate (/login).
3. Verify no guest bypass or sandbox preview links exist.
4. Complete registration via email/password or Google Sign-In.
5. Verify you are admitted to the workspace with your cloud account initialized at `users/{userId}` with `planTier: 'free'`.

**Acceptance Scenarios**:
1. **Given** an unauthenticated visitor arrives at Tracklet, **When** the page loads, **Then** AuthGate intercepts access and displays the Login/Signup screen.
2. **Given** an unauthenticated visitor, **When** they attempt to bypass the auth screen or access `/pipeline`, **Then** the system keeps them on `/login` until authenticated.
3. **Given** a returning visitor with legacy local storage applications from prior versions, **When** they register or sign in, **Then** the system displays the Guest Migration modal and transfers their local applications into Firestore at `users/{userId}/applications`.

---

### User Story 2 - Non-Destructive Legacy Guest Migration & Grandfathered Pipeline (Priority: P1)

As a returning user with existing local data from the legacy open-source guest mode, I am guided to create a free account that imports 100% of my pre-existing applications, contacts, and status history into Firestore without data loss, even if my active application count exceeds the standard 20-card Free tier limit.

**Why this priority**: Preserves customer goodwill and trust during the commercial SaaS transition. Zero data loss is mandatory.

**Independent Test**:
1. Seed `localStorage` with legacy keys `tracklet_guest_apps_v1` (containing 25 applications with embedded history) and `tracklet_guest_contacts_v1` (containing 5 contacts).
2. Reload the application.
3. Verify the "Welcome to Tracklet Cloud: Migrate Your Workspace" banner/modal appears.
4. Click "Migrate to Cloud Account" and complete sign-up.
5. Verify all 25 applications and 5 contacts exist in Firestore with preserved status history and remapped contact references.
6. Verify the user is granted "Grandfathered Manage Mode": all 25 cards are fully editable and viewable, but adding a 26th card requires upgrading to Pro or moving cards to terminal stages until active count falls below 20.

**Acceptance Scenarios**:
1. **Given** a returning visitor with pre-existing legacy guest records (`> 3` applications in `tracklet_guest_apps_v1`), **When** the app loads, **Then** the system displays a Legacy Migration banner explaining the Cloud upgrade and inviting one-click account creation.
2. **Given** a legacy guest user imports `> 20` active applications into a Free tier account, **Then** all imported applications remain fully accessible, searchable, and editable, but new active application creation is gated with an upgrade prompt until active applications are under 20.
3. **Given** a legacy guest chooses to discard their local data during the migration prompt, **Then** the local storage keys are removed and they enter a clean cloud account state with an informational confirmation snackbar.

---

### User Story 3 - Unified Web & Chrome Extension Authentication (Priority: P1)

As an authenticated Tracklet user, my active session on the web app automatically synchronizes with the Chrome Extension, so that jobs captured, checked for duplicates, or logged via the extension write directly to my cloud Firestore account without secondary manual logins or local-only storage.

**Why this priority**: The Chrome Extension is Tracklet's primary PLG acquisition and daily engagement tool. Maintaining Web and Extension parity without fragmented storage is essential.

**Independent Test**:
1. Sign in to the Tracklet web application (`https://tracklet.pages.dev` or `http://localhost:3000`).
2. Open the Chrome Extension popup (`extension/popup.html`).
3. Verify the popup displays the user's authenticated email and plan tier (`Free` or `Pro`).
4. Capture a job from an ATS board (e.g. Greenhouse or Lever).
5. Verify the job is written directly to `users/{userId}/applications` in Firestore and appears in the web app pipeline in real time.
6. Sign out from the web app; open the extension popup; verify the extension transitions to the unauthenticated "Sign in to Tracklet" state.

**Acceptance Scenarios**:
1. **Given** an unauthenticated user opens the Chrome Extension popup, **When** no valid Firebase Auth session exists in `chrome.storage.local`, **Then** the popup renders an unauthenticated state with a prominent "Sign in to Tracklet" button that opens the web app auth flow (`/login?source=extension`) and disables saving jobs until signed in.
2. **Given** a user signs in, logs out, or refreshes their auth session on the web app, **When** auth state changes, **Then** the web app dispatches a secure handshake message to the extension background worker (`extension/background.js`) updating `tracklet_user_session` in `chrome.storage.local`.
3. **Given** a user's Firebase ID token expires while using the extension, **When** an API call or Firestore write is made, **Then** the background worker silently refreshes the token using Google Secure Token API before retrying the operation.
4. **Given** an authenticated Free tier user with 20 active applications in Firestore, **When** they attempt to save a 21st active job via the extension, **Then** the extension popup blocks the save, displays the Free tier quota message, and provides an "Upgrade to Pro" link.

---

### User Story 4 - User Entitlement Profile, Pipeline Cap & Upgrade Paywall Modal (Priority: P2)

As an authenticated Free tier user, I can see my current plan tier and active application usage within my account settings and pipeline toolbar, and I am presented with an informative `<UpgradePaywallModal />` when attempting to exceed my active pipeline limit or metered quotas.

**Why this priority**: Establishes the entitlement architecture and conversion paywall ahead of Stripe/LemonSqueezy checkout integration.

**Independent Test**:
1. Sign in as a `free` tier user with 19 active applications.
2. View the Active Pipeline toolbar; verify the calm quota indicator displays `19 / 20 Active`.
3. Add 1 application (total reaches 20/20 active).
4. Attempt to add another application via the web UI; verify the `<UpgradePaywallModal />` opens with the `card_limit` message.
5. Move 1 active application to `Rejected` (terminal stage); verify the quota indicator drops to `19 / 20 Active`, and the user can now create 1 new active application.

**Acceptance Scenarios**:
1. **Given** a user registers or logs in, **When** their user profile loads, **Then** the system loads or initializes `users/{userId}` with default fields: `planTier: 'free'`, `subscriptionStatus: 'none'`, and default `quotas`.
2. **Given** an authenticated Free tier user, **When** calculating active application quota, **Then** only applications in non-terminal stages (`Saved`, `Applied`, `Screening`, `Interview`, `Offer`) count toward the 20-card limit; terminal applications (`Rejected`, `Archived`) are strictly excluded.
3. **Given** a Free tier user at 20 active applications, **When** they click "Add Application" or attempt to drag a `Rejected` or `Archived` card back into an active column, **Then** the action is prevented and `<UpgradePaywallModal />` is triggered.
4. **Given** ADR 0010 architectural rules, **When** rendering quota and tier information, **Then** persistent top-level navigation tabs remain calm and free of raw numerical badges (`X / 20`), placing inventory metrics exclusively inside the Pipeline toolbar and Account Settings.
5. **Given** a user clicks "Upgrade to Pro" on `<UpgradePaywallModal />`, **When** billing integration (`014`) is pending, **Then** the system logs the `paywall_upgrade_clicked` event, displays an "Early Access Pro Waitlist" receipt toast, and offers an opt-in prompt.

---

### User Story 5 - Authenticated, Tier-Aware & Rate-Limited Serverless API Routes (Priority: P2)

As the SaaS operator, all serverless endpoints (`api/scrape-job.ts` and `api/report-issue.ts`) must require and verify a valid Firebase Auth Bearer ID token and enforce user tier quotas, preventing anonymous scraping abuse and bot spamming.

**Why this priority**: Protects serverless runtime compute, third-party AI scraping costs (Gemini API), and GitHub issue repository health against unauthenticated abuse.

**Independent Test**:
1. Issue an HTTP POST to `/api/scrape-job` without an `Authorization` header; verify response is `401 Unauthorized`.
2. Issue an HTTP POST with an invalid or expired token; verify response is `401 Unauthorized`.
3. Issue an HTTP POST with a valid Free tier token whose user has consumed 20 scrapes this month; verify response is `429 Too Many Requests` with code `QUOTA_EXCEEDED`.
4. Issue an HTTP POST to `/api/report-issue` with a valid token; verify the issue is created with the authenticated user's verified UID and email attached to the diagnostics context.

**Acceptance Scenarios**:
1. **Given** a client calls `POST /api/scrape-job` or `POST /api/report-issue` without a valid Firebase ID token, **When** the request is received, **Then** the server immediately terminates with HTTP `401 Unauthorized` and proper CORS headers without executing downstream scraping or GitHub API calls.
2. **Given** an authenticated `free` tier user calls `POST /api/scrape-job`, **When** their monthly usage is `< 20`, **Then** the AI fallback scraping executes and increments their monthly scrape count by 1.
3. **Given** an authenticated `free` tier user calls `POST /api/scrape-job`, **When** their monthly usage is `>= 20`, **Then** the endpoint returns HTTP `429` with `{ error: 'QUOTA_EXCEEDED', message: 'Monthly AI scraping limit reached (20/20). Upgrade to Pro for 500 monthly scrapes.' }`.
4. **Given** an authenticated user calls `POST /api/report-issue`, **When** processed, **Then** the authenticated UID and verified email are populated directly from the validated token claims, preventing user identity spoofing.

---

## Edge Cases & Architectural Safeguards

- **Grandfathered Legacy Guest Users (>20 Cards):** Users migrating from legacy guest mode who already accumulated >20 cards must never experience card deletion or loss of edit access. They are placed in "Grandfathered Manage Mode" where they can view, edit, search, and export all existing cards, but cannot add *new* active cards until they either upgrade to Pro or move cards to terminal stages until active count drops below 20.
- **Terminal vs. Active Status Flips:** If a Free tier user is at 20 active cards, moving a card from `Applied` to `Rejected` frees up 1 active slot. If they attempt to drag a card from `Rejected` back to `Applied` while at 20/20 active cards, the drop must be rejected with an upgrade notification snackbar and the card must snap back to its previous column.
- **Extension Token Refresh Race Conditions:** If the Chrome Extension encounters an expired Firebase ID token while the user is offline or experiencing intermittent connectivity, the background worker attempts silent token refresh using the Google Secure Token endpoint (`securetoken.googleapis.com`). If refresh fails due to a revoked refresh token, the extension safely transitions to the unauthenticated "Sign in to Tracklet" CTA without throwing unhandled exceptions.
- **ADR 0004 & Telemetry Safeguards:** Sentry and PostHog integrations MUST preserve the conditional environment guards established in ADR 0004 (`Boolean(dsn) && isProd`). In production Tracklet Cloud, error monitoring and funnel analytics are active with strict PII scrubbing (anonymized UIDs, no sensitive job/salary details logged). In self-hosted or local development environments where DSN keys are omitted, the SDKs enter zero-overhead no-op states to prevent console noise or build breakages.
- **Client Privilege Tampering in Firestore:** Clients must not be capable of elevating their own `planTier` from `'free'` to `'pro'` via direct Firestore client SDK calls. `firestore.rules` must strictly enforce that document mutations to `users/{userId}` preserve the existing `planTier` and `subscriptionStatus` values.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST cap unauthenticated Sandbox Mode at a maximum of 3 application cards and 3 linked contacts stored in local storage (`LOCAL_STORAGE_KEYS.GUEST_APPS` / `LOCAL_STORAGE_KEYS.GUEST_CONTACTS`).
- **FR-002**: System MUST render a calm, accessible persistent Sandbox Banner when an unauthenticated visitor is exploring Tracklet in Sandbox mode, providing immediate context and an account creation CTA.
- **FR-003**: System MUST intercept attempts by Sandbox users to add a 4th application card or perform bulk CSV imports, displaying the Account Conversion / Sign-Up modal.
- **FR-004**: System MUST automatically detect pre-existing legacy guest datasets (`tracklet_guest_apps_v1`) upon app initialization and offer a non-destructive migration workflow that transfers 100% of applications, status history, and contacts into `users/{userId}` in Firestore.
- **FR-005**: System MUST maintain a user entitlement record at `users/{userId}` containing `planTier` (`'free' | 'pro'`), `subscriptionStatus` (`'none' | 'active' | 'past_due' | 'canceled'`), `currentPeriodEnd`, and `quotas` (`scrapesUsedThisMonth`, `autofillsUsedThisMonth`, `quotaResetAt`).
- **FR-006**: System MUST enforce a maximum quota of 20 active applications for users with `planTier === 'free'`.
- **FR-007**: Applications with statuses `Rejected` or `Archived` MUST NOT count toward the 20 active application limit on the Free tier.
- **FR-008**: System MUST display active application quota (`X / 20 Active`) in the Pipeline toolbar and Account Settings view, strictly adhering to ADR 0010 by excluding raw counts from persistent top navigation tabs.
- **FR-009**: Chrome Extension popup (`extension/popup.html`) and background worker (`extension/background.js`) MUST require a valid authenticated Firebase session before permitting job saves, duplicate checks, or autofill actions.
- **FR-010**: Web application MUST transmit authentication credentials (`uid`, `email`, `idToken`, `refreshToken`, `planTier`) to the Chrome Extension via the established extension messaging bridge on login, token refresh, and logout.
- **FR-011**: Extension background worker MUST automatically refresh expired Firebase ID tokens using Google's Secure Token API before initiating Firestore requests or serverless API calls.
- **FR-012**: `api/scrape-job.ts` and `api/report-issue.ts` serverless endpoints MUST verify a Firebase Auth Bearer token on every invocation and immediately reject unauthenticated requests with HTTP `401 Unauthorized`.
- **FR-013**: `api/scrape-job.ts` MUST enforce monthly scraping quotas (`20/month` for Free tier, `500/month` for Pro tier) and return HTTP `429` (`QUOTA_EXCEEDED`) when the caller's quota is exhausted.
- **FR-014**: System MUST provide a canonical `<UpgradePaywallModal />` component with support for trigger contexts: `'pipeline_cap'`, `'scrape_limit'`, `'autofill_limit'`, and `'feature_gate'`.
- **FR-015**: `firestore.rules` MUST prevent client SDK calls from mutating `planTier` or `subscriptionStatus` on document `users/{userId}`.
- **FR-016**: Production telemetry (Sentry & PostHog) MUST log SaaS funnel conversion events (`sandbox_limit_reached`, `sandbox_migration_completed`, `paywall_modal_viewed`, `paywall_upgrade_clicked`) with PII scrubbing while preserving ADR 0004 conditional guards for self-hosters and local developers.

---

### Key Entities & Data Schemas

#### 1. UserEntitlementProfile (`users/{userId}`)
```typescript
export type PlanTier = 'free' | 'pro';
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'trialing';

export interface UserQuotas {
  scrapesUsedThisMonth: number;
  autofillsUsedThisMonth: number;
  quotaResetAt: string; // ISO 8601 string (start of next calendar/billing period)
}

export interface UserEntitlementProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  stripeCustomerId?: string | null; // Reserved for spec 014 billing
  quotas: UserQuotas;
  createdAt: string;
  updatedAt: string;
}
```

#### 2. ExtensionSession (`chrome.storage.local: tracklet_user_session`)
```typescript
export interface ExtensionUserSession {
  uid: string;
  email: string | null;
  idToken: string;
  refreshToken: string;
  planTier: PlanTier;
  activeApplicationsCount?: number;
  expiresAt: number; // Unix epoch ms
  syncedAt: number;  // Unix epoch ms
}
```

#### 3. Canonical Application Status Map
```typescript
// Active Stages (Count towards 20-card Free limit)
export const ACTIVE_STATUSES: ApplicationStatus[] = [
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
];

// Terminal Stages (Exempt from 20-card Free limit)
export const TERMINAL_STATUSES: ApplicationStatus[] = [
  'Rejected',
  'Archived',
];
```

---

## Firestore Security Rules Specification

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User Profile & Entitlement Protection
    match /users/{userId} {
      allow read: if isOwner(userId);

      // Allow initial document creation with default 'free' tier and 'none' subscription
      allow create: if isOwner(userId)
        && request.resource.data.planTier == 'free'
        && request.resource.data.subscriptionStatus == 'none';

      // Disallow client updates that alter planTier or subscriptionStatus
      allow update: if isOwner(userId)
        && request.resource.data.planTier == resource.data.planTier
        && request.resource.data.subscriptionStatus == resource.data.subscriptionStatus;

      allow delete: if false; // User document deletion handled by backend account deletion routine

      // Applications Sub-collection
      match /applications/{applicationId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId) && isValidApplication(request.resource.data);
      }

      // Contacts Sub-collection
      match /contacts/{contactId} {
        allow read, delete: if isOwner(userId);
        allow create, update: if isOwner(userId) && isValidContact(request.resource.data);
      }
    }

    // Explicit default-deny for all unmatched root paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of unauthenticated requests to `/api/scrape-job` and `/api/report-issue` are rejected with HTTP `401 Unauthorized` in `< 50ms` compute time.
- **SC-002**: Unauthenticated visitors in Sandbox Mode can create up to 3 application cards, with 100% of attempts to add a 4th card blocked and redirected to the conversion modal.
- **SC-003**: 100% of Sandbox and Legacy Guest cards (including status history and contact associations) migrate to Firestore within 2 seconds of account registration with zero data corruption or orphaned records.
- **SC-004**: Authenticated web users opening the Chrome Extension see their logged-in account, plan tier, and pipeline sync state in `< 150ms` without secondary authentication prompts.
- **SC-005**: Client-side attempts to mutate `planTier` directly to `'pro'` via Firestore client SDK or browser DevTools console are 100% blocked by `firestore.rules`.
- **SC-006**: Free tier users with 20 active applications cannot create a 21st active card across Web or Extension, but can immediately create a new card upon transitioning an existing card to `Rejected` or `Archived`.
- **SC-007**: 100% compliance with ADR 0010: Top-level navigation tabs remain calm and display zero raw numerical badges or database tallies.

---

## Assumptions & Dependencies

- **Billing Integration Deferred to Spec 014**: Stripe/LemonSqueezy checkout webhooks and customer portal links are scheduled for feature `014-saas-billing-checkout`. In feature `013`, the `<UpgradePaywallModal />` CTA triggers an "Early Access Pro Waitlist" confirmation toast, logs PostHog telemetry, and provides a development-mode entitlement toggle for QA verification.
- **Serverless Token Verification Implementation**: In serverless functions (Cloudflare Pages / Node), Firebase Auth Bearer tokens are verified using Firebase Auth REST token lookup or public JWKS verification using `FIREBASE_PROJECT_ID` / `VITE_FIREBASE_PROJECT_ID`, avoiding heavy private key bundle dependencies.
- **Self-Hosting Preservation**: Open-source self-hosters configuring their own Firebase instances can set default tier or quotas via environment configuration, preserving Tracklet's open-core commitment without breaking local builds.
