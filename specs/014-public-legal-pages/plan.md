# Implementation Plan: Public Legal & Trust Pages (/privacy, /terms)

**Branch**: `add_legal_trust_pages` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-public-legal-pages/spec.md`

## Summary

Deliver publicly accessible, standalone, unauthenticated **Privacy Policy** (`/privacy`) and **Terms of Service** (`/terms`) pages on Tracklet's domain. Decouple these routes from the mandatory `AuthGate` wall so that Chrome Web Store reviewers, Google OAuth verification auditors, and payment gateway compliance officers (Paddle/Creem) can evaluate Tracklet's compliance covenants. The implementation includes high-craft, accessible, responsive legal reader components with an interactive Table of Contents, document switcher, print-friendly stylesheets, and synchronized entry links across authentication views, settings, and the Chrome Extension popup.

---

## Technical Context

**Language/Version**: TypeScript 5.x / React 19 / Vite  
**Primary Dependencies**: Tailwind CSS, Lucide React, Motion (`motion/react`)  
**Storage**: N/A (Static legal covenants; user-scoped cloud persistence for existing features is preserved)  
**Testing**: Vitest (`tests/unit/`)  
**Target Platform**: Web browsers (Desktop & Mobile), Chrome Extension MV3 surface  
**Project Type**: Web SaaS Application & Chrome Extension  
**Performance Goals**: 100/100 Lighthouse Performance, Accessibility, and Best Practices; < 50ms route switch  
**Constraints**: Zero unauthenticated redirects for `/privacy`, `/terms`, `/legal`; WCAG AA contrast standards (no `text-slate-400` on light backgrounds)  
**Scale/Scope**: 2 dedicated legal documents, ~5 reader subcomponents, route integration across 4 entry points  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Cloud-First, User-Scoped Persistence**: Legal pages are static markdown/React presentation; no local-only database silos are introduced.
- [x] **II. Entitlement & Tier-First Feature Design**: Public trust pages are completely open to all visitors (prospective, free, and pro users alike), without gating or paywalls.
- [x] **III. Authenticated & Rate-Limited Serverless Endpoints**: No new unauthenticated serverless API routes are created.
- [x] **IV. Extension & Web Parity**: Extension popup links directly to the hosted Privacy Policy on the web app.
- [x] **V. High-Craft UI/UX & Performance Standards**: Follows `DESIGN.md` tokens, includes print styling, keyboard accessibility, sticky Table of Contents, and action-only navigation.

---

## Project Structure

### Documentation (this feature)

```text
specs/014-public-legal-pages/
├── spec.md              # Feature specification
├── plan.md              # This plan
├── research.md          # Technical analysis & compliance rationale
├── data-model.md        # Routing contracts & component interfaces
├── quickstart.md        # Verification & testing procedures
└── tasks.md             # Implementation tasks
```

### Source Code

```text
src/
├── lib/
│   └── routeUtils.ts                 # Add isLegalPath, getLegalDocFromPath, LEGAL_PATH_TO_DOC
├── components/
│   ├── layout/
│   │   └── AuthGate.tsx              # Exempt legal paths from auth interception
│   ├── legal/
│   │   ├── LegalView.tsx             # Main legal reader container
│   │   ├── LegalNavbar.tsx           # Brand header with switcher and nav buttons
│   │   ├── LegalFooter.tsx           # Footer with links & legal contact
│   │   ├── LegalTableOfContents.tsx  # Sticky desktop sidebar TOC with scrollspy
│   │   ├── PrivacyPolicyContent.tsx  # Comprehensive Privacy Policy content
│   │   └── TermsOfServiceContent.tsx # Comprehensive Terms of Service content
│   ├── auth/
│   │   ├── SignupView.tsx            # Add terms & privacy agreement notice
│   │   └── LoginView.tsx             # Add footer legal links
│   ├── AuthScreen.tsx                # Include legal footer links
│   └── SecurityPrivacyCard.tsx       # Link directly to /privacy and /terms
├── App.tsx                           # Route sync handling for legal paths
└── index.css                         # Print styles for legal documents

extension/
├── popup.html                        # Privacy policy link in extension popup
└── popup.js                          # Chrome runtime tab open handler
```

---

## Phases & Deliverables

### Phase 1: Route Utilities & App Gating Exemption
- Update `src/lib/routeUtils.ts` with legal path mappings and detection functions.
- Update `src/App.tsx` and `src/components/layout/AuthGate.tsx` to allow `/privacy` and `/terms` to render without auth barriers.
- Unit tests for route helper functions in `tests/unit/routeUtils.test.ts`.

### Phase 2: Comprehensive Legal Documents & Reader Components
- Create `PrivacyPolicyContent.tsx` with all mandatory disclosures (Manifest V3 extension permissions, Non-Monetization Pledge, Firebase AES-256 encryption, Sentry/PostHog PII masking, user deletion/portability rights).
- Create `TermsOfServiceContent.tsx` with customer content ownership, subscription/cancellation policies, acceptable use, and disclaimers.
- Create `LegalNavbar.tsx`, `LegalTableOfContents.tsx`, `LegalFooter.tsx`, and `LegalView.tsx`.
- Add print-friendly styles in `src/index.css`.

### Phase 3: Web App Entry Points & Navigation Links
- Add consent statement and links in `src/components/auth/SignupView.tsx`.
- Add legal footer links in `src/components/auth/LoginView.tsx` and `src/components/AuthScreen.tsx`.
- Update `src/components/SecurityPrivacyCard.tsx` to provide external links to `/privacy` and `/terms`.
- Wire in-app navigation so switching tabs updates history state and page title seamlessly.

### Phase 4: Chrome Extension Linkage & Manifest Sync
- Add Privacy Policy link in `extension/popup.html` and click handler in `extension/popup.js`.
- Ensure version synchronization between `extension/manifest.json` and `src/lib/constants.ts`.

### Phase 5: Verification & Quality Assurance
- Run `tests/unit/routeUtils.test.ts` and entire test suite (`npm test`).
- Type check: `npx tsc --noEmit`.
- Production build: `npm run build`.
- Verify Lighthouse compliance and responsive behavior.
