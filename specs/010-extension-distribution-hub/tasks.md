# Tasks: In-App Chrome Extension Distribution & Update Hub

**Input**: Design documents from `specs/010-extension-distribution-hub/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/handshake-contract.json`, `quickstart.md`)

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `data-model.md`, `contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, types, constants, packaging script, and build configuration

- [x] T001 Define `ExtensionStatus`, `ExtensionState`, `TrackletExtPingMessage`, `TrackletExtPongPayload`, and `TrackletExtPongMessage` interfaces in `src/types.ts`
- [x] T002 [P] Define `EXTENSION_DISTRIBUTION_CONFIG`, `LATEST_EXTENSION_VERSION`, and status presentation maps in `src/lib/constants.ts`
- [x] T003 [P] Create `scripts/package-extension.js` cross-platform Node.js script packaging `extension/` into `public/tracklet-extension.zip` and configure `"package:ext"` and `"build"` scripts in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core version comparison utilities, IPC content script bridge, and reactive status hook

**⚠️ CRITICAL**: Must be completed before user story implementation can begin

- [x] T004 [P] Create `src/lib/versionUtils.ts` with pure `compareSemver(a, b)` and `isUpdateAvailable(installed, latest)` helpers
- [x] T005 [P] Create unit test suite `tests/unit/versionUtils.test.ts` verifying semver comparisons (matching, patch/minor/major upgrades, prerelease/dev strings, null/empty cases)
- [x] T006 Update `src/lib/extensionSync.ts` to implement ping/pong handshake methods (`pingExtension(timeoutMs)`) and handshake message listener
- [x] T007 Update `extension/content.js` to listen for `TRACKLET_EXT_PING` from authorized Tracklet origins and reply with `TRACKLET_EXT_PONG` containing `chrome.runtime.getManifest().version`
- [x] T008 Create reactive custom hook `src/hooks/useExtensionStatus.ts` orchestrating handshake on mount, timeout fallback, manual recheck, and status state transitions

**Checkpoint**: Foundation ready — extension handshake and version introspection operational

---

## Phase 3: User Story 1 (P1) - 1-Click In-App Extension Download & 3-Step Setup Guide 🎯 MVP

**Goal**: Deliver a 1-click download for `public/tracklet-extension.zip` and an accessible setup guide with a 1-click "Copy `chrome://extensions`" button, eliminating GitHub navigation.

**Independent Test**: Can be tested by opening Tracklet without the extension, clicking "Extension" in the TopBar or Settings, verifying immediate download of `tracklet-extension.zip`, clicking "Copy `chrome://extensions`" to verify clipboard copy, and pressing `Escape` to close the modal.

### Implementation for User Story 1

- [x] T009 [P] [US1] Create `src/components/extension/ExtensionInstallGuide.tsx` rendering 3-step visual cards (1. Download & Extract, 2. Open `chrome://extensions` with 1-click clipboard copy button, 3. Load unpacked in Developer mode)
- [x] T010 [US1] Create `src/components/extension/ExtensionModal.tsx` accessible modal dialog supporting tab navigation (`install`, `update`), direct download CTA, backdrop click, and `Escape` key dismissal compliant with `AGENTS.md`
- [x] T011 [P] [US1] Create `src/components/extension/ExtensionSettingsCard.tsx` for `SettingsView` displaying extension overview, 1-click download button, and setup guide launcher
- [x] T012 [US1] Integrate `ExtensionSettingsCard` into `src/components/SettingsView.tsx` under a dedicated "Browser Extension Companion" section

**Checkpoint**: User Story 1 complete — fully functional in-app download and installation flow (MVP achieved)

---

## Phase 4: User Story 2 (P1) - Real-Time In-App Extension Detection & Status Indicator 🎯 MVP

**Goal**: Automatically detect when the extension is active on page load and display dynamic visual status (green "Connected v1.0.0") in the TopBar and inside the modal with shortcut cheat sheets.

**Independent Test**: Can be tested by loading the unpacked extension in Chrome, refreshing Tracklet, and verifying that the TopBar pill immediately transitions from "Extension" to green "Connected (v1.0.0)" within 500ms, with modal showing connected features and shortcut cheat sheet (`Alt + Shift + A`).

### Implementation for User Story 2

- [x] T013 [P] [US2] Create `src/components/extension/ExtensionStatusBadge.tsx` displaying dynamic visual pills (slate for uninstalled, emerald for connected, amber pulse for update ready) with tooltip and responsive labels
- [x] T014 [US2] Integrate `ExtensionStatusBadge` and `ExtensionModal` launcher trigger into `src/components/TopBar.tsx` (desktop header utility area, responsive hidden on mobile `<sm`)
- [x] T015 [US2] Update `src/components/extension/ExtensionModal.tsx` to display active connection status, synced features list, and shortcut cheatsheet (`Alt + Shift + A`) when in `connected` state

**Checkpoint**: User Stories 1 AND 2 complete — download, installation, and real-time connection verification operational

