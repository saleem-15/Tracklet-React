# Research: Extension Capture Quality

## R1. Company Domain & Logo Resolution (FR-001, FR-002, FR-003, US1)

### Context & Finding
Previously, `extension/content.js` called `getDomainFromUrl(window.location.href)` and returned it as `domain`. When clipping from `https://www.linkedin.com/jobs/view/...`, `domain` evaluated to `"linkedin.com"`. In `popup.js` and `background.js`, this was written as `companyDomain: "linkedin.com"` and `logoUrl: "https://logo.clearbit.com/linkedin.com"`. Clearbit's free logo API (`logo.clearbit.com`) is also deprecated, rate-limited, and unreliable.

### Decision
1. **Never use the job-board host**: Before assigning any candidate as `companyDomain`, validate it against `isJobBoardOrAts(candidate)`. If it matches, reject it.
2. **Prioritized Domain Resolution Chain**:
   - **Step 1 — JSON-LD `sameAs` or `hiringOrganization.url`**: Check `<script type="application/ld+json">` for `hiringOrganization.sameAs` or `hiringOrganization.url`. If it points to an external company website (and is not an ATS/job board), extract its root domain.
   - **Step 2 — Site-specific company anchor**:
     - *LinkedIn*: Inspect company anchor tags (e.g. `.job-details-jobs-unified-top-card__company-name a`). If linking to `/company/<slug>/`, extract the company slug.
     - *Greenhouse / Lever / Ashby*: Extract the ATS sub-domain / slug (e.g. `boards.greenhouse.io/stripe` → slug `"stripe"`).
   - **Step 3 — Known Company Dictionary**: Check against `KNOWN_COMPANY_DOMAINS` (shared dictionary of 40+ major tech companies: Stripe, Figma, Notion, Linear, etc.).
   - **Step 4 — Direct Company Site**: If the posting is hosted directly on the employer's company site (e.g. `careers.airbnb.com`), strip subdomains like `careers.`, `jobs.`, `apply.` to obtain the base domain (`airbnb.com`).
   - **Step 5 — Fallback**: If no domain can be determined with high confidence, set `companyDomain: ""` and `logoUrl: undefined`. **Do not guess or use the job board**. Tracklet will render a stylish pastel letter monogram.
3. **Editable Domain with Live Logo Preview**:
   - The extension popup displays the extracted `companyDomain` (or allows the user to type it).
   - When the user edits the company domain, the logo preview updates immediately using Google Favicon (`https://www.google.com/s2/favicons?domain=${domain}&sz=128`) with monogram fallback on error.
4. **Logo URL Persistence**:
   - Avoid hardcoding temporary CDN URLs (e.g. expiring AWS S3 URLs or LinkedIn media URLs with tokens).
   - Only persist high-durability logo endpoints or leave `logoUrl` undefined so Tracklet's dynamic resolver generates it from `companyDomain` or `company`.

### Rationale
- Prevents job boards (e.g., linkedin.com, greenhouse.io) from being stored as the company website, which breaks logo rendering and email matching.
- Google Favicon v2 is highly reliable, fast, resilient against rate-limiting, and completely free from sunset risks.
- Monograms provide a clean, intentional visual appearance when no verified company domain is available.

### Alternatives Considered
- **Clearbit Logo API**: Rejected because Clearbit's free endpoint is deprecated, intermittently blocks requests, and frequently fails in production.
- **Scraping arbitrary `<img>` tags on the page**: Rejected because job board CDN URLs include temporary authorization tokens (e.g., LinkedIn media tokens that expire in hours/days), resulting in broken images later.
- **Dynamic search engine lookups**: Rejected due to latency, network requirements, privacy concerns, and potential hallucination/mismatches.

---

## R2. Unified Job-Board & ATS Registry (FR-004)

### Context & Finding
Three separate files maintained partial, out-of-sync lists of job boards and ATS domains:
- `src/lib/logoUtils.ts` (regex with 11 patterns)
- `extension/popup.js` (`ATS_DOMAINS` array with 8 items)
- `extension/content.js` (`ATS_DOMAINS` array with 10 items)

