# Tracklet — Product Definition & Architecture

## 1. Product Vision
Tracklet is a commercial, cloud-native B2C SaaS platform and Chrome Extension that acts as a command center for modern job seekers. It eliminates spreadsheet chaos and repetitive form entry by combining 1-click job capture, ATS form autofill, unified application journey tracking, recruiter contact/email logging, and pipeline conversion analytics.

## 2. Core Value Proposition
- **Speed to Apply:** Capture job postings in 1 click and autofill complex ATS forms (Greenhouse, Lever, Workday, Ashby) directly from the browser extension.
- **Single Source of Truth:** Every application's status history, tailored resume, recruiter contacts, email logs, and interview prep notes live in a single cloud-synced workspace.
- **Actionable Pipeline Intelligence:** Real-time visibility into application velocity, stage-to-stage conversion rates, and bottleneck stages.

## 3. Target Personas
1. **High-Velocity Active Job Seekers:** Software engineers, product managers, designers, and knowledge workers submitting 15–100+ applications who need speed, organization, and interview preparation tools.
2. **Selective Career Switchers / Passive Candidates:** Professionals tracking high-stakes opportunities over several months who value deep contact tracking, email logs, and structured notes.

## 4. Product Surfaces & Core Features

### A. Web Application (`src/`)
- **Active Pipeline Board (`ActivePipelineBoard.tsx`):** Kanban board for active stages (*Saved*, *Applied*, *Screen*, *Interviewing*, *Offer*) with drag-and-drop transitions and action-only navigation badges (ADR 0010).
- **All Applications Inventory (`AllApplicationsTable.tsx`):** High-density searchable, filterable table view including terminal states (*Rejected*, *Ghosted*, *Withdrawn*).
- **Application Detail Panel (`ApplicationDetailPanel.tsx`):** Slide-over workspace featuring:
  - **Unified Application Journey:** Embedded chronological status history and transition timeline (ADR 0003).
  - **Always-Editable Notes Editor:** Shared markdown surface with slash-menu commands, fenced code blocks, and debounced cloud autosave (ADR 0006, ADR 0007).
  - **Contact & Email Log:** Normalized markdown email ingestion, recruiter contact linking, and cross-visibility projection (ADR 0008, ADR 0009, Spec 012).
  - **Cloud Document Vault:** User-scoped resume and cover letter storage in Firebase Cloud Storage (superseding local `IndexedDB` storage).
- **Analytics & Insights (`StatsView.tsx`, `analytics/`):** Pipeline conversion funnels, response rates, and weekly application velocity metrics.
- **Support & Issue Reporting (`TesterReportModal.tsx`, `api/report-issue.ts`):** Authenticated customer support and broken job-board/scraper reporting flow.

### B. Chrome Extension (`extension/`)
- **1-Click Job Capture & Scraper (`popup.js`, `api/scrape-job.ts`):** Extracts job title, company, location, salary, and description from supported job boards (`jobBoardRegistry.js`) and syncs directly to Firestore.
- **Duplicate Detection (`content.js`, `popup.js`):** Detects previously saved/applied roles on the current URL or company/title match, informs the user, and routes to the existing record (ADR 0005).
- **Cloud-Synced ATS Autofill (`content.js`):** Populates application forms using the user's cloud-synced profile and cloud-stored resumes.

## 5. SaaS Tier & Entitlement Matrix

| Capability | Sandbox / Demo (Unauthenticated) | Free Tier (Authenticated) | Pro Tier (Paid SaaS) |
| :--- | :--- | :--- | :--- |
| **Authentication** | Ephemeral local preview | Firebase Auth required | Firebase Auth required |
| **Active Applications Limit** | Max 3 demo cards (migrates on sign-up) | Up to 20 active applications | **Unlimited** applications |
| **Extension Job Saving & Duplicate Detection** | Disabled | Included (up to 20 card cap) | **Unlimited** |
| **URL Job Scraping (`api/scrape-job.ts`)** | Disabled | 20 scrapes / month | **Unlimited** + AI field extraction |
| **1-Click ATS Form Autofill** | Disabled | 5 autofills / month | **Unlimited** 1-click autofill |
| **Cloud Resume Storage** | Disabled | 1 base resume | **Unlimited** tailored resumes & versions |
| **Notes & Contact/Email Manual Log** | Local preview only | Included | Included + Automated Email Sync |
| **Pipeline Analytics (`StatsView`)** | Basic counts | Top-line KPI summary cards | **Full conversion funnels & velocity** |

## 6. Deprecated Open-Source / Local-First Patterns
- **Unrestricted Guest Mode:** Replaced by upfront authentication or a strict 3-card Sandbox Demo that prompts immediate account creation.
- **Browser IndexedDB Resume Storage (`indexedDbResumeStorage.js`):** Deprecated in favor of Firebase Cloud Storage (`users/{uid}/resumes/`).
- **Local-Only Extension Profile (`profileStorage.js`):** Deprecated as a standalone store; extension profiles must sync bi-directionally with Firestore (`users/{uid}/profile`).