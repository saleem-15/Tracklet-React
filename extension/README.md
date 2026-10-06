# 🧩 Tracklet Companion — Chrome Side Panel, Contact Clipper & Autofill Hub

**Tracklet Companion** is a persistent browser side panel built with Manifest V3 that docks seamlessly alongside your browsing window. It captures job applications from any careers website, clips recruiter contacts directly from LinkedIn into your Contacts Hub, logs interview emails from webmail with active pipeline ranking, stores tailored CVs in local IndexedDB, and auto-fills ATS application forms without auto-submitting.

---

## 🚀 Installation & Setup

### 📥 Option A: Load Unpacked in Chrome (Developer Mode)

1. Open Google Chrome (or Edge / Brave) and navigate to `chrome://extensions`.
2. Toggle **Developer mode** to **ON** in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the `extension/` directory inside your Tracklet project checkout.
5. Click the Extensions puzzle piece icon (🧩) in the browser toolbar and pin **Tracklet**.

### 📌 Side Panel Docking Behavior
- Clicking the extension icon opens Tracklet docked on the right side of your browser as a persistent **Side Panel** (`chrome.sidePanel`).
- The side panel stays open while you interact with web pages, fill out applications, or navigate between tabs.
- For compact browsing, you can also launch Tracklet using the global shortcut **`Alt + Shift + A`** (Mac: **`Option + Shift + A`**).

---

## ⚡ Core Capabilities & Companion Tabs

The companion features a persistent 4-tab segmented navigation bar that automatically switches context based on your active web tab:

```
┌────────────────────────────────────────────────────────┐
│  [📥 Job]    [👤 Contact]    [✉️ Email]    [⚡ Autofill] │
└────────────────────────────────────────────────────────┘
```

### 📥 1. Job Clipper (`[📥 Job]`)
- **Auto-Detection**: Extracts company name, job title, location, workplace arrangement (Remote / Hybrid / On-site), employment type (Full-time / Part-time / Contract / Intern), and posting URL.
- **Brand Avatar Resolution**: Uses Google Favicons (`sz=128`) with canonical rejection of 100+ job board and ATS domains from `jobBoardRegistry.js`, falling back to SVG monogram avatars.
- **Stage Safety Locks**:
  - New job clips are strictly restricted to **`Saved`** or **`Applied`** stage pills.
  - Existing applications already in **`Screening`**, **`Interview`**, **`Offer`**, **`Rejected`**, or **`Archived`** render as immutable badges to prevent accidental pipeline demotions.
- **Tailored CV Upload**: Drag and drop or browse to attach a tailored resume variant (`.pdf`, `.docx`, `.doc`, `.txt`, max 10MB). Binary file payloads are saved locally in IndexedDB (`TrackletExtensionDB`), with file metadata (`resumeFileName`, `resumeFileSize`, `resumeBlobId`, `resumeUploadedAt`) linked directly to the application record.
- **Recruiter Micro-Card**: When browsing a job post with an identified recruiter or job poster, a micro-card renders on the Job tab with an opt-in checkbox (checked by default) to bundle contact creation and bidirectional linking in a single transaction on save.
- **Rich Text Notes**: WYSIWYG notes editor with bidirectional Markdown synchronization.

### 👤 2. LinkedIn Contact Clipper (`[👤 Contact]`)
- **Profile Extraction**: Automatically extracts full name, current headline / role, organization, location, avatar image, and canonical LinkedIn URL when browsing `linkedin.com/in/*`.
- **Category Smart-Defaulting**:
  - `Recruiter`: Matched by `/talent|recruiter|recruiting|sourcer|staffing|people\s+ops/i`.
  - `Hiring Manager`: Matched by `/vp|vice\s+president|director|head\s+of|lead|manager|engineering\s+manager|cto/i`.
  - `Mentor`: Matched by `/mentor|advisor|coach/i`.
  - Easily switch categories between `Recruiter`, `Hiring Manager`, `Mentor`, `Referral`, `Peer / Alumni`, or `Other`.
- **Job Linking**: Searchable dropdown auto-suggests active Tracklet job applications from the same company.
- **Duplicate & Change Detection**: Recognizes existing contacts. If details have changed (e.g. updated headline or company), an "Update Contact" button appears to refresh fields while preserving your private notes.

