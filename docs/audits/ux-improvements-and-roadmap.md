# Tracklet UX Improvement Proposals & Strategic Product Roadmap

This document outlines strategic recommendations, feature opportunities, and UX enhancements to elevate Tracklet from a job application tracking tool into a comprehensive, high-velocity **Job Search Cockpit**.

---

## 1. High-Velocity Daily Driver Workflows

### A. Global Command Palette (`⌘K` / `Ctrl+K`)
* **Problem**: Navigating views, searching across applications and contacts, or triggering exports currently requires mouse clicks and menu traversal.
* **Proposed Solution**:
  * An omnipresent command palette accessible via `⌘K` (Mac) or `Ctrl+K` (Windows/Linux) or `/` when not focused on an input.
  * **Unified Fuzzy Search**: Search applications, companies, notes, and contacts simultaneously in a single dropdown.
  * **Quick Navigation**: Instant shortcuts (*"Go to Active Pipeline"*, *"Open Job Search Analytics"*, *"View Contacts"*).
  * **Instant Commands**: *"New Application"*, *"Add Contact"*, *"Export JSON Backup"*, *"Toggle View Layout"*.
* **Impact**: Positions Tracklet on par with developer-grade tools like Linear, Superhuman, and Raycast.

### B. Sequential Keyboard Navigation (`J` / `K`)
* **Problem**: Reviewing applications requires clicking each row/card individually to open its detail drawer.
* **Proposed Solution**:
  * Support `J` (next item) and `K` (previous item) to cycle through rows in the applications table and cards on the Kanban board.
  * When the detail drawer is open, `J` / `K` updates the drawer smoothly to the adjacent application without closing and reopening the modal.

---

## 2. Friction Reduction & Data Capture

### A. "Smart Link Autofill" (Job URL Metadata Extraction)
* **Problem**: Re-entering the Company Name, Job Title, Platform, Location, and Job Link for 10–20 daily applications is the primary source of user fatigue.
* **Proposed Solution**:
  * A dedicated **"Quick Add via URL"** input field inside the application creation modal.
  * Pasting a supported job link (LinkedIn, Greenhouse, Lever, Ashby, Indeed, Workday) automatically parses OpenGraph metadata and URL structures to auto-fill:
    * Job Title
    * Company Name
    * Platform detection (e.g. auto-selecting "LinkedIn" or "Greenhouse")
    * Direct Job URL
* **Impact**: Reduces a 60-second repetitive data entry process down to a 3-second paste-and-confirm action.

### B. Browser Extension / Web Clipper Companion
* **Problem**: Users must switch tabs between LinkedIn/job boards and Tracklet.
* **Proposed Solution**:
  * Connect the existing `extension/` directory into a 1-click Chrome/Edge extension that reads the active tab's job post and saves it directly into the user's Firestore pipeline via Firebase Auth token.

---

## 3. Deepening the Interview & Prep Phase

### A. Dedicated Interview Prep & Story Vault
* **Problem**: Once an application moves to `Screening` or `Interviewing`, the user's primary mental model shifts from *pipeline tracking* to *interview preparation*.
* **Proposed Solution**:
  * Add an **Interview Prep tab** inside the Application Detail Drawer containing:
    * **STAR Method Story Bank**: Quick-attach relevant pre-saved stories (Situation, Task, Action, Result) to the specific company's requirements.
    * **"Questions to Ask the Interviewer"**: Built-in template bank covering engineering culture, team roadmap, onboarding expectations, and tech stack details.
    * **Interview Stage Sub-Tracker**: Break down the application into sequential rounds (Recruiter Screen ➔ Technical Assessment ➔ System Design ➔ Cultural/Offer).

### B. Calendar Sync & `.ics` Downloads
* **Problem**: Scheduled interviews and follow-up deadlines tracked in Tracklet are isolated from the user's primary daily calendar.
* **Proposed Solution**:
  * Add a 1-click **"Add to Google Calendar"** URL link and **"Download .ics"** file button on interview dates and task follow-up reminders.

### C. Offer Comparison & Compensation Calculator
* **Problem**: When candidates receive multiple offers, comparing complex compensation packages (Base, Equity, Bonus, 401k match, Remote stipend) is difficult.
* **Proposed Solution**:
  * A side-by-side **Offer Comparison Modal** for applications in the `Offer` stage, calculating normalized Total Compensation (TC), benefits score, and pros/cons.

---

## 4. Smart Proactivity & Automation

### A. "Ghosting Detector" & 1-Click Follow-Up Engine
* **Problem**: Job seekers apply to dozens of roles and lose track of applications that have received zero responses after 2–3 weeks.
* **Proposed Solution**:
  * Visual indicator tag on applications that remain in `Applied` with no status change for >14 or >21 days (`No response in 18 days`).
  * **1-Click Follow-Up Button**: Opens a pre-composed `mailto:` template addressed to the recruiter:
    > *"Subject: Following up on [Job Title] application - [User Name]\n\nHi [Contact Name],\nI hope you're having a great week. I wanted to check in regarding my application submitted on [Date]..."*
  * **1-Click Archive/Stale Action**: Move directly to `Archived` without opening the modal.

### B. Weekly Momentum & Search Streak Tracker
* **Problem**: Job searching is an emotionally taxing marathon; users suffer from burnout without visible signs of progress.
* **Proposed Solution**:
  * A lightweight momentum widget on the dashboard showing weekly output metrics:
    * Applications submitted this week
    * Networking touchpoints logged
    * Follow-ups completed
    * Target weekly goal progress bar (e.g. 8 / 10 weekly target applications)

---

## 5. Prioritization Matrix (Impact vs. Effort)

| Proposal | Value / Impact | Implementation Effort | Recommended Order |
|---|---|---|---|
| **Global Command Palette (`⌘K`)** | Very High | Low – Medium | **Immediate Priority (Phase 1)** |
| **Ghosting Detector & Follow-Up Templates** | High | Low | **Immediate Priority (Phase 1)** |
| **Calendar Sync (`.ics` / Google Cal Link)** | Medium – High | Low | **Phase 2** |
| **Smart Job Link Metadata Extraction** | Very High | Medium | **Phase 2** |
| **Interview Prep & STAR Story Vault** | High | Medium | **Phase 3** |
| **Weekly Momentum Streak Widget** | Medium | Low | **Phase 3** |
| **Offer Comparison Calculator** | High (Stage-specific) | Medium | **Phase 4** |
| **Full Browser Extension Companion** | Very High | High | **Phase 4** |
