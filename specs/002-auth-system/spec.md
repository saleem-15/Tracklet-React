# Feature Specification: Production Authentication & Strict Email Verification

**Feature Branch**: `002-auth-system`  
**Created**: 2026-08-16  
**Status**: Ready for Implementation Planning  
**Input**: "the user cant get to the system if not verified !!. and make sure that if he closes the website and opens it again the website does not get him unless he verifies the email"

---

## Overview

Tracklet requires a production-grade authentication architecture featuring a dedicated `AuthRepository`, an `AuthContext` with a `useAuth()` hook, multi-provider authentication (Google OAuth & Email/Password), and a **Strict Email Verification Gate**. For Email/Password accounts, unverified users are strictly blocked from accessing the workspace and cloud data until their email address is verified. This verification barrier persists across tab reloads, browser restarts, and subsequent logins.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Strict Email Verification Gate for Registration & Login (Priority: P1)

When a user creates an account with Email/Password or logs in with an unverified email, they are immediately placed in a blocking **Email Verification Screen**. They cannot view the dashboard, access applications, or interact with the system until they verify their email. If they close the browser and revisit the site, the system re-checks verification and keeps them locked out until verified.

**Why this priority**: Core security guard ensuring verified identities, preventing spam/fake accounts, and enforcing account integrity before data access.

**Independent Test**: Register with an email address, verify that the dashboard is blocked by the Email Verification Gate, reload the page (or open in a fresh tab), confirm the gate persists, click the verification link in email, click "I've Verified My Email", and confirm the dashboard unlocks.

**Acceptance Scenarios**:
1. **Given** a user registers with Email & Password, **When** account creation succeeds, **Then** `sendEmailVerification` is dispatched and the user is placed on a dedicated **Email Verification Gate Screen** showing their email, a "Resend Verification Email" button, an "I've Verified My Email" check button, and a "Sign Out" button.
2. **Given** an unverified user closes and re-opens the website (or refreshes), **When** Firebase auth resolves on startup, **Then** `AuthRepository.reloadUser()` checks verification status; if still unverified, the verification gate is rendered and workspace data remains inaccessible.
3. **Given** an unverified user who clicks the link in their email, **When** they return to Tracklet and click "I've Verified My Email" (or reload), **Then** `emailVerified` evaluates to `true`, the gate unlocks, and the user enters the workspace.
4. **Given** a user signing in with Google OAuth, **When** login succeeds, **Then** because Google accounts are inherently email-verified (`emailVerified: true`), they bypass the verification gate and enter directly.

---

### User Story 2 - Explicit Guest-to-Account Data Migration (Priority: P1)

When a guest user with existing local storage applications registers or signs in, once their identity is fully verified, Tracklet prompts whether to import local guest applications to their cloud account or start fresh.

**Why this priority**: Prevents silent data loss when transitioning from guest exploration to an authenticated cloud account.

**Independent Test**: Add 2 applications in guest mode, sign up, verify email, confirm the Migration Modal appears only after email verification is complete, click "Import to Account", and verify applications exist in Firestore.

**Acceptance Scenarios**:
1. **Given** a guest session with local applications, **When** the user logs in and passes email verification, **Then** a `GuestMigrationModal` prompts: *"We found X applications from your guest session. Would you like to import them to your account?"*
2. **Given** the user selects "Import to Account", **When** migration completes, **Then** local applications are saved to Firestore under their UID and guest localStorage is cleared.
3. **Given** the user selects "Discard & Start Fresh", **When** confirmed, **Then** guest storage is cleared and a clean account loads.

---

### User Story 3 - First-Time Onboarding Without Mock Data Pollution (Priority: P2)

When a new user completes email verification with zero cloud applications, Tracklet renders a clean empty state with an onboarding call-to-action rather than automatically injecting 20 fake demo jobs into their real production database.

**Why this priority**: Production job seekers should have a clean personal pipeline. Sample demo data (Acme Corp, Stripe, Figma) must only be loaded if explicitly requested in Settings.

**Independent Test**: Register and verify a brand-new account, confirm 0 applications exist on the board, and verify "Reload Sample Demo Data" in Settings functions on demand.

**Acceptance Scenarios**:
1. **Given** a newly verified user with 0 cloud applications, **When** entering the workspace, **Then** the board displays a clean empty state with "Log Your First Application".
2. **Given** a user wishing to test features with demo data, **When** clicking "Reload Sample Demo Data" in Settings, **Then** sample applications are loaded on demand.

---

### User Story 4 - User Profile, Account Management & GDPR Purge (Priority: P2)

Users have self-service access to account credentials, verified status badges, password reset, data export, and GDPR-compliant account & data deletion.

