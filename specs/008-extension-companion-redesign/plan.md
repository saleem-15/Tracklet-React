# Implementation Plan: Extension Side Panel Redesign, Contact Clipper & Autofill Readiness

**Branch**: `feat/extension-companion-redesign` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-extension-companion-redesign/spec.md`

---

## Summary

This feature modernizes the Tracklet browser companion by transitioning from an ephemeral popup into a persistent **Chrome Side Panel** (`chrome.sidePanel` API), introducing a dedicated **LinkedIn Contact Clipper** with Category Smart-Defaulting, elevating the **Webmail Companion** with multi-match prioritization, providing a **Recruiter Micro-Card** on job postings with atomic bundle-on-save linking, implementing **Tailored CV Upload & Linking**, establishing the **Autofill Hub** with real-time ATS form detection and interactive scroll-to-field feedback, and implementing **Real-Time SPA Browsing Reactivity & Smart Multi-Entity Duplicate Detection** (Jobs, Emails, and Contacts) with dirty-gated update buttons and a strict Zero Auto-Save guarantee.

Crucially, this is a **modular redesign and capability expansion, NOT a rewrite**: all 13 battle-tested existing extension capabilities (`jobBoardRegistry.js`, sync queues, offline storage, stage safety, Markdown parser) are strictly preserved with zero regressions.

---

## Technical Context

**Language/Version**: TypeScript 5 (web app, React 19), plain ES2022 JavaScript (MV3 extension, no bundler)

**Primary Dependencies**: Chrome Extension Manifest V3 APIs (`chrome.sidePanel`, `chrome.tabs`, `chrome.runtime`, `chrome.storage`), Google Favicon API v2, IndexedDB API, existing Tracklet utilities

**Storage**:
- Firestore REST API (`applications`, `contacts`)
- `chrome.storage.sync` (`tracklet_candidate_profile_v1`)
- `chrome.storage.local` (`pending_applications`, `pending_emails`, offline queue, `tracklet_apps_index`, `tracklet_contacts_index`)
- IndexedDB (`TrackletExtensionDB` / `tailored_resumes`)

**Testing**:
- Vitest (`tests/unit/jobBoardRegistry.test.ts`, `tests/unit/dateUtils.test.ts`, web-side test suites)
- Manual end-to-end browser verification via [quickstart.md](./quickstart.md)

**Target Platform**: Chromium browsers (Chrome 114+, Edge 116+, Brave) on desktop, MV3

**Project Type**: Web application + companion browser extension

**Performance Goals**:
- Side panel transition time $\le 150\text{ms}$ with zero layout shifts (CLS = 0)
- Contextual tab & SPA route detection latency $< 50\text{ms}$
- DOM ATS form detection $\le 60\text{ms}$
- 100% non-destructive autofill execution (0 premature form submissions)
- 100% manual persistence (0 unprompted background database writes)

**Constraints**:
- Plain JavaScript in `extension/` (no bundler inside extension directory to keep dev iteration instant)
- Zero regressions on existing 13 working extension capabilities
- Responsive companion bounds: 360px – 440px width (default 400px), 100vh fluid vertical layout
- Zero auto-saves to Firebase/storage on page navigation or tab switches

**Scale/Scope**:
- ~6 files modified in `extension/` (`manifest.json`, `background.js`, `content.js`, `popup.html`, `popup.css`, `popup.js`)
- 1 file updated in `src/types.ts` (`Application` tailored CV attributes)
- 0 destructive database migrations

---

## Constitution Check

*GATE: Evaluated against `.agents/AGENTS.md`.*

| Gate (AGENTS.md) | Status | Notes |
|---|---|---|
| **Zero Spaghetti Code / No logic in UI** | ✅ PASS | Separation between DOM extraction (`content.js`), background message routing (`background.js`), and companion presentation controller |
| **Repository Pattern for Persistence** | ✅ PASS | Web app retains `ApplicationRepository`; extension connects via standard Firestore REST endpoints and synced storage |
| **Single Source of Truth for Constants** | ✅ PASS | Platform, stage, and contact category enums strictly match `src/types.ts` and `src/lib/constants.ts` |
| **Strict Code & Feature Preservation** | ✅ PASS | Section 1.A 13-point non-negotiable preservation mandate guarantees zero regressions on working capabilities |
| **Mandatory Shared Primitives** | ✅ PASS | Side panel styles align 100% with `DESIGN.md` tokens (Outfit, Plus Jakarta Sans, JetBrains Mono, Command Blue `#2563eb`) |
| **Zero Browser Dialogs** | ✅ PASS | No native `alert()`, `confirm()`, or `prompt()` calls; all confirmations use in-panel receipts |
| **Outbound Links `target="_blank"`** | ✅ PASS | All profile links, job links, and deep links use `target="_blank" rel="noopener noreferrer"` |
| **Lighthouse / Contrast AA Compliance** | ✅ PASS | Text tokens meet or exceed `text-slate-500` minimum contrast requirements |
| **Strict Zero Auto-Save** | ✅ PASS | Navigating or switching tabs never triggers background database writes; persistence is exclusively user-initiated |
| **`tsc --noEmit` & `npm run build`** | ✅ PASS | Type checks and production build must verify cleanly |
| **No Unprompted Commits** | ✅ PASS | All modifications remain uncommitted in the working tree for user review |

---


## Project Structure

### Documentation (this feature)

```text
specs/008-extension-companion-redesign/
├── spec.md              # Requirements, user stories & 13-point preservation mandate
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research & decisions (R1–R9)
├── data-model.md        # Entities, schemas, state machines & diffing logic
├── quickstart.md        # End-to-end verification guide across all 6 scenarios
├── contracts/
│   ├── side-panel-messaging.md       # Runtime message protocol between companion, SW & content
│   └── candidate-profile-storage.md # Storage contracts for candidate profile & IndexedDB CV blobs
└── checklists/
    └── requirements.md  # Quality checklist (16/16 passing)
```

### Source Code Layout

```text
src/
├── types.ts                    # Updated with Application tailored CV fields (resumeFileName, resumeFileSize, etc.)
├── lib/
│   ├── constants.ts            # Canonical stages, platforms, contact categories
│   ├── applicationRepository.ts# Persistence layer supporting optional resume metadata
│   └── jobBoardRegistry.ts     # Canonical registry of job boards & ATS hosts

tests/
├── unit/                       # Existing and new unit test suites

extension/
├── manifest.json               # MV3 manifest with "sidePanel", "tabs", "storage" & side_panel config
├── background.js               # Service worker: side panel behavior, context menus, offline queue relay
├── content.js                  # Page extractor: JSON-LD, LinkedIn profile scraper, ATS form detector, scroll-to-field
├── jobBoardRegistry.js         # Canonical registry of job boards & ATS hosts (strictly preserved)
├── popup.html                  # Unified companion layout (works in both side panel and popup fallback)
├── popup.css                   # Impeccable styling: 400px fluid, Outfit/Plus Jakarta Sans/JetBrains Mono tokens
└── popup.js                    # Companion controller: 4-tab switcher, auto-switching, contact clipper, autofill hub
```

**Structure Decision**:
The companion layout in `extension/` is structured to support both Chrome Side Panel (`chrome.sidePanel`) and popup fallback seamlessly using a unified HTML/CSS/JS controller, eliminating code duplication while delivering the persistent side panel experience.

---

## Complexity Tracking

*No constitutional violations identified. Standard repository patterns and Manifest V3 practices applied.*
