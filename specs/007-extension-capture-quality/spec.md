# Feature Specification: Extension Capture Quality

**Feature Branch**: `fix/extension-capture-quality`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "The extension does not capture the company logo correctly. On LinkedIn it shows the LinkedIn logo (also on other sites). Also let it grab the other data that we store. The job stage should be Saved or Applied only in the extension."

**Related specs**: `006-extension-auth-sync` (where saves go), `008-extension-companion-redesign` (how fields are presented, autofill readiness). This spec is UI-agnostic: it defines *what* is captured and the rules for it, so it works in today's popup and in the redesign.

## Root causes found (context for planning, not requirements)

1. **Wrong logo/domain**: The extension records the *website it is on* (e.g. linkedin.com, greenhouse.io) as the company's website, then builds the logo from it. Every LinkedIn job therefore gets LinkedIn's logo.
2. **The bad value wins downstream**: Tracklet treats a saved logo/website as authoritative and skips its own job-board filtering, so the wrong logo sticks permanently. The wrong website also breaks email-to-job matching (every LinkedIn job "matches" LinkedIn emails; none match the real company).
3. **Three different job-board lists**: The web app, the extension form, and the extension page reader each keep their own, slightly different list of job boards/ATS hosts.
4. **Stage data loss**: Saving a job that already exists in Tracklet (from the right-click menu) overwrites its stage and replaces its stage history with a single entry. A job at "Interview" can silently drop back to "Saved".
5. **Fields never filled**: Location, work arrangement, employment type, and the hiring contact are available on most postings but are never captured.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The right company identity and logo (Priority: P1)

When a user saves a job from a job board or applicant-tracking site, Tracklet shows the hiring company's logo and website, never the job board's.

**Why this priority**: It's the most visible defect, and the wrong website also silently breaks email matching.

**Independent Test**: Save one job each from LinkedIn, Indeed, Greenhouse, Lever, Workday, and a company careers page. Each shows the hiring company's logo (or a clean monogram), never the board's.

**Acceptance Scenarios**:

1. **Given** a LinkedIn job at Stripe, **When** the user saves it, **Then** the logo is Stripe's (or an "S" monogram if no logo can be found), and the stored company website is not linkedin.com.
2. **Given** a job hosted on an applicant-tracking site (e.g. Greenhouse, Lever, Ashby, Workday), **When** saved, **Then** the ATS's own website is never stored as the company's website.
3. **Given** a job on the company's own careers site (e.g. careers.acme.com), **When** saved, **Then** the company website is the company's main domain (acme.com).
4. **Given** the extension cannot determine the company website with confidence, **When** the job is saved, **Then** no website or logo is stored, and Tracklet shows a monogram rather than a wrong logo.
5. **Given** the user sees a wrong or missing logo before saving, **When** they edit the company website, **Then** the logo preview updates, and the corrected website is saved.
6. **Given** a job board's logo image is temporary (expiring link), **When** the job is saved, **Then** that temporary image is not stored as the permanent logo.

---

### User Story 2 - Existing bad logos fix themselves (Priority: P1)

Jobs already saved with a job board's website or logo display correctly without the user editing each one.

**Why this priority**: Fixing only new saves leaves every existing LinkedIn job with the wrong logo.

**Independent Test**: An existing record whose stored website is linkedin.com displays a monogram or the correct company logo after the fix ships.

**Acceptance Scenarios**:

1. **Given** an existing job whose stored company website or logo points to a job board/ATS, **When** Tracklet displays it, **Then** that stored value is ignored and the normal company-name-based logo resolution is used.
2. **Given** such a record, **When** email-to-job matching runs, **Then** the job-board website is not used for matching.

---

### User Story 3 - Capture the details Tracklet already tracks (Priority: P1)

When saving, the extension pre-fills every detail Tracklet stores that the posting reveals, so the user doesn't retype it later.

**Why this priority**: The web app has filters for work arrangement and employment type, but extension-saved jobs arrive empty, so those filters silently miss them.

**Independent Test**: Save a posting that states "Remote · Full-time · Berlin, Germany". All three appear pre-filled and editable before saving, and are stored.