### Decision
Define a single canonical registry of job boards, aggregators, and ATS hosts:
- Create `src/lib/jobBoardRegistry.ts` exporting:
  - `JOB_BOARD_HOSTS`: Set of known job boards (e.g. `linkedin.com`, `indeed.com`, `glassdoor.com`, `ziprecruiter.com`, `monster.com`, `simplyhired.com`, `otta.com`, `wellfound.com`, `angel.co`, `dice.com`, `careerbuilder.com`, etc.)
  - `ATS_HOSTS`: Set of known ATS hosts (e.g. `greenhouse.io`, `lever.co`, `ashbyhq.com`, `workdayjobs.com`, `myworkdayjobs.com`, `smartrecruiters.com`, `jobvite.com`, `recruitee.com`, `rippling-ats.com`, `bamboohr.com`, `icims.com`, `jazzhr.com`, `workable.com`, `breezy.hr`)
  - `isJobBoardOrAts(hostnameOrUrl: string): boolean`: Robust matching function handling subdomains and protocols.
  - `cleanCompanyDomain(urlOrHost: string): string | null`: Strips protocol, `www.`, path, and returns clean domain if valid and not a job board/ATS.
- For the extension (plain MV3 JS without a bundler), mirror these constants into `extension/jobBoardRegistry.js` (loaded in `manifest.json` content scripts and popup).

### Rationale
- Consolidating into a single source of truth eliminates drift and guarantees that any new ATS or board added to the registry is recognized by both web app and extension simultaneously.
- Unit testing the registry in `tests/unit/jobBoardRegistry.test.ts` ensures edge cases (subdomains, port numbers, malformed protocols) are thoroughly guarded against regressions.

### Alternatives Considered
- **Single npm package / shared module bundled via Vite**: Rejected because the extension directory uses vanilla ES2020 JavaScript in MV3 without a build step or bundler. Introducing a bundler for one file would add unnecessary build friction.
- **Maintaining inline regexes in each file**: Rejected because fragmented lists led directly to the original defect where ATS hosts slipped through.

---

## R3. Display-Time Filtering for Existing Bad Logos (FR-005, US2)

### Context & Finding
Existing users already have applications saved with `companyDomain: "linkedin.com"` or `logoUrl: "https://logo.clearbit.com/linkedin.com"`.
In `src/lib/logoUtils.ts`:
```ts
if (customDomain && customDomain.trim()) return customDomain;
if (customLogoUrl && customLogoUrl.trim()) return [customLogoUrl];
```
Because of this, existing records will continue showing the LinkedIn logo forever unless Tracklet sanitizes them at display time.

### Decision
Update `getCompanyDomain()` and `getCompanyLogoUrls()` in `src/lib/logoUtils.ts`:
1. If `customDomain` satisfies `isJobBoardOrAts(customDomain)`, **ignore it** and fall back to known dictionary or company name slug.
2. If `customLogoUrl` contains any job board / ATS domain or resolves to a board's logo, **ignore it**.
3. Update email-to-job matching in `src/lib/emailMatchingUtils.ts`: do not match incoming company emails against job board domains.

### Rationale
- 100% of existing corrupted jobs are instantly corrected across the entire Tracklet web app without needing a database migration script.
- Zero risk of migration failures, connectivity issues, or data clobbering for offline/mobile users.

### Alternatives Considered
- **One-off Firestore batch migration script**: Rejected because it requires administrative service credentials, risks clobbering user fields, does not heal offline caches, and leaves dormant user accounts unaffected until accessed.
- **Requiring manual user edits**: Rejected as poor user experience for users with dozens or hundreds of saved LinkedIn applications.

---

## R4. Page Extraction for Rich Fields (FR-007, FR-008, FR-009, FR-010, US3)

### Context & Finding
Tracklet already has first-class support in `Application` for:
- `location?: string`
- `workLocation?: WorkLocation` ('Remote' | 'Hybrid' | 'Onsite')
- `employmentType?: EmploymentType` ('Full-time' | 'Part-time' | 'Contract' | 'Internship')
- `notes?: string` (job description summary)

However, the extension previously extracted none of these, leaving them blank and causing dashboard filters (e.g. Remote, Full-time) to miss them.

