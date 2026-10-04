# Research: Extension Capture Quality

## R1. Company Domain & Logo Resolution (FR-001, FR-002, FR-003, US1)

### Context & Finding
Today, `extension/content.js` calls `getDomainFromUrl(window.location.href)` and returns it as `domain`. When clipping from `https://www.linkedin.com/jobs/view/...`, `domain` is `"linkedin.com"`. In `popup.js` and `background.js`, this gets written as `companyDomain: "linkedin.com"` and `logoUrl: "https://logo.clearbit.com/linkedin.com"`. Furthermore, Clearbit's free logo API (`logo.clearbit.com`) is increasingly rate-limited or deprecated.

### Decisions
1. **Never use the job-board host**: Before assigning any candidate as `companyDomain`, test it against `isJobBoardOrAts(candidate)`. If it matches, reject it.
2. **Prioritized Domain Resolution Chain**:
   - **Step 1 — JSON-LD `sameAs` or `hiringOrganization.url`**: Check `<script type="application/ld+json">` for `hiringOrganization.sameAs` or `hiringOrganization.url`. If it points to an external company website (and is not an ATS/job board), extract its root domain.
   - **Step 2 — Site-specific company anchor**:
     - *LinkedIn*: Inspect company anchor tags (e.g. `.job-details-jobs-unified-top-card__company-name a`). Often this links to `/company/<slug>/`. If the company website is not directly linked, the company name is used in Step 3.
     - *Greenhouse / Lever / Ashby*: Extract the ATS sub-domain / slug (e.g. `boards.greenhouse.io/stripe` → slug `"stripe"`).
   - **Step 3 — Known Company Dictionary**: Check against `KNOWN_COMPANY_DOMAINS` (shared dictionary of 40+ major tech companies: Stripe, Figma, Notion, Linear, etc.).
   - **Step 4 — Direct Company Site**: If the posting is hosted directly on the employer's company site (e.g. `careers.airbnb.com`), strip subdomains like `careers.`, `jobs.`, `apply.` to obtain the base domain (`airbnb.com`).
   - **Step 5 — Fallback**: If no domain can be determined with high confidence, set `companyDomain: ""` and `logoUrl: undefined`. **Do not guess or use the job board**. Tracklet will render a stylish pastel letter monogram.
3. **Editable Domain with Live Logo Preview**:
   - The extension popup will display the extracted `companyDomain` (or allow the user to type it).
   - When the user edits the company domain, the logo preview updates immediately using Google Favicon (`https://www.google.com/s2/favicons?domain=${domain}&sz=128`) with monogram fallback on error.
4. **Logo URL Persistence**:
   - Avoid hardcoding temporary CDN URLs (e.g. expiring AWS S3 URLs or LinkedIn media URLs with tokens).
   - Only persist high-durability logo endpoints or leave `logoUrl` undefined so Tracklet's dynamic resolver generates it from `companyDomain` or `company`.

---

## R2. Unified Job-Board & ATS Registry (FR-004)

### Context & Finding
Three separate files maintain partial lists of job boards and ATS domains:
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
- For the extension (plain MV3 JS without a bundler), mirror these constants into `extension/jobBoardRegistry.js` (loaded in `manifest.json` content scripts and popup) or export via shared module.

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
**Result**: 100% of existing corrupted jobs are instantly corrected across the entire Tracklet web app without needing a database migration script.

---

## R4. Page Extraction for Rich Fields (FR-007, FR-008, FR-009, FR-010, US3)

### Context & Finding
Tracklet already has first-class support in `Application` for:
- `location?: string`
- `workLocation?: WorkLocation` ('Remote' | 'Hybrid' | 'Onsite')
- `employmentType?: EmploymentType` ('Full-time' | 'Part-time' | 'Contract' | 'Internship')
- `notes?: string` (job description summary)

However, the extension currently extracts none of these, leaving them blank.

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
   - *LinkedIn*:
     - Pills in `.job-details-jobs-unified-top-card__primary-description-container`: contain location string (e.g. "Seattle, WA"), arrangement ("On-site", "Hybrid", "Remote"), type ("Full-time", "Contract").
   - *Indeed*:
     - `.jobsearch-JobInfoHeader-subtitle`: location.
     - `#jobDetailsSection`: work setting & job type tags.
   - *Greenhouse*:
     - `.location`: location text.
   - *Lever*:
     - `.posting-categories .location`: location text.
     - `.posting-categories .workplace-type`: Remote / Hybrid / On-site.
     - `.posting-categories .commitment`: Full-time / Contract / etc.

3. **Conservative Mapping Rule**:
   - If a value cannot be unambiguously mapped to `'Remote' | 'Hybrid' | 'Onsite'` or `'Full-time' | 'Part-time' | 'Contract' | 'Internship'`, leave the field undefined. Never guess.

---

## R5. Hiring Contact Extraction & Linking (FR-011, US4)

### Context & Finding
On LinkedIn job postings, a hirer card often appears:
- Element `.hirer-card__hirer-information`, `.jobs-poster__name`, or an anchor linking to `linkedin.com/in/<profile>`.
- Contains: Recruiter / Manager Name, Job Title (e.g. "Technical Recruiter at Acme"), LinkedIn Profile URL.
Currently, this high-value networking lead is lost.

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

---

## R6. Stage Rules & History Preservation (FR-012, FR-013, FR-014, FR-015, US5)

### Context & Finding
Today, `popup.js` lets the user pick any of the 7 stages (`Saved`, `Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, `Archived`). If a user re-saves or updates a job already at `Interview`, the extension overwrites `status: 'Saved'` and replaces the entire `history` array with a single element:
```javascript
history: [{ toStatus: selectedStage, timestamp: nowISO }]
```
This causes silent data destruction.

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

---

## R7. UI/UX & Autofill Preparation (Spec 008 Bridge)

### Impeccable Design Principles for the Extension Popup
- **Compact & High-Clarity**: Maintain a clean, calm 380px popup width.
- **Editable Identity**: Company Name with inline domain chip and live logo avatar. If domain is missing, a subtle "+ Add website" trigger lets users enter it.
- **Pills for Attributes**: Work Arrangement (Remote/Hybrid/Onsite) and Employment Type displayed as compact selectable badge pills rather than bulky dropdowns.
- **Hiring Contact Card**: A warm, discrete card showing avatar initial, name, and role with an active checkbox.
- **Autofill Readiness**: The structured extractor in `content.js` will output a normalized schema matching what form autofillers require in feature `008`.
