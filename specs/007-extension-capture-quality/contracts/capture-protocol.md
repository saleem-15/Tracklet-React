# Contract: Extension Capture Protocol & Messaging

This document defines the message contracts, runtime boundaries, and payload schemas for data extraction, saving, and web-app synchronization.

---

## 1. Internal Extension Message: `EXTRACT_PAGE_DATA`

Sent from `popup.js` or `background.js` to `content.js` via `chrome.tabs.sendMessage`.

### Request
```typescript
interface ExtractPageDataRequest {
  action: 'EXTRACT_PAGE_DATA';
}
```

### Response
```typescript
interface ExtractPageDataResponse {
  isWebmail: boolean;
  role: string;
  company: string;
  platform: JobPlatform;
  jobLink: string;
  companyDomain?: string;      // Root domain of hiring company, NEVER a job board or ATS
  logoUrl?: string;            // Resolved durable logo URL (if available)
  location?: string;           // Formatted location string e.g. "Berlin, Germany"
  workLocation?: 'Remote' | 'Hybrid' | 'Onsite';
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  notes?: string;              // Highlighted text or ~300 character description summary
  suggestedStage: 'Saved' | 'Applied';
  contact?: {
    name: string;
    role?: string;
    organization?: string;
    linkedIn?: string;
    email?: string;
    category: 'Recruiter' | 'Hiring Manager';
  };
  pageTitle: string;
}
```

---

## 2. Extension Message: `SAVE_APPLICATION`

Sent from `popup.js` to `background.js` via `chrome.runtime.sendMessage` to persist the clipped job and optional hiring contact (single-owner pattern from Spec 006 R8).

### Request
```typescript
interface SaveApplicationRequest {
  action: 'SAVE_APPLICATION';
  payload: {
    id?: string;               // Optional client-generated ID
    company: string;
    role: string;
    platform: JobPlatform;
    dateApplied: string;       // YYYY-MM-DD
    status: 'Saved' | 'Applied'; // Or existing stage if read-only
    jobLink: string;
    notes?: string;
    companyDomain?: string;    // Sanitized company domain
    logoUrl?: string;
    location?: string;
    workLocation?: 'Remote' | 'Hybrid' | 'Onsite';
    employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
    contactIds?: string[];
  };
  contactPayload?: {
    name: string;
    role?: string;
    organization?: string;
    category: 'Recruiter' | 'Hiring Manager';
    linkedIn?: string;
    email?: string;
  };
  isUpdate?: boolean;          // True if modifying an existing application
  existingAppId?: string;
}
```

### Response
```typescript
interface SaveApplicationResponse {
  success: boolean;
  persistedToCloud: boolean;   // True if written to Firestore REST, false if queued on device
  application: Application;
  createdContact?: Contact;
  error?: string;
}
```

---

## 3. Web App Synchronization: `TRACKLET_EXT_ADD_APPLICATION`

Dispatched via `window.postMessage` from `content.js` to the Tracklet tab to optimistically update active React state.

### Message Shape
```typescript
interface WebAppIncomingAppMessage {
  type: 'TRACKLET_EXT_ADD_APPLICATION';
  payload: Application;
  persistedToCloud: boolean;
  contact?: Contact;
}
```

### Constraints & Security
- Target origin MUST be `window.location.origin` (strictly matching official Tracklet domain, never `'*'`).
- Recipient MUST check `event.source === window` and `isTrackletOrigin()`.

---

## 4. Web App Display Sanitizer Contract (`src/lib/logoUtils.ts`)

Pure utility contract used across all Tracklet table rows, kanban cards, and detail panels:

```typescript
/**
 * Safely extracts the domain of the company, automatically discarding any
 * stored values that match known job boards or ATS systems.
 */
function getCompanyDomain(
  companyName: string,
  jobLink?: string,
  customDomain?: string
): string;

/**
 * Returns prioritized logo URLs, automatically discarding customLogoUrl if
 * it references a job board, ATS, or temporary CDN.
 */
function getCompanyLogoUrls(
  companyName: string,
  jobLink?: string,
  customLogoUrl?: string,
  customDomain?: string
): string[];
```
