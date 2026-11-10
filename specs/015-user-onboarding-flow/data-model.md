# Phase 1: Data Model & TypeScript Contracts

**Feature**: `015-user-onboarding-flow`  
**Date**: 2026-10-25

---

## 1. Type Definitions (`src/types.ts`)

```typescript
// --- Onboarding Types ---
export type OnboardingIntent = 'migrator' | 'hunter' | 'explorer';

export interface UserOnboardingState {
  completed: boolean;
  completedAt?: string | null; // ISO 8601 string e.g. "2026-10-25T14:35:10.000Z"
  dismissed: boolean;
  dismissedAt?: string | null;
  intent?: OnboardingIntent | null;
  lastStepViewed?: number;
}

// Update UserEntitlementProfile in src/types.ts:
export interface UserEntitlementProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  stripeCustomerId?: string | null;
  quotas: UserQuotas;
  onboarding?: UserOnboardingState; // Added field
  createdAt: string;
  updatedAt: string;
}
```

---

## 2. Global Navigation Context Extension (`src/context/NavigationContext.tsx`)

```typescript
export interface NavigationContextType {
  // Existing dialog states...
  isAddModalOpen: boolean;
  isFeedbackModalOpen: boolean;
  isExtensionModalOpen: boolean;
  // Added Onboarding dialog states:
  isOnboardingModalOpen: boolean;
  openOnboardingModal: (initialStep?: number) => void;
  closeOnboardingModal: (markDismissed?: boolean) => void;
  onboardingInitialStep: number;
}
```

---

## 3. Storage Persistence Constants (`src/lib/constants.ts`)

```typescript
export const LOCAL_STORAGE_KEYS = {
  // Existing keys...
  ONBOARDING_COMPLETED_PREFIX: 'tracklet_onboarding_completed_',
  ONBOARDING_SUPPRESSED_SESSION_PREFIX: 'tracklet_onboarding_suppressed_',
};
```

---

## 4. Telemetry Schema (`src/lib/posthog.ts`)

| Event Name | Properties | Description |
| :--- | :--- | :--- |
| `onboarding_opened` | `{ trigger: 'auto' \| 'manual', totalApps: number }` | Fired when the onboarding modal is presented |
| `onboarding_intent_selected` | `{ intent: 'migrator' \| 'hunter' \| 'explorer' }` | Fired when user selects an intent path in Step 1 |
| `onboarding_step_viewed` | `{ stepIndex: number, stepName: string, intent?: string }` | Fired when navigating between steps |
| `onboarding_action_taken` | `{ action: 'download_ext' \| 'import_file' \| 'seed_demo' \| 'blank_canvas' }` | Fired on action button click in Step 2 |
| `onboarding_completed` | `{ intent?: string, durationSeconds: number }` | Fired when completing Step 3 / "Get Started" |
| `onboarding_dismissed` | `{ stepIndex: number, intent?: string }` | Fired on "Skip for now" or close/Escape |
