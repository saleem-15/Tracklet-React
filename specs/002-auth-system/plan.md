# Implementation Plan: Production Authentication & Strict Email Verification Gate

**Branch**: `002-auth-system` | **Date**: 2026-08-16 | **Spec**: [specs/002-auth-system/spec.md](file:///d:/Programming/Tracklet/specs/002-auth-system/spec.md)

---

## Summary

Implement a production-grade authentication and account management system for Tracklet featuring a dedicated `AuthRepository` (`src/lib/authRepository.ts`), `AuthContext`, multi-provider authentication (Google OAuth & Email/Password), and a **Strict Blocking Email Verification Gate** (`src/components/EmailVerificationGate.tsx`). Unverified Email/Password users are strictly blocked from accessing the system across reloads and tab closes until verified.

---

## Technical Context

**Language/Version**: TypeScript 5.7+ / React 19  
**Primary Dependencies**: `firebase` (Auth & Firestore v11), `lucide-react`, `tailwindcss` v4  
**Storage**: Firebase Authentication + Cloud Firestore (`applications` collection, `/history` sub-collection) with `localStorage` guest fallback  
**Testing & Verification**: TypeScript compiler (`npx tsc --noEmit`), Vite production bundler (`npm run build`), manual validation flow in `quickstart.md`  
**Target Platform**: Modern Desktop & Mobile Web Browsers  
**Project Type**: React Single-Page Application (SPA)  
**Constraints**:
- **Strict Verification Gate**: Unverified Email/Password users MUST be blocked by `EmailVerificationGate` across page reloads and browser restarts until verified.
- **Repository Pattern**: All Firebase Auth SDK calls MUST reside in `AuthRepository` (`src/lib/authRepository.ts`). All Firestore persistence MUST reside in `ApplicationRepository` (`src/lib/applicationRepository.ts`).
- **Clean Slate**: New accounts start with 0 applications and a clean onboarding banner instead of auto-injected demo data.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Rule | Compliance Status | Rationale |
|------------------|-------------------|-----------|
| **Repository Pattern** | ✅ PASS | `AuthRepository` created for all Auth SDK calls; `ApplicationRepository` for Firestore persistence. |
| **Strict Email Verification Guard** | ✅ PASS | `EmailVerificationGate` strictly blocks unverified sessions and handles reloads cleanly. |
| **Single Source of Truth for Constants** | ✅ PASS | Shared storage keys and auth status tokens stored in `src/lib/constants.ts`. |
| **Component Size Limits (<300 lines)** | ✅ PASS | `AuthModal`, `EmailVerificationGate`, `GuestMigrationModal`, and `AccountSettingsCard` modularized into sub-components. |
| **WCAG AA Compliance** | ✅ PASS | All text contrast conforms to Tracklet design tokens (`text-slate-500` min on white). |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-auth-system/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Technical research & architectural decisions
├── data-model.md        # Entities, schemas & state transitions
├── contracts/           # TypeScript interface contracts
│   ├── auth-repository-contract.md
│   ├── auth-context-contract.md
│   └── repository-contract.md
└── quickstart.md        # Verification and test guide
```

### Source Code Organization

```text
src/
├── context/
│   └── AuthContext.tsx              # [NEW] React Context for Firebase Auth, verification checking & AuthModal
├── components/
│   ├── AuthModal.tsx                # [NEW] Modal for Google & Email/Password Sign-in/Sign-up/Reset
│   ├── EmailVerificationGate.tsx    # [NEW] Blocking screen for unverified users with reload & resend actions
│   ├── GuestMigrationModal.tsx      # [NEW] Dialog prompting verified user to import or discard guest data
│   ├── AccountSettingsCard.tsx      # [NEW] Profile info, verification badge, and GDPR account purge
│   ├── SettingsView.tsx             # [MODIFY] Embed AccountSettingsCard
│   ├── Sidebar.tsx                  # [MODIFY] Connect to useAuth() & open AuthModal
│   └── OnboardingEmptyState.tsx     # [NEW] Clean empty state for fresh accounts with "Load Demo Data" CTA
├── lib/
│   ├── firebase.ts                  # [MODIFY] Export initialized auth & db instances
│   ├── authRepository.ts            # [NEW] Dedicated repository for all Firebase Auth operations
│   ├── applicationRepository.ts     # [MODIFY] Remove auto-seeding on new account, add purgeUserData
│   ├── constants.ts                 # [MODIFY] Add auth storage keys
│   └── authErrors.ts                # [NEW] Firebase auth error code to friendly message mapper
├── types.ts                         # [MODIFY] Add AuthUser and AuthModal types
└── App.tsx                          # [MODIFY] Wrap with AuthProvider, add EmailVerificationGate guard
```

---

## Phases & Deliverables

### Phase 0: Research & Architecture (Completed)
- Resolved strict verification gate architecture, repository pattern, and migration flow in `research.md`.

### Phase 1: Design & Contracts (Completed)
- Defined `data-model.md`, `contracts/auth-repository-contract.md`, `contracts/auth-context-contract.md`, `contracts/repository-contract.md`, and `quickstart.md`.

### Phase 2: Implementation (Tasks)
1. **Foundation & Types**:
   - Update `src/types.ts` with `AuthUser`, `AuthViewMode`.
   - Implement `src/lib/authRepository.ts` encapsulating all Firebase Auth SDK methods (`signInWithPopup`, `signInWithEmail`, `signUpWithEmail`, `sendEmailVerification`, `reloadUser`, `sendPasswordReset`, `signOut`, `deleteAccount`).
   - Create `src/lib/authErrors.ts` for friendly error messages.
2. **Context & Persistence Layer**:
   - Implement `src/context/AuthContext.tsx` with verification reloading and token state management.
   - Refactor `src/lib/applicationRepository.ts` to stop auto-seeding mock data on login and add `purgeUserData`.
3. **UI Components**:
   - Build `src/components/EmailVerificationGate.tsx` (Strict blocking screen for unverified users).
   - Build `src/components/AuthModal.tsx` (Google, Email sign-in, registration, password reset).
   - Build `src/components/GuestMigrationModal.tsx` (Merge guest apps to account or discard).
   - Build `src/components/AccountSettingsCard.tsx` (User details, verification status, GDPR account delete).
   - Build `src/components/OnboardingEmptyState.tsx` (Clean first-time user experience).
4. **Integration & Refactoring in `App.tsx`**:
   - Wrap root in `<AuthProvider>`.
   - Place `EmailVerificationGate` as a blocking guard whenever `user && !user.emailVerified`.
   - Replace raw Firestore queries with `ApplicationRepository`.
   - Connect `Sidebar.tsx` to `AuthModal`.
5. **Verification**:
   - Validate with `npx tsc --noEmit` and `npm run build`.
   - Run through all scenarios in `quickstart.md`.
