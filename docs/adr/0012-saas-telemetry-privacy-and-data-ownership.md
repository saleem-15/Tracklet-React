# ADR 0012: SaaS Telemetry, Product Analytics & Strict Data Ownership Positioning

## Status
Accepted

## Date
2026-10-22

## Context
Tracklet has transitioned from an open-source, local-first utility into a commercial cloud-native B2C SaaS platform ([ADR 0011](0011-pivot-to-commercial-saas-and-cloud-storage.md)). 

In earlier open-source iterations ([ADR 0004](0004-conditional-sentry-telemetry.md)), the project adopted a "zero-telemetry, local-only" stance where error reporting and monitoring were strictly conditional or opt-in. However, running a sustainable, high-availability commercial SaaS without observability creates critical business vulnerabilities:
1. **Onboarding Funnel Blindness**: Inability to identify where job seekers drop off during initial workspace setup, profile configuration, and first job application capture.
2. **Scraper Degradation**: Job board DOM structures (LinkedIn, Greenhouse, Lever, Workable, Ashby) change constantly. Without telemetry on scraper failures and HTTP status codes, scrapers break silently, destroying core product utility.
3. **Conversion & Feature Discovery Gaps**: No data on which premium capabilities (e.g., automated email milestone sync, ATS autofill, advanced interview velocity analytics) drive user upgrade decisions or trigger paywalls.

Simultaneously, job applicants manage sensitive personal information: current employers, salaries, offer letters, mentor contacts, and resumes. A commercial pivot cannot compromise candidate trust by selling data or allowing unmasked PII into third-party diagnostic services.

## Decisions

### 1. Positioning Shift: From "Zero-Telemetry" to "Enterprise Security & Strict Data Ownership"
- **Customer Career Data Sovereignty**: All job applications, salary figures, resumes, contact emails, and personal interview notes belong strictly to the user. Tracklet explicitly covenants that **we never sell, broker, rent, or share candidate career data with recruiters, employers, or third-party ad networks**.
- **Cloud Security**: Cloud synchronization is encrypted at rest (AES-256 via Firestore and Firebase Cloud Storage) and in transit (TLS 1.3). Firestore Security Rules enforce strict tenant isolation (`request.auth.uid == userId`).
- **Data Portability & Erasure**: Users retain the unilateral right to export their complete workspace (JSON/CSV) and permanently purge all cloud data via self-service account deletion at any time.

### 2. Dual-Tier Telemetry Architecture
Observability is decoupled into two purpose-built systems with distinct responsibilities:

1. **System Health & Crash Forensics ([Sentry](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/update_telemetry_privacy_policy/src/instrument.ts))**:
   - Captures unhandled JavaScript exceptions, React Error Boundary catches, and network/DOM performance traces.
   - Enforces strict PII scrubbing:
     - `maskAllText: true` — All DOM text nodes (salaries, company names, candidate notes) are masked in session replays.
     - `blockAllMedia: true` — All images, avatars, and documents are blocked from visual replay streams.
2. **Product & Growth Analytics ([PostHog](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/update_telemetry_privacy_policy/src/lib/posthog.ts))**:
   - Tracks pseudonymized lifecycle and PLG funnel milestones (`user_signed_up`, `application_created`, `follow_up_started`, `paywall_viewed`, `subscription_upgraded`).
   - Tracks ATS scraper health: Records domain name (e.g., `boards.greenhouse.io`) and HTTP failure status codes in `api/scrape-job.ts` without transmitting candidate PII.
   - Masks sensitive input fields and passwords in all session recordings.
   - Links session replay identifiers with Sentry tags (`Sentry.setTag('posthog_session_id', sessionId)`) to correlate frontend errors with user session context.

### 3. Telemetry Activation & Environment Isolation
- **Production Tracklet Cloud**: Telemetry is **enabled by default** for all authenticated users under the Terms of Service and Privacy Policy. It is not an opt-in toggle; operational monitoring is strictly necessary to deliver 99.9% availability and reliable scraper functionality.
- **Code-Level Environment Guards Remain Intact**:
  - In `src/instrument.ts`: `enabled: Boolean(dsn) && isProd`
  - In `src/lib/posthog.ts`: `Boolean(posthogKey && posthogHost)`
  - These conditional guards remain permanently in the codebase to guarantee that local developer environments, unit tests, preview builds, and CI/CD pipelines never pollute production datasets or fail due to missing secrets.

## Consequences

### Positive
- **Product Velocity & Funnel Visibility**: Clear attribution of onboarding drop-offs, feature engagement, and paywall conversion drivers.
- **Scraper Reliability**: Rapid detection of ATS layout changes before users report broken imports.
- **Candidate Trust**: Clear legal commitments against recruiter monetization paired with cryptographic data privacy and PII masking.
- **Clean Developer Experience**: Local builds and unit tests remain silent, fast, and independent of external API keys.

### Negative / Trade-offs
- **SDK Bundle Overhead**: Maintaining both `@sentry/react` and `posthog-js` adds client bundle weight, mitigated by Rollup vendor chunking (`vendor-sentry`) in Vite.
- **Compliance Burden**: Requires maintaining formal Terms of Service, Privacy Policy, and GDPR/CCPA data export/deletion workflows.
