# Implementation Tasks: Public Legal & Trust Pages (/privacy, /terms)

**Feature**: `014-public-legal-pages`  
**Branch**: `add_legal_trust_pages`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup & Foundational Routing Contracts

- [x] **T001** [P]: Update `src/lib/routeUtils.ts`
  - Define `LegalDocType` (`'privacy' | 'terms'`).
  - Add `LEGAL_PATH_TO_DOC` mapping (`/privacy`, `/privacy-policy`, `/terms`, `/terms-of-service`, `/tos`, `/legal`).
  - Add `DOC_TO_LEGAL_PATH` mapping (`privacy: '/privacy'`, `terms: '/terms'`).
  - Implement `isLegalPath(pathname: string): boolean`.
  - Implement `getLegalDocFromPath(pathname: string): LegalDocType`.
  - Implement `getPathForLegalDoc(doc: LegalDocType): string`.
- [x] **T002** [P]: Add Unit Tests in `tests/unit/routeUtils.test.ts`
  - Verify `isLegalPath` identifies all canonical legal paths and aliases with and without trailing slashes.
  - Verify `getLegalDocFromPath` resolves the expected `LegalDocType`.
  - Verify existing auth and tab path helpers continue to behave correctly.

---

## Phase 2: App & AuthGate Public Access Exemption

- [x] **T003**: Update `src/components/layout/AuthGate.tsx`
  - Detect `isLegalPath(window.location.pathname)`.
  - Render `<LegalView initialDoc={getLegalDocFromPath(window.location.pathname)} />` unconditionally before evaluating auth state or email verification.
- [x] **T004**: Update `src/App.tsx` Routing Synchronization
  - Ensure the routing `useEffect` in `App.tsx` does not replace legal URLs with `/login` or `/applications`.
  - Listen for `popstate` events to update top-level view state when users navigate browser history between legal documents and app tabs.

---

## Phase 3: Comprehensive Legal Documents & Reader Components

- [x] **T005** [P]: Create `src/components/legal/PrivacyPolicyContent.tsx`
  - Non-Monetization Pledge: Candidate data is never sold, brokered, rented, or pooled for recruiters or ad brokers.
  - Manifest V3 Chrome Extension Permissions: Technical and plain-language explanation of `storage`, `activeTab`, `scripting`, and host permissions.
  - Cloud Infrastructure & Security: Google Firebase Auth, Firestore tenant isolation (`users/{userId}`), AES-256 at rest, TLS 1.3 in transit.
  - Diagnostics & Telemetry: Sentry and PostHog disclosures with client-side text masking and PII redaction.
  - User Rights: Exportability (CSV/JSON) and complete deletion via Danger Zone.
  - Legal contact: `privacy@tracklet.app`.
- [x] **T006** [P]: Create `src/components/legal/TermsOfServiceContent.tsx`
  - Customer Content Ownership: Users retain 100% exclusive ownership of all applications, notes, and uploaded resumes.
  - Subscription Plans & Billing: Free vs. Pro tier quotas, auto-renewal, cancellation policy, retention through paid period.
  - Acceptable Use Policy: Anti-abuse, rate limits, no automated scraping flood, no agency account sharing.
  - Disclaimers & Limitations of Liability: 99.9% uptime target, "as is" warranty disclaimers, liability caps.
  - Legal contact: `legal@tracklet.app`.
- [x] **T007**: Create `src/components/legal/LegalNavbar.tsx`
  - Tracklet brand logo and title.
  - Document switcher tabs ("Privacy Policy" vs "Terms of Service") with active pill styling.
  - Dynamic action CTA: "Back to Workspace" (when authenticated) or "Sign In" (when unauthenticated).
- [x] **T008**: Create `src/components/legal/LegalTableOfContents.tsx`
  - Sticky sidebar navigation on desktop (`lg:w-64`).
  - Anchor link click handling with smooth scroll.
  - IntersectionObserver active section indicator.
- [x] **T009**: Create `src/components/legal/LegalFooter.tsx`
  - Security covenants summary pill.
  - Copyright notices, cross-document links, and contact email mailto.
- [x] **T010**: Create `src/components/legal/LegalView.tsx`
  - Container assembling `LegalNavbar`, `LegalTableOfContents`, active document content, and `LegalFooter`.
  - URL history synchronization (`pushState`) on tab switch.
  - Document title updates (`Privacy Policy | Tracklet` / `Terms of Service | Tracklet`).
  - Print button invoking `window.print()`.
- [x] **T011**: Add Print Styles in `src/index.css`
  - `@media print` rules hiding navbar, sidebar, buttons, and badges while formatting body copy for high-legibility print/PDF.

---

## Phase 4: Entry Points Across Web App & Chrome Extension

- [x] **T012**: Update `src/components/auth/SignupView.tsx`
  - Add agreement text: "By signing up, you agree to our Terms of Service and Privacy Policy" with links opening `/terms` and `/privacy`.
- [x] **T013**: Update `src/components/auth/LoginView.tsx` and `src/components/AuthScreen.tsx`
  - Add footer legal links to `/privacy` and `/terms`.
- [x] **T014**: Update `src/components/SecurityPrivacyCard.tsx`
  - Provide direct external links / button to view live `/privacy` and `/terms` pages.
- [x] **T015**: Update `extension/popup.html` and `extension/popup.js`
  - Add "Privacy Policy" link in extension popup footer.
  - Verify extension manifest sync (`tests/unit/versionSync.test.ts`).

---

## Phase 5: Verification & Quality Assurance

- [x] **T016**: Run unit tests (`npm test`).
- [x] **T017**: Run TypeScript verification (`npx tsc --noEmit`).
- [x] **T018**: Run production build (`npm run build`).
- [x] **T019**: Final sanity check of unauthenticated navigation and Lighthouse compliance.
