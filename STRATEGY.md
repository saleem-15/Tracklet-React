# Tracklet — Commercial SaaS Strategy & Roadmap

## 1. Strategic Positioning
Tracklet operates as a closed-source, Product-Led Growth (PLG) B2C SaaS business. 
- **Privacy & Security Stance:** Instead of local-only isolation, Tracklet provides *encrypted, multi-device cloud synchronization with strict user data ownership*. User data is never sold to third-party recruiters or ad networks.
- **Primary Acquisition Wedge:** The Chrome Extension (`extension/`) serves as the top-of-funnel acquisition engine. Users install the extension for instant job capture and duplicate detection, and upgrade to **Tracklet Pro** when they hit active pipeline limits or need unlimited ATS autofill and analytics.

## 2. Pricing & Packaging (Mitigating Episodic Churn)
Because job searching is episodic (1 to 4 months), standard monthly SaaS subscriptions suffer from high natural churn once a candidate is hired. Tracklet aligns pricing with the job-hunt lifecycle:
1. **Free Tier ($0):** Up to 20 active job applications, 1 cloud resume, basic KPIs, and 5 ATS autofills/month. Designed to hook active job seekers within their first week of applying.
2. **Pro Monthly ($12 / month):** Full access to unlimited applications, unlimited ATS autofill, unlimited cloud resume versions, and full pipeline analytics.
3. **Pro "Job Hunt Pass" ($29 / 3 months — Default Recommended):** Pre-paid quarterly bundle offering a ~20% discount. Maximizes Customer Lifetime Value (LTV) upfront while matching the average duration of a tech job search.

## 3. Unit Economics & Infrastructure Protection
To protect gross margins as a SaaS business:
- **Authenticated Compute:** Serverless endpoints (`api/scrape-job.ts`, `api/report-issue.ts`) must verify Firebase Auth ID tokens (`Authorization: Bearer <token>`) and enforce per-user rate limits.
- **Database Cost Control:** Keep status history and contact/email projections embedded or tightly scoped under `users/{userId}/applications/{appId}` (ADR 0003, ADR 0009) to minimize Firestore document read amplification.
- **Storage Quotas:** Enforce file size limits (max 5MB per PDF) and count limits on Firebase Cloud Storage per user tier.

## 4. Telemetry & Funnel Observability (Superseding ADR 0004)
To optimize conversion and reliability, telemetry is enabled by default for all authenticated sessions (with PII scrubbing):
- **Error Monitoring (Sentry):** Tracks runtime exceptions across the React web app, serverless `/api` routes, and Chrome Extension scripts.
- **Product Analytics (PostHog):** Tracks key PLG funnel events:
  1. `user_signed_up`
  2. `extension_connected`
  3. `application_created` (manual vs. extension scrape)
  4. `autofill_triggered`
  5. `paywall_viewed` (reason: `card_limit` | `autofill_limit` | `resume_limit` | `analytics_gate`)
  6. `subscription_upgraded` (`monthly` | `quarterly_pass`)

## 5. Phased Execution Roadmap

### Phase 1: Context, Auth Unification & Endpoint Hardening (Current)
- Update repository truth files (`PRODUCT.md`, `STRATEGY.md`, `constitution.md`, `AGENTS.md`).
- Restrict Guest Mode to a 3-card Sandbox or require login upfront; implement 1-click `localStorage` $\rightarrow$ Firestore migration on sign-up.
- Unify Firebase Auth between the React web app and the Chrome Extension.
- Add Firebase ID Token verification and rate-limiting to `api/scrape-job.ts` and `api/report-issue.ts`.

### Phase 2: Cloud Storage Consolidation
- Migrate resume storage from `extension/indexedDbResumeStorage.js` to Firebase Cloud Storage + Firestore metadata.
- Sync `extension/profileStorage.js` with the user's Firestore profile document so autofill data is editable from the web dashboard.

### Phase 3: Entitlements & Paywall Gating
- Extend the Firestore user schema (`users/{userId}`) with `planTier`, `subscriptionStatus`, `currentPeriodEnd`, and `quotas`.
- Enforce tier limits in `firestore.rules` and UI action hooks.
- Build the reusable `<UpgradeModal />` and lock states across `ActivePipelineBoard`, `StatsView`, and the Chrome Extension popup.

### Phase 4: Billing & Lifecycle Automation
- Integrate Stripe / LemonSqueezy checkout and customer portal.
- Build the billing webhook handler (`api/billing-webhook.ts`) to sync subscription states to Firestore.
- Add Account & Billing management and GDPR "Delete Account" self-service in Settings.
