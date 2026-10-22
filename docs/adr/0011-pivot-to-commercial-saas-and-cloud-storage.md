# ADR 0011: Pivot from Open Source / Local-First to Commercial Cloud SaaS

## Status
Accepted

## Context
Tracklet was initially designed as an open-source, local-first, privacy-focused application utilizing unrestricted Guest Mode, browser IndexedDB storage for resumes, and local storage in the Chrome extension. 

To build a sustainable commercial business, the product is pivoting to a closed-source SaaS model. This requires:
1. Gating features behind authenticated user identities and paid subscription tiers (Free vs. Pro).
2. Transitioning asset and profile storage from client-side isolated storage to user-scoped cloud storage.
3. Establishing server-side rate limits and entitlements on compute-heavy routes.

## Decisions

### 1. Authentication & Guest Lifecycle
- Deprecate unrestricted local-only Guest Mode.
- Guest Mode is replaced by an ephemeral 3-card demo sandbox or an upfront authenticated Free tier.
- The Chrome Extension (`extension/`) and web dashboard must share a unified Firebase Auth session. Local extension operations must sync to the user's Firestore records.

### 2. Asset & Data Storage
- Supersede local `indexedDbResumeStorage.js`: All resumes and parsed documents are stored in user-scoped Firebase Cloud Storage buckets (`users/{uid}/resumes/{fileId}`) with Firestore metadata pointers.
- Supersede local `profileStorage.js`: The extension's autofill data syncs with the user's profile document in Firestore (`users/{uid}`).

### 3. Monetization & Usage Gating
- Free Tier Limits:
  - Up to 20 active pipeline applications.
  - Basic job saving and local duplicate detection via extension.
  - Standard KPI stats (pipeline totals).
- Pro Tier ($9–$12/month or $29/quarter Job Hunt Pass):
  - Unlimited active pipeline applications.
  - Unlimited 1-click ATS application form autofill.
  - Automated recruiter email sync and status progression.
  - Advanced pipeline conversion and interview velocity analytics.

### 4. API & Scraper Protection
- All endpoints (`api/scrape-job.ts`, `api/report-issue.ts`) require a verified Firebase Auth ID token in the `Authorization` header.
- Scraping requests are rate-limited and metered against the user's tier quota.

### 5. Telemetry & Licensing
- Supersede ADR 0004: Standardize Sentry error monitoring and PostHog product analytics with PII scrubbing to track funnel conversion.
- Remove open-source license files and restrict repository visibility.

## Consequences
- Existing local-only code paths in `extension/` and the client app will be refactored to check cloud state and entitlement tier flags.
- Firebase Security Rules (`firestore.rules`) will enforce quota and ownership checks server-side.
