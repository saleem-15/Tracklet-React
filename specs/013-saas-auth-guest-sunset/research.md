# Phase 0 Research & Technical Decisions: SaaS Auth Unification, Guest Mode Sunset & API Hardening

**Branch**: `013-saas-auth-guest-sunset`  
**Date**: 2026-10-22  
**Status**: Completed  
**Spec Reference**: [spec.md](./spec.md)

---

## 1. Sandbox Mode vs. Guest Mode Sunset

### Context
Tracklet originally launched as an open-source, local-first tracker where anyone could store unlimited applications and contacts indefinitely in browser `localStorage`. For Tracklet Cloud to operate as a sustainable commercial SaaS, anonymous usage must be bounded while preserving top-of-funnel conversion.

### Decision
- **Sunset Unlimited Guest Mode**: Remove the indefinite "Continue as Guest" experience from standard onboarding.
- **Introduce 3-Card Sandbox Mode**:
  - Visitors arriving unauthenticated enter an ephemeral Sandbox Mode.
  - Can create up to **3 applications** and up to **3 linked contacts**.
  - Displays a persistent, calm Sandbox Banner: *"Sandbox Preview: Tracking locally (up to 3 applications). Create a free account to unlock cloud sync, Chrome Extension capture, and 20 active applications."*
  - Creation of a 4th card (or CSV import) is intercepted by `useApplications` and `AddApplicationModal`, triggering the Account Conversion modal (`mode: 'signup'`).
  - Features requiring server resources (Cloud Resume storage, AI scraper fallback, GitHub issue reporting, and Extension cloud sync) are disabled with informational upgrade prompts.
- **Seamless Conversion Migration**:
  - When the user registers or signs in, `useGuestMigration` automatically batch-imports the 1–3 sandbox applications and contacts to Firestore under `users/{userId}`, establishes the default Free entitlement document, and purges `localStorage`.

---

## 2. Legacy Guest User Grandfathering

### Context
Users who tracked applications in Tracklet before this release may have dozens of applications stored under `tracklet_guest_apps_v1` and contacts in `tracklet_guest_contacts_v1`. Deleting their data or locking them out would destroy trust.

### Decision
- **Automatic Detection**: On app initialization, check if `tracklet_guest_apps_v1` contains `> 3` applications.
- **Legacy Migration Prompt**: Present the dedicated `GuestMigrationModal` explaining Tracklet's upgrade to Cloud Sync.
- **Grandfathered Pipeline Access**:
  - If a legacy user has `> 20` active applications, all applications are imported into Firestore without data loss.
  - They are placed into "Grandfathered Manage Mode": all imported cards remain 100% viewable, searchable, editable, and exportable.
  - New active card creation is gated until their active application count drops below 20 (or they upgrade to Pro).

---

## 3. Chrome Extension & Web Auth Synchronization

### Context
Constitution Principle IV and PLG acquisition demand that the Chrome Extension and Web App operate seamlessly together. Previously, the extension maintained separate storage (`tracklet_guest_apps_v1` / `tracklet_apps_index`) and could save locally even when disconnected from the cloud.

### Decision
- **Mandatory Auth in Extension**:
  - The extension popup (`extension/popup.html`) requires an authenticated Firebase session.
  - If no session exists in `chrome.storage.local`, the popup displays a polished sign-in state with a CTA: *"Sign in to Tracklet"*, opening `https://tracklet-eight.vercel.app/login?source=extension`.
  - Job capture, duplicate detection, and autofill are gated behind authentication.
- **Web-to-Extension Auth Bridge**:
  - When a user signs in, refreshes their token, or logs out in the React app, `AuthContext` dispatches a `TRACKLET_AUTH_SYNC` message to the window.
  - Content scripts (`extension/content.js`) forward the message to `background.js` via `chrome.runtime.sendMessage`.
  - `background.js` stores `tracklet_user_session` in `chrome.storage.local`.
- **Silent Token Refresh**:
  - Firebase ID tokens expire after 1 hour. `background.js` inspects `expiresAt` before initiating network calls or Firestore operations and invokes Google's Secure Token API (`https://securetoken.googleapis.com/v1/token`) using the cached `refreshToken`.

