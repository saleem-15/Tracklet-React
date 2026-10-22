# Quickstart Verification Guide: SaaS Auth Unification, Guest Mode Sunset & API Hardening

**Branch**: `013-saas-auth-guest-sunset`  
**Date**: 2026-10-22  
**Spec Reference**: [spec.md](./spec.md)

---

## Prerequisites
- Modern browser (Chrome / Edge / Firefox)
- Node.js 20+
- Web app running locally (`npm run dev`) or deployed on Vercel
- Extension loaded unpacked in Chrome (`chrome://extensions`) pointing to `/extension`

---

## Test Flow 1: Capped Sandbox Preview & Conversion Wall

1. Open `http://localhost:3000` in a new Chrome Incognito window.
2. Verify you enter the app in **Sandbox Mode**:
   - The top workspace banner states: *"Sandbox Preview: Tracking locally (up to 3 applications). Create a free account to unlock cloud sync, Chrome Extension capture, and 20 active applications."*
3. Click "Add Application" and add:
   - Card 1: `Acme Corp` · `Frontend Engineer` · `Applied`
   - Card 2: `Beta Labs` · `Fullstack Developer` · `Interview`
   - Card 3: `Gamma Tech` · `UI Engineer` · `Saved`
4. Attempt to add a 4th card (e.g. click "Add Application" or quick-add):
   - **Expected Result**: The action is blocked. The Account Conversion / Sign-Up modal appears stating: *"You've reached the 3-application sandbox preview limit. Create a free account to keep tracking."*
5. Attempt to use CSV Import:
   - **Expected Result**: Blocked with an informational upgrade gate.

---

## Test Flow 2: Seamless Cloud Migration

1. From the conversion modal, complete registration (or click "Sign In" and enter valid test credentials).
2. Once authenticated:
   - **Expected Result**:
     - The Sandbox Banner disappears.
     - All 3 applications (`Acme Corp`, `Beta Labs`, `Gamma Tech`) are automatically batch-persisted to Firestore at `/users/{userId}/applications`.
     - `localStorage.getItem('tracklet_guest_apps_v1')` is cleared.
     - A success toast appears: *"Workspace Migrated: 3 applications synced to your cloud account."*
     - The user entitlement document is created at `/users/{userId}` with `planTier: 'free'`.

---

## Test Flow 3: Legacy Guest Migration & Grandfathered Pipeline

1. In DevTools console, seed legacy guest records:
   ```javascript
   const sampleApps = Array.from({ length: 24 }, (_, i) => ({
     id: `legacy-${i + 1}`,
     company: `Legacy Company ${i + 1}`,
     role: 'Software Engineer',
     status: i < 22 ? 'Applied' : 'Rejected',
     dateApplied: '2026-10-01',
     platform: 'LinkedIn',
     stageUpdatedAt: new Date().toISOString(),
     createdAt: new Date().toISOString(),
     updatedAt: new Date().toISOString()
   }));
   localStorage.setItem('tracklet_guest_apps_v1', JSON.stringify(sampleApps));
   location.reload();
   ```
2. Verify the **Legacy Guest Migration Modal** opens on load.
3. Click **"Import 24 Items to Cloud Account"** and log in or register.
4. **Expected Result**:
   - All 24 applications are preserved in Firestore.
   - The user has 22 active applications (>20 limit).
   - The pipeline toolbar displays: `22 / 20 Active (Grandfathered)`.
   - Existing cards are fully editable.
   - Attempting to click "Add Application" displays the `<UpgradePaywallModal />` explaining that active applications must drop below 20 before adding new ones.
   - Move 3 cards from `Applied` to `Rejected`. Quota updates to `19 / 20 Active`.
   - User can now add 1 new active card.

---

## Test Flow 4: Chrome Extension Auth Synchronization

1. In Chrome, load unpacked extension from `./extension`.
2. Open extension popup without signing in to Tracklet:
   - **Expected Result**: Popup shows *"Sign in to Tracklet to sync jobs directly to your cloud pipeline."* with a disabled "Save Job" button.
3. Click "Sign in to Tracklet" — web app opens to `/login?source=extension`.
4. Sign in to Tracklet web app.
5. Re-open extension popup:
   - **Expected Result**: Popup immediately reflects authenticated state, showing user email, `Free Tier`, and active card count.
6. Open any job posting on Greenhouse or Lever. Click "Save Application":
   - **Expected Result**: Card writes directly to Firestore `/users/{userId}/applications`. Check web app pipeline — card appears in real time.

---

## Test Flow 5: Serverless API Hardening & Token Verification

1. Test unauthenticated call:
   ```bash
   curl -X POST http://localhost:3000/api/scrape-job \
     -H "Content-Type: application/json" \
     -d '{"pageText":"Software Engineer at Acme","pageUrl":"https://acme.com/job"}'
   ```
   - **Expected Result**: HTTP `401 Unauthorized` `{ "error": "Unauthorized" }`.
2. Test unauthenticated issue report:
   ```bash
   curl -X POST http://localhost:3000/api/report-issue \
     -H "Content-Type: application/json" \
     -d '{"title":"Bug","description":"broken"}'
   ```
   - **Expected Result**: HTTP `401 Unauthorized`.
3. Test authenticated call with valid Firebase Bearer token:
   - **Expected Result**: Scrape succeeds; monthly quota increments.

---

## Test Flow 6: Quota Display & ADR 0010 Compliance

1. Inspect the top global navigation header tabs (`All`, `Pipeline`, `Contacts`, `Stats`, `Settings`).
   - **Expected Result**: Tabs are completely free of raw numerical inventory badges (`X / 20`).
2. Switch to `Pipeline` view.
   - **Expected Result**: Quota meter is placed contextually in the Pipeline toolbar (`X / 20 Active`).
3. Switch to `Settings` view.
   - **Expected Result**: Account settings card shows subscription tier (`Free Plan`) and active usage breakdown.
