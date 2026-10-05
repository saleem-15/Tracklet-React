# 🧩 Tracklet Browser Extension — Job Application Saver & Webmail Companion

Save job applications from any website (LinkedIn, Indeed, Greenhouse, Lever, Otta, Wellfound, company career pages, etc.) and log interview updates directly from webmail (Gmail, Outlook) into your Tracklet workspace with one click.

---

## 🚀 Quick Setup / Installation

### 📥 Option A: For Testers (Recommended)

[![Download Latest Extension](https://img.shields.io/badge/Download_Extension-Latest_Release-2563eb?style=for-the-badge&logo=googlechrome&logoColor=white)](https://github.com/saleem-15/Tracklet-React/releases/latest/download/tracklet-extension.zip)

1. **Download:** Click the button above or [download `tracklet-extension.zip`](https://github.com/saleem-15/Tracklet-React/releases/latest/download/tracklet-extension.zip).
2. **Extract:** Unzip `tracklet-extension.zip` into a permanent folder on your computer (e.g. `Downloads/TrackletExtension` or `Documents/TrackletExtension`).
   > ⚠️ **Important:** Do not delete or move this folder after installing, as Chrome runs the extension directly from it.
3. **Open Extensions Page:** Open Google Chrome (or Edge / Brave) and navigate to `chrome://extensions` in the address bar.
4. **Developer Mode:** In the top-right corner, toggle **Developer mode** to ON.
5. **Load Unpacked:** Click the **Load unpacked** button in the top-left and select the unzipped folder containing `manifest.json`.
6. **Pin:** Click the puzzle piece icon (🧩) in the Chrome toolbar and pin **Tracklet** for quick access.

#### 🔄 How to Update When a New Version is Released
1. Download the latest `tracklet-extension.zip` from the link above.
2. Unzip and replace the files inside your existing extension folder.
3. In `chrome://extensions`, click the **Reload** (circular arrow) icon on the Tracklet card.

---

### 💻 Option B: For Developers (From Source)

1. Open your browser and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `extension/` folder inside your cloned repository.

---

## ⚡ How to Use

### 💼 1. Job Application Clipper (Any Job Board)

1. **Navigate to a Job Post:** Open any job posting (LinkedIn, Indeed, Greenhouse, Lever, Otta, Wellfound, or company careers pages).
2. **Open Extension:** Click the Tracklet extension icon or press **`Alt + Shift + A`** (Mac: `Option + Shift + A`).
3. **Smart Auto-Fill:** The extension automatically extracts:
   - **Company Identity & Logo:** Resolves the true hiring employer domain and high-res favicon (or monogram), never the job board or ATS logo. Deprecated Clearbit dependencies have been removed.
   - **Job Role / Title**
   - **Location:** City, region, or country as posted.
   - **Workplace Arrangement:** Remote, Hybrid, or On-site.
   - **Employment Type:** Full-time, Part-time, Contract, or Internship.
   - **Platform:** LinkedIn, Indeed, Lever, Greenhouse, etc.
   - **Recruiter / Job Poster:** One-click capture of recruiter contacts linked directly into Contacts Hub.
   - **Highlights & Notes:** Automatically summarizes job descriptions or captures your highlighted text.
   - **Job Link URL**
4. **Pipeline Stage Safety:**
   - **New Jobs:** Limited strictly to **Saved** or **Applied** (defaults to Applied on confirmation/thank-you pages).
   - **Existing Jobs:** Jobs already at **Interview**, **Offer**, etc. are displayed with a read-only stage badge so your pipeline progress and stage history are never overwritten or lost.
5. **Save Application:** Click **Save Application** (or press `Enter ↵`).

---

### ✉️ 2. Email Clipping & Webmail Companion (Gmail & Outlook)

Tracklet turns into a dedicated email companion whenever you are in Gmail (`mail.google.com`) or Outlook (`outlook.live.com` / `office.com`):

1. **Open an Email Thread:** Open any recruiter, interview, or application update email.
2. **Open Extension:** Click the Tracklet extension icon or press **`Alt + Shift + A`**.
3. **Companion Mode Auto-Detect:** The extension automatically switches to **Email Log View** and captures:
   - **Counterparty & Recruiter Info:** Names and email addresses (intelligently discerning inbound vs. outbound threads).
   - **Subject & Timestamp:** Clean subject line and exact date/time sent.
   - **Sanitized Snippet:** Clean preview of the message content.
   - **Direct Email Link:** Stores a deep link back to that specific email thread.
4. **Smart Match & Stage Advance:**
   - Automatically suggests matching companies from your existing Tracklet pipeline.
   - Update the application's stage on the fly (e.g. advance to **Interview** or **Offer**) right as you log the email.
5. **Clip as Job Posting Toggle:** If the email itself contains a new job posting or newsletter lead rather than an update, click *"Clip as job posting instead"* at the bottom to switch back to the job clipper.

---

## 🔄 Real-Time Web App Integration

- **Live Sync:** If Tracklet is open in another browser tab, clipped jobs and logged emails appear in your pipeline and email timeline instantly with a toast receipt.
- **Offline Storage Sync:** If Tracklet is closed, clipped applications and emails are queued safely in extension local storage and auto-synced the moment you next open Tracklet.
- **Right-Click Context Menu:** Highlight text on any page $\rightarrow$ Right-click $\rightarrow$ **Save Job to Tracklet**.

---

## 🛠️ File Structure

- `manifest.json`: Manifest V3 configuration.
- `jobBoardRegistry.js`: Shared registry of job boards, ATS domains, and logo proxies.
- `popup.html` & `popup.css`: Executive design tokens, stage selector pills, work arrangement & employment type chips, recruiter contact card, and Google Favicon / monogram fallbacks.
- `popup.js`: Form management, live logo resolution, duplicate detection, and direct Firestore/storage persistence.
- `content.js`: Page extraction engine (JSON-LD structured data parser + site DOM selectors + prioritized domain resolver).
- `background.js`: Service worker handling context menu actions, extension badge indicators, and offline sync storage.

