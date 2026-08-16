# Research & Technical Decisions: Strict Email Verification & Authentication

**Feature Branch**: `002-auth-system`  
**Date**: 2026-08-16  

---

## Decision 1: Dedicated AuthRepository vs. Raw Firebase Calls in Context

### Chosen Approach
Create a dedicated `AuthRepository` class in `src/lib/authRepository.ts` adhering strictly to Clean Architecture and the Repository Pattern already established in Tracklet.

### Rationale
- **Single Responsibility**: `AuthRepository` isolates all Firebase Auth SDK method calls (`signInWithPopup`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `sendEmailVerification`, `sendPasswordResetEmail`, `signOut`, `deleteUser`, `reload`, `onAuthStateChanged`).
- **Separation of Concerns**: `AuthContext.tsx` only manages React UI state (active user, emailVerified status, loading spinner, modal visibility) and delegates actual auth SDK calls to `AuthRepository`.
- **Testability**: Allows straightforward unit testing and mocking of auth services without mocking the entire Firebase SDK.

---

## Decision 2: Strict Blocking Email Verification Gate

### Chosen Approach
Enforce a hard blocking guard in `App.tsx` / `AuthContext`:
- If an authenticated user has `user.emailVerified === false`:
  1. The app will **NOT** load Firestore applications.
  2. The app will **NOT** render the dashboard, sidebar, or pipeline boards.
  3. Instead, Tracklet renders a dedicated full-screen or card **`EmailVerificationGate`**.
- On startup / tab reload:
  - `AuthRepository.reloadUser()` is called to fetch the freshest Firebase token from Google servers.
  - If `emailVerified` is still `false`, the gate remains locked.
  - If `emailVerified` has become `true` (user clicked the verification link), the gate immediately unlocks and loads their workspace.
- Inside the Gate:
  - **"I've Verified My Email"**: Triggers `reloadUser()`. If verified, seamlessly transitions into the workspace. If not yet verified, displays a gentle toast reminder.
  - **"Resend Email"**: Triggers `sendEmailVerification()` with a 60-second countdown timer.
  - **"Sign Out"**: Allows the user to exit back to guest mode or log in with another account.

### Rationale
Completely fulfills the user requirement: *"the user cant get to the system if not verified !! and make sure that if he closes the website and opens it again the website does not get him unless he verifies the email"*.

---

## Decision 3: Direct User Mutations (No Unprompted Auto-Sync)

### Chosen Approach
All application CRUD actions (create, update, status change, delete) write directly through `ApplicationRepository`. There are no background auto-sync pollers or unprompted Firestore snapshot listeners overriding state.

---

## Decision 4: Guest-to-Cloud Data Migration Pipeline

### Chosen Approach
Trigger an explicit `GuestMigrationModal` only **after** an authenticated account is confirmed to be email verified.

### Implementation Details:
1. When a verified user session is established, inspect `localStorage.getItem('tracklet_guest_applications')`.
2. If guest applications exist, display `GuestMigrationModal` asking whether to import or discard.
3. On "Import", batch upload via `ApplicationRepository.batchImport` and clear guest storage.

---

## Decision 5: Clean Slate Onboarding (No Fake Data Seeding)

### Chosen Approach
Brand-new accounts start with 0 applications and a clean onboarding hero card. Fake mock applications are never injected automatically into Firestore.
