# Architecture Decisions & Edge-Case Reference: Hybrid Job Scraping

**Feature**: `011-hybrid-job-scraping` | **Date**: 2026-10-10

> **Purpose of this document**: Record *only* the high-leverage architectural decisions, why simpler alternatives failed in production, the cost math, and the non-obvious DOM/SPA edge cases so future maintainers do not accidentally regress them.

---

## ADR-1: Why Hybrid Scraping (Hardened Deterministic First + AI Fallback) Instead of 100% AI or 100% DOM

### Decision
Use a **two-layer pipeline**:
1. **Layer 1 — Hardened Deterministic Scraper (`extension/content.js`)**: Runs synchronously in `0ms` at `$0` cost using JSON-LD, site-specific rules, label-sibling heuristics, and a Readability-style description density scorer.
2. **Layer 2 — Server-Side AI Fallback (`api/scrape-job.ts`)**: Triggered **only** when Layer 1 leaves critical fields missing or low-confidence (`!role`, `!company`, `company` equals the host job board, or `!notes || notes.length < 150`).

### Why Not 100% DOM/Regex?
- Open-web career pages use arbitrary layouts, Tailwind/CSS-in-JS hashed classes, non-English labels (`cosy.green`), or bury the employer name inside a paragraph (`"Join Our Team at UNIPREP"` under an `"Arc Exclusive"` badge on `arc.dev`). Pure selectors plateau around **~85–90%**.

### Why Not 100% AI on Every Page?
- **Latency**: Deterministic scraping populates the popup in `< 30ms`. An LLM call takes `600–1,500ms`. Running AI on standard LinkedIn/Greenhouse/Workable pages where deterministic scraping is 100% accurate degrades UX unnecessarily.
- **Rate Limits & Cost**: Skipping AI on the ~75–85% of pages handled deterministically cuts token usage and rate-limit pressure by **4x–5x**.

### Verified Financial Math (Test Launch & Production Scale)
- Sending cleaned visible text (`innerText` of active modal or `<main>`, capped at ~8,000–10,000 chars) uses **~2,500 input tokens** and **~120–600 output tokens**.
- With **Gemini 2.5 Flash-Lite** (`$0.10` / 1M input, `$0.40` / 1M output):
  - **Per AI scrape**: `$0.00030` (metadata only) to `$0.00049` (with full Markdown description) → **~2,040 to 3,330 scrapes per `$1.00`**.
  - **100 test users × 50 jobs/month = 5,000 jobs/month**:
    - **Google AI Studio Free Tier**: **`$0.00 / month`** (1,000–1,500 free req/day = 30,000–45,000 scrapes/month).
    - **Paid Tier (Hybrid 25–30% AI fallback)**: **`~$0.45 – $0.75 / month` total**.
    - **Paid Tier (100% AI)**: **`~$1.50 – $2.45 / month` total**.

---

## ADR-2: Platform-Agnostic Serverless Endpoint (`/api/scrape-job`) — Netlify & Cloudflare Ready (Zero Vercel Lock-In)

### Decision
Host the AI extraction endpoint at `/api/scrape-job` using standard HTTP/JSON semantics compatible with **Netlify Functions** (Starter Free Tier) and **Cloudflare Pages Functions**, rather than coupling to Vercel-proprietary SDKs, client-side extension keys, or Firebase Cloud Functions.

### Rationale & Provider Comparison (100% Free Tier, No Credit Card Required)
1. **Never put API keys in `extension/`**: Chrome extensions are unpacked zip archives on the user's machine; any key in `popup.js` or `background.js` can be extracted in seconds.
2. **Why not Firebase Cloud Functions?**: Requires upgrading the Firebase project from Spark (Free) to the **Blaze (pay-as-you-go) plan** with a credit card.
3. **Free Serverless Function Alternatives to Vercel**:
   - **Netlify Starter Free Tier (Recommended if migrating from Vercel)**:
     - **125,000 function invocations / month** + 100 GB bandwidth (no credit card required).
     - Enough for **~2,500–8,000+ active monthly users** with hybrid scraping.
     - With a 6-line `netlify.toml` redirect (`/api/*` → `/.netlify/functions/:splat`), both `api/report-issue` and `api/scrape-job` keep the exact `/api/*` URL path so the frontend and extension require only a base-URL constant change.
   - **Cloudflare Pages + Workers Free Tier**:
     - **100,000 function invocations / day (~3,000,000 / month)** + unlimited static bandwidth (no credit card required).
     - Uses the exact same Web Standard `Request` / `Response` (`fetch`) signature as Netlify Functions v2.
   - **Supabase Edge Functions Free Tier**:
     - **500,000 invocations / month** (Deno Web Standard `Request` / `Response`).

### Portability Rule
Write all serverless endpoints (`report-issue` and `scrape-job`) using **zero proprietary framework imports** (no `@vercel/node` or `@netlify/functions` package lock-in) and keep the API origin in a single constant (`TRACKLET_APP_ORIGIN`) so switching from Vercel to Netlify takes under 5 minutes.

---

## ADR-3: Why Visible `<h1>` Inside `<main>` / Active Modal Must Beat `og:title`

### The Trap (What Went Wrong)
In `parseUniversalFallback()`, Step 1 parsed `<meta property="og:title">` and assigned `title`. Step 2 checked `if (!title || GENERIC_HEADINGS.test(title))` before looking at `<h1>`.
- Because 95%+ of websites define `og:title`, **Step 2 (`<h1>`) was dead code across almost the entire web**.
- On `cosy.green`, `og:title` was `"Senior Flutter Developer (m/w/d) – Karriere bei cosy.green"`, whereas the visible `<h1>` had the full title `"Senior Flutter Developer with a focus on UX Design (m/f/d)"`.
- On `arc.dev`, `og:title` was the static homepage slogan `"Hire Top Remote Software Developers for Full-Time..."`, which completely blocked the job title from being read.

