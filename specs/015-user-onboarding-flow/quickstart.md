# Quickstart & Verification Guide: Onboarding Flow

**Feature**: `015-user-onboarding-flow`  
**Date**: 2026-10-25

---

## Manual Verification Steps

### Scenario 1: New Verified User Auto-Trigger
1. Launch Tracklet in an incognito window (`npm run dev`).
2. Register a new user account (or use Google Auth).
3. If using email/password, verify email so `EmailVerificationGate` clears.
4. Verify that `OnboardingModal` opens automatically with Step 1 ("Where are you starting your search today?").
5. Press `Escape` or click "Skip for now".
6. Verify the modal dismisses smoothly and lands on `ActivePipelineBoard`.
7. Reload the page; verify the modal does **not** re-appear.

### Scenario 2: Intent Path - Migrator (CSV/JSON Ingestion)
1. Open the Onboarding Modal (click "Welcome Tour" in the sidebar footer).
2. Click **"I have an existing spreadsheet or backup"**.
3. In Step 2, drop a `.json` backup file.
4. Verify the snapshot confirmation appears with the application count.
5. Alternatively, drop a `.csv` file; verify `ImportCSVModal` launches with column mapping.
6. Verify reassurance copy regarding 100% data export in Settings.

### Scenario 3: Intent Path - Job Hunter (Chrome Extension Reactivity)
1. In Step 1, click **"I'm browsing jobs right now"**.
2. If the extension is not installed:
   * Verify the "Download Extension" button triggers download of `tracklet-extension.zip`.
   * Open `chrome://extensions` in developer mode, drag the unpacked folder.
   * Switch focus back to Tracklet.
   * Verify the UI updates immediately to a green badge: **"Companion Connected (v...)"**.
3. Verify the shortcut tip (`Alt+S` / `Cmd+Shift+S`) and browser toolbar pinning advice.

### Scenario 4: Empty Board Quick-Start Hub
1. From an empty pipeline, inspect the canvas.
2. Verify the 4 actionable quick-start cards are displayed:
   - 🌟 **Take the Tour** (re-opens `OnboardingModal`).
   - ➕ **Add First Job** (opens `AddApplicationModal`).
   - 🪄 **Load Demo Roles** (seeds realistic sample roles).
   - 📥 **Import File** (opens `ImportCSVModal`).
3. Click "Load Demo Roles"; verify 3 cards populate the pipeline and the empty state clears.

### Scenario 5: Mobile Drawer & Permanent Access
1. Switch browser to a mobile viewport (< 768px).
2. Open the mobile menu drawer.
3. Tap **"Getting Started Tour"** in the footer.
4. Verify the mobile menu drawer closes automatically before the Onboarding Modal appears.
5. Verify the modal is properly sized, scrollable, and dismissable on small screens.
