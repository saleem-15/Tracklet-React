# Quickstart Verification Guide: Settings Hub Redesign (015-settings-hub-redesign)

This guide provides step-by-step verification procedures to validate the implementation of Spec 015.

---

## 1. Local Environment Setup

1. Verify dependencies and worktree status:
   ```bash
   git status
   ```
2. Start the local Vite development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

---

## 2. Verification Checklist

### Test Case 1: Split-Pane Master-Detail Navigation
- [ ] Open Settings by clicking the **Settings** item in the sidebar.
- [ ] On a desktop screen ($\ge 1024\text{px}$), confirm the left vertical sub-navigation rail displays all 5 panes:
  1. `Account & Profile`
  2. `Subscription & Billing`
  3. `Workflow & Alerts`
  4. `Browser Extension`
  5. `Data & Governance`
- [ ] Click each pane item. Confirm that pane switching is instantaneous (<16ms) with zero layout jump or scroll resets.
- [ ] Resize the browser window to $<1024\text{px}$ (tablet) and $<640\text{px}$ (mobile). Confirm the navigation smoothly adapts to a horizontally scrollable segmented pill bar with $44\times 44\text{px}$ touch targets.
- [ ] Test deep linking: navigate to `http://localhost:5173/?tab=settings&section=billing` in a new tab. Confirm the Subscription & Billing pane is automatically focused.

### Test Case 2: Subscription & Entitlement Meters
- [ ] Navigate to the **Subscription & Billing** pane.
- [ ] Verify that all 4 SaaS entitlement dimensions are displayed with semantic progress bars:
  - Active Applications (Max 20 Free / Unlimited Pro)
  - AI Scrapes (Max 20/mo Free / Unlimited Pro)
  - 1-Click ATS Form Autofills (Max 5/mo Free / Unlimited Pro)
  - Cloud Resumes Stored (1 Base Free / Unlimited Pro)
- [ ] Verify the plan cards display Tracklet Pro Monthly (`$12/month`) and Job Hunt Pass (`$29/3 months`).
- [ ] Click "Manage Billing in Stripe" (if Pro) and confirm it opens the Stripe portal in a new tab.

### Test Case 3: Candidate Profile & Chrome Extension Parity
- [ ] Navigate to the **Account & Profile** pane.
- [ ] Fill in the Candidate Job Hunt Target fields:
  - Target Job Titles: `Staff Frontend Engineer, UI Architect`
  - Minimum Base Salary: `160000` USD
  - Work Authorization: `US Citizen`
- [ ] Click "Save Profile". Confirm an immediate green confirmation toast appears.
- [ ] Refresh the browser tab. Confirm that all profile data reloads accurately from Cloud Firestore.
- [ ] Open the Chrome Extension popup: verify the candidate profile fields reflect the values saved on the web app.

### Test Case 4: Workflow & Expiry Preferences (Cloud Persistence)
- [ ] Navigate to the **Workflow & Alerts** pane.
- [ ] Toggle the "Soon to Expire Notification Indicator" switch.
- [ ] Confirm the switch thumb transitions smoothly to **Command Blue (`bg-blue-600`)** when active (not amber!).
- [ ] Select the `72h (3 days)` preset button.
- [ ] Confirm an immediate receipt toast appears: *"Expiry alert window set to 72 hours"*.
- [ ] Open an incognito browser window or log in on another device: confirm the setting loads as `72h` directly from Cloud Firestore.

### Test Case 5: Data Portability & Safety Covenants
- [ ] Navigate to the **Data & Governance** pane.
- [ ] Click "Download JSON Backup". Confirm a complete 1:1 JSON file downloads immediately.
- [ ] Click "Export Jobs (CSV)". Confirm the applications CSV file downloads cleanly.
- [ ] Click "Export Contacts (CSV)". Confirm the contacts directory CSV downloads cleanly.
- [ ] Click "Reload Sample Demo Data". Confirm an explicit confirmation modal appears before executing the reset.
- [ ] In the Danger Zone, hover over "Delete Account". Confirm the button rests in calm slate and transitions cleanly to rose on hover.

---

## 3. Automated Quality Verification Gates

Run the verification commands:
```bash
# Typecheck
npx tsc --noEmit

# Unit tests
npm test

# Production build
npm run build
```
Confirm all pass with **zero errors**.
