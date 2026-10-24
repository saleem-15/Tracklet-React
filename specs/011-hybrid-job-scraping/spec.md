# Feature Specification: High-Precision Hybrid Job Scraping (Deterministic + AI Fallback)

**Feature Branch**: `feat/hybrid-job-scraping`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "The Extension does not scrape correctly always and a lot of times it misses some information or does not recognize it or even reads it wrong. Most of the time the description does not get scraped. Achieve 95%+ accuracy in a financially feasible way for test users."

**Related specs**: `007-extension-capture-quality` (initial domain/logo and field capture), `008-extension-companion-redesign` (side-panel UI).

---

## Why This Spec Exists (Root Causes Uncovered in Production Testing)

Real-world testing across ATS boards (`apply.workable.com`), custom startup career pages (`cosy.green/karriere/...`), and SPA modal job boards (`arc.dev/dashboard/...`) exposed why pure selector scraping plateaus around ~60% accuracy:

1. **SEO `<meta property="og:title">` overrides the actual page `<h1>`**: Almost every website sets `og:title` (often to a generic site slogan like `"Hire Top Remote Software Developers..."` on Arc, or a truncated title with a localized suffix like `"Senior Flutter Developer (m/w/d) – Karriere bei cosy.green"`). Checking `og:title` before `<h1>` made `<h1>` extraction dead code on >90% of the web.
2. **Job descriptions (`notes`) are dropped during SPA hydration**: Single-Page Applications render `<title>` first (`t ≈ 50ms`) and fetch the job description asynchronously (`t ≈ 300–1000ms`). Because the extension's change-detection signature (`threadSig`) only hashed `role`, `company`, `location`, `workLocation`, and `salary`—omitting `notes.length` and `employmentType`—late-arriving descriptions were silently ignored and the empty `t = 50ms` snapshot remained cached for 60 seconds.
3. **Hardcoded description selectors miss custom sites and split-section ATS layouts**: Relying on 7 CSS selectors (`.job-description`, `article`, etc.) misses ATS platforms that split descriptions into multiple blocks (e.g., Workable's `[data-ui="job-description"]` + `[data-ui="job-requirements"]` + `[data-ui="job-benefits"]`) and custom startup sites (`cosy.green`) that use plain `<div>`/`<section>` tags without semantic class names.
4. **React portal modals without ARIA roles (`arc.dev`) cause background scraping**: When a job opens in a visual overlay lacking `role="dialog"` or `aria-modal="true"`, the scraper misses the modal and queries `<main>`—scraping the background dashboard behind the modal instead of the active job.
5. **Employer names embedded in prose**: On curated job boards (`arc.dev`), the header badge says `"Arc Exclusive"` while the actual hiring company (`"UNIPREP"`) only appears inside the body prose (`"Join Our Team at UNIPREP"`).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Job Description Capture Across ATS & Custom Sites (Priority: P1)

When a user opens the extension on any job posting—whether a major ATS, a slow-loading SPA, or a custom company career page—the full job description is captured cleanly as structured text/Markdown unless the user explicitly highlights a snippet on the page.

**Why this priority**: The job description is the hardest field for a user to copy/format manually and is currently missed on most non-JSON-LD pages and SPAs.

**Independent Test**: Open a job on Workable, a custom startup career site without JSON-LD (`cosy.green`), and an SPA that loads its description 500ms after navigation. In all three cases, the description field populates automatically without manual refresh.

**Acceptance Scenarios**:

1. **Given** a multi-section ATS posting (e.g., Workable with separate Description, Requirements, and Benefits blocks), **When** the extension scrapes the page, **Then** all sections are combined into the job description (`notes`).
2. **Given** a custom career page with no JSON-LD and no `.job-description` class (`cosy.green`), **When** the extension scrapes the page, **Then** it identifies the main prose container via text/paragraph density and populates the description.
3. **Given** an SPA where the job title renders immediately but the description finishes rendering 300–1500ms later, **When** the description appears in the DOM, **Then** the extension detects the newly hydrated description and updates the side panel automatically.
4. **Given** the user highlights specific text on the page before invoking capture, **When** the extension reads the page, **Then** the highlighted text takes precedence over the full description.

---

### User Story 2 - Accurate Role, Company, Location & Employment Metadata on Edge-Case Layouts (Priority: P1)

When a user views a job on a localized career page (`cosy.green`), an ATS with remote country lists (`workable.com`), or a split-pane modal (`arc.dev`), the extension extracts the true role title, hiring company, location, work arrangement, and employment type without marketing slogans or job-board names polluting the fields.

**Why this priority**: Wrong titles (e.g. site slogans) and wrong company names (e.g. `"Arc"` or `"Karriere bei cosy.green"`) force manual editing on every save.

**Independent Test**: Test against the 3 benchmark pages (`apply.workable.com/fuseenergy/...`, `cosy.green/karriere/...`, and `arc.dev/dashboard/d/verified-jobs/...`). All fields match the visible job posting.

**Acceptance Scenarios**:

1. **Given** a page whose `<meta property="og:title">` is a site-wide marketing slogan or truncated string while the visible heading inside the main content/modal states the specific role, **When** scraped, **Then** the visible heading wins as the Job Title.
2. **Given** a page title or metadata suffix with career prefixes in English or German (e.g., `"Karriere bei cosy.green"`, `"Careers at Acme"`, `"Jobs bei ..."`), **When** scraped, **Then** the prefix is stripped so only the company name (`"cosy.green"`, `"Acme"`) is kept.
3. **Given** a job displayed inside a visual modal/drawer overlay (even if it lacks `role="dialog"`), **When** scraped, **Then** all fields (`role`, `company`, `location`, `salary`, `notes`) are scoped strictly to the overlay and never read from the background page behind it.
4. **Given** a curated job board posting where the header badge is the board's own brand (e.g., `"Arc Exclusive"`) and the employer is named in the intro heading/prose (`"Join Our Team at UNIPREP"`), **When** scraped, **Then** the actual employer (`"UNIPREP"`) is extracted instead of the board name.

---

### User Story 3 - Hybrid AI Fallback for the Remaining Long-Tail Web (Priority: P2)

When deterministic extraction cannot confidently populate critical fields (`role`, `company`, `location`, or `notes`) on an unconventional or obfuscated webpage, the system uses a lightweight server-side AI extraction fallback to reach 95%+ overall accuracy at near-zero cost.

**Why this priority**: Deterministic heuristics can reach ~85–90% accuracy, but the open web's long tail (bespoke startup pages, prose-only postings, non-English layouts) requires semantic comprehension to cross the 95% threshold.

**Independent Test**: Open an unstructured job page where deterministic selectors miss the company or location. The AI fallback extracts the structured fields from the cleaned visible text within 1.5 seconds.

**Acceptance Scenarios**:

1. **Given** deterministic scraping completes with all critical fields (`role`, `company`, `notes` >= 150 chars, and `location`/`workLocation`) present and high-confidence, **When** the page loads, **Then** zero AI requests are made (`0ms` extra latency, `$0` cost).
2. **Given** deterministic scraping leaves a critical field missing or low-confidence on a job page, **When** AI fallback runs, **Then** only cleaned visible page text (never raw HTML/scripts/styles) is sent to the serverless endpoint, and the returned structured fields merge non-destructively into any empty/low-confidence form fields.
3. **Given** the user has already manually typed into a form field in the side panel, **When** late hydration or AI fallback returns, **Then** the user's manual input is never overwritten.

---

### Edge Cases *(Critical Reference for Future Changes)*

- **`og:title` vs `<h1>` Inversion Trap**: Almost every site has an `og:title`. If `og:title` is checked first and `<h1>` is only checked when `!title`, `<h1>` becomes dead code. Conversely, if a page's `<h1>` is generic (`"Careers"`, `"Job Openings"`, `"Join Us"`), the scraper must fall back to the job title inside `og:title` / `document.title`.
- **Localized Career Suffixes in Titles**: German and international career pages use `" – Karriere bei <Company>"`, `" | Jobs bei <Company>"`, or `" - Trabaja en <Company>"`. Splitting on `' – '` without stripping `"Karriere bei "` pollutes the company name.
- **JSON-LD `employmentType` Formatting Variants**: Schema.org specifies `"FULL_TIME"`, but real-world sites output `"Full time"`, `"Full-time"`, `"FULL TIME"`, or arrays `["FULL_TIME", "PERMANENT"]`. Normalization must strip spaces, hyphens, and underscores before matching.
- **JSON-LD Remote Location in `applicantLocationRequirements`**: Workable and Ashby often omit `jobLocation.address` on remote roles and put allowed countries (`United Kingdom`, `United Arab Emirates`, `United States`) in `applicantLocationRequirements` (as an object or array of `Country`/`AdministrativeArea` objects).
- **SPA Two-Phase Hydration (`t=50ms` Title vs `t=500ms` Description)**: If `threadSig` in `content.js` does not include description length (`(jd.notes || '').length`) and `employmentType`, the `t=500ms` DOM mutation is ignored as a "duplicate" of the `t=50ms` empty-description scrape.
- **`querySelector()` First-Match Trap on Descriptions**: Many pages have an empty `.job-description` placeholder or a 1-line summary header above the real description container. Selecting via `querySelectorAll()` and picking the candidate with the largest meaningful text length prevents empty/truncated descriptions.
- **Non-ARIA React Portal Modals (`arc.dev`)**: Job boards built with React portals often render full-height split-pane overlays (`position: fixed`, high `z-index`) without `role="dialog"`. If the modal detector misses the overlay, `document.querySelector('main')` scrapes the background job feed instead of the open job.
- **Multi-Agent / User Edit Preservation**: Neither late DOM hydration nor async AI fallback may overwrite a field the user has actively edited (`userEditedFields` dirty tracking).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The scraper MUST prioritize a non-generic visible heading (`<h1>` or explicit job-title element inside the active modal or `<main>`) over `<meta property="og:title">` when they differ, falling back to `og:title` / `document.title` only when the visible heading is absent or generic.
- **FR-002**: The scraper MUST strip career-page boilerplate prefixes (`"Karriere bei "`, `"Careers at "`, `"Jobs at "`, `"Jobs bei "`, `"Work at "`, `"Working at "`, `"Join "`) from company names extracted via title delimiters.
- **FR-003**: The scraper MUST support multi-section and Readability-style fallback description extraction: when explicit description selectors fail, it MUST score candidate blocks inside the active modal or `<main>` by paragraph/list density and extract the primary prose body as Markdown.
- **FR-004**: The SPA change signature (`threadSig`) and popup hydration re-polling MUST track description presence (`notes.length`) and `employmentType` so asynchronous description rendering updates both `tracklet_active_tab_data` and the open side panel.
- **FR-005**: The URL classifier (`classifyTabUrl`) and platform detector (`detectPlatform`) MUST recognize all ATS hosts in `JobBoardRegistry.ATS_HOSTS` (including `workable.com`, `bamboohr.com`, `personio.de`, `teamtailor.com`, etc.) and common international/short job path segments (`/j/`, `/karriere/`, `/career/`, `/stellenangebote/`).
- **FR-006**: The modal detector MUST identify visible fixed/portal overlays (`position: fixed` or `absolute` covering a significant viewport area with job metadata/apply actions) even when `role="dialog"` and `aria-modal="true"` are omitted.
- **FR-007**: When scraping inside an active modal or on a job board where the header company name matches the board itself (e.g., `"Arc"`, `"Arc Exclusive"`), the scraper MUST check intro headings and prose patterns (`"Join Our Team at X"`, `"At X, we..."`, `"About X"`) to resolve the actual employer.
- **FR-008**: The scraper MUST extract label-value sibling pairs (e.g., a label element `"Location"` or `"Salary"` immediately followed by its value sibling) and subtitle metadata lines (`"Remote EU-wide · Full-time"`) when CSS class names are obfuscated.
- **FR-009**: When deterministic scraping on a confirmed job page leaves critical fields (`role`, `company`, or `notes`) missing or low-confidence, the extension MUST support invoking a server-side AI extraction endpoint (`POST /api/scrape-job`) using cleaned visible page text (`<= 12,000` characters) and merging returned fields only into unedited/missing form fields.
- **FR-010**: The server-side AI endpoint MUST keep model credentials strictly on the server, enforce payload size limits, and return a deterministic JSON schema matching Tracklet's `Application` fields.

### Key Entities

- **ScrapedJobPayload**: Normalized job extraction output (`role`, `company`, `companyDomain`, `location`, `workLocation`, `employmentType`, `salary`, `notes`, `jobLink`, `platform`, `confidence`).
- **AIExtractionRequest / Response**: Trimmed visible text + page URL/title sent to `/api/scrape-job`, returning structured job fields with zero HTML/script noise.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Deterministic scraping accurately populates `role`, `company`, `location`, `workLocation`, `employmentType`, and `notes` across 100% of the 3 benchmark failure cases (`workable.com`, `cosy.green`, `arc.dev`) and existing unit test fixtures in `< 50ms`.
- **SC-002**: Job descriptions (`notes`) are non-empty (> 150 characters) on >= 95% of tested job postings across ATS boards, SPA modals, and custom startup career sites.
- **SC-003**: Combined deterministic + AI fallback achieves >= 95% field accuracy across arbitrary job postings while keeping average AI cost under `$0.0005` per AI-assisted scrape (`$0.00/month` on free tier or `< $1.00/month` on paid tier for 100 active test users).
- **SC-004**: Zero user-edited fields in the extension side panel are ever overwritten by delayed SPA hydration or AI fallback responses.

---

## Assumptions

- Contact profile scraping (`contact_profile` / LinkedIn profile extraction) is handled in a separate workstream and MUST NOT be altered by job-posting scraper changes.
- Tracklet's Cloudflare Pages deployment (`https://tracklet.pages.dev`) hosts `/api/*` serverless routes (alongside `api/report-issue.ts`).