**Why this priority**: Essential for privacy compliance, security, and account lifecycle control.

**Independent Test**: Navigate to Settings > Account, verify account details are displayed with a "Verified" badge, click "Delete Account & Data", type "DELETE", and confirm all Firestore documents and the auth account are permanently removed.

**Acceptance Scenarios**:
1. **Given** an authenticated user in Settings, **When** viewing the Account section, **Then** they see their email, "Verified Email" badge, auth provider (Google/Password), and account actions.
2. **Given** a user requesting account deletion, **When** confirming with "DELETE", **Then** `ApplicationRepository.purgeUserData(userId)` deletes all user applications and history records, `AuthRepository.deleteAccount()` removes the auth user, and the session returns to guest mode.

---

## Edge Cases

- **User Refreshes While Unverified**: The system automatically calls `reloadUser()`. If still unverified, the `EmailVerificationGate` remains active and blocks the dashboard.
- **User Closes Tab and Reopens Later**: Firebase Auth restores the session, reloads the user token; if `emailVerified` is `false`, the verification gate immediately intercepts and prevents access to any application views.
- **Resend Cooldown**: Prevent email spamming by enforcing a 60-second cooldown timer on the "Resend Verification Email" button.
- **Google OAuth Login**: Google accounts provide verified emails (`emailVerified === true`), bypassing the verification gate automatically.
- **User Decides to Switch Email / Sign Out**: The verification gate provides a prominent "Sign Out / Use Different Account" button so users are never trapped.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST encapsulate all Firebase Auth SDK calls inside a dedicated `AuthRepository` (`src/lib/authRepository.ts`).
- **FR-002**: System MUST provide an `AuthContext` (`src/context/AuthContext.tsx`) and `useAuth()` hook that exposes auth state, user metadata, and auth action handlers.
- **FR-003**: System MUST render an accessible `AuthModal` (`src/components/AuthModal.tsx`) supporting Google OAuth, Email/Password sign in, Email/Password registration, and Password Reset.
- **FR-004**: System MUST automatically dispatch an email verification link (`sendEmailVerification`) upon Email/Password registration.
- **FR-005**: System MUST strictly block unverified Email/Password users from entering the application workspace by rendering a dedicated, persistent **Email Verification Gate** (`src/components/EmailVerificationGate.tsx`).
- **FR-006**: System MUST persist the Email Verification Gate across page refreshes, tab closures, and browser restarts until the user's `emailVerified` is confirmed `true` via `AuthRepository.reloadUser()`.
- **FR-007**: The Email Verification Gate MUST provide:
  - Clear notification of the destination email address
  - An **"I've Verified My Email"** check button that reloads the user's auth token
  - A **"Resend Verification Email"** action with rate-limiting / cooldown feedback
  - A **"Sign Out"** button to return to guest mode or change credentials
- **FR-008**: System MUST NOT automatically inject sample demo data into newly created authenticated accounts.
- **FR-009**: System MUST check for existing guest applications upon verified login and present an explicit `GuestMigrationModal` allowing the user to either import guest data or discard it.
- **FR-010**: System MUST centralize all Firestore read, write, batch, and delete operations within `ApplicationRepository` (`src/lib/applicationRepository.ts`), removing duplicated raw Firestore calls from `App.tsx`.
- **FR-011**: System MUST provide an Account Management section in `SettingsView` displaying user info, verified email status, and a GDPR-compliant account & data purge flow.
- **FR-012**: System MUST map all Firebase Auth error codes to friendly, actionable user messages via `src/lib/authErrors.ts`.

---

## Key Entities

- **AuthUser**: Cleaned abstraction over Firebase `User`:
  ```typescript
  export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    providerId: 'google.com' | 'password' | string;
    emailVerified: boolean;
    creationTime?: string;
    lastSignInTime?: string;
  }
  ```
- **GuestMigrationPayload**: Structure containing pending local guest applications to migrate.

---

## Success Criteria *(mandatory)*

- **SC-001**: Unverified users CANNOT access the dashboard or Firestore data under any circumstances (including refreshing the page or restarting the browser).
- **SC-002**: Zero TypeScript errors (`npx tsc --noEmit`) and successful production build (`npm run build`).
- **SC-003**: 100% of Firebase Auth interactions route through `AuthRepository`, and 100% of Firestore operations route through `ApplicationRepository`.
- **SC-004**: Clicking "I've Verified My Email" instantly verifies token status and unlocks the workspace once the email link is clicked.
- **SC-005**: 100% of auth error codes display user-friendly toast messages with zero uncaught console exceptions.
