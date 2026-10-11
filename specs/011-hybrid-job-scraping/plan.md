# Implementation Plan: High-Precision Hybrid Job Scraping

**Branch**: `feat/hybrid-job-scraping` (spec dir `011-hybrid-job-scraping`) | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-hybrid-job-scraping/spec.md` and architectural decisions in [research.md](./research.md).

---

## Summary

Raise Tracklet's browser extension job-scraping accuracy from ~55–65% to **95%+** across ATS platforms, SPA modals, and custom startup career sites without recurring infrastructure costs:

1. **Layer 1 — Deterministic Scraper Hardening (`0ms`, `$0`, ~85–90% accuracy)**:
   - Fix the 9 root-cause bugs identified across `workable.com`, `cosy.green`, and `arc.dev` (missing `cleanRoleTitle` helper, `og:title` vs `<h1>` inversion, `"Karriere bei"` company prefix pollution, JSON-LD `employmentType` space/hyphen normalization, `applicantLocationRequirements` remote country extraction, non-ARIA React portal modal detection, sibling label-value metadata extraction, prose company extraction for `"Join Our Team at X"`, and Readability-style description density scoring).
   - Fix SPA late-hydration drops by adding `notes.length` and `employmentType` to `threadSig` in `extension/content.js`, syncing `classifyTabUrl()` in `extension/popup.js` with `JobBoardRegistry.ATS_HOSTS` + `/j/` + `/karriere/`, and re-polling when `notes` is empty.
2. **Layer 2 — Hybrid AI Fallback (`api/scrape-job.ts`, reaches 95–99% accuracy at `$0` free tier / `<$0.0005` per scrape paid)**:
   - Add a Vercel Serverless Function (`api/scrape-job.ts`) calling **Gemini 2.5 Flash-Lite** with Structured Outputs (`responseSchema`) on cleaned visible page text (`<= 12,000` chars).
   - Trigger automatically (and/or via a manual button) only when Layer 1 leaves critical fields (`role`, `company`, or `notes`) incomplete, merging results strictly into unedited/empty fields.

---

## Technical Context

**Language/Version**: TypeScript 5 (Vercel serverless function & unit tests), plain ES2020 JavaScript (MV3 extension in `extension/`)

**Primary Dependencies**: Chrome Extension MV3 APIs (`chrome.tabs`, `chrome.runtime`, `chrome.storage`), Vercel Serverless Runtime (`api/scrape-job.ts`), Google Gemini REST API (`gemini-2.5-flash-lite` via `fetch` — zero heavy SDK dependencies required)

**Storage**: `chrome.storage.local` (`tracklet_active_tab_data` transient cache), Firestore `applications` collection on save

**Testing**: Vitest (`tests/unit/extensionAutoScrape.test.ts`, `tests/unit/extensionTabContext.test.ts`)

**Target Platform**: Chromium browsers (Chrome, Edge, Brave) MV3 + Vercel Hobby Free Tier

**Performance Goals**:
- Layer 1 (Deterministic): `< 50ms` execution time, `0` network calls
- Layer 2 (AI Fallback, only when Layer 1 is incomplete): `< 1,500ms` p95 response time, `<= 2,500` input tokens

**Constraints**:
- **Multi-Agent Safety**: Do NOT modify contact-scraping functions (`extractLinkedInProfileData`, `extractGenericContactProfile`, `contact_profile` listeners/tests) being worked on by the parallel agent.
- **Extension Version Lockstep**: Bump `extension/manifest.json` `"version"` and `LATEST_EXTENSION_VERSION` in `src/lib/constants.ts` in lockstep (`tests/unit/versionSync.test.ts`).

---

## Constitution Check

*GATE: Evaluated against `.agents/AGENTS.md`.*

| Gate (AGENTS.md) | Status | Notes |
|---|---|---|
| Zero Spaghetti Code / No logic in UI | ✅ PASS | Scraping heuristics stay in `extension/content.js`; AI schema extraction lives in `api/scrape-job.ts` |
| Single Source of Truth for Constants | ✅ PASS | `LATEST_EXTENSION_VERSION` synced with `extension/manifest.json`; ATS hosts shared via `JobBoardRegistry` |
| Pure Utility Functions | ✅ PASS | Title cleaning, employment-type normalization, and HTML-to-Markdown remain pure helpers |
| Zero Browser Dialogs | ✅ PASS | No `alert()`, `confirm()`, or `prompt()` used |
| Extension Versioning & Distribution | ✅ PASS | `extension/manifest.json` and `src/lib/constants.ts` updated together |
| `npx tsc --noEmit` & `npm run build` | ✅ PASS | Verified before completion |
| No Unprompted Commits | ✅ PASS | All changes left uncommitted until explicitly requested |

---

## Project Structure

### Documentation (this feature)

```text
specs/011-hybrid-job-scraping/
├── spec.md                     # Problem statement, user stories, edge cases, requirements
├── research.md                 # ADRs (ADR-1 through ADR-6) & financial math
├── plan.md                     # This implementation plan
└── checklists/
    └── requirements.md         # Specification quality checklist
