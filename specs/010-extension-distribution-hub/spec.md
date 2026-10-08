# Feature Specification: In-App Chrome Extension Distribution & Update Hub

**Feature Branch**: `feat/extension-distribution-hub`

**Created**: 2026-10-08

**Status**: Draft (Ready for Plan Execution)

**Input**: User description: "Right now, the extension, when the user wants to download it, he has to go to the README on the repo itself on GitHub and then press download on the button. There is a download button there. Now, it's not the best UI/UX. I want to make it practical. Right now, I can't pay money to the extension store, the $5 fee. I want a button or a way inside the Tracklet web app itself so the user can update the extension itself. Give me ways or suggestions on how to do it."

---

## Clarifications & Design Decisions

### Session 2026-10-08

- **Q1: Where should the downloadable extension zip file be hosted?**
  - **Decision**: **Dual-Source Hybrid Hosting (Self-Hosted in Web App `public/` + GitHub Releases Fallback)**.
  - **Rationale**: 
    1. Packaging `extension/` directly into `public/tracklet-extension.zip` during the build/deploy cycle ensures zero third-party dependencies, instant same-origin browser downloads, and 100% availability even if GitHub is unreachable or rate-limited.
    2. A secondary link directly targets `https://github.com/saleem-15/Tracklet-React/releases/latest/download/tracklet-extension.zip` for standalone or release-specific downloads without showing users repository code or issue lists.

- **Q2: How does the Tracklet web app detect whether the user has the extension installed and what version is running?**
  - **Decision**: **Bi-Directional `postMessage` Handshake via Existing Content Script Bridge**.
  - **Rationale**: `extension/content.js` already runs on Tracklet origins (`isTrackletOrigin()`). 
    1. On app load, `src/lib/extensionSync.ts` emits `TRACKLET_EXT_PING`.
    2. `extension/content.js` intercepts it and returns `TRACKLET_EXT_PONG` with `chrome.runtime.getManifest().version`.
    3. If no pong is received within 500ms, the web app marks the status as **Not Installed**.
    4. If the reported version is lower than the web app's bundled version, status updates to **Update Available**.
    5. If equal or higher, status updates to **Connected & Up-to-date**.

- **Q3: Where should the UI entry points live in Tracklet?**
  - **Decision**: **Dual Placement — TopBar Dynamic Status Pill + Settings Dedicated Extension Card**.
  - **Rationale**:
    1. **TopBar Action Pill (`src/components/TopBar.tsx`)**: High visibility without being intrusive. Shows a puzzle icon with status-aware states (Gray "Get Extension", Green "Connected v1.0.0", Amber "Update Ready v1.0.1"). Clicking opens the `ExtensionModal`.
    2. **Settings Hub Card (`src/components/SettingsView.tsx`)**: Permanent home alongside Account, Templates, and Feedback with complete installation walkthrough, keyboard shortcut references, and diagnostic status.

- **Q4: How should users open `chrome://extensions` given browser security restrictions?**
  - **Decision**: **1-Click Clipboard Copy with Clear Visual Action Prompt**.
  - **Rationale**: Chromium-based browsers block web pages from directly linking to or opening `chrome://*` URLs via standard `<a href="...">` or `window.open()`. The UI provides a 1-click **"Copy `chrome://extensions`"** button with an instant green check confirmation and clear guidance: *"Paste into a new browser tab to view installed extensions."*

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 1-Click In-App Extension Download & First-Time Setup (Priority: P1)

As a Tracklet user who wants to clip job postings and recruiter contacts while browsing LinkedIn and job boards, I want to download and install the companion browser extension directly from the Tracklet web app without visiting GitHub, searching through source code, or leaving the application.

**Why this priority**: Without a clean download and installation path inside the web app, non-technical users abandon the extension, missing Tracklet's core differentiator (cross-tab job and contact clipping).

**Independent Test**: Can be tested by opening the web app without the extension installed, clicking the "Get Extension" button in the TopBar or Settings, verifying the 1-click download of `tracklet-extension.zip`, and following the 3-step setup guide.

**Acceptance Scenarios**:

