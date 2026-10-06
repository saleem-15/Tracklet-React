# Quickstart & Verification Guide: Extension Side Panel Redesign, Contact Clipper & Autofill Readiness

**Feature Directory**: `specs/008-extension-companion-redesign`  
**Date**: 2026-10-05  
**Spec Reference**: [`spec.md`](./spec.md)

---

## 1. Prerequisites & Installation

1. **Verify Web App Build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
2. **Load Unpacked Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions`.
   - Enable **Developer mode** toggle (top right).
   - Click **Load unpacked** and select the `d:/Programming/Tracklet/extension` directory.
   - Click the Extension puzzle piece in the Chrome toolbar and pin **Tracklet**.

---

## 2. End-to-End Test Scenarios

### Scenario 1: Chrome Side Panel Docking & Persistence
- **Action**: Click the Tracklet extension toolbar icon or press `Alt + Shift + A` (Mac: `Option + Shift + A`).
- **Expected Outcome**:
  - The Tracklet companion opens docked on the right side of the browser window as a persistent Side Panel.
  - Clicking on the main webpage does NOT close the side panel.
  - The side panel maintains an exact width of ~400px and renders with `Outfit` headers and Tracklet Command Blue styling.

### Scenario 2: Contextual Auto-Switching & Tab Draft Memory
- **Action**:
  1. Open a new tab and go to any job posting (e.g. `https://jobs.lever.co/...`). Observe the companion auto-selects `[📥 Job]`.
  2. Type some custom text in the Job Notes editor (e.g., "Discussed in tech meetup").
  3. In the browser, navigate to a LinkedIn profile (`https://www.linkedin.com/in/...`).
- **Expected Outcome**:
  - The companion automatically navigates to the `[👤 Contact]` tab with the person's name and role extracted.
  - Switch back to the previous tab: your custom notes in the Job tab remain completely intact in session memory.

### Scenario 3: LinkedIn Contact Clipper with Category Smart-Default
- **Action**:
  1. Open a LinkedIn profile with the headline "Senior Technical Recruiter at Figma".
  2. In the side panel's `[👤 Contact]` tab, inspect the pre-filled fields.
- **Expected Outcome**:
  - Full Name, Role ("Senior Technical Recruiter"), Organization ("Figma"), and LinkedIn URL are extracted.
  - The category pill is automatically smart-defaulted to **`Recruiter`**.
  - Click "Save Contact to Tracklet". A success receipt appears and the contact is created in Contacts Hub.
  - Re-inspecting the same profile shows the serene badge `"✓ Saved in Contacts Hub"`.

### Scenario 4: Recruiter Micro-Card on Job Posts (Bundle-on-Save)
- **Action**:
  1. Open a LinkedIn job posting that shows "Job poster: John Doe · Talent Partner".
  2. View the `[📥 Job]` tab in the side panel.
- **Expected Outcome**:
  - A Recruiter Micro-Card appears below the role details showing John Doe's details.
  - Checkbox `"Add John Doe as contact in Contacts Hub and link to this application"` is checked.
  - Click "Save Application". Both the application and the contact are created and mutually linked.

### Scenario 5: Autofill Hub & Interactive Checklist with Scroll-to-Field
- **Action**:
  1. Navigate to a live Greenhouse or Lever application page.
  2. Open the `[⚡ Autofill]` tab. Observe the status pill displays `⚡ Greenhouse Form Detected`.
  3. Click "⚡ Auto-Fill Application".
- **Expected Outcome**:
  - Standard fields (First Name, Last Name, Email, Phone, LinkedIn) are populated on the host page.
  - The side panel renders an itemized checklist of populated fields.
  - Click on the `Phone` item in the checklist: the host page smoothly scrolls to the phone input, sets focus, and briefly highlights it with an accent outline for 1.5s.
  - The form is NOT automatically submitted.

### Scenario 6: Tailored CV File Upload & Linking
- **Action**:
  1. In the `[📥 Job]` tab, drag and drop a tailored resume file `My_Custom_Resume.pdf` into the CV dropzone.
  2. Save the application.
- **Expected Outcome**:
  - An attachment chip displays `📎 My_Custom_Resume.pdf`.
  - The file payload is persisted in IndexedDB and linked to the application record with instant preview/download availability.
