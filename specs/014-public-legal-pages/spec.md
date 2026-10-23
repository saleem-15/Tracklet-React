# Feature Specification: Public Legal & Trust Pages (/privacy, /terms)

**Feature Branch**: `add_legal_trust_pages` (Directory: `specs/014-public-legal-pages`)  
**Created**: 2026-10-23  
**Status**: Ready for Planning  
**Input**: "Ship Public Legal & Trust Pages (/privacy, /terms) Even before you integrate billing, you need live Privacy Policy and Terms of Service pages on your domain. Why: The Chrome Web Store strictly refuses to publish extensions that handle user data (storage, activeTab, scripting in extension/manifest.json) without a live Privacy Policy URL. Firebase Google OAuth consent screen verification requires live Privacy Policy and Terms URLs. When you do apply to Creem or Paddle later, their compliance reviewers check these pages first."

---

## Overview & Strategic Rationale

Tracklet is a commercial B2C SaaS job application tracker with a companion Manifest V3 Chrome Extension. Prior to integrating monetization gateways (Paddle, Creem, Stripe) and submitting the Chrome Extension to the Chrome Web Store, Tracklet must host live, legally thorough, publicly accessible **Privacy Policy** and **Terms of Service** pages on its root domain.

Currently, unauthenticated visitors who attempt to access any route other than `/login`, `/signup`, or `/forgot-password` are unconditionally redirected by `AuthGate` and `App.tsx` to `/login`. As a result:
1. **Chrome Web Store Review Failure**: Reviewers evaluating the extension's declared permissions (`storage`, `activeTab`, `scripting`, `tabs`) require a publicly accessible Privacy Policy URL without login gating.
2. **Google OAuth Verification Blocker**: Verifying the Firebase Google OAuth brand and consent screen requires live, publicly crawlable Privacy and Terms URLs.
3. **Payment Processor Rejections**: Merchant of Record (MoR) providers (Paddle, Creem) require transparent consumer terms, refund/cancellation guidelines, security commitments, and clear legal contact information.
4. **Candidate Trust Deficit**: Job seekers entrust Tracklet with sensitive employment history, resumes, and recruiter notes. A public "Zero Recruiter Monetization" covenant is required to build customer confidence.

This feature establishes dedicated public routes (`/privacy` and `/terms`), decoupled from the authentication wall, featuring an accessible, responsive, high-craft legal document reader and synchronized entry points across the web app and extension.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Public Unauthenticated Access to Legal Pages (Priority: P1)

As an external reviewer (Chrome Web Store tester, Google OAuth verification reviewer, Paddle/Creem compliance auditor) or an unauthenticated prospective user, I can directly navigate to `/privacy` or `/terms` on the live domain without being redirected to `/login` or prompted for authentication, so that I can independently verify Tracklet's compliance and governance.

**Why this priority**: Required for regulatory approvals and store distribution. If compliance reviewers are blocked by an authentication gate, the extension and Google OAuth verification will be rejected.

**Independent Test**:
1. Open an incognito/private browser window without any active cookies or sessions.
2. Navigate directly to `https://<domain>/privacy`.
3. Verify the Privacy Policy page loads immediately without redirecting to `/login` or `/signin`.
4. Navigate directly to `https://<domain>/terms`.
5. Verify the Terms of Service page loads immediately without redirecting to `/login`.

**Acceptance Scenarios**:
1. **Given** an unauthenticated visitor or web crawler visits `/privacy`, **When** the page initializes, **Then** `AuthGate` does NOT render the `AuthScreen` or trigger a `/login` URL replacement; the full Privacy Policy document renders.
2. **Given** an unauthenticated visitor visits `/terms`, **When** the page initializes, **Then** the Terms of Service document renders with clean header/footer navigation.
3. **Given** an authenticated user visits `/privacy` or `/terms`, **When** the page renders, **Then** they can view the legal documents and click "Back to Dashboard" or "Go to Workspace" to return directly to their active pipeline.

---

### User Story 2 - Comprehensive, Compliant Legal Content (Priority: P1)

As a candidate, auditor, or compliance officer, I can read clear, rigorous, and unambiguous contractual provisions governing Tracklet's data practices, security controls, and SaaS service terms.

**Why this priority**: Generic or incomplete policies fail Chrome Web Store and MoR audits. Policies must explicitly address Tracklet's specific technical architecture: Chrome Extension permissions, ATS scraping, Firebase AES-256 cloud encryption, Sentry/PostHog telemetry masking, and data ownership.

**Independent Test**:
1. Review the Privacy Policy for explicit disclosures on:
   - Manifest V3 Chrome Extension permissions (`storage`, `activeTab`, `scripting`, host permissions) and how data is processed locally vs synced to the cloud.
   - Non-Monetization Pledge: explicitly stating that job search data, resumes, and recruiter notes are NEVER sold, rented, or monetized to recruiters or ad brokers.
   - Telemetry disclosure: Sentry and PostHog PII masking.
   - Infrastructure & Encryption: Firebase Auth, Firestore tenant isolation (`users/{userId}`), and AES-256 at rest / TLS 1.3 in transit.
   - User rights: CSV/JSON data portability and account/data deletion ("Danger Zone").
