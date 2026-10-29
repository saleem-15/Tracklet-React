# Data Model & Schema Contracts: Settings Hub Redesign (015-settings-hub-redesign)

**Feature**: Settings Hub Redesign  
**Date**: 2026-10-28  
**Scope**: Firestore Collections, TypeScript Interfaces, Security Rules, Local Cache Keys

---

## 1. Cloud Firestore Schemas

All persistent user configuration MUST be scoped under `users/{userId}/...` in compliance with ADR 0003 and Constitution Principle I.

### 1.1 User Preferences (`users/{userId}/preferences/settings`)

Document Path: `users/{userId}/preferences/settings`

```json
{
  "expirySettings": {
    "enabled": true,
    "expiryThresholdHours": 48
  },
  "pipelinePreferences": {
    "defaultClipStage": "Saved",
    "stalenessThresholdDays": 14,
    "autoArchiveGhostedDays": 45
  },
  "uiPreferences": {
    "tableRowDensity": "dense",
    "soundEffectsEnabled": false,
    "toastDurationSeconds": 4
  },
  "updatedAt": "2026-10-28T14:00:00.000Z"
}
```

### 1.2 Candidate Job Hunt Target (`users/{userId}/profile/candidate`)

Document Path: `users/{userId}/profile/candidate`

```json
{
  "fullName": "Alex Rivera",
  "targetTitles": [
    "Staff Frontend Engineer",
    "Lead UI Architect"
  ],
  "salaryTarget": {
    "minimumBase": 165000,
    "targetOTE": 195000,
    "currency": "USD"
  },
  "targetLocations": [
    "Remote - US",
    "San Francisco, CA",
    "New York, NY"
  ],
  "workAuthorization": "US Citizen (No Sponsorship Required)",
  "links": {
    "linkedInUrl": "https://linkedin.com/in/alexrivera",
    "githubUrl": "https://github.com/alexrivera",
    "portfolioUrl": "https://alexrivera.work"
  },
  "defaultResumeId": "res_cloud_01j8k9m...",
  "updatedAt": "2026-10-28T14:00:00.000Z"
}
```

---

## 2. TypeScript Interfaces (`src/types.ts`)

```typescript
export type SettingsPaneId = 
  | 'account'      // Account & Candidate Profile
  | 'billing'      // Subscription & Billing
  | 'workflow'     // Workflow & Alerts
  | 'extension'    // Browser Extension
  | 'governance';  // Data & Privacy Governance

export interface ExpiryNotificationSettings {
  enabled: boolean;
  expiryThresholdHours: number; // default: 48
}

export interface PipelinePreferences {
  defaultClipStage: 'Saved' | 'Applied';
  stalenessThresholdDays: number; // default: 14
  autoArchiveGhostedDays?: number; // default: 45
}

export interface SalaryTarget {
  minimumBase?: number;
  targetOTE?: number;
  currency: string;
}

export interface CandidateProfile {
  fullName?: string;
  targetTitles: string[];
  salaryTarget?: SalaryTarget;
  targetLocations: string[];
  workAuthorization?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  defaultResumeId?: string;
  updatedAt?: string;
}

export interface UserPreferences {
  expirySettings: ExpiryNotificationSettings;
  pipelinePreferences: PipelinePreferences;
  uiPreferences?: {
    tableRowDensity?: 'dense' | 'roomy';
    soundEffectsEnabled?: boolean;
    toastDurationSeconds?: number;
  };
  updatedAt: string;
}

export type PlanTier = 'free' | 'pro';

export type CommercialPlanType = 
  | 'free'
  | 'pro_monthly'         // $12/mo
  | 'pro_job_hunt_pass';   // $29/3mo

export interface QuotaDimension {
  used: number;
  limit: number | 'unlimited';
  label: string;
  unit: string;
  renewalDate?: string;
}

export interface SaasEntitlementSummary {
  planTier: PlanTier;
  planType: CommercialPlanType;
  isActive: boolean;
  currentPeriodEnd?: string | null;
  stripeCustomerId?: string | null;
  quotas: {
    activeApplications: QuotaDimension;
    monthlyScrapes: QuotaDimension;
    monthlyAutofills: QuotaDimension;
    cloudResumes: QuotaDimension;
  };
}
```

---

## 3. Firestore Security Rules Update (`firestore.rules`)

```javascript
// Rule updates in firestore.rules under match /users/{userId}
match /preferences/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

match /profile/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## 4. Local Storage Scoping Key Contracts

To prevent cross-user account collisions on shared workstations:

```typescript
export const getScopedLocalStorageKey = (userId: string | undefined, key: string): string => {
  if (!userId) return `tracklet_guest_${key}`;
  return `tracklet_u_${userId}_${key}`;
};
```
