# ADR 0002: In-App Password Reset & Split Authentication Views

## Status
Accepted

## Date
2026-08-17

## Context
Previously, Tracklet used a single unified authentication screen with inline tabs (`SegmentedTabs`) and a prominent 5-column marketing hero panel on the left. Additionally, password reset links dispatched by Firebase Authentication redirected users to Firebase's default generic hosted action page (`/__/auth/action`), creating a disjointed user experience detached from Tracklet's visual identity and design system.

Key issues identified:
1. **Visual Clutter & Landing Page Redundancy**: The marketing hero panel took up significant screen real estate on an internal authentication barrier.
2. **Ambiguous UX on Password Reset**: When requesting a reset link, an in-place alert banner rendered above the existing form rather than transitioning to a focused confirmation state.
3. **Generic External UI**: Firebase's default password reset action page bypasses Tracklet's design tokens, typography (`Outfit` / `Plus Jakarta Sans`), and validation standards.
4. **Environment Constraints**: The Firebase Console global email template editor strictly rejects unencrypted `http://localhost` URLs, complicating local development and staging environments.

## Decision
1. **Split Authentication Views**:
   - Decomposed the auth screen into dedicated, modular view components:
     - `LoginView.tsx` (`/login`, `/signin`)
     - `SignupView.tsx` (`/signup`, `/register`)
     - `ForgotPasswordView.tsx` (`/forgot-password`)
     - `ResetPasswordView.tsx` (`/reset-password`)
   - Eliminated the left marketing hero section in favor of a centered, cardless layout constrained to `max-w-[380px]` floating cleanly on the canvas.
   - Incorporated `motion/react` (`AnimatePresence mode="wait"`) for fluid directional transitions between views without layout shifts.

2. **Custom In-App Password Reset Flow**:
   - Created a dedicated in-app `/reset-password` route consuming `verifyPasswordResetCode(auth, oobCode)` and `confirmPasswordReset(auth, oobCode, newPassword)` via `AuthRepository`.
   - Configured custom action URLs to point directly to the application host, allowing users to enter and confirm their new password in Tracklet's branded UI.
   - Handled token lifecycle states: loading validation, expired/invalid link state with quick re-request action, and success confirmation.

3. **Field-Level Validation & Accessibility**:
   - Extracted reusable `AuthTextField` component with custom error states (`border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-rose-500/20`), password visibility toggles, and animated inline error messages.
   - Suppressed native browser speech-bubble tooltips (`noValidate`) across all auth forms.

## Consequences

### Positive
- **Brand Consistency**: End-to-end authentication and credential recovery occurs strictly within Tracklet's executive-grade UI without generic third-party screens.
- **Improved Information Hierarchy**: Focused, cardless design reduces cognitive load and visual fatigue.
- **Maintainable Architecture**: View components adhere to the `<300 lines` guideline and isolate form state from business logic.

### Negative / Trade-offs
- Custom password reset requires ensuring authorized domains are kept up to date in Firebase Console settings (`tracklet-eight.vercel.app`, `localhost`).
