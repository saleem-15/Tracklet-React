# Quickstart & Verification Guide: Strict Email Verification & Authentication

**Feature Branch**: `002-auth-system`  
**Date**: 2026-08-16  

---

## 1. Prerequisites

- Development server running on `http://localhost:5173` (`npm run dev`).
- Firebase Auth and Firestore configured via `.env.local` or active configuration.

---

## 2. Validation Scenarios

### Scenario A: Strict Email Verification Gate on Registration
1. In an incognito window, click **"Sign In"** > **"Create Account"**.
2. Register with a test email: `unverified-user@example.com` + password.
3. Click **"Create Account"**.
4. **Expected**:
   - Verification email is sent automatically.
   - The user is **strictly blocked** by the `EmailVerificationGate` screen.
   - The dashboard/sidebar is NOT rendered.
   - Screen displays: *"Verify Your Email Address"*, user's email, "Resend Verification Email", "I've Verified My Email", and "Sign Out".

### Scenario B: Verification Gate Persistence on Reload / Browser Close
1. While on the `EmailVerificationGate` screen, reload the page (or close the tab and re-open `http://localhost:5173`).
2. **Expected**:
   - On startup, the system reloads the user state and sees `emailVerified: false`.
   - The user remains **strictly blocked** on the `EmailVerificationGate` screen.
   - The workspace cannot be accessed.

### Scenario C: Unlocking the Gate Upon Email Verification
1. Click the verification link in the received email (or mark as verified in Firebase Console for testing).
2. On Tracklet, click **"I've Verified My Email"** (or refresh the page).
3. **Expected**:
   - `reloadUser()` confirms `emailVerified === true`.
   - The gate unlocks immediately.
   - The user enters the workspace.

### Scenario D: Google OAuth Instant Verification
1. Click **"Sign In with Google"** and complete OAuth.
2. **Expected**:
   - Because Google accounts are verified by default, the user immediately enters the workspace without hitting the gate.

### Scenario E: Guest Session to Cloud Account Migration
1. Log out to return to Guest mode. Add 2 jobs in guest mode.
2. Sign in with a verified account.
3. **Expected**:
   - `GuestMigrationModal` prompts to import or discard guest jobs.

---

## 3. Automated Integrity Checks

```powershell
# 1. Type check
npx tsc --noEmit

# 2. Production build verification
npm run build
```