2. Review the Terms of Service for:
   - User content ownership (customer owns all applications and resumes).
   - Subscription terms, renewals, cancellations, and refund policy.
   - Acceptable Use Policy (no reverse engineering, no ATS abuse, no commercial recruiter pooling).
   - Disclaimers and limitation of liability.
   - Official legal contact email (`support@tracklet.app` / `privacy@tracklet.app`).

**Acceptance Scenarios**:
1. **Given** a reviewer inspecting `/privacy`, **When** reading the Chrome Extension section, **Then** they see exact technical explanations for `storage`, `activeTab`, and `scripting` permissions that match `extension/manifest.json`.
2. **Given** a user reviewing their rights, **When** reading the data deletion section, **Then** clear instructions outline how to export data and permanently erase their account in Account Settings.

---

### User Story 3 - Navigation & Legal Entry Points Across App & Extension (Priority: P2)

As a user navigating Tracklet's web dashboard, auth screens, or Chrome Extension, I can readily access the public legal pages via standardized links, maintaining full transparency at every conversion touchpoint.

**Why this priority**: Legal links must be discoverable during onboarding (auth screen) and daily use (settings, extension popup) to comply with consumer protection standards.

**Independent Test**:
1. Navigate to `/signup`: verify the consent notice: *"By signing up, you agree to our Terms of Service and Privacy Policy"* with functional links.
2. Navigate to `/login`: verify the footer contains "Privacy" and "Terms" links.
3. Open Account Settings > Security Card: verify the "Review Privacy & Terms" button links directly or opens the legal view.
4. Open the Chrome Extension popup: verify a link to "Privacy Policy" is accessible in the footer or menu.

**Acceptance Scenarios**:
1. **Given** a prospective user on the Signup screen, **When** they click "Privacy Policy" or "Terms of Service", **Then** the corresponding legal page opens in a new tab without disrupting their registration flow.
2. **Given** a user in the Chrome Extension popup, **When** they click the Privacy Policy link, **Then** `https://<domain>/privacy` opens in a new browser tab via Chrome Extension runtime APIs.

---

### User Story 4 - High-Craft Reader UX, Accessibility & Print Support (Priority: P2)

As a user or auditor reading lengthy legal agreements, I experience a distraction-free, legible, and responsive reading interface with quick-navigation anchor links, tab switching, and print-ready styles.

**Why this priority**: Poor readability and broken layouts on mobile or print undermine product quality and fail accessibility (WCAG AA) requirements.

**Independent Test**:
1. View `/privacy` and `/terms` on mobile viewport (< 640px) and desktop (> 1024px).
2. Verify table of contents / anchor jump navigation works smoothly.
3. Verify quick tab switcher allows toggling between "Privacy Policy" and "Terms of Service" while keeping the URL in sync (`window.history.pushState`).
4. Trigger browser print preview (`Ctrl+P`): verify headers, footers, and sidebars format cleanly for paper/PDF export.
5. Verify text colors meet WCAG AA standards (no `text-slate-400` on light backgrounds; minimum `text-slate-600` for body copy, `text-slate-900` for headings).

**Acceptance Scenarios**:
1. **Given** a user viewing `/privacy`, **When** clicking the "Terms of Service" tab, **Then** the view updates to the Terms of Service and the browser URL updates to `/terms`.
2. **Given** a user navigating by keyboard, **When** tabbing through the document, **Then** focus indicators are clearly visible and table of contents jumps to the correct heading.

---

## Technical Architecture & Constraints

1. **Routing Architecture**:
   - `src/lib/routeUtils.ts`: Add `isLegalPath(pathname)`, `getLegalDocFromPath(pathname)`, `LegalDocType = 'privacy' | 'terms'`.
   - `src/App.tsx`: Exempt `isLegalPath(path)` from unauthenticated `/login` redirects.
   - `src/components/layout/AuthGate.tsx`: When `isLegalPath(pathname)` is true, render `<LegalView initialDoc={...} />` regardless of user authentication state.
2. **Component Structure**:
   - `src/components/legal/LegalView.tsx`: Main reader container with brand header, document tab switcher, table of contents, and print controls.
   - `src/components/legal/PrivacyPolicyContent.tsx`: Full compliant Privacy Policy document.
   - `src/components/legal/TermsOfServiceContent.tsx`: Full compliant Terms of Service document.
   - `src/components/legal/LegalTableOfContents.tsx`: Sticky quick-jump navigation on desktop.
3. **Design & Craft Standards**:
   - Tailwind utility classes following `DESIGN.md`.
   - WCAG AA contrast compliance (`text-slate-600`/`text-slate-700` body, `text-slate-900` headings).
   - Document `<title>` sync (`Privacy Policy | Tracklet` / `Terms of Service | Tracklet`).
4. **Extension Updates**:
   - `extension/popup.html` and `popup.js`: Add Privacy Policy link to the extension popup footer.
   - Keep `extension/manifest.json` version and `constants.ts` synchronized if extension files change.