---

## Phase 5: User Story 3 (P2) - Effortless In-App Update Alert & Guided Reload Process

**Goal**: Proactively alert users when their installed extension version is older than `LATEST_EXTENSION_VERSION`, provide a 1-click "Download Update" button, and display 2-step replacement & reload instructions.

**Independent Test**: Can be tested by simulating installed version `0.9.0` with latest `1.0.0`, verifying amber TopBar pill "Update Ready (v1.0.0)", opening modal and verifying "How to Update" tab is selected, displaying version diff (`v0.9.0` $\rightarrow$ `v1.0.0`) and 2-step reload instructions.

### Implementation for User Story 3

- [x] T016 [P] [US3] Create `src/components/extension/ExtensionUpdateGuide.tsx` rendering version diff pill, primary "Download Update (.zip)" CTA, and 2-step reload guide (1. Overwrite files in extension directory, 2. Click reload 🔄 in `chrome://extensions`)
- [x] T017 [US3] Update `src/components/extension/ExtensionModal.tsx` to automatically default to the "How to Update" tab when `status === 'update_available'`, showing version comparison banner
- [x] T018 [US3] Update `useExtensionStatus.ts` and `ExtensionModal.tsx` to trigger a success toast receipt (`onShowToast`) when an update is successfully completed and detected after reload

**Checkpoint**: User Story 3 complete — full self-updating cycle for unpacked extension with in-app guidance

---

## Phase 6: User Story 4 (P3) - Companion Side Panel Update Banner

**Goal**: Display a slim, dismissible update alert inside the extension's companion side panel when a new version is available, linking back to Tracklet.

**Independent Test**: Can be tested by opening the extension side panel when an update is available, verifying the presence of the top update alert banner, clicking "[Update Now]" and verifying it focuses/opens Tracklet tab with the extension modal.

### Implementation for User Story 4

- [x] T019 [US4] Update `extension/popup.html` with a dismissible `#update-alert-banner` container at the top of the companion side panel
- [x] T020 [US4] Update `extension/popup.js` to check for updates on launch and display `#update-alert-banner` with direct action link to Tracklet web app

**Checkpoint**: All user stories complete — web app and companion side panel fully synchronized for distribution and updates

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Unit test coverage, packaging execution, build verification, and end-to-end quickstart validation

- [x] T021 [P] Create unit test suite `tests/unit/useExtensionStatus.test.ts` validating handshake timeout, version transitions, and recheck handling
- [x] T022 Execute `scripts/package-extension.js` to generate fresh `public/tracklet-extension.zip`
- [x] T023 Run TypeScript type check (`npx tsc --noEmit`) to verify zero errors across all components
- [x] T024 Run Vitest test suite (`npm test`) to ensure all unit tests pass cleanly
- [x] T025 Run Vite production build (`npm run build`) to ensure bundle compiles cleanly with zip packaging
- [x] T026 Execute `quickstart.md` manual validation walkthrough end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational phase completion
  - Phase 3 (US1 - Download & Install Guide): Foundation complete $\rightarrow$ delivers MVP
  - Phase 4 (US2 - Detection & Handshake Pill): Foundation complete $\rightarrow$ pairs with US1
  - Phase 5 (US3 - In-App Update Flow): Depends on US1 and US2 components
  - Phase 6 (US4 - Side Panel Alert): Can be implemented alongside or after US3
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent after Foundational phase
- **User Story 2 (P1)**: Integrates with `ExtensionModal` from US1
- **User Story 3 (P2)**: Extends `ExtensionModal` and `ExtensionStatusBadge` from US1/US2
- **User Story 4 (P3)**: Extension side panel component, links to web app entry points

---

## Parallel Opportunities

- `T002` (constants) and `T003` (package script) can run in parallel with `T001` (types)
- `T004` (versionUtils) and `T005` (versionUtils tests) can run in parallel
- `T009` (`ExtensionInstallGuide`) and `T011` (`ExtensionSettingsCard`) can be built in parallel
- `T013` (`ExtensionStatusBadge`) can be built in parallel with `T016` (`ExtensionUpdateGuide`)
- `T021` (unit tests) can run in parallel with `T022` (packaging)

---

## Implementation Strategy

### MVP First (Phases 1, 2, 3, 4)
1. Complete Setup (Types, Constants, Packaging script)
2. Complete Foundational (versionUtils, extensionSync ping/pong, useExtensionStatus hook)
3. Complete User Story 1 (1-click download, 3-step setup guide, Settings card)
4. Complete User Story 2 (Real-time handshake, TopBar pill, Connected status)
5. **STOP and VALIDATE**: Verify end-to-end download and connection in browser

### Incremental Delivery (Phases 5, 6, 7)
1. Add User Story 3 (Update available alert, version diff, reload guide)
2. Add User Story 4 (Side panel update banner in extension)
3. Polish & Verification (Tests, TypeScript checks, production build)
