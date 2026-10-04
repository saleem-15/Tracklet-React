# Implementation Plan: Extension Capture Quality

**Branch**: `feat/extension-enhancements` (spec dir `007-extension-capture-quality`) | **Date**: 2026-10-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-extension-capture-quality/spec.md`

## Summary

The Tracklet browser extension captures wrong company logos (e.g. LinkedIn logo when clipping a LinkedIn job), misses valuable metadata already supported by Tracklet (location, work arrangement, employment type, hiring contacts), and allows destructive stage regressions (overwriting existing interview progress with "Saved").

### Technical Approach (see [research.md](./research.md) R1–R7):
1. **Unified Job-Board & ATS Registry**: Define a single canonical list of job boards and ATS hosts in `src/lib/jobBoardRegistry.ts` (mirrored in `extension/jobBoardRegistry.js`). Reject any host matching this list as a company website.
2. **Display-Time Sanitization for Existing Bad Logos**: Update `src/lib/logoUtils.ts` and `emailMatchingUtils.ts` to dynamically filter out stored job-board domains or logos. Existing LinkedIn jobs instantly resolve to clean company logos or pastel monograms without requiring a database migration.
3. **Rich Field Extraction**: Enhance `extension/content.js` to extract structured JSON-LD (`@type: JobPosting`) and DOM details: Location, Work Arrangement (`Remote` | `Hybrid` | `Onsite`), Employment Type (`Full-time` | `Part-time` | `Contract` | `Internship`), and a clean description summary.
4. **Hiring Contact Detection**: Capture recruiter / job poster details (name, title, LinkedIn profile) and present a pre-checked toggle card in `popup.html`. On save, deduplicate against existing contacts and link to the application.
5. **Stage Restriction & Progress Preservation**: Restrict extension stage selection to **`Saved`** and **`Applied`** only (auto-defaulting to Applied on confirmation pages). For jobs already in Tracklet at later stages (`Screening`, `Interview`, `Offer`, etc.), display the stage as read-only. Stage-history entries written by the extension conform strictly to Tracklet's `StatusHistoryEntry` schema and never clobber existing history.

---

## Technical Context

**Language/Version**: TypeScript 5 (web app, React 19), plain ES2020 JavaScript (MV3 extension, no bundler)

**Primary Dependencies**: Chrome Extension APIs (`chrome.tabs`, `chrome.runtime`, `chrome.storage`), Google Favicon API v2, existing Tracklet utilities

**Storage**: Firestore REST API & `chrome.storage.local` (collections: `applications`, `contacts`)

**Testing**: Vitest (`tests/unit/logoUtils.test.ts`, `tests/unit/jobBoardRegistry.test.ts`), manual browser validation via [quickstart.md](./quickstart.md)

**Target Platform**: Chromium browsers (Chrome, Edge, Brave), MV3

**Project Type**: Web application + companion browser extension

**Performance Goals**: DOM extraction execution time < 50ms; popup load & field population < 150ms; 0 UI layout shifts during avatar resolution

**Constraints**: Plain JavaScript in `extension/` (no npm dependencies or bundler inside extension directory); backward-compatible with all existing Firestore application records

**Scale/Scope**: ~7 files modified across `src/` and `extension/`, 0 Firestore database migrations

---

## Constitution Check

*GATE: Evaluated against `.agents/AGENTS.md`.*

| Gate (AGENTS.md) | Status | Notes |
|---|---|---|
| Zero Spaghetti Code / No logic in UI | ✅ PASS | Registry and domain extraction live in `src/lib/jobBoardRegistry.ts` & `src/lib/logoUtils.ts`; UI components remain purely presentational |
| Single Source of Truth for Constants | ✅ PASS | Job board and ATS hosts consolidated into a single registry, removing fragmented inline regexes |
| Pure Utility Functions | ✅ PASS | `cleanCompanyDomain()`, `isJobBoardOrAts()`, `getCompanyDomain()` are pure functions |
| Rules of Hooks | ✅ PASS | No hooks modified or called conditionally |
| Components under 300 lines | ✅ PASS | Presentational components remain compact |
| Mandatory Canonical Shared Primitives | ✅ PASS | Web app displays retain `StatusBadge` and `STAGE_CONFIG_MAP`; extension popup adopts standard stage dot tokens |
| Outbound Links `target="_blank"` | ✅ PASS | All profile and job links opened externally use `target="_blank" rel="noopener noreferrer"` |
| Zero Browser Dialogs | ✅ PASS | No `alert`, `confirm`, or `prompt` calls |
| Lighthouse / Contrast compliance | ✅ PASS | Text tokens meet or exceed `text-slate-500` minimum contrast requirements |
| `tsc --noEmit` & `npm run build` | ✅ PASS | Must verify cleanly before completing implementation |
| No unprompted commits | ✅ PASS | Changes remain uncommitted in working tree |

---

## Project Structure

### Documentation (this feature)

```text
specs/007-extension-capture-quality/
├── spec.md              # Requirements & user stories
├── plan.md              # This file
├── research.md          # Phase 0: Technical decisions & rationale
├── data-model.md        # Phase 1: Entities, mappings, state machine
├── quickstart.md        # Phase 1: End-to-end testing scenarios
├── contracts/
│   └── capture-protocol.md # Phase 1: Message contracts & schemas
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── jobBoardRegistry.ts     # Canonical registry of job boards, ATS hosts, domain cleaning
│   ├── logoUtils.ts            # Display-time sanitization: ignores stored job board domains/logos
│   └── emailMatchingUtils.ts   # Prevents matching company emails against job board domains
tests/unit/
├── jobBoardRegistry.test.ts    # Unit tests for domain extraction and ATS matching
└── logoUtils.test.ts           # Unit tests for logo resolution and sanitization

extension/
├── jobBoardRegistry.js         # Mirrored canonical registry for MV3 extension
├── content.js                  # Rich extraction: JSON-LD + DOM (location, arrangement, type, contact)
├── popup.html                  # Popup layout: domain edit, arrangement/type pills, contact card, stage selector
├── popup.css                   # Impeccable styling: responsive pills, avatar states, read-only badges
├── popup.js                    # Popup controller: live logo preview, stage restrictions, contact toggle
└── background.js               # Background service worker: idempotent save, contact deduplication & linking
```

**Structure Decision**: Web-side modules live under `src/lib/` with dedicated Vitest suites in `tests/unit/`. Extension modules live under `extension/` with mirrored registry to avoid requiring a bundler for the unpacked extension.

---

## Complexity Tracking

No constitution violations or unwarranted complexity.

---

## Phase Outputs

- **Phase 0**: [research.md](./research.md) (R1–R7 resolving domain extraction, logo sanitization, rich fields, contact capture, and stage rules)
- **Phase 1**: [data-model.md](./data-model.md), [contracts/capture-protocol.md](./contracts/capture-protocol.md), [quickstart.md](./quickstart.md)
