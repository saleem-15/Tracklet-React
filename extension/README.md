# 🧩 Tracklet Browser Extension — Job Application Saver

Save job applications from any website (LinkedIn, Indeed, Greenhouse, Lever, Otta, Wellfound, company career pages, etc.) directly into your Tracklet workspace with one click.

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

1. **Clip from Any Job Board:** Open any job post (e.g. on LinkedIn, Indeed, or a company careers page).
2. **Open Extension Popup:** Click the Tracklet extension icon or press **`Alt + Shift + A`** (Mac: `Option + Shift + A`).
3. **Smart Auto-Fill:** The extension automatically extracts:
   - **Company Name** (with domain logo preview)
   - **Job Role / Title**
   - **Platform** (LinkedIn, Indeed, Lever, Greenhouse, etc.)
   - **Job Link URL**
   - **Highlights & Notes** (pre-fills text you highlighted on the webpage)
4. **Save Application:** Click **Save Application** (or press `Enter ↵`).

---

## 🔄 Real-Time Web App Integration

- **Live Sync:** If Tracklet is open in another browser tab, saved applications appear on your pipeline board instantly with a toast notification.
- **Offline Storage Sync:** If Tracklet is closed when you save, applications are queued in extension local storage and auto-synced the next time you open Tracklet.
- **Right-Click Context Menu:** Highlight text on any page $\rightarrow$ Right click $\rightarrow$ **Save Job to Tracklet**.

---

## 🛠️ File Structure

- `manifest.json`: Manifest V3 configuration.
- `popup.html` & `popup.css`: Executive design tokens, stage selector pills, favicon initial fallbacks.
- `popup.js`: Form management, BroadcastChannel emitter, and storage management.
- `content.js`: Page extraction engine (JSON-LD structured data parser + site DOM selectors + universal fallbacks).
- `background.js`: Service worker handling context menu actions, extension badge indicators, and offline sync storage.
