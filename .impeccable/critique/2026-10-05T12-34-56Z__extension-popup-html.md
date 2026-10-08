---
timestamp: 2026-10-05T12-34-56Z
slug: extension-popup-html
target: extension/popup.html
total_score: 25
max_score: 40
na_heuristics: ''
p0_count: 0
p1_count: 2
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Duplicate banner works well; lacks autosave indicators or draft state feedback. |
| 2 | Match System / Real World | 3 | Good domain vocabulary; clear platform and stage metaphors. |
| 3 | User Control and Freedom | 2 | Ephemeral popup closes on outside click; webmail switch lacks clean instant undo. |
| 4 | Consistency and Standards | 3 | Matches Tracklet fonts and tokens, but notes toolbar buttons use raw text characters. |
| 5 | Error Prevention | 3 | Strong duplicate detection; form field validation relies on native browser bubbles. |
| 6 | Recognition Rather Than Recall | 3 | Good dropdowns; company monogram fallback aids recognition. |
| 7 | Flexibility and Efficiency | 2 | No keyboard accelerators (`Ctrl+Enter` to save); tab index traverses all editor buttons. |
| 8 | Aesthetic and Minimalist Design | 2 | Heavy visual clutter: 11 label icons, crowded header, non-sticky bottom save button. |
| 9 | Error Recovery | 2 | Native HTML5 validation bubbles can overflow or clip in 390px extension popup. |
| 10 | Help and Documentation | 2 | "Local Mode" badge is ambiguous; no tooltip explaining cloud sync behavior. |
| **Total** | | **25/40** | **Acceptable (62.5%)** |

### Design Specificity Verdict

**LLM assessment**: The incumbent companion extension UI (`extension/popup.html`) captures Tracklet's brand palette (`Outfit`, `Plus Jakarta Sans`, `JetBrains Mono`, and stage color tokens), but behaves structurally like a generic single-column Web 2.0 form cramped into a 390×590px popup box. While features like the duplicate banner, recruiter contact detection, and webmail logging are deeply specific to Tracklet, the presentation suffers from severe visual noise—every single input label carries a 24×24 stroke icon, creating label fatigue. Furthermore, the absence of persistent navigation between clipping modes forces the UI into jarring complete-view swaps (`#main-form-view` vs `#email-log-view`).

**Deterministic scan**: Scanned `extension/popup.html` using `detect.mjs`. Detector reported fallback regex mode with 0 automated violations, as custom property extraction and computed contrast are handled via external CSS (`popup.css`).

**Visual overlays**: Extension popup relies on Chrome Manifest V3 extension APIs (`chrome.tabs`, `chrome.storage`) and cannot be rendered in a standalone browser tab without simulated Chrome runtime APIs. Live overlay injection skipped; findings derived from static audit and source inspection.

### Overall Impression
A functionally capable and feature-rich browser clipper that feels uncomfortably squeezed into an ephemeral popup. The foundation is solid, but the information architecture needs structural grouping, sticky action affordances, and modern side-panel spatial rhythm to match the premium quality of the main Tracklet web app.

### What's Working
1. **Intelligent Duplicate Detection**: The `#duplicate-banner` immediately alerts users when a job is already tracked, offering direct links to view or save as a separate position.
2. **First-Class Pipeline & Platform Selectors**: Custom dropdowns (`#platform-trigger`, `#stage-trigger-btn`) respect pipeline stage constraints (`Saved` / `Applied` only for new entries; read-only for later stages) and brand tokens.
3. **Contextual Recruiter Extraction**: The recruiter micro-card (`#recruiter-contact-card`) automatically bundles hiring contacts with the job posting, eliminating manual copy-pasting.

### Priority Issues

- **[P1] Primary Action Button Pushed Below the Fold**
  - **Why it matters**: In a fixed 590px popup with 10 form fields, selecting options or expanding the notes field pushes `#save-btn` off-screen, forcing users to scroll just to save a job.
  - **Fix**: Pin the primary action to a sticky bottom action bar (`h-14 bg-white border-t border-slate-200`) so the save trigger is always visible regardless of scroll depth.
  - **Suggested command**: `/impeccable layout`

- **[P1] Label Icon Fatigue & Unstructured Vertical Sprawl**
  - **Why it matters**: 11 consecutive form fields each have a 24×24 icon beside their label. When every field has an icon, visual hierarchy collapses and scanning speed drops.
  - **Fix**: Remove decorative label icons; organize fields into 3 structured, collapsible micro-cards (`Job Essentials`, `Role Details`, `Notes & Context`).
  - **Suggested command**: `/impeccable distill`

- **[P2] Abrupt View Swapping Without Persistent Navigation**
  - **Why it matters**: When switching between job clipping and webmail logging, the entire view vanishes and replaces itself. Users have no persistent visual tabs to understand where they are or manually switch modes.
  - **Fix**: Introduce a persistent 4-tab top switcher (`[📥 Job]`, `[👤 Contact]`, `[✉️ Email]`, `[⚡ Autofill]`) that auto-detects context while preserving tab state.
  - **Suggested command**: `/impeccable shape`

- **[P2] Keyboard Inefficiency for Power Applicants**
  - **Why it matters**: Power applicants clip dozens of jobs daily. Currently, pressing `Tab` forces focus through all rich-text toolbar buttons (`B`, `I`, `H`, `List`), and there is no `Ctrl+Enter` shortcut to submit.
  - **Fix**: Add `tabindex="-1"` to formatting toolbar buttons, implement `Ctrl+Enter` / `Cmd+Enter` global save listener, and display a subtle keyboard shortcut hint on the save button.
  - **Suggested command**: `/impeccable adapt`

### Persona Red Flags

- **Alex (Power User)**: Forced to click the save button with mouse because `Ctrl+Enter` is unsupported. Tabbing through the form gets trapped in the rich-text toolbar before reaching the notes area.
- **Jordan (First-Timer)**: Overwhelmed by 10 inputs appearing simultaneously in a small popup. Confused by the "Local Mode" badge—uncertain whether their clips will be lost if they close the browser.
- **Sam (Accessibility)**: Rich-text toolbar buttons lack `aria-pressed` states. Pill buttons in `#work-location-pills` are plain `<button>` tags without `role="radiogroup"` or `aria-checked` semantics.

### Minor Observations
- The notes toolbar uses raw text characters (`<b>B</b>`, `<i>I</i>`, `<b>H</b>`) instead of crisp SVG icons matching Tracklet's design system.
- The company avatar box (`#company-avatar`) displays a plain `?` before a domain is typed, rather than an elegant building placeholder icon.
- Email logging view's "Switch to job clipper" link is styled as a low-contrast text link at the very bottom of the view.

### Questions to Consider
- What if the companion lived permanently docked in the Chrome Side Panel alongside job boards instead of vanishing on every blur?
- Could secondary fields (workplace, employment type, custom platform) be progressively disclosed only when detected or needed?
- How might the save button celebrate a successful clip without replacing the entire screen with an unclosable 2-second timeout?
