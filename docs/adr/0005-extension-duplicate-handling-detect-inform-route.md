# ADR 0005: Chrome Extension Duplicate Application Handling — "Detect, Inform & Route" UX Architecture

## Status
Accepted

## Date
2026-08-20

## Context
The Tracklet Chrome extension operates as a lightweight, frictionless browser clipper designed to capture job postings from platforms like LinkedIn, Indeed, Greenhouse, and Lever into the user's workspace with a single click.

Previously, when the extension was opened on a page corresponding to an existing job application (or duplicate URL), it attempted an in-place "Update Application" flow.

Several severe product, UX, and data integrity hazards were identified with that approach:

1. **High Risk of Accidental Data Loss**:
   - In the Tracklet web application, users continuously enrich their application records with recruiter contact information, interview round schedules, custom notes, salary ranges, and status history logs.
   - When the extension re-scrapes a job page, it captures raw text. Allowing an update write from the extension risked overwriting carefully curated notes and timeline metadata with raw or empty scraped values.

2. **Mental Model Mismatch (Capture Utility vs. Workspace Editor)**:
   - Web clippers are inherently **capture utilities** (quick, low-friction, fire-and-forget).
   - Application tracking dashboards are **management utilities** (auditing, rich editing, status tracking, analysis).
   - Forcing a 380px extension popup to act as a full CRUD editor introduced cognitive anxiety: users had no visibility into what fields would be modified upon clicking "Update".

3. **False-Positive URL & ATS Portal Collisions**:
   - Applicant tracking systems (e.g., Greenhouse, Workday, Lever) frequently use generic portal URLs or re-used posting links.
   - Matching solely on URL or broad company attributes could cause a user applying to a new role (e.g., "Fullstack Engineer") to silently overwrite their existing application for a different role (e.g., "Frontend Engineer") at the same company.

4. **REST API State Mismatch**:
   - Direct Firestore REST writes from the extension previously issued standard `POST` collection requests, leading to unintended duplicate records rather than updates.

---

## Decision

We replaced the extension's in-place overwrite flow with an industry-standard **"Detect, Inform & Route"** pattern (aligned with tools like Notion Web Clipper, Raindrop, and Huntr):

```
┌─────────────────────────────────────────────────────────┐
│ [Logo] Tracklet                        [ ● Cloud Sync ] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ✓ Already Tracked                                     │
│   Google — Senior Frontend Engineer                     │
│   [ Stage: Interview ]  •  Applied 12 days ago          │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │        Open in Tracklet Workspace ↗             │   │ (Primary Action)
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│          Applying for a different role?                 │
│          [ Save as separate application ]               │ (Secondary Action)
│                                                         │
└─────────────────────────────────────────────────────────┘
```

1. **Acknowledge and Inform ("Already Tracked" Status Card)**:
   - When an existing application is detected, the extension suppresses the entry form and displays an informative card containing:
     - Verified Company Name & Job Title.
     - Live Pipeline Stage badge with Tracklet brand tokens (`Saved`, `Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, `Archived`).
     - Application date / relative timestamp.

2. **Route to Safe Dashboard Context (`Open in Tracklet Workspace ↗`)**:
   - The primary CTA focuses the user's active Tracklet browser tab (or opens a new tab) and navigates directly to the application detail panel (`?app=<id>`).
   - All rich editing (modifying notes, logging interview rounds, managing contacts) is intentionally performed in the web app where full history timelines and safety prompts are active.

3. **Intentional Separate Entry Escape Hatch (`Save as separate application`)**:
   - If a candidate is legitimately applying for a distinct opening at the same company or a re-posted listing, clicking `"Save as separate application"` un-gates the form.
   - The form opens pre-filled, and saving generates a distinct, non-destructive application record.

4. **Pure Create-Only Extension Persistence**:
   - Extension write handlers (`pushToFirestoreDirectly` and local queue storage) now strictly execute creation (`POST`). Destructive in-place document updates from the extension context are prohibited by design.

5. **Normalized Duplicate Matching & Real-time Index Sync**:
   - Implemented `normalizeUrl()` in both the extension and web app to strip tracking query parameters (`utm_*`, `refId`, `trackingId`, `position`, `pageNum`) and trailing slashes.
   - Added `syncApplicationsToExtension` in `extensionSync.ts` to push lightweight application summaries (`tracklet_apps_index`) across tabs whenever workspace applications update.

---

## Consequences

### Positive
- **Zero Risk of Data Truncation**: User-curated notes, salary expectations, recruiter contacts, and status histories cannot be overwritten or wiped out by extension re-clips.
- **Immediate Candidate Reassurance**: Users browsing job boards instantly see whether they have already applied to a posting and what pipeline stage it is currently in.
- **Deep-Linked Workflow**: One click transports the user from the job posting directly to the exact application detail panel in Tracklet (`?app=<id>`).
- **Clear Architectural Boundary**: Enforces a strict separation of concerns between fast web capture (extension) and rich application management (web app).

### Negative / Trade-offs
- **No In-Popup Stage Mutation**: Users cannot update an application's stage directly from the extension popup without opening the web workspace. This is an intentional trade-off to prioritize data integrity and prevent blind stage transitions.