### Decision
Enhance `extension/content.js` to parse these fields from two sources:
1. **Structured Data (JSON-LD `@type: JobPosting`)**:
   - `location`: Parse `jobLocation.address.addressLocality`, `addressRegion`, `addressCountry`. Format as e.g. "Berlin, Germany" or "San Francisco, CA".
   - `workLocation`:
     - If `jobLocationType === "TELECOMMUTE"` or `applicantLocationRequirements` exists → `'Remote'`
     - If text includes "hybrid" in `description` or title → `'Hybrid'`
     - Otherwise if physical location specified without remote indicators → `'Onsite'`
   - `employmentType`:
     - `"FULL_TIME"` → `'Full-time'`
     - `"PART_TIME"` → `'Part-time'`
     - `"CONTRACTOR"` | `"TEMPORARY"` → `'Contract'`
     - `"INTERN"` → `'Internship'`
   - `notes` (Job Description):
     - If user has highlighted text on the page, use the highlighted text.
     - If no highlight, strip HTML from `description`, take the first ~400 characters or key bullet points as a clean summary.
2. **Site-Specific DOM Fallbacks**:
   - *LinkedIn*: Extract from pills in `.job-details-jobs-unified-top-card__primary-description-container`.
   - *Indeed*: Extract from `.jobsearch-JobInfoHeader-subtitle` and `#jobDetailsSection`.
   - *Greenhouse*: Extract from `.location`.
   - *Lever*: Extract from `.posting-categories`.
3. **Conservative Mapping Rule**:
   - If a value cannot be unambiguously mapped to `'Remote' | 'Hybrid' | 'Onsite'` or `'Full-time' | 'Part-time' | 'Contract' | 'Internship'`, leave the field undefined. Never guess.

### Rationale
- Saves significant manual data entry at save time.
- JSON-LD `@type: JobPosting` is the standard schema used by Google Jobs, LinkedIn, and major ATS platforms, making it resilient to frontend layout and CSS class changes.
- Conservative mapping guarantees zero false categorizations.

### Alternatives Considered
- **AI/LLM-based DOM extraction at clip time**: Rejected due to latency (1-3s), API token cost, Chrome extension manifest restrictions, and network dependency.
- **Loose whole-page keyword matching**: Rejected because words like "remote" appear frequently in unrelated disclaimers (e.g., "no remote work allowed"), generating false positives.

---

## R5. Hiring Contact Extraction & Linking (FR-011, US4)

### Context & Finding
On LinkedIn job postings, a hirer card frequently appears:
- Element `.hirer-card__hirer-information`, `.jobs-poster__name`, or an anchor linking to `linkedin.com/in/<profile>`.
- Contains: Recruiter / Manager Name, Job Title (e.g. "Technical Recruiter at Acme"), LinkedIn Profile URL.
Previously, this high-value networking lead was lost and had to be manually re-typed into Contacts Hub.

### Decision
1. In `content.js`, detect the hiring contact:
   - Extract `name`, `role` (title), and `linkedIn` URL.
2. In `popup.html` / `popup.js`:
   - If a contact is detected, show a subtle pre-checked card/pill:
     `[✓] Add contact: Jane Doe (Technical Recruiter)`
   - The user can uncheck it if they do not wish to save the contact.
3. In `background.js` (or via Firestore REST / Web App sync):
   - When saving the application:
     - Check if a contact with this `linkedIn` URL already exists for the user.
     - If exists: link its `id` to `application.contactIds`.
     - If new: create a `Contact` document in Firestore (`contacts` collection) with `category: 'Recruiter'` (or `'Hiring Manager'` if title contains manager/director/lead), link it to `application.contactIds`.
     - Also attach the embedded `contacts` array in the optimistic local payload for instant UI responsiveness.

### Rationale
- Connects the extension clipping workflow directly with Tracklet's standalone Contacts Hub.
- Deduplication prevents polluting Contacts Hub when re-clipping or viewing multiple postings handled by the same recruiter.
- Explicit opt-in checkbox gives the user full control.

### Alternatives Considered
- **Silent automatic creation without user confirmation**: Rejected because users should have explicit agency over who enters their contact directory.
- **Deferring contact capture to a separate extension tool**: Rejected because the context is already available during job clipping, making separate workflows redundant.

