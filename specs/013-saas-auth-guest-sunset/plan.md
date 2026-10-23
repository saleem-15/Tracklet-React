# Implementation Plan: SaaS Auth Unification, Guest Mode Sunset & API Hardening

**Branch**: `013-saas-auth-guest-sunset` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

---

## Summary

Pivot Tracklet Cloud from an unrestricted anonymous local Guest Mode to a commercial PLG SaaS model. Introduce a capped 3-card Sandbox preview with seamless cloud migration on sign-up; provide non-destructive grandfathered migration for legacy guest users; unify Web and Chrome Extension authentication with automatic token refresh and cloud-first persistence; enforce a 20 active application limit on the Free tier (excluding terminal `Rejected`/`Archived` cards) with contextual `<UpgradePaywallModal />` paywalls; and harden serverless endpoints (`/api/scrape-job`, `/api/report-issue`) with mandatory Firebase Auth Bearer token verification and monthly quota metering.

---

## Technical Context

**Language/Version**: TypeScript 5.8+, React 19  
**Primary Dependencies**: Vite, TailwindCSS v4, Lucide React, Firebase Auth & Firestore Client SDK, Motion, PostHog, Sentry  
**Storage**: Firestore `/users/{userId}` (entitlements), `/users/{userId}/applications`, `/users/{userId}/contacts` + `localStorage` for ephemeral Sandbox preview (max 3 cards)  
**Testing**: Vitest (`npm test`), TypeScript check (`npx tsc --noEmit`), Vite production build (`npm run build`)  
**Target Platform**: Modern desktop and mobile evergreen browsers + Chromium-based extension browsers (Manifest V3)  
**Project Type**: Single-page web application + Serverless API routes (Node/Edge) + Chrome Extension (V3)  
**Performance Goals**: <50ms serverless auth verification, instant optimistic UI updates (<16ms frame), <2s cloud migration latency  
**Constraints**: Components under 300 lines, WCAG AA contrast compliance, zero browser dialogs (`window.alert`/`confirm`), strict ADR 0010 compliance (no noisy inventory badges on global navigation tabs)  

---

## Constitution & Core Guidelines Check

- [x] **Repository Pattern**: All Firestore reads/writes routed through `ApplicationRepository`, `ContactRepository`, and `EntitlementRepository`.
- [x] **Single Source of Truth**: All tier names (`'free'`, `'pro'`), statuses, limits (`SAAS_LIMITS`), and storage keys imported from `src/lib/constants.ts`.
- [x] **Universal UI/UX Standards**:
  - Outbound links use `target="_blank" rel="noopener noreferrer"`.
  - Optimistic UI on card mutations with automatic error rollback and receipt toasts.
  - Standardized destructive palette: `text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors`.
  - Canonical primitives: `RichTextEditor` for notes, `CustomSelectDropdown` for selects, `Escape` keydown listeners on all modals.
  - Action-only navigation badges (ADR 0010): Quota indicators placed inside Pipeline toolbar and Account Settings; global tabs remain calm.
- [x] **Telemetry Preservation (ADR 0004)**: Retain conditional guards (`Boolean(dsn) && isProd`) so local development and self-hosted instances run cleanly without Sentry errors.
- [x] **Zero Unprompted Commits**: Leave modified files uncommitted in the working tree for user review.

---

## Project Structure & Planned Modifications

### Documentation
```text
specs/013-saas-auth-guest-sunset/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this document)
├── research.md          # Phase 0 architectural decisions
├── data-model.md        # Phase 1 schemas & contracts
├── quickstart.md        # Manual test verification guide
└── tasks.md             # Actionable task list
```

### Source Code Modifications
```text
src/
├── types.ts                                     # Add PlanTier, SubscriptionStatus, UserQuotas, UserEntitlementProfile, PaywallTriggerContext, ExtensionUserSession
├── lib/
│   ├── constants.ts                             # Add SAAS_LIMITS, DEFAULT_USER_QUOTAS, updated LOCAL_STORAGE_KEYS
│   ├── entitlementRepository.ts                 # New repository for users/{userId} entitlement profile & quotas
│   ├── applicationRepository.ts                 # Enforce sandbox 3-card ceiling & active card quota checks
│   ├── firebaseTokenVerifier.ts                 # Serverless-compatible Firebase ID token validation utility
│   ├── authBridge.ts                            # Web-to-Extension authentication dispatch bridge
│   └── posthog.ts                               # SaaS funnel conversion telemetry events
├── hooks/
│   ├── useEntitlement.ts                        # Hook for tier, active count, quotas, and paywall trigger state
│   ├── useGuestMigration.ts                     # Enhanced sandbox auto-migration & legacy grandfathered import
│   └── useApplications.ts                       # Enforce 3-card sandbox ceiling & active pipeline limit
├── components/
│   ├── layout/
│   │   ├── SandboxBanner.tsx                    # Persistent, calm top banner for sandbox exploration
│   │   └── AppModals.tsx                        # Mount UpgradePaywallModal and ConversionModal
│   ├── paywall/
│   │   └── UpgradePaywallModal.tsx              # Context-specific upgrade modal (<300 lines)
│   ├── ActivePipelineBoard.tsx                  # Contextual active quota indicator in toolbar (ADR 0010)
│   ├── AccountSettingsCard.tsx                  # Tier badge, usage stats, and upgrade CTA
│   └── auth/
│       ├── LoginView.tsx                        # Update footer from "Continue as guest" to "Explore sandbox preview"
│       └── SignupView.tsx                       # Contextual conversion headers
api/
├── scrape-job.ts                                # Require Bearer token, enforce 20/mo Free tier limit, return 401/429
└── report-issue.ts                              # Require Bearer token, verify reporter identity, return 401
extension/
├── background.js                                # Require auth session, silent token refresh, quota-aware save
├── popup.js                                     # Auth state switch: sign-in CTA vs authenticated cloud sync
└── popup.html                                   # Render sign-in state & Free/Pro tier badge
firestore.rules                                  # Enforce immutable planTier/subscriptionStatus on client updates
tests/unit/
├── entitlementRepository.test.ts                # Unit tests for entitlement initialization & quota tracking
├── sandboxQuota.test.tsx                        # Unit tests for 3-card sandbox ceiling & conversion gate
├── upgradePaywallModal.test.tsx                 # Unit tests for paywall modal triggers & escape listener
├── apiAuthScrapeJob.test.ts                     # Unit tests for serverless Bearer token verification & 401/429
└── extensionAuthSync.test.ts                    # Unit tests for auth bridge & token refresh
```

---

## Deliverables Status
- [x] `research.md`: Phase 0 Completed
- [x] `data-model.md`: Phase 1 Completed
- [x] `quickstart.md`: Phase 1 Completed
- [x] `plan.md`: Phase 1 Completed