### The Rule Moving Forward
1. Always inspect the visible `<h1>` (scoped to the active modal first, then `<main>` / `<article>`) **before** trusting `og:title`, **provided** the `<h1>` is not a generic page header (`"Careers"`, `"Job Openings"`, `"Join Our Team"`, etc.) and is between 3 and 120 characters.
2. Still parse `og:title` / `document.title` to extract `company` if `company` is missing, but **strip career boilerplate prefixes** (`/(?:karriere\s+bei|careers?\s+at|jobs?\s+(?:at|bei)|work(?:ing)?\s+at|join\s+(?:us\s+at\s+)?)\s*/i`) so `"Karriere bei cosy.green"` becomes `"cosy.green"`.

---

## ADR-4: Why `threadSig` Must Hash `notes.length` and `employmentType`

### The Trap (What Went Wrong)
In `extension/content.js`, `checkAndDispatchContextChange()` built a deduplication signature:
```javascript
threadSig = `job:::${jd.role || ''}:::${jd.company || ''}:::${jd.location || ''}:::${jd.workLocation || ''}:::${jd.salary || ''}:::${jd.jobLink || ''}`;
```
On SPAs (Workable, Ashby, React career sites):
1. At `t = 50ms`, `<title>` is already in the DOM, so `role` and `company` are extracted, while `notes` (description) is `""`. `content.js` saves `notes: ""` to `tracklet_active_tab_data` and records `lastObservedThreadSignature`.
2. At `t = 500ms`, the job description finishes fetching and renders into the DOM. `MutationObserver` and `spa_hydration_retry` fire, re-scrape the page (getting the full description), and recompute `threadSig`.
3. Because `threadSig` did not include `(jd.notes || '').length` or `jd.employmentType`, **`threadSig === lastObservedThreadSignature` evaluated to `true` (`threadChanged === false`)**, and `content.js` **threw away the newly scraped description**!

### The Rule Moving Forward
- `threadSig` for `job_posting` / `ats_form` MUST include `:::${jd.employmentType || ''}:::${(jd.notes || '').length > 0 ? Math.min(1000, jd.notes.length) : 0}`.
- `popup.js` hydration re-polling (`effectiveCategory === 'job'`) MUST also re-poll if `!response.jobData?.notes` during initial load.

---

## ADR-5: Why Description Extraction Needs a Readability-Style Density Scorer

### The Trap (What Went Wrong)
1. `content.js` only checked 7 CSS selectors for descriptions (`#job-description`, `.job-description`, `article`, etc.).
2. It used `document.querySelector()`, which returns the **first** matching element in DOM order—even if that element is an empty skeleton node or a 30-character intro banner.
3. Custom career sites (`cosy.green`, Notion, Webflow, Framer, Tailwind `.prose`) don't use `.job-description` or `<article>`.

### The Rule Moving Forward
1. **Multi-section ATS aggregation**: For platforms like Workable that split descriptions across sibling containers (`[data-ui="job-description"]`, `[data-ui="job-requirements"]`, `[data-ui="job-benefits"]`), concatenate all present sections in DOM order.
2. **Best-candidate selection (`querySelectorAll`)**: Across generic selectors (including `[itemprop="description"]`, `.prose`, `[class*="prose"]`, `.w-richtext`, `[class*="description" i]`), evaluate all matches and pick the container with the longest clean text (`> 120` chars).
3. **Readability-style text-density fallback**: When no selector matches, scan `<section>` and `<div>` containers inside the active modal or `<main>` (excluding `nav`, `header`, `footer`, `form`, `aside`), scoring by `(paragraphCount * 50) + (listItemCount * 30) + textLength`, and extract the highest-scoring container (`>= 200` chars).

---

## ADR-6: Non-ARIA Split-Pane Modals & Prose Employer Extraction (`arc.dev` Case)

### The Trap (What Went Wrong)
On `arc.dev/dashboard/d/verified-jobs/...`:
1. The job opens in a React portal overlay that does **not** set `role="dialog"` or `aria-modal="true"`.
2. Because `extractJobFromActiveModalOrDrawer()` missed it, `parseSiteSpecific()` ran `document.querySelector('main')`—which scraped the **background dashboard behind the modal**!
3. Inside the modal, the top badge says `"Arc Exclusive"` while the real company (`UNIPREP`) is stated in the heading `"Join Our Team at UNIPREP"`.

### The Rule Moving Forward
1. **Visual Overlay Detection**: If no `[role="dialog"]` / `[aria-modal="true"]` is found, detect fixed/portal overlays (`getComputedStyle(el).position === 'fixed'`, high `z-index`, visible width `>= 400px` and height `>= 300px`) that contain job signals (an `Apply` / `Fast apply` / `Save` button and `> 250` chars of text). Scope all DOM queries to that overlay.
2. **Prose Employer Fallback**: Whenever `company` is empty, equals the host job board (`"Arc"`, `"Arc Exclusive"`), or matches `GENERIC_SITE_NAMES`, inspect headings (`h1`–`h4`, `strong`) and opening prose inside the job container for `"Join Our Team at <Company>"`, `"At <Company>, we..."`, and `"About <Company>"`.
3. **Sibling Label-Value Extraction**: Support label-value DOM pairs (`<div>Location</div><div>Remote anywhere</div>`, `<div>Salary</div><div>US$50K - 100K</div>`) and dot-separated subtitle bars (`"Remote EU-wide · Full-time"`).
