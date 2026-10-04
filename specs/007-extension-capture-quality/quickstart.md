# Quickstart Validation Guide: Extension Capture Quality

This guide walks through validation scenarios to verify that the extension captures accurate company identities, rich posting details, and recruiter contacts while preserving stage progress.

---

## Prerequisites

1. Run the local development server:
   ```bash
   npm run dev
   ```
2. In Google Chrome / Chromium browser:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select `d:\Programming\Tracklet\extension` (or click reload icon if already loaded)
3. Open `http://localhost:5173` (or production `https://tracklet-eight.vercel.app`) and sign in.

---

## Scenario 1: LinkedIn Job Capture (Company Identity & Recruiter Contact)

**Goal**: Verify that LinkedIn jobs get the employer's logo and website (never LinkedIn's), extract work arrangements, and capture the recruiter.

1. Navigate to any job posting on LinkedIn (e.g. `https://www.linkedin.com/jobs/view/...`).
2. Click the Tracklet extension icon in the browser toolbar to open the popup.
3. **Verify Extracted Fields**:
   - Company name is populated with the hiring company (not "LinkedIn").
   - Company website shows the company's domain or is cleanly editable with live logo preview; it is **NOT** `linkedin.com`.
   - The logo avatar shows the hiring company's favicon/logo or a clean monogram, **NOT** the blue LinkedIn logo.
   - Work arrangement (Remote / Hybrid / On-site) and Employment type (Full-time, etc.) match the posting's tags.
   - If a hirer card is visible on the posting, a checkbox appears: `[✓] Add <Recruiter Name> as contact`.
4. Click **"Save Application"**.
5. **Verify Outcome in Tracklet Web App**:
   - Open Tracklet dashboard.
   - The new application appears with the company logo (or initial monogram).
   - In Contacts Hub, the recruiter appears as a linked Contact.

---

## Scenario 2: ATS Job Postings (Greenhouse / Lever / Workday)

**Goal**: Verify that postings on ATS subdomains do not store the ATS domain as the company website.

1. Navigate to a job posting on:
   - Greenhouse (`boards.greenhouse.io/<company>/jobs/...`)
   - Lever (`jobs.lever.co/<company>/...`)
   - Workday (`<company>.wd1.myworkdayjobs.com/...`)
2. Open the Tracklet extension popup.
3. **Verify Extracted Fields**:
   - Company domain is either the employer's domain or empty; it is **NOT** `greenhouse.io`, `lever.co`, or `workdayjobs.com`.
   - Logo is NOT the ATS provider's logo.
   - Location is populated (e.g., city, state/country).
4. Save the job and verify the card in Tracklet.

---

## Scenario 3: Auto-Correction of Existing Corrupted Records (US2)

**Goal**: Verify that existing applications previously saved with `linkedin.com` or `greenhouse.io` as `companyDomain` display clean monograms/correct logos without database migration.

1. Run the test suite:
   ```bash
   npx vitest run tests/unit/logoUtils.test.ts
   ```
2. In Tracklet, view any application that was historically saved with `companyDomain: "linkedin.com"`.
3. **Verify Outcome**:
   - The row/card does **NOT** render the LinkedIn logo.
   - The fallback company-name resolver resolves the correct company logo or displays a pastel letter monogram.

---

## Scenario 4: Stage Restriction & History Preservation (US5)

**Goal**: Verify that the extension only permits `Saved` or `Applied`, and never destroys the progress of existing jobs.

1. **New Job Test**:
   - Open any job posting.
   - Open extension popup.
   - Observe the stage selector: only **"Saved"** and **"Applied"** are available choices.
   - Save the job as "Saved".
2. **Advance Stage Test**:
   - With the same job page open, open the extension popup again.
   - The duplicate indicator shows "Already in Tracklet (Saved)".
   - Change the stage to "Applied" and save.
   - Open Tracklet detail panel: the job is now "Applied", and the timeline shows two entries (`Saved` → `Applied`).
3. **Read-Only Later Stage Test**:
   - In Tracklet, move the job to **"Interview"**.
   - Open the extension on that job's URL.
   - In the popup, stage is displayed as a read-only badge: `Interview`. The dropdown cannot change it back to `Saved`.
   - Update notes and save.
   - In Tracklet: verify the stage remains **`Interview`** with its full history intact.

---

## Automated Verification Commands

```bash
# Type check TypeScript codebase
npx tsc --noEmit

# Run unit tests for logo sanitization, job board registry, and utils
npm test

# Production build check
npm run build
```