---

## R6. Stage Rules & History Preservation (FR-012, FR-013, FR-014, FR-015, US5)

### Context & Finding
Previously, `popup.js` let the user pick any of the 7 stages (`Saved`, `Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, `Archived`). If a user re-saved or updated a job already at `Interview`, the extension overwrote `status: 'Saved'` and replaced the entire `history` array with a single element:
```javascript
history: [{ toStatus: selectedStage, timestamp: nowISO }]
```
This caused silent data destruction of stage progress and interview history.

### Decision
1. **Restrict Stage Choices in Extension**:
   - For a **new job**: Only **`Saved`** and **`Applied`** are allowed.
   - Default stage heuristic:
     - If the current page URL or title indicates a completed application (e.g. matches `/(?:confirmation|applied|thank-you|success|submitted)/i`), default to **`Applied`**.
     - Otherwise, default to **`Saved`**.
2. **Handle Existing Jobs (Duplicate Detection)**:
   - If the job already exists in Tracklet:
     - If `existingApp.status === 'Saved'`: allow user to toggle to **`Applied`**.
     - If `existingApp.status` is **`Applied`** or any later stage (`Screening`, `Interview`, `Offer`, `Rejected`, `Archived`):
       - Show the existing stage as a **read-only status badge**.
       - Disable stage modification from the extension clipper.
3. **Stage History Preservation**:
   - When updating an existing job:
     - If status changes (`Saved` → `Applied`):
       - Preserve all existing history entries: `history: [ ...(existingApp.history || []), { id: generateId(), fromStatus: 'Saved', toStatus: 'Applied', timestamp: nowISO, note: 'Applied via Tracklet extension' } ]`
       - Update `stageUpdatedAt: nowISO`.
     - If status does not change:
       - Retain existing `status`, `stageUpdatedAt`, and `history` without modification.
4. **Email Companion Independence (FR-016)**:
   - The email companion in Gmail/Outlook continues to allow advancing stages (e.g. logging an interview invite can advance the stage to `Interview`). The Saved/Applied restriction applies strictly to the job clipper.

### Rationale
- Users only ever clip jobs to bookmark them (`Saved`) or after submitting (`Applied`). Allowing stages like `Interview` or `Offer` in the extension clipper creates invalid workflows and severe risk of accidental data regression.
- Immutability of later stages protects existing user progress and stage history from being overwritten.

### Alternatives Considered
- **Allowing all 7 stages in dropdown**: Rejected because it enables destructive regressions and breaks single-source-of-truth expectations.
- **Blocking updates completely if the job exists**: Rejected because users often clip from a confirmation page after applying to update a bookmark from `Saved` to `Applied` or append recruiter notes.

---

## R7. UI/UX & Autofill Preparation (Spec 008 Bridge)

### Context & Finding
The extension popup requires a polished, compact interface that fits naturally into the browser without feeling cramped or overwhelming. It also needs to provide clean, normalized extracted data that can be consumed by future form-autofill features (Spec 008).

### Decision
1. **Popup Design Tokens**:
   - Calm, structured 380px popup width.
   - Company identity chip with live Google Favicon preview and editable domain trigger.
   - Work Arrangement and Employment Type represented as compact, interactive pill buttons.
   - Discrete, warm recruiter contact card with toggle switch.
2. **Autofill Normalized Schema**:
   - The structured extractor in `content.js` outputs a normalized data contract conforming to `contracts/capture-protocol.md`, ensuring full forward-compatibility with Spec 008 form autofill.

### Rationale
- Interactive pills offer significantly faster single-click selection compared to native `<select>` menus.
- Consistent with Tracklet's design principles: high clarity, zero clutter, accessible contrast tokens (`text-slate-500` minimum).

### Alternatives Considered
- **Injecting an in-page floating widget or drawer**: Rejected because host page CSS and conflicting script bundles can break floating widgets, and users find unprompted in-page overlays intrusive.
- **Native browser dialogs or raw form controls**: Rejected to maintain Tracklet's high-craft aesthetic and keyboard accessibility.