1. **Given** a user without the extension installed, **When** they look at the TopBar, **Then** they see a subtle puzzle button labeled "Extension" with an uninstalled status indicator.
2. **Given** the user clicks the "Extension" button, **When** the `ExtensionModal` opens, **Then** they see a primary action button "Download Extension (.zip)" and a clear, sequential 3-step guide:
   - Step 1: Download & extract the `.zip` archive.
   - Step 2: Open `chrome://extensions` (with a 1-click Copy Address button).
   - Step 3: Enable Developer mode and click "Load unpacked".
3. **Given** the user clicks "Download Extension (.zip)", **When** the action triggers, **Then** the browser immediately downloads `tracklet-extension.zip` without opening external GitHub pages.

---

### User Story 2 - Real-Time In-App Extension Detection & Version Handshake (Priority: P1)

As a user who has loaded the Tracklet companion extension, I want the web app to automatically detect that the extension is active and display its connected status, so I have immediate confidence that application sync, contact clipping, and autofill bridges are working.

**Why this priority**: Users need instant feedback confirming that their unpacked extension was installed correctly and is successfully communicating with their web account.

**Independent Test**: Can be tested by loading the unpacked extension in Chrome, refreshing Tracklet, and verifying that the TopBar pill immediately transitions from "Get Extension" to "Connected (v1.0.0)" with a green badge.

**Acceptance Scenarios**:

1. **Given** the user has installed the extension and loads Tracklet, **When** the page initializes, **Then** the web app sends a ping and receives a pong with the active version string within 500ms.
2. **Given** a successful handshake, **When** the user inspects the TopBar or opens the `ExtensionModal`, **Then** the status displays as "Connected & Up to Date (v1.0.0)" with a solid green indicator dot.
3. **Given** the user is logged into Tracklet, **When** the extension is active, **Then** the modal confirms that authentication sync and clipboard bridges are linked.

---

### User Story 3 - Effortless In-App Update Alert & Guided Reload (Priority: P2)

As an active user of the Tracklet extension, when a new extension version is published with bug fixes or new features, I want Tracklet to inform me that an update is available and give me a 1-click download of the updated zip with clear instructions on how to reload the extension in Chrome.

**Why this priority**: Since unpacked extensions cannot auto-update via the Chrome Web Store, the web app must serve as the update coordinator to prevent users from getting stuck on buggy or deprecated versions.

**Independent Test**: Can be tested by simulating an older installed extension version (e.g. `0.9.0` vs latest `1.0.0`) and verifying that the TopBar displays an amber "Update Available" badge, clicking it opens the modal with the "Download Update" button and 2-step reload instructions.

**Acceptance Scenarios**:

1. **Given** the user's installed extension reports version `0.9.0` while the web app knows the latest version is `1.0.0`, **When** Tracklet loads, **Then** the TopBar displays an amber badge: "Update Ready (v1.0.0)".
2. **Given** the user opens the `ExtensionModal` during an update state, **When** they view the modal, **Then** the modal highlights:
   - "Current: v0.9.0" $\rightarrow$ "Latest: v1.0.0"
   - A primary "Download Update (.zip)" button
   - An "Update Instructions" step card: (1. Replace files in your extension folder, 2. Click the reload 🔄 icon on the Tracklet card in `chrome://extensions`).
3. **Given** the user completes the reload in Chrome and returns to Tracklet, **When** the handshake re-executes, **Then** the badge turns green ("Connected v1.0.0") and an optional toast confirms: *"Tracklet Extension updated to v1.0.0!"*

---

### User Story 4 - Companion Side Panel Update Banner (Priority: P3)

As a user browsing LinkedIn or a job board with the Tracklet Side Panel open, I want the side panel itself to alert me if an update is available, with a link to open Tracklet to download the update.

**Why this priority**: Users who primarily interact with the extension side panel without frequently checking the web app should not miss critical scraper or ATS selector updates.

**Independent Test**: Can be tested by opening the extension side panel when an update is available, verifying the presence of a slim, dismissible update alert banner, and clicking it to open or switch to Tracklet.

**Acceptance Scenarios**:

1. **Given** the extension companion detects that a newer version exists, **When** the side panel is opened, **Then** a slim banner appears at the top: *"✨ Tracklet update v1.0.1 is available. [Update Now]"*.
2. **Given** the user clicks "[Update Now]", **When** clicked, **Then** the active Tracklet tab is focused (or a new tab is opened) with the `ExtensionModal` opened.

