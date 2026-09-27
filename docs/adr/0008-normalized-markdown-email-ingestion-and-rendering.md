# ADR 0008: Normalized Markdown Ingestion and Semantic Rendering for Email Communications

## Status
Accepted

## Context
Tracklet captures and logs job-related email communications (interview invitations, scheduling links, offer letters, follow-ups) across two entry vectors:
1. **Automated extraction**: Via the Chrome companion extension running against webmail clients (Gmail, Outlook).
2. **Manual entry**: Via the web app's "+ Log Email" modal form or clipboard paste.

When displaying these messages in the timeline card and the dedicated Reader modal, the system faced a foundational architectural question: **In what format should email message bodies be captured, stored in Firestore/localStorage, and rendered in the UI?**

Three technical approaches were evaluated:
1. **Raw HTML Storage & Rendering**: Persisting full HTML payloads from webmail and rendering via `dangerouslySetInnerHTML`.
2. **Flat Plain-Text Stripping**: Discarding all formatting, tags, and links via `innerText`.
3. **The Normalized Markdown Bridge**: Converting incoming webmail DOM and rich text into clean canonical Markdown (preserving links, bolding, and lists), persisting lightweight text, and rendering safely via semantic React primitives.

This decision is architecturally significant because it defines the permanent storage contract across Firestore documents, the Chrome extension extraction pipeline, and all current and future client renderers (web, mobile, exports).

---

## Decision

We adopt **The Normalized Markdown Bridge** architecture across the persistence and presentation layers.

### 1. Canonical Storage Contract (Firestore & localStorage)
- Email bodies are strictly persisted as **plain-text Markdown strings**, never raw multi-kilobyte HTML trees.
- Payload bloat is reduced by ~95% compared to raw email markup (e.g. typical interview email drops from 25 KB of nested tables and tracker pixels to ~300 bytes of clean text).
- Database records remain 100% portable, easily exportable to CSV/JSON, and future-proof for mobile clients or AI summary agents.

### 2. Upgraded Companion Extension Ingestion (`extension/content.js`)
- Rather than blindly extracting plain text via `clone.innerText` (which destroyed hyperlink URLs), the extension now converts actionable anchor tags (`<a href="...">text</a>`) to Markdown links (`[text](url)`) and bold elements (`<b>`, `<strong>`) to `**bold**` before string serialization.
- Critical recruiting action links (Zoom, Google Meet, Calendly, Ashby/Greenhouse portals) are permanently preserved.
- Boilerplate signatures, hidden tracking pixels (`1x1` GIFs), scripts, and nested quote trees continue to be aggressively stripped at the browser edge before sync.

### 3. Safe Semantic React Rendering (`FormattedEmailBody.tsx`)
- **Zero `dangerouslySetInnerHTML`**: All email content is rendered through React elements, providing complete architectural immunity against Cross-Site Scripting (XSS) from untrusted email contents.
- **Universal Outbound Link Discipline**: All extracted URLs automatically render with `target="_blank" rel="noopener noreferrer"` per Rule 1 of Tracklet's UI/UX standards.
- **Dual-Mode Visual Output**:
  - **Collapsed Card Mode (`isCollapsed`)**: Multi-line content is flattened into a clean 2-line snippet (`line-clamp-2`) with formatted inline bolding and links, with markdown syntax tokens cleanly hidden.
  - **Expanded / Reader Modal Mode**: Structured blocks are rendered with dedicated Tailwind typography: styled bullet lists (`•`, `-`, `*`), numbered lists (`1.`), blockquotes (`>`), headings (`#`), and paragraphs.
- **HTML Paste Resilience**: If a user pastes raw HTML fragments into the manual web form, `normalizeEmailContent` runs `htmlToMarkdown` to sanitize the payload into canonical Markdown before rendering.

### 4. Domain Nomenclature Decoupling
- Renamed the manual entry field from `"Email Content / Notes"` to `"Email Body"` to eliminate domain ambiguity.
- Application-level workflow notes remain strictly segregated in the dedicated, auto-saved Notes workspace (ADR 0006/0007), while email logs represent immutable communication event records.

---

## Consequences

### Positive
- **Guaranteed Layout Stability**: Email content inherits Tracklet's responsive Tailwind design tokens and modal bounds. Rigid `width="600"` desktop table layouts from third-party email clients can never break the UI or trigger modal overflow.
- **Zero XSS Attack Surface**: Email text is parsed into typed tokens and rendered as pure React components without DOM injection.
- **Preserved Recruiting Links**: Interview and schedule links remain interactive and accessible directly from the timeline card and reader modal.
- **Low Cloud Costs & Snappy Sync**: Storing small text payloads maximizes Firestore document packing efficiency and ensures lightning-fast offline cache hydration.

### Neutral / Trade-offs
- **Stylistic Simplification**: Highly customized graphical email layouts (marketing banners, complex multi-column grids, embedded logos) are flattened into pure text and links. (This is a deliberate product benefit for job tracking, but Tracklet cannot function as a pixel-perfect raw email client).
- **Deep Webmail Fallback**: For emails requiring pixel-perfect layout verification, Tracklet preserves the canonical `emailUrl` deep link (`"Open Thread"` / `"Open in webmail"`), allowing 1-click navigation to native Gmail/Outlook.
