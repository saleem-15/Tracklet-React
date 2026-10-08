# Phase 0 Research: In-App Extension Distribution & Update Hub

**Feature Branch**: `feat/extension-distribution-hub`  
**Date**: 2026-10-08  
**Spec**: [spec.md](./spec.md)

---

## 1. Packaging & Distribution Strategy

### Context & Problem
Tracklet Companion is currently distributed via manual GitHub repository navigation. Users have to clone or download the repo and extract the `extension/` subfolder. Without paying the Chrome Web Store $5 registration fee, the extension must be run via Developer Mode ("Load unpacked"). We need a 100% automated, zero-cost, frictionless way to bundle and serve the extension so users can download it with 1 click directly inside the web app.

### Evaluation of Options

| Option | Architecture | Reliability | Dependencies | Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Pure Node.js Cross-Platform Packaging Script** | A zero-dependency script (`scripts/package-extension.js`) executed during build (`npm run package:ext` / `npm run build`) that zips `extension/` into `public/tracklet-extension.zip`. | 100% across Windows, macOS, Linux, and Vercel/Firebase CI. | 0 external npm packages (uses native OS tools or `node:fs` / `node:zlib`). | **SELECTED** |
| **Option B: GitHub Releases API Only** | UI button links directly to GitHub's `releases/latest/download/tracklet-extension.zip`. | 95% (depends on GitHub API rate limits and network availability). | None. | **SECONDARY / FALLBACK** |
| **Option C: Heavy third-party zip libraries (`jszip` / `archiver`)** | Adds 2–5MB dependency footprint to bundle. | High, but adds maintenance and supply-chain overhead. | Additional devDependencies. | **REJECTED** |

### Implementation Decision
- Create `scripts/package-extension.js`:
  - On Windows: Uses PowerShell `Compress-Archive` or Node stream compression.
  - On Unix / macOS / CI: Uses `zip -r` or Node stream compression.
  - Ignores development artifacts: `.git`, `README.md`, `.DS_Store`, tests.
  - Targets output: `public/tracklet-extension.zip`.
- Hook into `package.json`:
  - `"package:ext": "node scripts/package-extension.js"`
  - `"build": "node scripts/package-extension.js && vite build"`
- This guarantees that every production build and preview always serves the latest extension package at `/tracklet-extension.zip` on the exact same origin!

---

## 2. Version Detection & Handshake Mechanism

### Context & Problem
Unpacked extensions cannot be auto-updated by Google Chrome. To give the user proactive guidance when a new version is released, the web app must detect if the extension is currently installed and what version it is running.

### Evaluation of Options

| Option | Mechanism | Latency | Security / Sandboxing | Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Window `postMessage` Handshake via Content Script** | Web app posts `TRACKLET_EXT_PING` on mount; `content.js` (running on verified Tracklet origins) calls `chrome.runtime.getManifest().version` and replies with `TRACKLET_EXT_PONG`. | <10ms | Strict origin check (`isTrackletOrigin()`); zero sensitive data transmitted. | **SELECTED** |
| **Option B: Chrome Externally Connectable (`chrome.runtime.sendMessage`)** | Direct runtime message from web page to extension ID. | Fast. | Requires hardcoding extension ID in environment variable; unpacked extension IDs change when loaded on different user machines! | **REJECTED as primary** |
| **Option C: BroadcastChannel** | Cross-tab broadcast channel. | <20ms | Great for multi-tab sync, but content scripts already run in the page context. | **COMPLEMENTARY** |

### Implementation Decision
1. **Content Script (`extension/content.js`)**:
   - Listens for `TRACKLET_EXT_PING` on `window`.
   - When received, checks `isTrackletOrigin()`.
   - Dispatches `TRACKLET_EXT_PONG` with `{ installed: true, version: manifest.version, name: manifest.name }`.
2. **Web App (`src/lib/extensionSync.ts` & `src/hooks/useExtensionStatus.ts`)**:
   - Dispatches `TRACKLET_EXT_PING`.
   - Sets a 500ms timeout.
   - If `TRACKLET_EXT_PONG` is received:
     - Parses `installedVersion`.
     - Compares with `LATEST_EXTENSION_VERSION` from `src/lib/constants.ts` using semver logic.
     - Transitions state to `'connected'` or `'update_available'`.
   - If timeout fires without response:
     - Transitions state to `'not_installed'`.

---

## 3. UI/UX Placement & Information Architecture

### Entry Points
1. **TopBar Pill (`src/components/TopBar.tsx`)**:
   - Placed in the right header utility section (next to Theme Toggle).
   - Render states:
     - *Not Installed*: Subtle slate outline button with puzzle icon: `Extension`.
     - *Connected*: Emerald dot badge: `Connected v1.0.0`.
     - *Update Available*: Amber pulse badge: `Update Ready (v1.0.1)`.
   - Hidden gracefully on mobile viewports (`hidden sm:flex`).
2. **Settings Card (`src/components/SettingsView.tsx`)**:
   - A dedicated `ExtensionSettingsCard` added under the Settings tab.
   - Displays full connection diagnostics, 1-click download, copyable `chrome://extensions` button, and visual installation/update guide.
3. **Modal Dialog (`src/components/extension/ExtensionModal.tsx`)**:
   - Opens when clicking either the TopBar pill or the Settings card action.
   - Tab 1: **"First-Time Install"** (3-step visual cards with copyable links).
   - Tab 2: **"How to Update"** (2-step replacement and reload guide).
   - Direct Download CTA: `[ 📥 Download Extension (.zip) ]`.

### Handling `chrome://extensions` Navigation
- **Chromium Security Constraint**: Browser engines actively reject scripts attempting `window.open('chrome://extensions')` or `<a href="chrome://extensions">` for anti-spoofing security.
- **Solution**: Provide a dedicated copy button:
  `[ 📋 Copy "chrome://extensions" ]`
  Clicking copies the URL to the clipboard and shows an instant receipt: `✓ Copied! Paste into a new tab`.

---

## 4. Architectural Boundaries & Compliance

- **Zero Spaghetti Code**: Persistence and sync functions encapsulated in `src/lib/extensionSync.ts` and `src/hooks/useExtensionStatus.ts`. Zero sync logic embedded directly in UI markup.
- **Single Source of Truth**: Extension version constant (`LATEST_EXTENSION_VERSION = '1.0.0'`), download URLs, and status mappings stored centrally in `src/lib/constants.ts`.
- **Universal Modal Dismissal**: `ExtensionModal` implements `useEscapeKey` listener (`e.key === 'Escape'`) and backdrop dismissal.
- **Design Tokens**: Standard Tracklet blue/slate styling (`DESIGN.md`), emerald for connected, amber for update available.