**Acceptance Scenarios**:

1. **Given** a posting that states its location, **When** opened in the extension, **Then** Location is pre-filled (city/region/country as shown).
2. **Given** a posting that states Remote / Hybrid / On-site, **When** opened, **Then** Work arrangement is pre-filled with the matching option.
3. **Given** a posting that states Full-time / Part-time / Contract / Internship (including common variants such as "Contractor", "Temporary", "Intern"), **When** opened, **Then** Employment type is pre-filled with the closest option. If no option fits, it is left empty, never guessed.
4. **Given** no text is highlighted and the posting has a description, **When** opened, **Then** Notes is pre-filled with a short plain-text summary of the description. Highlighted text, if any, always takes precedence.
5. **Given** any pre-filled value, **When** the user edits or clears it, **Then** the user's value is what gets saved.
6. **Given** a field cannot be determined, **When** opened, **Then** it is left empty and clearly editable. Empty is better than wrong.

---

### User Story 4 - Capture the hiring contact (Priority: P2)

If the posting names a recruiter or job poster, the user can save them as a Contact linked to this job in one step.

**Why this priority**: Contacts Hub exists, and the person who posted the job is the warmest lead. Today it must be copied by hand.

**Independent Test**: Open a LinkedIn posting that shows the job poster. The extension offers to add them. After saving, the Contact exists with name, title, and profile link, linked to the job.

**Acceptance Scenarios**:

1. **Given** a posting shows a recruiter/poster with name (and optionally title and profile link), **When** opened, **Then** the extension offers "Add <name> as contact", pre-checked.
2. **Given** the user keeps it checked and saves, **When** the save completes, **Then** a Contact is created (category Recruiter unless the posting says hiring manager) and linked to the job.
3. **Given** a Contact with the same profile link or email already exists, **When** saving, **Then** the existing Contact is linked instead of creating a duplicate.
4. **Given** the user unchecks it, **When** saving, **Then** no Contact is created.

---

### User Story 5 - Stage is Saved or Applied, and never destroys progress (Priority: P1)

The extension only records the two stages a user can truthfully set while browsing: "Saved" (bookmark for later) and "Applied" (just submitted). It never moves an existing job backwards or erases its history.

**Why this priority**: Five of the seven current choices are never true at clip time, and the current behavior can silently reset a job at "Interview" to "Saved".

**Independent Test**: (a) New clip offers only Saved/Applied. (b) Re-saving a posting already at Interview leaves it at Interview with history intact.

**Acceptance Scenarios**:

1. **Given** a new job, **When** the user saves from the extension, **Then** the only stage choices are Saved and Applied.
2. **Given** a new job, **When** the extension opens, **Then** the default stage is Saved on a posting page and Applied on a page that indicates a submitted application (e.g. confirmation / "thank you for applying" page). The user can switch it.
3. **Given** the job already exists at Saved, **When** the user opens it in the extension, **Then** they can mark it Applied, and a stage-history entry is added.
4. **Given** the job already exists at any later stage (Applied, Screening, Interview, Offer, Rejected, Archived), **When** the user opens it in the extension, **Then** its stage is shown read-only and no extension action changes it.
5. **Given** any save of an existing job from any entry point (form, right-click menu, shortcut), **When** it completes, **Then** existing stage and stage history are preserved, and only new information is added.
6. **Given** the email companion logs an email for a job, **When** the user chooses to advance the stage (e.g. interview invite → Interview), **Then** that remains allowed. The Saved/Applied restriction applies to job capture only.

### Edge Cases

- Company name on the page is the board's name (e.g. page title "Jobs | LinkedIn") → never accept a job-board name as the company.
- Staffing agency posts on behalf of an unnamed client → company is the agency as shown; no invented client.
- Multiple locations ("London or Remote") → Location keeps the posted text; Work arrangement only set if unambiguous.
- "Remote (US only)" → Work arrangement Remote; Location "United States".
- Posting in a non-English language → fields left empty rather than mis-mapped, unless the structured data on the page states them.
- Same job saved from LinkedIn and later from the company's ATS → treated as the same job by the existing duplicate detection; the better company website (non-board) wins.
- Logo service unavailable → monogram, never a broken image.

