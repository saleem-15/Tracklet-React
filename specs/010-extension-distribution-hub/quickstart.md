# Quickstart & Verification Guide: In-App Extension Distribution & Update Hub

**Feature Branch**: `feat/extension-distribution-hub`  
**Date**: 2026-10-08  
**Spec**: [spec.md](./spec.md)

---

## Prerequisites

- Node.js 20+ installed
- Chromium-based browser (Google Chrome, Microsoft Edge, Brave, or Arc)
- Tracklet development server running (`npm run dev`)

---

## Scenario 1: Extension Packaging & Static Asset Verification

1. Run the extension packaging script:
   ```bash
   node scripts/package-extension.js
   ```
2. **Verify output**:
   - `public/tracklet-extension.zip` is created.
   - Archive contains `manifest.json`, `popup.html`, `popup.js`, `content.js`, `background.js`, `icons/`.
   - Archive excludes `.git`, `README.md`, or test files.
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. In browser, navigate to `http://localhost:3000/tracklet-extension.zip`.
5. **Expected Outcome**: The browser triggers a direct file download of `tracklet-extension.zip`.

---

## Scenario 2: First-Time User Experience (Uninstalled State)

1. Open Tracklet in a browser profile that has **not** loaded the extension.
2. Observe the TopBar on desktop:
   - Puzzle icon renders with label `"Extension"`.
   - Subtle slate styling without green dot.
3. Click the TopBar `"Extension"` button:
   - `ExtensionModal` opens with default tab `"First-Time Install"`.
   - Steps 1, 2, 3 render with clear visual icons.
4. Click **"Download Extension (.zip)"**:
   - Browser downloads `tracklet-extension.zip`.
5. Click **"Copy chrome://extensions"**:
   - Text is copied to system clipboard.
   - Button renders checkmark: `Copied!`.
6. Press the `Escape` key:
   - Modal dismisses cleanly.

---

## Scenario 3: Extension Connected State (Handshake Verification)

1. Open `chrome://extensions` in the browser.
2. Enable **Developer mode** toggle.
3. Click **Load unpacked** and select the extracted directory containing `manifest.json`.
4. Return to the Tracklet tab (`http://localhost:3000`) and reload.
5. **Expected Outcome**:
   - Within 500ms, the TopBar pill updates to show a solid emerald green indicator: `"Connected (v1.0.0)"`.
   - Clicking the pill opens the modal showing `"Connected & Up to Date"`, active permissions, and keyboard shortcut cheat sheet (`Alt + Shift + A`).

---

## Scenario 4: Update Available State Verification

1. In `src/lib/constants.ts`, temporarily bump `LATEST_EXTENSION_VERSION` to `'1.0.1'`.
2. Reload Tracklet (with the `1.0.0` extension still active).
3. **Expected Outcome**:
   - The TopBar pill turns amber with an animated pulse: `"Update Ready (v1.0.1)"`.
   - Clicking opens the modal with the `"How to Update"` tab active by default.
   - Modal displays: `"Installed: v1.0.0"` $\rightarrow$ `"Latest: v1.0.1"`.
   - Primary button reads: `"Download Update (.zip)"`.
   - Steps clearly guide the user: (1. Replace files in your extension folder, 2. Click the reload 🔄 icon on the Tracklet card in `chrome://extensions`).

---

## Scenario 5: Unit Tests Execution

Run unit tests for version comparison and handshake state logic:
```bash
npm test
```
**Expected Outcome**: All tests pass cleanly with zero errors.
