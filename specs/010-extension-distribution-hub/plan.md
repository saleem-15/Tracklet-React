# Implementation Plan: In-App Chrome Extension Distribution & Update Hub

**Branch**: `feat/extension-distribution-hub` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-extension-distribution-hub/spec.md`

---

## Summary

Build a zero-cost, frictionless distribution and self-updating hub for the Tracklet Chrome Extension directly inside the Tracklet web application, completely bypassing the Chrome Web Store $5 fee and eliminating confusing GitHub navigation.

The system introduces:
1. **Self-Hosted Extension Package**: Build-time script (`scripts/package-extension.js`) packaging `extension/` directly into `public/tracklet-extension.zip`, served with 100% reliability on the same origin.
2. **Real-Time Version Handshake**: Bidirectional `window.postMessage` ping/pong protocol (`TRACKLET_EXT_PING` $\rightarrow$ `TRACKLET_EXT_PONG`) between Tracklet web app and content script, introspecting installation presence and exact manifest version within 500ms.
3. **Reactive Extension Status Hook (`useExtensionStatus`)**: Encapsulates handshake lifecycle, state transitions (`checking` $\rightarrow$ `not_installed` | `connected` | `update_available`), and manual rechecks.
4. **Dual Entry Surfaces**:
   - **TopBar Status Pill (`src/components/TopBar.tsx`)**: Subtle, non-intrusive header badge with dynamic visual states (slate for uninstalled, emerald for connected, amber pulse for update ready).
   - **Settings Hub Card (`src/components/extension/ExtensionSettingsCard.tsx`)**: Dedicated section in SettingsView with full diagnostics, 1-click download, and visual guides.
5. **Interactive In-App Companion Modal (`src/components/extension/ExtensionModal.tsx`)**:
   - Tab 1: **First-Time Install** (3-step visual cards with 1-click clipboard copy of `chrome://extensions`).
   - Tab 2: **How to Update** (Version diff, "Download Update" CTA, 2-step folder replacement & reload instructions).
   - Full keyboard accessibility with `Escape` dismissal conforming to `AGENTS.md`.

---

## Technical Context

**Language/Version**: TypeScript 5.8+ / React 19  
**Primary Dependencies**: Vite 6, TailwindCSS v4, Lucide React (unified blue/slate tokens)  
**Distribution Storage**: Static asset `public/tracklet-extension.zip` (self-hosted); fallback link to GitHub Releases latest asset  
**IPC / Messaging**: `window.postMessage` bridge with origin verification (`isTrackletOrigin()`)  
**Testing**: Vitest (`npm test`)  
**Target Platform**: Desktop Chromium-based browsers (Chrome, Edge, Brave, Opera, Arc)  
**Performance Goals**: <500ms handshake resolution on page load; <1s download start; zero impact on initial bundle size or Lighthouse score  
**Constraints**: Zero Chrome Web Store dependencies; zero new npm runtime dependencies; WCAG AA contrast compliance  

---

## Constitution Check

- [x] **Repository Pattern & Separation of Concerns**: Persistence and IPC communication isolated in `src/lib/extensionSync.ts` and `src/hooks/useExtensionStatus.ts`. Zero raw messaging spaghetti inside presentation components.
- [x] **Single Source of Truth**: `LATEST_EXTENSION_VERSION`, download paths, and URLs defined centrally in `src/lib/constants.ts`.
- [x] **Pure Utility Functions**: Semver parsing and version comparison logic isolated in pure, testable `src/lib/versionUtils.ts`.
- [x] **Canonical Shared Primitives**:
  - Modal implements `Escape` key listener (`e.key === 'Escape'`) and outside click dismissal.
  - Toast notifications dispatched through top-level `onShowToast` / `useToastContext`.
  - Design tokens adhere strictly to `DESIGN.md` (no inline hex, standard blue/slate palette, emerald for success/connected, amber for update alerts).
- [x] **Component Line Limits**: Modal and settings cards modularized into sub-components under 300 lines.

---

## Project Structure

### Documentation (this feature)