### ✉️ 3. Webmail Companion (`[✉️ Email]`)
- **Auto-Detect**: Automatically activates when viewing an email thread in Gmail (`mail.google.com`) or Outlook (`outlook.live.com` / `office.com`).
- **Sender & Subject Extraction**: Dispatches counterparty name, email, clean subject line, date/time, and sanitized snippet.
- **Active Stage & Recency Ranking**: Matches emails to tracked applications, prioritizing active stages (`Interview` > `Screening` > `Applied` > `Saved`, newest first).
- **In-Flight Stage Advance**: Advance pipeline stage to `Interview`, `Screening`, or `Offer` right as you log the email.
- **Recruiter Contact Opt-in**: Checkbox to save new email senders directly into Contacts Hub.

### ⚡ 4. Autofill Hub (`[⚡ Autofill]`)
- **Candidate Profile Sync**: Stored in `chrome.storage.sync` with local fallback (`TrackletProfileStorage`).
- **Inline Quick Edit**: Expandable drawer inside the side panel to edit candidate details (Full Name, Email, Phone, Location, Work Authorization, LinkedIn, GitHub, Portfolio).
- **Real-Time ATS Form Detection**:
  - Greenhouse (`boards.greenhouse.io` and embedded forms)
  - Lever (`jobs.lever.co` and application forms)
  - Workday (`myworkdayjobs.com`)
  - Generic HTML5 career forms
- **4-Tier Field Resolution**: ATS-specific selectors $\rightarrow$ HTML5 `autocomplete` $\rightarrow$ semantic name/id heuristics $\rightarrow$ label proximity text.
- **Safe 1-Click Autofill**: Injects native input values and dispatches synthetic `input`, `change`, and `blur` events without ever submitting the form.
- **Interactive Populated Checklist**: Shows populated fields (`✓`) and manual alerts (`⚠`). Click any field item to smoothly scroll the host page to that target input, set focus, and trigger a 1.5-second accent halo highlight.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Scope | Action |
| :--- | :--- | :--- |
| `Alt + Shift + A` (Mac: `Option + Shift + A`) | Global Browser | Open or toggle the Tracklet Side Panel |
| `Ctrl + Enter` (Mac: `Cmd + Enter`) | Extension Panel | Save application, save contact, log email, or trigger autofill |
| `Enter` (outside multi-line textarea) | Extension Panel | Save current active entity |
| `Tab` / `Shift + Tab` | Extension Panel | Navigate through form fields |
| `Esc` | Custom Dropdowns / Modals | Close open dropdown menus and drawers |

---

## 🔄 Cloud & Local Sync Architecture

- **Live Web App Sync**: When Tracklet is open in another tab, saved applications, contacts, and emails sync instantly via window postMessage.
- **Direct Cloud Persistence**: Authenticated users sync directly to Cloud Firestore (`/users/{uid}/applications` and `/users/{uid}/contacts`).
- **Offline Sync Queue**: If Tracklet is closed or network is offline, items are queued in `tracklet_pending_apps`, `tracklet_pending_contacts`, and `tracklet_pending_emails` and drained automatically when Tracklet is next launched.
- **Guest / Local Mode**: Operates seamlessly without an account using extension local storage.

---

## 📁 File Structure

```
extension/
├── manifest.json              # Manifest V3 (sidePanel, permissions, background worker)
├── popup.html                 # Side Panel companion layout (Job, Contact, Email, Autofill)
├── popup.css                  # Modern UI tokens, responsive styles, animations, halos
├── popup.js                   # Unified controller (tab routing, drafts, storage, validation)
├── content.js                 # Unified scraper (DOM parsing, ATS detection, autofill, scroll-to-field)
├── background.js              # Service worker (sidePanel behavior, tab events, context menus)
├── jobBoardRegistry.js        # Known job boards, ATS hosts, company domain resolvers
├── indexedDbResumeStorage.js  # IndexedDB binary storage utility (TrackletExtensionDB)
├── profileStorage.js          # Candidate profile storage helper (sync + local fallback)
└── icons/                     # SVG & PNG brand icons
```