---

### Edge Cases

- **Chrome URL Navigation Block**: Web browsers prohibit scripting `window.open('chrome://extensions')`. The UI must NOT attempt a dead link; instead, it provides a 1-click "Copy `chrome://extensions`" button with clear instructions.
- **Mobile / Unsupported Devices**: Mobile browsers (iOS Safari, Android Chrome) do not support desktop Chromium extensions. On mobile screens (`sm:hidden`), the TopBar pill is gracefully hidden, and Settings shows a clear notice: *"Tracklet Companion is supported on desktop Chromium browsers (Chrome, Edge, Brave, Arc)."*
- **Local Developer Override**: If a developer is running a custom branch where the installed extension version is higher than or equal to the web app constant, it renders as "Connected (Developer Build)" rather than triggering a false update alert.
- **Network Failure During Download**: If the bundled zip fails to download, the modal falls back to triggering the direct GitHub Release asset download URL.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a build-time script or packaging process (`npm run package:ext`) that generates `public/tracklet-extension.zip` containing all production extension files without test artifacts or git metadata.
- **FR-002**: System MUST host `tracklet-extension.zip` as a static public asset accessible via `/tracklet-extension.zip` on all deployed environments.
- **FR-003**: System MUST execute a version handshake on web app mount using `window.postMessage` (`TRACKLET_EXT_PING` $\rightarrow$ `TRACKLET_EXT_PONG`) to detect extension presence and active manifest version.
- **FR-004**: System MUST maintain single source of truth for the latest extension version in `src/lib/constants.ts` (`LATEST_EXTENSION_VERSION`).
- **FR-005**: System MUST render an accessible `ExtensionModal` accessible from both the `TopBar` and `SettingsView`.
- **FR-006**: The `ExtensionModal` MUST dynamically adapt its content based on connection state:
  - State A (Not Installed): Setup guide, feature benefits, 1-click download button.
  - State B (Installed & Current): Active version badge, synced status, shortcut cheat sheet, reload/re-download link.
  - State C (Update Available): Version diff (`vOld` $\rightarrow$ `vNew`), "Download Update" button, 2-step replacement guide.
- **FR-007**: System MUST provide a 1-click copy button for `chrome://extensions` with visual feedback (`Copied!`).
- **FR-008**: System MUST support keyboard dismissal (`Escape` key) and background click dismissal for `ExtensionModal` compliant with `AGENTS.md`.
- **FR-009**: Extension content script (`extension/content.js`) MUST respond to `TRACKLET_EXT_PING` with its installed version and extension ID.
- **FR-010**: Extension companion side panel (`popup.js` / `popup.html`) MUST display a non-intrusive update alert banner when `installedVersion < latestRemoteVersion`.

---

### Key Entities

- **ExtensionHandshakeState**:
  - `status`: `'checking' | 'not_installed' | 'connected' | 'update_available'`
  - `installedVersion`: string or null (e.g., `'1.0.0'`)
  - `latestVersion`: string (e.g., `'1.0.1'`)
  - `lastChecked`: number (timestamp)
- **ExtensionDistributionConfig**:
  - `downloadUrl`: string (default `/tracklet-extension.zip`)
  - `githubReleaseUrl`: string (direct asset fallback URL)
  - `latestVersion`: string

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can download the extension zip file with a single click in <1 second directly from the web app, with zero visits to GitHub.
- **SC-002**: First-time installation from download to active side panel connection takes <45 seconds following the in-app 3-step guide.
- **SC-003**: Web app extension detection handshake completes in <500ms on page load without slowing down initial page render or Lighthouse score.
- **SC-004**: When an extension update is published, 100% of active extension users on the web app receive an instant, non-blocking visual alert indicating the new version.

---

## Assumptions

- Users install the extension in desktop Chromium-based browsers (Google Chrome, Microsoft Edge, Brave, Opera, Arc) supporting Manifest V3 and Developer Mode.
- Direct Chromium API constraints (inability to programmatically install unpacked extensions without Developer Mode) remain as established by Google Chrome security policy.
- The web app is deployed on standard static web hosts (Vercel, Firebase Hosting) where files in `public/` are served with proper `application/zip` MIME types.
