# Feature Specification: Settings Hub Redesign (015-settings-hub-redesign)

**Feature**: Settings Hub Modular Architecture & SaaS Entitlement Command Center  
**Feature Directory**: `specs/015-settings-hub-redesign`  
**Created**: 2026-10-28  
**Status**: Ready for Implementation  
**Origin**: UI/UX & Product Analysis ([SETTINGS_PAGE_ANALYSIS.md](file:///C:/Users/Saleem/.gemini/antigravity/brain/a0c35185-8ef1-4c9b-9f0c-0219634da059/SETTINGS_PAGE_ANALYSIS.md))  
**Constitution Alignment**: Verified against `.specify/memory/constitution.md` (Principles I–V)

---

## 1. Overview & Strategic Rationale

Tracklet is a commercial, cloud-native B2C SaaS job application tracker and Manifest V3 Chrome Extension ([ADR 0011](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/settings_page_ui_analysis/docs/adr/0011-pivot-to-commercial-saas-and-cloud-storage.md)). Its primary operational workspaces—the [Active Pipeline Kanban Board](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/settings_page_ui_analysis/src/components/ActivePipelineBoard.tsx) and [All Applications Table](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/settings_page_ui_analysis/src/components/AllApplicationsTable.tsx)—embody the *"Executive Command Center"* design north star (`DESIGN.md`) with dense, crisp typography, clean micro-borders, and high-velocity workflows.

However, the current **Settings Subsystem (`SettingsView.tsx`) suffers from 5 critical architectural and product deficiencies**:
1. **The Monolithic 7-Card Stack**: It dumps 7 heterogeneous domains into a single 655-line vertical scroll (>3,200 vertical pixels) with zero categorization, inducing severe cognitive fatigue and Hick's Law choice paralysis (16+ competing buttons).
2. **SaaS Entitlement & Commercialization Gaps**: The UI displays outdated pricing placeholders (`$5/mo`), completely omits the strategic **Job Hunt Pass ($29 / 3 months)** designed to counter episodic job-hunt churn (`STRATEGY.md`), lacks self-service billing management via Stripe Customer Portal, and omits key usage meters (Autofills and Cloud Resumes).
3. **The Disconnected Extension Wedge**: While the Chrome Extension (`popup.html:754`) directs users to *"Open full profile in Tracklet settings →"*, the web dashboard contains **zero candidate profile, resume default, or ATS autofill configuration**, breaking extension parity (`constitution.md` Principle IV).
4. **Constitution Principle I Violation**: User notification thresholds and expiry alert preferences are saved strictly to `localStorage` (`tracklet_expiry_settings_v1`) rather than being synced to Firestore under `users/{userId}/preferences`, causing cross-device state loss and multi-user collisions on shared devices.
5. **Chromatic Over-Saturation (10% Accent Rule Violation)**: Accent colors cover >45% of the viewport (amber, emerald, blue, purple, indigo, rose). Even routine controls like the toggle switch are styled in alarming amber (`bg-amber-500`).

This specification defines the complete overhaul of Tracklet's Settings subsystem into a **Responsive Split-Pane Settings Hub** featuring modular domain panes, full cloud persistence, transparent SaaS entitlement meters, candidate profile synchronization with the Chrome Extension, and Apple HIG-grade ergonomic controls.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Categorized Split-Pane Navigation (Priority: P1)

As a job seeker configuring my workspace, I can navigate between distinct, logically grouped settings panes through a persistent desktop sidebar or responsive mobile tab bar without scrolling through thousands of pixels of unrelated cards.

**Why this priority**: Eliminates Hick's Law choice paralysis and scroll fatigue. Brings Settings into alignment with tier-1 benchmarks (Linear, Raycast, Stripe, macOS Settings).

**Independent Test**:
1. On desktop ($\ge 1024\text{px}$), verify a sleek vertical navigation rail (`w-56`) appears on the left with 5 categorized panes:
   - `Account & Profile`
   - `Subscription & Billing`
   - `Workflow & Alerts`
   - `Browser Extension`
   - `Data & Governance`
2. Click each pane and verify instant, zero-flicker switching without full-page reloads.
3. Resize browser to tablet/mobile ($< 1024\text{px}$) and verify the navigation transforms into a horizontal, smooth-scrolling segmented pill bar.
4. Verify the active tab state is reflected cleanly in the URL query (`?tab=billing`, `?tab=alerts`) so specific settings views can be deep-linked.

**Acceptance Scenarios**:
1. **Given** an authenticated user on Settings, **When** they click "Subscription & Billing", **Then** the view instantly transitions to the billing pane with zero layout shift or scroll jump.
2. **Given** a user on mobile (<640px), **When** interacting with the horizontal tab bar, **Then** all tab hit targets meet the minimum $44\times 44\text{px}$ touch target size.
3. **Given** a deep link `https://app.tracklet.work/?tab=settings&section=extension`, **When** the page loads, **Then** the Settings tab opens with the "Browser Extension" pane pre-selected.

---

### User Story 2 - Transparent SaaS Entitlements & Billing Management (Priority: P1)

As an active job seeker, I can clearly inspect my subscription status, monitor my usage across all 4 SaaS entitlement dimensions (applications, AI scrapes, ATS autofills, and cloud resumes), upgrade to Tracklet Pro or the Job Hunt Pass, and manage my billing portal directly.

**Why this priority**: Directly drives SaaS monetization, transparency, and PLG conversion while mitigating episodic job-hunt churn.

**Independent Test**:
1. Open the **Subscription & Billing** pane.
2. Verify all 4 core SaaS quota meters are visualized with semantic progress bars and clear metrics:
   - **Active Applications**: Current / 20 (Free) or Unlimited (Pro).
   - **AI Fallback Scrapes**: Current / 20 per month (Free) or Unlimited (Pro).
   - **1-Click ATS Form Autofills**: Current / 5 per month (Free) or Unlimited (Pro).
   - **Cloud Resumes Stored**: Current / 1 Base Resume (Free) or Unlimited Tailored Versions (Pro).
3. Verify plan cards accurately display:
   - **Tracklet Pro Monthly**: `$12 / month` (unlimited access, cancel anytime).
   - **Job Hunt Pass**: `$29 / 3 months (Best Value — Recommended)` (~20% bundle discount).
4. For paid subscribers, verify the "Manage Billing in Stripe" button securely redirects to the Stripe Customer Portal for card updates, invoice downloads, or cancellation.
5. For canceling users, verify a "Job Hunt Sabbatical / Pause" option is presented to preserve tailored resumes and data without charge until their next search.

**Acceptance Scenarios**:
1. **Given** a Free tier user with 18 active applications, **When** viewing the Active Applications meter, **Then** a warning indicator alerts them that they are at 90% capacity, with an "Upgrade to Unlimited" CTA.
2. **Given** a Free tier user who hits their 5 autofill monthly limit, **When** viewing the Autofills meter, **Then** an informative card explains: *"You've saved ~45 min of typing this month. Upgrade to Pro for unlimited 1-click ATS autofills."*
3. **Given** a Pro user, **When** they click "Manage Billing", **Then** the system calls the authenticated billing portal endpoint and opens their Stripe Customer Portal in a new tab.

---

### User Story 3 - Candidate Profile & Chrome Extension Parity (Priority: P1)

As a candidate applying to roles with the Chrome Extension, I can configure my job target preferences, salary requirements, work authorization, and default resume in the web app, and have them automatically sync to the Chrome Extension for 1-click ATS form autofilling.

**Why this priority**: Resolves the dead link in the Chrome Extension (`popup.html:754`) and enforces Constitution Principle IV (Extension & Web Parity).

**Independent Test**:
1. Open the **Account & Profile** pane.
2. Fill out the **Candidate Job Hunt Target** section:
   - Target Job Titles: e.g. `["Staff Frontend Engineer", "Engineering Manager"]`
   - Target Salary: Minimum Base `$165,000`, Currency `USD`, Target OTE `$195,000`
   - Target Locations: `["Remote - US", "San Francisco, CA"]`
   - Work Authorization: `"US Citizen / Permanent Resident (No Sponsorship Needed)"`
   - Portfolio & Profile Links: LinkedIn, GitHub, Personal Website
3. Click "Save Profile". Verify immediate optimistic confirmation toast receipt.
4. Verify data is written to Firestore at `users/{userId}/profile`.
5. Open the Chrome Extension popup or trigger ATS form autofill on a Greenhouse/Lever test page: verify the candidate fields auto-populate accurately from the cloud profile.

**Acceptance Scenarios**:
1. **Given** a candidate updating their target salary in the web app, **When** they submit the form, **Then** the Chrome Extension receives the updated profile via background sync within 5 seconds.
2. **Given** a candidate with multiple resumes in Cloud Storage, **When** they designate a "Default Base Resume", **Then** that resume is prioritized for 1-click ATS autofill uploads.

---

### User Story 4 - Cloud-First Notification & Workflow Preferences (Priority: P2)

As a job seeker with multiple devices, I can configure my task expiry lookahead threshold, application staleness warnings, and follow-up prompts, with all preferences securely synced to my Cloud Firestore account rather than lost in local browser storage.

**Why this priority**: Eliminates the Constitution Principle I violation (`tracklet_expiry_settings_v1` in `localStorage`) and prevents cross-device configuration drift.

**Independent Test**:
1. Open the **Workflow & Alerts** pane on Device A.
2. Toggle "Soon to Expire Notification Indicator" ON.
3. Select the `72h (3 days)` preset or use the stepped adjuster.
4. Verify the toggle switch uses **Command Blue (`bg-blue-600`)** instead of alarming amber.
5. Verify an immediate confirmation toast appears (`addToast('success', 'Preferences Updated', 'Expiry alert window set to 72 hours')`).
6. Log in to Tracklet on Device B (or in an incognito session): verify the setting loads as `72 hours` directly from Cloud Firestore.

**Acceptance Scenarios**:
1. **Given** an authenticated user changing their expiry threshold, **When** the change is made, **Then** React state updates optimistically and writes to Firestore `users/{userId}/preferences`.
2. **Given** an offline user, **When** changing preferences, **Then** `localStorage` serves as a read-through cache and synchronizes to Firestore upon reconnecting.
3. **Given** applications with tasks due within the threshold, **When** viewing the Workflow pane, **Then** a compact summary indicates matching tasks, but active interactive task items remain strictly in the Pipeline/Kanban workspace.

---

### User Story 5 - Full Data Portability, GDPR Rights & Enterprise Trust (Priority: P2)

As a user who values data privacy and security, I can download a complete 1:1 JSON backup of my entire workspace, export/import CSV spreadsheets, review Tracklet's non-monetization security covenants, or exercise my GDPR right to permanently delete my account and cloud data.

**Why this priority**: Builds candidate trust, satisfies GDPR Article 17 ("Right to be Forgotten") and Article 20 ("Right to Data Portability"), and consolidates backup tools into a dedicated governance pane.

**Independent Test**:
1. Open the **Data & Governance** pane.
2. Click "Download JSON Backup": verify an instant JSON file download containing a 1:1 complete dataset snapshot of all applications, contacts, status histories, and notes.
3. Click "Export Jobs (CSV)": verify applications CSV downloads cleanly.
4. Click "Export Contacts (CSV)": verify contacts CSV downloads cleanly.
5. In the Enterprise Privacy section, verify the 3 trust pillars (Zero Recruiter Monetization, AES-256 Cloud Sync, PII-Masked Telemetry) and click "Review Privacy Policy": verify `https://app.tracklet.work/privacy` opens in a **new tab** (`target="_blank" rel="noopener noreferrer"`) without hijacking the session.
6. In Danger Zone, click "Delete Account": verify the delete button rests in a calm slate state (`border-slate-300 text-slate-700`) transitioning to rose on hover (Rule 3), opening the `DeleteAccountModal` with typed confirmation.

**Acceptance Scenarios**:
1. **Given** a user restoring a valid JSON backup, **When** the file is uploaded, **Then** the system validates the schema, imports the records, and emits a success toast receipt.
2. **Given** a user clicking "Reload Sample Demo Data", **When** clicked, **Then** a pre-action confirmation modal appears before executing the reset.

---

## 3. Functional Requirements (FR)

### Navigation & Information Architecture
- **FR-001**: System MUST render a responsive Master-Detail Settings shell (`SettingsLayout`) with a vertical navigation rail (`w-56`) on screens $\ge 1024\text{px}$ and a horizontal segmented pill bar on screens $< 1024\text{px}$.
- **FR-002**: System MUST segment settings into 5 distinct panes:
  1. `Account & Profile` (`account`)
  2. `Subscription & Billing` (`billing`)
  3. `Workflow & Alerts` (`workflow`)
  4. `Browser Extension` (`extension`)
  5. `Data & Governance` (`governance`)
- **FR-003**: System MUST support deep-linking via URL query parameter `?tab=settings&section=<paneId>`.
- **FR-004**: System MUST keep the Settings container under 120 lines and ensure all sub-pane components strictly adhere to the $\le 300$-line ceiling (`AGENTS.md` 6.B).
- **FR-005**: System MUST render `<SettingsView />` in `WorkspaceContent.tsx` with **zero prop-drilling**, consuming all domain state directly from React context providers.

### SaaS Commercialization & Entitlements
- **FR-006**: System MUST visualize all 4 SaaS entitlement dimensions in `SubscriptionBillingPane`:
  - Active Pipeline Applications (Max 20 Free / Unlimited Pro)
  - AI Fallback Web Scrapes (Max 20/mo Free / Unlimited Pro)
  - 1-Click ATS Form Autofills (Max 5/mo Free / Unlimited Pro)
  - Cloud Stored Resumes (Max 1 Base Free / Unlimited Versions Pro)
- **FR-007**: System MUST display accurate pricing cards:
  - **Pro Monthly**: `$12 / month`
  - **Job Hunt Pass**: `$29 / 3 months` (Default Recommended)
- **FR-008**: System MUST provide an authenticated trigger for the Stripe Customer Portal to allow self-service payment method updates, invoice downloads, and subscription cancellations.
- **FR-009**: System MUST offer a "Job Hunt Sabbatical / Pause" flow upon cancellation to retain candidate notes, tailored resumes, and histories free of charge.

### Candidate Profile & Extension Parity
- **FR-010**: System MUST provide a Candidate Job Hunt Target editor in `AccountProfilePane` supporting target titles, minimum salary, currency, target locations, work authorization, and portfolio URLs.
- **FR-011**: System MUST persist candidate profile data to Cloud Firestore under `users/{userId}/profile`.
- **FR-012**: System MUST synchronize candidate profile updates with the Chrome Extension (`extension/profileStorage.js`) to power 1-click ATS autofill forms.
- **FR-013**: System MUST allow designating a "Default Base Resume" from the user's Cloud Storage documents for automated ATS attachment.

### Workflow, Notifications & Cloud Persistence
- **FR-014**: System MUST migrate user notification preferences from local-only storage to Cloud Firestore under `users/{userId}/preferences`, maintaining `localStorage` strictly as an offline read-through cache (Constitution Principle I).
- **FR-015**: System MUST provide quick presets (`12h`, `24h`, `48h`, `72h`, `7d`) and a stepped precision threshold adjuster for the task expiry alert window.
- **FR-016**: System MUST style the notification toggle switch in **Command Blue (`bg-blue-600`)** when active, eliminating confusing amber toggle states.
- **FR-017**: System MUST provide an optional application staleness policy (flagging applications inactive after 14, 21, or 30 days).
- **FR-018**: System MUST remove the overdue task alert badge from the *Settings* tab in `Sidebar.tsx`, relocating actionable indicators to the *Pipeline* tab.

### Data Portability, Security & Ergonomics
- **FR-019**: System MUST provide 1-click 1:1 workspace JSON backup download and restore in `DataGovernancePane`.
- **FR-020**: System MUST provide CSV export for Applications and Contacts, and open the `ImportCSVModal` for bulk spreadsheet imports.
- **FR-021**: System MUST require pre-action modal confirmation before executing "Reload Sample Demo Data".
- **FR-022**: System MUST ensure all outbound external links (`mailto:`, legal pages, Stripe portal) include `target="_blank" rel="noopener noreferrer"` without session-hijacking `e.preventDefault()` handlers (UI-UX Rule 1).
- **FR-023**: System MUST style destructive buttons (Delete Account, Purge Data) in calm slate at rest (`border-slate-300 text-slate-700`), transitioning to rose on hover (UI-UX Rule 3).
- **FR-024**: System MUST adhere strictly to the 10% Accent Rule (`DESIGN.md`), eliminating pastel button gradients and reserving amber exclusively for urgent deadlines and unverified email gates.
- **FR-025**: System MUST maintain WCAG 2.1 AA compliant contrast ($\ge 4.5:1$) across all text and icons, replacing all occurrences of `text-slate-400` on light surfaces with `text-slate-500` or `text-slate-600`.

---

## 4. Non-Functional Requirements & Guardrails

1. **Performance**: Pane switching latency MUST be $<16\text{ms}$ (instant 60fps transition) using React local state or lightweight URL hash navigation without layout jank.
2. **Bundle Impact**: Total added bundle weight across all 5 pane components MUST be $<15\text{KB}$ gzipped.
3. **Accessibility**: All toggle switches, tabs, and buttons MUST provide a minimum $44\times 44\text{px}$ touch target and include proper ARIA roles (`role="switch"`, `role="tab"`, `role="progressbar"`, `aria-label`).
4. **Security**: All Firestore reads and writes to `users/{userId}/preferences` and `users/{userId}/profile` MUST be strictly enforced by `firestore.rules` matching `request.auth.uid == userId`.
5. **Mobile Responsiveness**: Viewports from 320px to 2560px MUST render with zero horizontal overflow, consistent container padding (`p-4 sm:p-6`), and zero typography clipping.

---

## 5. Edge Cases & Resilience

| Edge Case | Failure Mode | Mitigation Strategy |
| :--- | :--- | :--- |
| **Offline Preferences Edit** | User changes expiry threshold while disconnected from internet. | Hook updates React state immediately, saves snapshot to `localStorage`, and queues Firestore sync via Firebase offline persistence. |
| **Corrupted JSON Restore** | User uploads an invalid or malformed JSON backup file. | `validateAndParseJSONBackup` validates schema structure, throws a descriptive error toast, and halts import before modifying state. |
| **Accidental Demo Data Reset** | User clicks "Reload Sample Demo Data" expecting an export. | Guard with a dedicated confirmation modal: *"This will reset your workspace to 20 demo applications. Export a backup first?"* |
| **Unsaved Profile Changes** | User types extensive candidate profile data then clicks another tab. | Debounce profile changes to Firestore (1,000ms debounce) or provide an explicit "Save Profile" button with visual "Saved" confirmation. |
| **Multiple Accounts on Same Browser** | User logs out and another user logs in on the same browser. | Local cache keys MUST be scoped by `userId` (e.g. `tracklet_prefs_${userId}`). Clear transient session state on logout. |