---

## 4. User Entitlement Profile & Active Pipeline Quotas

### Context
Tracklet needs a structured entitlement model to prepare for paid billing (feature `014`) and enforce Free tier limits (feature `013`).

### Decision
- **Schema (`users/{userId}`)**:
  ```typescript
  export type PlanTier = 'free' | 'pro';
  export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'trialing';

  export interface UserEntitlementProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    planTier: PlanTier;
    subscriptionStatus: SubscriptionStatus;
    currentPeriodEnd?: string | null;
    quotas: {
      scrapesUsedThisMonth: number;
      autofillsUsedThisMonth: number;
      quotaResetAt: string;
    };
    createdAt: string;
    updatedAt: string;
  }
  ```
- **Active vs. Terminal Classification**:
  - Active: `Saved`, `Applied`, `Screening`, `Interview`, `Offer` (count toward the 20-card limit).
  - Terminal: `Rejected`, `Archived` (exempt from limit to encourage pipeline hygiene).
- **ADR 0010 Compliance**:
  - Top-level persistent navigation tabs remain calm and free of raw numbers.
  - Quota indicator (`X / 20 Active`) is displayed in the **Active Pipeline toolbar** (with visual progress ring/bar) and within **Account Settings**.
- **Upgrade Paywall Modal (`<UpgradePaywallModal />`)**:
  - Canonical modal triggered when hitting quota limits (`card_limit`, `scrape_limit`, `feature_gate`).
  - While billing (`014`) is pending, clicking "Upgrade to Pro" logs the conversion intent and offers an "Early Access Pro Waitlist" confirmation toast.

---

## 5. Serverless API Hardening & Token Verification

### Context
Serverless endpoints `/api/scrape-job.ts` and `/api/report-issue.ts` were previously open to anonymous traffic. Anonymous scrapers and bots could exhaust Gemini API quotas and spam GitHub Issues.

### Decision
- **Bearer Token Verification**:
  - All calls to `/api/scrape-job` and `/api/report-issue` require header: `Authorization: Bearer <firebaseIdToken>`.
  - In serverless runtimes (Vercel Node/Edge), verify the token by verifying the JWT signature against Google's public JWKS certificates (`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`) or querying Firebase Auth Tokeninfo.
  - Return HTTP `401 Unauthorized` immediately if missing or invalid.
- **Quota Metering for AI Scraping**:
  - Free tier: 20 scrapes / month.
  - Pro tier: 500 scrapes / month.
  - Check monthly usage; if exceeded, return HTTP `429 Too Many Requests` with `{ error: 'QUOTA_EXCEEDED' }`.
- **Identity Integrity for Issue Reports**:
  - `/api/report-issue` extracts `uid` and verified `email` directly from the token, preventing spoofed reporter identities.

---

## 6. Firestore Security Rules Hardening

### Context
`firestore.rules` currently allows `write: if isOwner(userId)` on `/users/{userId}`, allowing client DevTools to manipulate `planTier: 'pro'`.

### Decision
- **Immutable Client Tier Updates**:
  - Allow initial creation if `planTier == 'free'` and `subscriptionStatus == 'none'`.
  - Disallow updates where `request.resource.data.planTier != resource.data.planTier`.
  - Only server-side Firebase Admin SDK (used in future billing webhooks) can promote tier to `'pro'`.

---

## 7. Telemetry & Environment Safeguards (ADR 0004 Reconciliation)

### Context
ADR 0004 established that Sentry should only be enabled when `Boolean(dsn) && isProd` to avoid breaking local development and self-hosted deployments.

### Decision
- Preserve ADR 0004 conditional checks:
  - In production Tracklet Cloud, Sentry and PostHog capture errors and SaaS conversion funnel events (`sandbox_limit_reached`, `sandbox_migration_completed`, `paywall_modal_viewed`, `paywall_upgrade_clicked`) with strict PII scrubbing.
  - In unconfigured or self-hosted environments, telemetry stays completely dormant without console errors.
