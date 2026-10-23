# Phase 0 Research & Technical Decisions: Public Legal & Trust Pages (/privacy, /terms)

**Branch**: `add_legal_trust_pages`  
**Date**: 2026-10-23  
**Status**: Completed  
**Spec Reference**: [spec.md](./spec.md)

---

## 1. Public Routing Architecture & AuthGate Interception

### Context
Tracklet uses a lightweight, client-side browser routing model built on `window.location.pathname` and `window.history.pushState` / `replaceState` without a bulky third-party router (like `react-router-dom`). In `src/App.tsx` and `src/components/layout/AuthGate.tsx`, any visitor without an authenticated Firebase session (`!user`) is automatically redirected to `/login` and rendered the `AuthScreen`.

This completely blocks Chrome Web Store reviewers, Google OAuth verification bots, payment gateway compliance auditors (Paddle/Creem), and prospective users from accessing `/privacy` and `/terms`.

### Decision
1. **Route Utilities (`src/lib/routeUtils.ts`)**:
   - Define `LegalDocType = 'privacy' | 'terms'`.
   - Map legal paths: `/privacy`, `/terms`, `/legal` (alias to `/privacy`).
   - Add utility functions:
     - `isLegalPath(pathname: string): boolean`
     - `getLegalDocFromPath(pathname: string): LegalDocType`
     - `getPathForLegalDoc(doc: LegalDocType): string`
2. **App Gating Exemption (`src/App.tsx`)**:
   - In `App.tsx`'s routing effect: If `isLegalPath(path)` is true, suppress any replacement to `/login` or `/applications`.
3. **AuthGate Rendering Bypass (`src/components/layout/AuthGate.tsx`)**:
   - Before evaluating user authentication or email verification:
     ```tsx
     if (isLegalPath(window.location.pathname)) {
       return <LegalView initialDoc={getLegalDocFromPath(window.location.pathname)} />;
     }
     ```
   - This ensures both unauthenticated visitors and authenticated users who navigate to `/privacy` or `/terms` see the standalone legal view directly without layout shifts or auth redirects.
4. **Browser History & URL Synchronization**:
   - When users switch between "Privacy Policy" and "Terms of Service" tabs within `LegalView`, `window.history.pushState` updates the URL to `/privacy` or `/terms` and dynamically updates `document.title` (`Privacy Policy | Tracklet` / `Terms of Service | Tracklet`).
   - Listen to the `popstate` event to support back/forward browser navigation seamlessly.

---

## 2. Regulatory & Compliance Content Requirements

### Context
Tracklet requires formal approval across three critical compliance jurisdictions:
1. **Chrome Web Store Policy**: Reviewers strictly require explicit disclosures for declared extension permissions (`storage`, `activeTab`, `scripting`, `tabs`, host permissions) and how captured job data is processed and stored.
2. **Google OAuth Verification**: Google’s Trust & Safety team inspects the domain's live Privacy Policy and Terms of Service before approving user consent screens, ensuring transparent identity handling and non-monetization.
3. **Payment Gateways & MoRs (Paddle, Creem, Stripe)**: Compliance auditors require explicit consumer terms: refund policy, subscription cancellation rules, customer data ownership, and direct legal contact channels.

### Decision
- **Privacy Policy Content Requirements**:
  - **Zero Recruiter Monetization Covenant**: Unequivocal guarantee that Tracklet never sells, brokers, rents, or pools candidate resumes, job applications, or recruiter communications.
  - **Extension Permissions Breakdown**: Plain-language and technical explanation of every permission requested in `extension/manifest.json`.
  - **Cloud Architecture & Encryption**: User-scoped Firestore isolation (`users/{userId}`), AES-256 encryption at rest, TLS 1.3 in transit.
  - **Telemetry & Diagnostic Masking**: Disclosures for Sentry error monitoring and PostHog product analytics, specifying automated client-side text masking and PII scrubbing.
  - **User Rights & Portability**: Clear instructions on how users can export full data (CSV/JSON) and execute complete account deletion via the in-app "Danger Zone".
- **Terms of Service Content Requirements**:
  - **Customer Ownership**: Explicit recognition that users retain 100% exclusive ownership of all resumes, application records, and notes.
  - **Subscription & Cancellation Terms**: Clear terms for Free and Pro tiers, auto-renewal mechanisms, immediate cancellation rights, and access retention through prepaid periods.
  - **Acceptable Use & Anti-Abuse**: Prohibitions on scraping reverse-engineering, ATS flood requests, and agency account sharing.
  - **Disclaimers & Limitation of Liability**: Standard SaaS limitations with 99.9% uptime target.
  - **Legal Contact**: Dedicated contact mailbox (`privacy@tracklet.app` and `support@tracklet.app`).

---

## 3. High-Craft Reader UX & Accessibility (WCAG AA)

### Context
Legal documents are long and dense. Typical legal pages suffer from poor typography, lack of navigation, and illegible text. Per Tracklet's UI/UX standards (`.agents/rules/ui-ux-standards.md`) and Lighthouse requirements (`.agents/skills/lighthouse-audit/SKILL.md`):
- Text contrast must exceed WCAG AA requirements (`text-slate-600` or `text-slate-700` on light background; never `text-slate-400`).
- Interactive elements must support full keyboard navigation.
- Desktop layouts should provide an interactive Table of Contents with smooth section jumping.
- Print layouts must eliminate navigation clutter and render clean document copy.

### Decision
- **Modular Component Breakdown**:
  - `src/components/legal/LegalView.tsx`: Main reader container with sticky top bar, document tabs, and quick navigation.
  - `src/components/legal/PrivacyPolicyContent.tsx`: Full privacy policy document structured with semantic `<section>` and `id` anchors.
  - `src/components/legal/TermsOfServiceContent.tsx`: Full terms of service document structured with semantic `<section>` and `id` anchors.
  - `src/components/legal/LegalTableOfContents.tsx`: Sticky sidebar TOC on desktop (`lg:w-64`) with smooth scrolling and active heading highlight.
  - `src/components/legal/LegalNavbar.tsx`: Brand header with Tracklet logo, document toggle, and "Back to Tracklet" / "Sign In" link.
  - `src/components/legal/LegalFooter.tsx`: Clean footer with copyright, contact email, and cross-document links.
- **Print Optimization**:
  - Add `@media print` rules in `src/index.css` or component styling to hide sticky headers, sidebars, and action buttons during printing or PDF export.

---

## 4. Entry Points Across Web App and Extension

### Context
Users must have frictionless access to legal terms at critical trust touchpoints:
1. **Signup Screen (`SignupView.tsx`)**: Legal consent statement: *"By signing up, you agree to our Terms of Service and Privacy Policy"*.
2. **Login Screen (`LoginView.tsx`) / AuthScreen**: Footer navigation links to `/privacy` and `/terms`.
3. **Settings (`SecurityPrivacyCard.tsx`)**: Direct links to open `/privacy` and `/terms` in a new tab.
4. **Chrome Extension (`popup.html` / `popup.js`)**: Privacy policy link in the popup footer opening the hosted policy in a new browser tab.
