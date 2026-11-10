# Phase 0: Technical Research & Architectural Decisions

**Feature**: `015-user-onboarding-flow`  
**Date**: 2026-10-25

---

## 1. Trigger Mechanics & Authentication Lifecycle

### Ground Truth Finding
In `src/components/layout/AuthGate.tsx`:
```tsx
if (user && !user.emailVerified) {
  return <EmailVerificationGate user={user} onReloadData={onReloadData} />;
}
```
When a user signs up with email/password, `AuthGate` blocks the application workspace until the email is verified. Google Auth users are verified immediately (`user.emailVerified === true`).

### Decision
The auto-trigger for the Onboarding Guide must be evaluated inside the mounted, verified workspace (`src/components/layout/WorkspaceContent.tsx` or a custom hook `useOnboardingTrigger.ts`), guarded by:
```typescript
const shouldTriggerOnboarding =
  !isLoading &&
  user !== null &&
  user.emailVerified &&
  totalAppCount === 0 &&
  !profile?.onboarding?.completed &&
  !profile?.onboarding?.dismissed &&
  !localStorage.getItem(`tracklet_onboarding_completed_${user.uid}`) &&
  !sessionStorage.getItem(`tracklet_onboarding_suppressed_${user.uid}`);
```
This guarantees:
1. Zero unwanted popups for password signups while on `EmailVerificationGate`.
2. Zero race conditions during initial Firestore entitlement fetching (`!isLoading`).
3. Resilient suppression in incognito or offline modes via dual persistence.

---

## 2. Ingestion Mechanics: Unifying CSV vs. JSON

### Ground Truth Finding
* `src/components/ImportCSVModal.tsx` parses `.csv` files only, performing column mapping to `Application` fields.
* `src/lib/backupJson.ts` exports and restores 1:1 JSON backups via `validateAndParseJSONBackup()`.

### Decision
In Step 2 of the Onboarding Flow (Migrator Intent):
* Render a smart dropzone accepting `.csv` and `.json`.
* If a `.json` file is dropped: validate via `validateAndParseJSONBackup()`. If valid, prompt "Restore complete workspace of N applications" and execute `handleBatchImportApplications()`.
* If a `.csv` file is dropped: close/delegate seamlessly to `ImportCSVModal` with the file preloaded.
* Provide clear secondary guidance: "Don't have a file ready? Skip to next step".

---

## 3. Real-Time Extension Detection

### Ground Truth Finding
`src/hooks/useExtensionStatus.ts` actively detects the Chrome Extension via:
1. DOM attribute markers (`data-tracklet-extension-installed="true"`).
2. Ping/pong window messages (`TRACKLET_EXT_PING` / `TRACKLET_EXT_PONG`).
3. Window `focus` event listener (re-checks whenever the user switches back from Chrome Web Store or `chrome://extensions`).
4. DOM `MutationObserver` on `document.documentElement`.

### Decision
The Extension Onboarding Step will directly consume `useExtensionContext()`.
When `status === 'connected'`:
* Immediately renders a green pill `Companion Connected (v{installedVersion})`.
* Shows the 1-click capture shortcut (`Alt+S` / `Cmd+Shift+S`) and pinning tip.
When `status !== 'connected'`:
* Shows the download button for `tracklet-extension.zip`.
* Shows a 2-step setup summary with a link to open the full `ExtensionModal` for guided unpacking.

---

## 4. UI/UX Hierarchy & Component Decomposition

To adhere to the 300-line limit per component and `.agents/rules/ui-ux-standards.md`:
* `src/components/onboarding/OnboardingModal.tsx` (< 200 lines): Shell, stepper dots, navigation buttons, `useEscapeKey`.
* `src/components/onboarding/steps/IntentSelectionStep.tsx` (< 150 lines): 3 card options (Migrator, Job Hunter, Explorer).
* `src/components/onboarding/steps/IntentActionStep.tsx` (< 220 lines): Contextual action based on intent (Smart Ingestion, Extension Live Guide, or Demo/Blank).
* `src/components/onboarding/steps/CapabilitiesStep.tsx` (< 160 lines): Buried gems (1:1 Export, Slash Command Notes, Velocity Tracking).
* `src/components/OnboardingEmptyState.tsx` (< 180 lines): Upgraded 4-card quickstart grid on the empty pipeline board.

---

## 5. Security & Multi-Tenancy

In `firestore.rules`:
```javascript
match /users/{userId} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId) && request.resource.data.planTier == 'free' && request.resource.data.subscriptionStatus == 'none';
  allow update: if isOwner(userId) && request.resource.data.planTier == resource.data.planTier && request.resource.data.subscriptionStatus == resource.data.subscriptionStatus;
}
```
Because `firestore.rules` allows arbitrary document updates on `users/{userId}` as long as `planTier` and `subscriptionStatus` are untouched, storing `onboarding: UserOnboardingState` does not require relaxing or restructuring security rules.