## Requirements *(mandatory)*

### Functional Requirements

**Company identity & logo**
- **FR-001**: The extension MUST NOT store a job board's or applicant-tracking site's address as the company website.
- **FR-002**: The extension MUST determine the company website from, in order of trust: the posting's own structured company information; the company link/details on the posting; the current site only when it is the company's own site (reduced to its main domain). If none apply, leave it empty.
- **FR-003**: The extension MUST NOT store a logo image that is temporary, board-hosted, or not specific to the company. If no durable company logo is known, store none and let Tracklet derive it from the website or show a monogram.
- **FR-004**: There MUST be one shared definition of job-board/ATS hosts used by the web app and the extension.
- **FR-005**: Tracklet MUST ignore stored company websites and logos that match a job-board/ATS host, both for display and for email matching. This fixes existing records without editing data.
- **FR-006**: The company website MUST be visible and editable before saving, with a live logo preview.

**Additional fields**
- **FR-007**: The extension MUST capture, when the posting states them: Location, Work arrangement (Remote/Hybrid/Onsite), Employment type (Full-time/Part-time/Contract/Internship).
- **FR-008**: When no text is highlighted, the extension MUST pre-fill Notes with a plain-text description summary of bounded length; highlighted text takes precedence.
- **FR-009**: Values MUST only be mapped to an allowed option when the mapping is unambiguous; otherwise the field stays empty.
- **FR-010**: Every captured value MUST be editable before saving, and the user's edits MUST win.
- **FR-011**: The extension MUST offer to save a recruiter/job poster shown on the posting as a linked Contact, de-duplicated against existing Contacts by profile link or email.

**Stage**
- **FR-012**: New jobs captured by the extension MUST be limited to Saved or Applied.
- **FR-013**: For existing jobs, the only stage change the extension may make is Saved → Applied, recorded in stage history.
- **FR-014**: No extension save path MAY overwrite a later stage or replace existing stage history.
- **FR-015**: Stage-history entries written by the extension MUST use the same shape as those written by Tracklet.
- **FR-016**: The email companion's ability to advance stages is unchanged by this spec.

### Key Entities

- **Captured Job**: company, role, platform, job link, company website, logo (optional), location, work arrangement, employment type, notes, stage (Saved|Applied), date. These are all fields that already exist in Tracklet. No new fields.
- **Captured Contact**: name, title, profile link, optional email, category; linked to the job.
- **Job-Board Registry**: The single list of hosts that are job boards or applicant-tracking systems, never valid as company identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across a test set of 30 postings (5 each from LinkedIn, Indeed, Greenhouse, Lever, Workday, company sites), 0 show a job board or ATS logo.
- **SC-002**: On the same set, ≥ 80% show the correct company logo; the rest show a monogram. 0 show a wrong company's logo.
- **SC-003**: After release, 100% of existing records with a job-board website display without the board's logo, with no manual edits.
- **SC-004**: For postings that state them, Location, Work arrangement, and Employment type are pre-filled correctly in ≥ 90% of the test set, and never filled with a wrong option.
- **SC-005**: Re-saving 10 existing jobs at various later stages leaves 10/10 stages and histories unchanged.
- **SC-006**: Time from opening the extension to saving a fully detailed job drops, because the user no longer types location/type/arrangement/contact. Target: median ≤ 10 seconds on the test set.

## Assumptions

- No new data fields. Salary and posting deadline are explicitly out of scope (would require a data-model change).
- Job-board pages change their markup often; structured job data published on the page is preferred over page-layout scraping wherever available.
- The free Clearbit logo endpoint currently used by the extension should be treated as unreliable/sunset (*verify current status*). Tracklet already resolves logos without it.
- "Applied" auto-default relies on recognizable confirmation pages; when unsure, default to Saved (the safer, non-committal choice).
- Autofill of application forms is out of scope here; see `008`.