```

### Source Code (repository root)

```text
api/
├── report-issue.ts             # Existing Vercel serverless function (reference pattern)
└── scrape-job.ts               # NEW: Hybrid AI fallback endpoint (Gemini 2.5 Flash-Lite JSON schema)

extension/
├── jobBoardRegistry.js         # ATS & job board host detection, platform mapping
├── content.js                  # Layer 1 deterministic scraper + Readability scorer + threadSig fix
└── popup.js                    # classifyTabUrl sync, hydration repoll on missing notes, AI fallback merge

tests/unit/
└── extensionAutoScrape.test.ts # Regression tests for Workable, cosy.green, arc.dev, and SPA hydration
```

---

## Phased Execution Plan

### Phase 1: Standalone Serverless AI Fallback (`api/scrape-job.ts`) — *Zero Conflict with Parallel Agent*
1. Create `api/scrape-job.ts` using the same zero-dependency Vercel Serverless Function pattern as `api/report-issue.ts`.
2. Accept `{ text, url, pageTitle, currentScraped }` (truncating `text` to `12,000` chars server-side for safety).
3. Call Gemini REST API (`gemini-2.5-flash-lite`) with `responseMimeType: "application/json"` and strict `responseSchema` for `{ role, company, companyDomain, location, workLocation, employmentType, salary, notes }`.
4. Return graceful JSON `{ fallbackAvailable: false }` if `GEMINI_API_KEY` is not yet configured in environment variables so the extension never errors.

### Phase 2: Deterministic Scraper Hardening (`extension/content.js` & `extension/jobBoardRegistry.js`)
1. **Fix `cleanRoleTitle` & Title/Company Priority**:
   - Define `cleanRoleTitle(title, company)` to strip trailing company suffixes and `"Karriere bei "` / `"Careers at "` prefixes.
   - In `parseUniversalFallback()`, evaluate visible `<h1>` inside `<main>`/modal before `og:title` (falling back to `og:title` only if `<h1>` is missing or matches `GENERIC_HEADINGS`).
2. **Fix Workable (`apply.workable.com`)**:
   - Add `workable.com` rule in `parseSiteSpecific()` for `[data-ui="job-title"]`, `[data-ui="job-location"]`, `[data-ui="job-remote"]`, `[data-ui="job-type"]`, and combined `[data-ui="job-description"]` + `[data-ui="job-requirements"]` + `[data-ui="job-benefits"]`.
   - Fix `parseJsonLd()` to normalize `employmentType` (`FULL[\s_-]*TIME` → `'Full-time'`, etc.) and extract countries from `applicantLocationRequirements` when `jobLocation.address` is empty.
   - Update `detectPlatform()` to check `ATS_HOSTS` (mapping known ATS domains appropriately instead of `'Company Site'`).
3. **Fix Custom Career Sites (`cosy.green`) & Description Readability Scorer**:
   - Parse subtitle lines beneath `<h1>` (`"Remote EU-wide · Full-time"`) for `workLocation`, `location`, and `employmentType`.
   - Add `extractBestDescriptionHtml(rootEl)` combining multi-selector best-length matching + Readability paragraph/list density scoring.
4. **Fix Non-ARIA Portal Modals & Prose Company (`arc.dev`)**:
   - Enhance `extractJobFromActiveModalOrDrawer()` to detect high-`z-index` fixed overlays containing an Apply button and job prose, scoping extraction to the modal so `<main>` behind the modal is never scraped.
   - Add label-sibling extraction (`Location` → `Remote anywhere`, `Salary` → `US$50K - 100K`) and prose company fallback (`"Join Our Team at UNIPREP"`, `"About UNIPREP"`) when `company` matches a generic site/badge (`"Arc"`, `"Arc Exclusive"`).
5. **Fix SPA Hydration Signature (`threadSig`)**:
   - Include `jd.employmentType` and `(jd.notes || '').length` bucket in `threadSig` and include `'spa_hydration_retry'` in `isExplicitForce`.

### Phase 3: Popup Hydration & AI Fallback Merge (`extension/popup.js`)
1. Sync `classifyTabUrl()` with all `ATS_HOSTS` (`workable.com`, `bamboohr.com`, `personio.de`, `teamtailor.com`, etc.) and path patterns (`/j/`, `/karriere/`, `/career/`).
2. Extend hydration re-poll condition to re-poll when `!response.jobData?.notes` on job pages.
3. Trigger `POST /api/scrape-job` fallback when deterministic extraction leaves `role`, `company`, or `notes` incomplete, merging returned values only into fields not in `userEditedFields`.
