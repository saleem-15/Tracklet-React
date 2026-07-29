# 🧩 Tracklet Browser Extension — Job Application Saver

Save job applications from any website (LinkedIn, Indeed, Greenhouse, Lever, Otta, Wellfound, company career pages, etc.) directly into your Tracklet workspace with one click.

---

## 🚀 Quick Setup / Installation

### Google Chrome / Microsoft Edge / Brave / Opera

1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `extension/` directory inside this repository (`d:\Programming\Tracklet\extension`).
5. Pin **Tracklet** to your extension toolbar for quick access!

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
