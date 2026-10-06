# Technical Research: Extension Side Panel Redesign, Contact Clipper & Autofill Readiness

**Feature Directory**: `specs/008-extension-companion-redesign`  
**Date**: 2026-10-05  
**Spec Reference**: [`spec.md`](./spec.md)

---

## Executive Summary & Research Decisions

This document details the architectural decisions, Chrome Manifest V3 APIs, interaction models, and data synchronization patterns for redesigning the Tracklet browser extension into a persistent **Chrome Side Panel** with a **LinkedIn Contact Clipper**, **Webmail Companion Parity**, and **Autofill Readiness**.

---

### Research Topics & Decisions Matrix

| Topic | Research Decision | Rationale | Alternatives Evaluated |
|---|---|---|---|
| **R1: Form Factor & Manifest V3** | **Persistent Chrome Side Panel (`chrome.sidePanel`)** | Solves the primary friction of popup extensions (unexpected dismissal on page interaction); stays open across multi-tab browsing sessions. | Popups (too ephemeral, lost state on blur); Injected iframe overlays (causes host page CSS bleeding and z-index wars). |
| **R2: Code Preservation Strategy** | **Modular Refactoring, Zero Rewrite** | Preserves all 13 battle-tested capabilities (`jobBoardRegistry.js`, sync queues, stage safety, offline storage) while wrapping them in side panel views. | Ground-up rewrite (high regression risk, unnecessary rework); Separate extension (fragmented user base). |
| **R3: Contextual Auto-Switching** | **URL-Driven Routing with Draft Preservation** | Detects active tab URL (`linkedin.com/in/*` $\rightarrow$ Contact, webmail $\rightarrow$ Email, job boards $\rightarrow$ Job) while keeping draft text in memory. | Manual-only tab switching (tedious clicking); In-page floating triggers (cluttered host page). |
| **R4: LinkedIn Contact Clipper** | **Semantic DOM Scraper + Category Smart-Default** | Fast, high-accuracy profile extraction without brittle class names; auto-selects `Recruiter` or `Hiring Manager` based on headline keywords. | LinkedIn API (requires enterprise partnership/auth); Full HTML dump (wasteful bandwidth). |
| **R5: Contact Deduplication & Update Gate** | **Diff-Gated Update Button** | Checks Contacts Hub by LinkedIn URL; shows "Update Contact" button *only* when scraped title/company differs from stored data. | Always show update (visual noise); Silent overwrite (risks overwriting user's manual edits). |
| **R6: Recruiter Micro-Card on Job Posts** | **Bundle-on-Save Atomic Linking** | Checkbox in Job tab saves job and recruiter simultaneously with bidirectional IDs (`applicationIds` $\leftrightarrow$ `contactIds`). | Two-step manual clipping (disruptive); Auto-save without opt-in (pollutes Contacts Hub with irrelevant posters). |
| **R7: ATS Form Detection & Field Matching** | **4-Tier Prioritized Selector Engine** | Tiers: 1. ATS specific $\rightarrow$ 2. Standard `autocomplete` $\rightarrow$ 3. Semantic `name`/`id` $\rightarrow$ 4. Label text proximity. Covers Greenhouse, Lever, Workday. | Machine learning models (heavy bundle size); Hardcoded single selectors (breaks on minor ATS layout updates). |
| **R8: Autofill Execution & Feedback** | **Synthetic Event Dispatch + Interactive Checklist** | Dispatches standard `input` and `change` with native value setter overrides; side panel checklist scrolls to & highlights fields on click. | Direct property assignment only (fails in React/Angular); Automatic submission (dangerous, violates user consent). |
| **R9: Tailored CV File Attachment** | **Dropzone Upload + ATS Capture + IndexedDB Payload** | Companion dropzone captures tailored PDF/DOCX; stores metadata (`resumeFileName`, `resumeFileSize`, `resumeUploadedAt`) on Application and file payload in IndexedDB. | Base64 in Firestore (hits 1MB document limit); Raw filesystem path (blocked by browser sandbox). |

---

## Detailed Research Findings

### R1. Chrome Side Panel Architecture (`chrome.sidePanel`)
- **API Availability**: Manifest V3 `chrome.sidePanel` is stable in Chrome 114+, Edge 116+, and Brave.
- **Manifest Permissions**:
  ```json
  "permissions": [
    "sidePanel",
    "tabs",
    "storage",
    "contextMenus",
    "scripting"
  ]
  ```
- **Service Worker Initialization (`background.js`)**:
  ```javascript
  // Open side panel on toolbar icon click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Failed to set side panel behavior:', error));
  ```
- **Dual Compatibility**: `sidepanel.html` and `popup.html` share the exact same CSS and companion controller scripts (`companion.js` / `popup.js`). If a browser environment restricts side panels, the interface functions identically as a popup.

---

### R2. Contextual Auto-Switching & Draft State Preservation
- **Listener Architecture**:
  The side panel controller listens to tab switches:
  ```javascript
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    handleContextualUrl(tab.url);
  });
  ```
- **URL Routing Heuristics**:
  - `mail.google.com` or `outlook.*` $\rightarrow$ switch to tab `'email'`
  - `linkedin.com/in/*` $\rightarrow$ switch to tab `'contact'`
  - `boards.greenhouse.io`, `jobs.lever.co`, `*.myworkdayjobs.com`, or any job posting $\rightarrow$ switch to tab `'job'` (or highlight `'autofill'` if application form detected)
- **Draft Session Memory**:
  Form inputs are bound to an in-memory draft cache object keyed by view mode. Switching between tabs does NOT clear `<input>` or contenteditable values. User text is preserved until explicit submission or clear action.

---

### R3. LinkedIn Profile Scraping & Category Smart-Defaulting
- **Semantic Selector Strategy**:
  LinkedIn regularly modifies hashed CSS classes (e.g. `.artdeco-...`). The scraper relies on semantic document landmarks:
  - **Full Name**: `h1` inside `section[data-member-id]` or profile top-card container.
  - **Headline**: Top-card headline element (`div.text-body-medium` or `.top-card-layout__headline`).
  - **Company**: Experience card current role anchor (`a[href*="/company/"]`) or top-card subtitle.
  - **Location**: Top-card location span.
  - **Profile URL**: Normalized canonical URL (`https://www.linkedin.com/in/{username}`).
- **Category Smart-Default Regex**:
  ```javascript
  function deriveSmartCategory(headline = '') {
    const h = headline.toLowerCase();
    if (/\b(talent|recruiter|recruiting|sourcer|staffing|people\s+partner|headhunter)\b/.test(h)) {
      return 'Recruiter';
    }
    if (/\b(vp|vice\s+president|director|head\s+of|engineering\s+manager|tech\s+lead|cto|founder)\b/.test(h)) {
      return 'Hiring Manager';
    }
    if (/\b(mentor|advisor|coach|consultant)\b/.test(h)) {
      return 'Mentor';
    }
    return 'Recruiter'; // default fallback
  }
  ```

---

### R4. ATS Form Detection & Field Matching Engine
- **Platform Signatures**:
  - **Greenhouse**: `boards.greenhouse.io`, `job-boards.greenhouse.io`, or `#application_form`, `#apply_form`, `form[action*="greenhouse"]`.
  - **Lever**: `jobs.lever.co` or `.application-form`, `form[action*="lever"]`.
  - **Workday**: `*.myworkdayjobs.com` or `div[data-automation-id="applicationComponent"]`.
  - **Generic**: Standard `<form>` containing standard inputs (`first_name`, `email`, `phone`, `resume`).
- **Reactive Framework Value Setter Override**:
  Many ATS forms (Greenhouse, Lever) use React or Angular controlled components. Simply assigning `input.value = "John"` fails because the internal React fiber state is not updated.
  The engine uses the standard native value setter override:
  ```javascript
  function setNativeInputValue(element, value) {
    const prototype = Object.getPrototypeOf(element);
    const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
      || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }
  ```

---

### R5. Tailored CV Attachment & IndexedDB Architecture
- **Problem**: Storing 1–5 MB PDF binaries inside `chrome.storage.local` causes storage quota errors and fails in Firestore (1MB limit).
- **Solution**:
  1. The user uploads/attaches their customized CV file via a dropzone in the side panel or it is captured from the ATS file input.
  2. The file binary is stored locally in an `IndexedDB` object store named `tailored_resumes` keyed by a UUID `resumeBlobId`.
  3. The `Application` record stores lightweight metadata:
     - `resumeFileName`: e.g. `Saleem_Senior_Frontend_Stripe_v2.pdf`
     - `resumeFileSize`: e.g. `148520` (bytes)
     - `resumeBlobId`: e.g. `blob_stripe_20261005_abc123`
     - `resumeUploadedAt`: ISO string timestamp
  4. The extension side panel reads directly from its extension-origin IndexedDB (`tailored_resumes`); the Tracklet web app detail panel must receive the resume bytes (e.g. via postMessage/sync bridging) or use storage it can access before offering preview and download.

---

### R6. Code Preservation Audit
- **Files Reused As-Is / Extended**:
  - `extension/jobBoardRegistry.js`: 100% retained.
  - `extension/background.js`: Retained; added side panel behavior and storage bridge.
  - `extension/content.js`: Retained; extended with LinkedIn profile parser and ATS form detector.
  - `extension/popup.js`: Refactored cleanly into `companionController.js` preserving all sync, offline queue, Markdown parser, and stage validation logic.
  - `extension/popup.css`: Retained; updated with side panel fluid layout and Design System tokens.