```text
specs/010-extension-distribution-hub/
├── spec.md                  # Feature specification
├── plan.md                  # Implementation plan (this file)
├── research.md              # Research & technical decisions
├── data-model.md            # TypeScript interfaces & state models
├── quickstart.md            # Manual walkthrough & verification guide
├── contracts/
│   └── handshake-contract.json # JSON schema for window postMessage handshake
└── checklists/
    └── requirements.md      # Spec completeness checklist
```

### Source Code

```text
scripts/
└── package-extension.js                      # Cross-platform build script packaging extension/ -> public/

src/
├── types.ts                                  # ExtensionStatus, ExtensionState interfaces
├── lib/
│   ├── constants.ts                          # LATEST_EXTENSION_VERSION, EXTENSION_DISTRIBUTION_CONFIG
│   ├── versionUtils.ts                       # Pure semver comparison & update check utilities
│   └── extensionSync.ts                      # Ping/pong handshake logic added to content script bridge
├── hooks/
│   └── useExtensionStatus.ts                 # Reactive hook orchestrating handshake lifecycle
├── components/
│   ├── extension/
│   │   ├── ExtensionModal.tsx                # Accessible modal with install & update tabs
│   │   ├── ExtensionStatusBadge.tsx          # Reusable status pill with dynamic color/icon
│   │   ├── ExtensionInstallGuide.tsx         # 3-step visual cards for first-time setup
│   │   ├── ExtensionUpdateGuide.tsx          # 2-step visual cards for folder replacement & reload
│   │   └── ExtensionSettingsCard.tsx         # Dedicated card for SettingsView
│   ├── TopBar.tsx                            # Top navigation status pill integration
│   └── SettingsView.tsx                      # Embeds ExtensionSettingsCard
tests/
└── unit/
    ├── versionUtils.test.ts                  # Unit tests for semver comparison
    └── useExtensionStatus.test.ts            # Unit tests for handshake state transitions
```

---

## Complexity Tracking

| Decision | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| Zero-dependency packaging script (`scripts/package-extension.js`) | Packages `extension/` into `public/tracklet-extension.zip` automatically during `npm run build` | Manual developer zipping is error-prone; adding heavy npm zip packages increases bundle footprint |
| Window `postMessage` Handshake | Allows web app to introspect whether extension is loaded and its exact version | Direct extension runtime messaging requires knowing extension ID, which varies dynamically for unpacked extensions |
| 1-Click Copy for `chrome://extensions` | Facilitates rapid navigation to Chrome Extensions management | Browsers forbid web pages from opening `chrome://` links directly via scripts |

---

## Phases

### Phase 0: Outline & Research *(Completed)*
- Documented packaging options, version handshake protocols, and Chromium security constraints in `research.md`.

### Phase 1: Design & Contracts *(Completed)*
- Documented data models in `data-model.md`.
- Defined JSON schema handshake contract in `contracts/handshake-contract.json`.
- Generated quickstart test guide in `quickstart.md`.

### Phase 2: Implementation Sequence (Ready for Execution via Tasks)
1. **Core Utilities & Packaging**:
   - `scripts/package-extension.js`: Cross-platform build script.
   - Update `package.json` build scripts.
   - `src/lib/versionUtils.ts`: Pure semver comparison.
   - Unit tests in `tests/unit/versionUtils.test.ts`.
2. **Handshake Bridge & Reactive Hook**:
   - Update `extension/content.js` to respond to `TRACKLET_EXT_PING`.
   - Update `src/lib/extensionSync.ts` with ping/pong helper.
   - Create `src/hooks/useExtensionStatus.ts`.
3. **UI Components**:
   - Create `src/components/extension/ExtensionStatusBadge.tsx`.
   - Create `src/components/extension/ExtensionInstallGuide.tsx`.
   - Create `src/components/extension/ExtensionUpdateGuide.tsx`.
   - Create `src/components/extension/ExtensionModal.tsx`.
   - Create `src/components/extension/ExtensionSettingsCard.tsx`.
4. **Integration**:
   - Connect Extension pill into `src/components/TopBar.tsx`.
   - Connect `ExtensionSettingsCard` into `src/components/SettingsView.tsx`.
   - Add companion Side Panel update notification in `extension/popup.js`.
5. **Verification**:
   - Run `npm test`, `npx tsc --noEmit`, `npm run build`.
   - Manual verification using `quickstart.md`.
