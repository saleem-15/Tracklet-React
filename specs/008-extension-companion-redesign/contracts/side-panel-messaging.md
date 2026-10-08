# Interface Contract: Side Panel Messaging Protocol

**Feature Directory**: `specs/008-extension-companion-redesign`  
**Date**: 2026-10-05  
**Spec Reference**: [`spec.md`](../spec.md)

---

## Overview

This contract governs asynchronous message passing via `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage` between the **Side Panel Companion Controller** (`sidepanel.js`), the **Background Service Worker** (`background.js`), and the **Active Tab Content Script** (`content.js`).

---

## 1. Message Definitions

### A. Active Page Data Extraction (`GET_PAGE_DATA`)
Sent by the Side Panel controller to `content.js` when mounting or when the active tab switches.

**Request:**
```typescript
interface GetPageDataRequest {
  action: 'GET_PAGE_DATA';
}
```

**Response:**
```typescript
interface GetPageDataResponse {
  success: boolean;
  pageType: 'job_posting' | 'linkedin_profile' | 'webmail' | 'ats_form' | 'unknown';
  jobData?: {
    company: string;
    role: string;
    location?: string;
    workLocation?: 'Remote' | 'Hybrid' | 'Onsite';
    employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
    companyDomain?: string;
    platform: string;
    jobLink: string;
    notes?: string;
    recruiter?: {
      name: string;
      role?: string;
      profileUrl?: string;
    };
  };
  profileData?: {
    fullName: string;
    headline?: string;
    organization?: string;
    location?: string;
    linkedInUrl: string;
    suggestedCategory: 'Recruiter' | 'Hiring Manager' | 'Mentor' | 'Referral' | 'Other';
  };
  emailData?: {
    subject: string;
    senderName?: string;
    senderEmail?: string;
    recipientName?: string;
    recipientEmail?: string;
    direction: 'inbound' | 'outbound';
    date: string;
    time?: string;
    snippet: string;
    emailUrl: string;
  };
}
```

---

### B. ATS Form Detection & Field Mapping (`DETECT_ATS_FORM`)
Sent by the Side Panel Autofill Hub to determine if the active page contains a compatible application form.

**Request:**
```typescript
interface DetectAtsFormRequest {
  action: 'DETECT_ATS_FORM';
}
```

**Response:**
```typescript
interface DetectAtsFormResponse {
  success: boolean;
  result: {
    ats: 'greenhouse' | 'lever' | 'workday' | 'generic' | null;
    confidence: number;
    formElementFound: boolean;
    formSelector: string;
    fieldsMatched: Array<{
      candidateKey: string;
      targetSelector: string;
      fieldType: 'text' | 'email' | 'tel' | 'url' | 'select' | 'file';
      label: string;
      confidence: number;
    }>;
    unmatchedFields: string[];
  };
}
```

---

### C. Execute Form Autofill (`EXECUTE_AUTOFILL`)
Sent by the Side Panel to `content.js` to populate matched inputs with candidate profile values.

**Request:**
```typescript
interface ExecuteAutofillRequest {
  action: 'EXECUTE_AUTOFILL';
  profile: CandidateProfile;
}
```

**Response:**
```typescript
interface ExecuteAutofillResponse {
  success: boolean;
  fieldsPopulatedCount: number;
  populatedFields: Array<{
    candidateKey: string;
    targetSelector: string;
    label: string;
    valueSnippet: string;
  }>;
  manualFieldsRequired: Array<{
    field: string;
    reason: 'file_attachment' | 'custom_question' | 'captcha';
    selector?: string;
  }>;
}
```

---

### D. Scroll to Field & Transient Highlight (`SCROLL_TO_FIELD`)
Sent by the Side Panel when the user clicks an item in the autofill checklist.

**Request:**
```typescript
interface ScrollToFieldRequest {
  action: 'SCROLL_TO_FIELD';
  targetSelector: string;
}
```

**Execution Behavior in `content.js`:**
1. Finds `element = document.querySelector(targetSelector)`.
2. Calls `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
3. Calls `element.focus()`.
4. Adds a CSS class `.tracklet-transient-highlight` (e.g. `outline: 2px solid #2563eb; outline-offset: 2px; transition: outline 0.3s ease;`).
5. Removes the highlight class after `1500ms`.

**Response:**
```typescript
interface ScrollToFieldResponse {
  success: boolean;
  scrolled: boolean;
}
```

---

### E. Broadcast Save to Web App Tabs (`BROADCAST_SAVE`)
Sent by the Side Panel via `chrome.runtime.sendMessage` to `background.js`, which relays the update to open Tracklet tabs via `window.postMessage`.

**Payload:**
```typescript
interface BroadcastSavePayload {
  action: 'BROADCAST_SAVE';
  entityType: 'application' | 'contact' | 'email';
  entityId: string;
  summary: {
    title: string;
    subtitle: string;
    stage?: string;
  };
}
```

---

### F. Real-Time In-Page Context Changed (`PAGE_CONTEXT_CHANGED` & `ACTIVE_TAB_UPDATED`)
Sent by `content.js` or `background.js` to notify the Side Panel that the user navigated to a different job card, email thread, or profile within an SPA.

**Payload:**
```typescript
interface PageContextChangedPayload {
  action: 'PAGE_CONTEXT_CHANGED' | 'ACTIVE_TAB_UPDATED';
  payload: {
    tabId?: number;
    url: string;
    title?: string;
    source: 'pushState' | 'replaceState' | 'hashchange' | 'popstate' | 'webmail_thread_mutation' | 'tab_url_updated';
  };
}
```

**Side Panel Handling Behavior:**
1. Verifies that the message matches the currently active observed tab.
2. Checks whether the newly focused page is a recognized entity (Job, Email, Contact).
3. If it is an exit or generic page (e.g. Inbox list view, Google search), **retains the last viewed item on screen**.
4. If it is a new valid item, **cleanly discards unsubmitted edits**, triggers unified extraction (`GET_PAGE_DATA`), evaluates duplicate state, and updates the view with a smooth 150ms subtle transition.
5. Strictly performs ZERO background saves to database or storage queues.

