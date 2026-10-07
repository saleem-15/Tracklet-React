# Quickstart: Tester Issue & Feedback Reporting

**Branch**: `feat/tester-issue-reporting` | **Feature**: `009-tester-issue-reporting` | **Date**: 2026-10-07

## Overview

Walkthrough guide to validate the tester issue reporting feature end-to-end across UI, diagnostic capture, screenshot attachment, Firestore persistence, and GitHub Issues generation.

---

## 1. Prerequisites & Environment Setup

1. **Working Tree**: `D:\Programming\Tracklet-tester-issue-reporting` on branch `feat/tester-issue-reporting`.
2. **Dependencies**: Run `npm install` to ensure all dependencies are resolved.
3. **GitHub Issue Creation Options**:
   - **Local Dev Server (`npm run dev`)**: Add `GITHUB_TOKEN="ghp_..."` (or fine-grained PAT) to `.env.local`. The Vite dev server will intercept `/api/report-issue` and automatically create the issue in `saleem-15/Tracklet-React`.
   - **Vercel Production Deployment**: Add `GITHUB_TOKEN` and `GITHUB_REPO` to Vercel Environment Variables. The serverless function `/api/report-issue` will handle creation.
   - **No Token (Fallback Mode)**: If no token is provided, the report is saved to Firestore/local cache, and a 1-click pre-filled GitHub Issue link is displayed on the receipt.

---

## 2. Validation Scenarios

### Scenario 1: Launch Reporter & Inspect Auto-Captured Diagnostics
1. Start development server: `npm run dev`
2. Open Tracklet at `http://localhost:5173/`
3. Navigate to **Settings** (`/?tab=settings`) $\rightarrow$ scroll to the new **Help & Feedback** card.
4. Click **"Report an Issue / Give Feedback"**.
5. **Expected**:
   - The `TesterReportModal` opens with focus on the Title input.
   - The modal footer displays an expandable **"System Diagnostics"** accordion.
   - Expand the accordion: verify that browser name, OS, current route (`/settings`), viewport, and auth status are accurately captured without manual entry.

---

### Scenario 2: Visual Evidence via Clipboard Paste (`Ctrl + V`)
1. Press `Win + Shift + S` (Mac: `Cmd + Shift + 4`) to copy any screenshot to your clipboard.
2. In the open `TesterReportModal`, click inside the modal and press **`Ctrl + V`** (or drag an image into the dropzone).
3. **Expected**:
   - The screenshot is immediately recognized and rendered as an interactive thumbnail preview.
   - File size (e.g. `124 KB`) and image format are indicated.
   - Hovering over the thumbnail reveals an "Enlarge" icon and a subtle "Remove" button.
   - Clicking the thumbnail opens a full-screen image overlay to verify readability.

---

### Scenario 3: Submit Bug Report & Verify Confirmation Receipt
1. Set Category to **"Bug Report"** using the `CustomSelectDropdown`.
2. Set Severity to **"High"**.
3. Enter Title: `"Kanban card disappears after drag-and-drop"`.
4. Enter Description: `"Dragged an application card from Applied to Screening and it vanished from view until browser reload."`.
5. Click **"Submit Report"**.
6. **Expected**:
   - The submit button transitions to a loading state with spinner ("Submitting report...").
   - A success confirmation receipt appears with a tracking ID (e.g. `TRK-BUG-101`).
   - A global green snackbar toast is dispatched: `"Report #101 received! Thank you for testing."`.
   - The modal closes cleanly and restores focus to the triggering element.

---

### Scenario 4: Offline / Disconnected Network Resilience
1. In Chrome DevTools, toggle **Network** to **"Offline"**.
2. Open the reporter modal, type a report description, and click "Submit Report".
3. **Expected**:
   - Submission fails gracefully with an inline banner: *"Unable to send report. Please check your connection."*
   - **Zero Data Loss**: Title, description, and attached screenshot remain intact.
   - A "Retry" button appears to allow immediate resubmission once the network is restored.

---

### Scenario 5: Sidebar Footer & Global Hotkey Entry
1. Navigate to the **Active Pipeline** tab (`/?tab=pipeline`).
2. Verify the **Sidebar** contains a "Report Issue" action in the footer utility section.
3. Click it: verify the modal opens with active tab diagnosed as `"pipeline"`.
4. Close the modal, then press `?` (when not focused on any text input).
5. Verify the modal opens via the keyboard shortcut.

---

## 3. Automated Verification Commands

Run these automated verification steps to ensure code health:

```bash
# 1. Run unit test suite
npm test

# 2. Type check
npx tsc --noEmit

# 3. Production build
npm run build
```
