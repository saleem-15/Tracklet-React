# Tasks: High-Precision Hybrid Job Scraping (`011-hybrid-job-scraping`)

**Input**: Design documents from `/specs/011-hybrid-job-scraping/` ([spec.md](./spec.md), [research.md](./research.md), [plan.md](./plan.md))

> **Multi-Agent Safety Rule**: Do NOT modify contact-scraping functions (`extractLinkedInProfileData`, `extractGenericContactProfile`, `contact_profile` listeners/tests) in `extension/content.js`, `extension/popup.js`, or `tests/unit/extensionAutoScrape.test.ts`.

---

## Phase 1: Foundational & Crash Prevention

- [x] **T001** Define `cleanRoleTitle(title, company)` and `cleanCompanyName(company)` in `extension/content.js` to resolve the `ReferenceError: cleanRoleTitle is not defined` crash and strip `"Karriere bei "` / `"Careers at "` / `"Jobs at "` prefixes.
- [x] **T002** Sync `classifyTabUrl()` in `extension/popup.js` and `detectPlatform()` in `extension/content.js` with all ATS hosts in `extension/jobBoardRegistry.js` (`workable.com`, `bamboohr.com`, `personio.de`, `teamtailor.com`, `breezy.hr`, `icims.com`, `jazzhr.com`, `pinpointhq.com`, `applytojob.com`) and career URL path segments (`/j/`, `/karriere/`, `/career/`, `/stellenangebote/`).

---

## Phase 2: User Story 1 — Reliable Job Description Capture & SPA Hydration (Priority: P1)

**Goal**: Capture full job descriptions (`notes`) across multi-section ATS pages (`workable.com`), custom startup pages without semantic classes (`cosy.green`), and slow-hydrating SPAs.

- [x] **T003** [US1] Implement `extractBestDescriptionHtml(rootEl)` in `extension/content.js`:
  - Aggregate multi-section ATS descriptions (`[data-ui="job-description"]` + `[data-ui="job-requirements"]` + `[data-ui="job-benefits"]`).
  - Use `querySelectorAll()` across expanded description selectors (`[itemprop="description"]`, `.prose`, `[class*="prose"]`, `.w-richtext`, `[class*="description" i]`) and pick the longest valid block (`> 120` chars) instead of the first DOM match.
  - Add a Readability-style paragraph/list density fallback for custom career pages (`<main>` / `<section>` / `<div>` with highest `<p>` + `<li>` density, excluding `<nav>`, `<header>`, `<footer>`, `<form>`, `<aside>`).
- [x] **T004** [US1] Update `threadSig` in `checkAndDispatchContextChange()` (`extension/content.js`) to include `jd.employmentType` and `(jd.notes || '').length`, and add `'spa_hydration_retry'` to `isExplicitForce`.
- [x] **T005** [US1] Update hydration re-polling in `extension/popup.js` so `effectiveCategory === 'job'` also re-polls when `!response.jobData?.notes`.

---

## Phase 3: User Story 2 — Accurate Role, Company, Location & Modal Extraction (Priority: P1)

**Goal**: Resolve `workable.com`, `cosy.green`, and `arc.dev` metadata failures without regressing existing job boards.

- [x] **T006** [US2] Fix `parseUniversalFallback()` in `extension/content.js` so a non-generic visible `<h1>` inside the active modal or `<main>` takes priority over `<meta property="og:title">`, while still extracting `company` from `og:title` / `og:site_name` / `document.title` when missing.
- [x] **T007** [US2] Fix `parseJsonLd()` and `parseSiteSpecific()` in `extension/content.js` for Workable and Schema.org edge cases:
  - Normalize `employmentType` separators (`FULL[\s_-]*TIME` → `'Full-time'`, `PART[\s_-]*TIME` → `'Part-time'`).
  - Extract remote country/region lists from `applicantLocationRequirements` when `jobLocation.address` is absent.
  - Add `workable.com` rule in `parseSiteSpecific()` (`[data-ui="job-title"]`, `[data-ui="job-location"]`, `[data-ui="job-remote"]`, `[data-ui="job-type"]`).
- [x] **T008** [US2] Enhance `extractJobFromActiveModalOrDrawer()` and `parseSiteSpecific()` in `extension/content.js` for non-ARIA portal modals (`arc.dev`) and custom subtitle bars (`cosy.green`):
  - Detect visible fixed/portal overlays (`position: fixed`, high `z-index`, `>= 400x300px` with job action buttons) even when `role="dialog"` is absent, and scope all DOM queries to the overlay so `<main>` behind the modal is never scraped.
  - Extract sibling label-value pairs (`Location` → `Remote anywhere`, `Salary` → `US$50K - 100K`) and subtitle metadata lines beneath `<h1>` (`"Remote EU-wide · Full-time"`).
  - Apply prose employer fallback (`"Join Our Team at <Company>"`, `"At <Company>, we..."`, `"About <Company>"`) when `company` is empty or matches the host job board (`"Arc"`, `"Arc Exclusive"`).
- [x] **T009** [US2] Add unit regression tests in `tests/unit/extensionAutoScrape.test.ts` covering `workable.com`, `cosy.green`, `arc.dev` modal, and late SPA description hydration.

---

## Phase 4: User Story 3 — Hybrid AI Fallback Endpoint & Extension Integration (Priority: P2)

**Goal**: Reach 95–99% open-web accuracy using a zero-infrastructure-cost Vercel Serverless Function (`api/scrape-job.ts`) backed by `Gemini 2.5 Flash-Lite`.

- [x] **T010** [P] [US3] Create `api/scrape-job.ts` Vercel Serverless Function calling Gemini REST API (`gemini-2.5-flash-lite`) with `responseMimeType: "application/json"` and strict JSON `responseSchema`, enforcing a `12,000`-character input text cap and graceful fallback if `GEMINI_API_KEY` is unset.
- [x] **T011** [US3] Add non-destructive AI fallback trigger in `extension/popup.js` (and `GET_CLEAN_PAGE_TEXT` handler in `extension/content.js`) that invokes `POST /api/scrape-job` only when deterministic scraping on a job page leaves `role`, `company`, or `notes` incomplete, merging results strictly into fields not in `userEditedFields`.
- [x] **T012** Bump `extension/manifest.json` `"version"` and `LATEST_EXTENSION_VERSION` in `src/lib/constants.ts` in lockstep, and verify `npx tsc --noEmit`, `npx vitest run`, and `npm run build`.
