---
target: extension/popup.html
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-10-06T11-28-37Z
slug: extension-popup-html
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Context chip (Gmail/LinkedIn) and stage dots provide clear state; however, save confirmation uses a disruptive 3.2s full-screen takeover without progress status or non-blocking snackbar. |
| 2 | Match System / Real World | 4 | Excellent domain mapping: job pipeline stages, relationship categories (Recruiter, Hiring Manager, Mentor), and domain-specific ATS field names match job seeker reality. |
| 3 | User Control and Freedom | 3 | Seamless draft preservation across tab switches prevents accidental data loss; however, no Undo action exists post-save, and Esc dismisses dropdowns but not full sub-drawers. |
| 4 | Consistency and Standards | 2 | Primary action placement diverges (Job/Contact/Email use a sticky bottom bar, while Autofill places its CTA in a top card); body has hardcoded `width: 390px; max-height: 600px` despite Manifest V3 Side Panel configuration. |
| 5 | Error Prevention | 3 | Proactive duplicate checking for jobs and contacts, and domain sanitization strips ATS/job board hostnames; however, no validation on URL schemes or date entry. |
| 6 | Recognition Rather Than Recall | 3 | Dynamic company logo preview, relationship category pills, and interactive field highlighting are intuitive; however, Contact Clipper lacks search for linked jobs (unlike Email tab). |
| 7 | Flexibility and Efficiency | 3 | Global `Ctrl+Enter` / `Cmd+Enter` accelerator and quick-edit profile drawer speed up workflows; lacks keyboard shortcuts (`Alt+1..4` or Arrow keys) to switch between companion tabs. |
| 8 | Aesthetic and Minimalist Design | 2 | The Job tab presents an unending 1300px+ vertical wall of 12 input controls, dropzones, and toolbars with zero progressive disclosure, creating severe cognitive fatigue. |
| 9 | Error Recovery | 2 | Empty required fields trigger a transient red outline (`.input-error`) without inline text explanation; users cannot undo if they accidentally submit. |
| 10 | Help and Documentation | 3 | Clear keyboard hints (`Ctrl+↵`) and button tooltips; lacks onboarding orientation or shortcut cheat sheet for new users. |
| **Total** | | **28/40** | **Good (70.0%)** |

---

### Design Specificity Verdict

**LLM assessment**: The Tracklet browser extension companion demonstrates high conceptual specificity for job tracking workflows. Unlike generic form-filler extensions, Tracklet incorporates domain-specialized patterns: recruiter detection on LinkedIn profiles, ATS application form scraping (Greenhouse, Lever, Workday), and candidate profile syncing. However, the surface suffers from an architectural identity crisis: while Manifest V3 registers the extension as a persistent, full-height Chrome Side Panel (`chrome.sidePanel`), the presentation layer (`popup.css`) remains locked into a legacy popup box (`width: 390px; max-height: 600px`). Furthermore, information density in the primary Job tab is uncurated—presenting 3 stacked cards, 12 inputs, recruiter previews, a resume dropzone, and a rich markdown editor simultaneously without progressive disclosure.

**Deterministic scan**: Scanned `extension/popup.html` and `extension/popup.css` using `detect.mjs`:
- **Warnings (2)**: Empty `src=""` on `<img id="recruiter-avatar-img">` (line 251) and `<img id="contact-avatar-img">` (line 398), risking broken image glyphs prior to script hydration.
- **Advisories (4+)**: Sub-type-ramp font sizes (`font-size: 10px` on lines 452 & 468) violating DESIGN.md's 11px floor for metadata labels; undocumented color hexes (`#22c55e`, `#166534`, `#bfdbfe`) and non-standard border-radii (`4px`, `7px`) drifting from core tokens.

**Visual overlays**: Chrome extension context utilizes sandboxed extension pages. Automated scans verified statically against DESIGN.md and WAI-ARIA tab standards.

---

### Overall Impression

The Tracklet extension companion has powerful features and rock-solid underlying plumbing (modular scrapers, IndexedDB resume caching, in-memory tab draft persistence), but its interface currently feels like three different tools squeezed into a rigid 390px phone box. Refactoring the layout to embrace Chrome's native Side Panel form factor, aligning primary action positions, introducing progressive disclosure on the Job tab, and replacing the disruptive full-screen modal success with an inline Undo snackbar will instantly elevate this to a top-tier companion tool.

---

### What's Working

1. **Context-Aware Mode Switching & Draft State Memory**: The companion automatically detects when a user navigates to LinkedIn (`/in/*`) or Gmail/Outlook and seamlessly shifts to Contact or Email logging while preserving in-memory drafts across tab switches without data loss.
2. **Contact Clipper Category Smart-Defaulting**: Auto-classifying scraped LinkedIn profiles into Recruiter, Hiring Manager, Mentor, or Referral based on headline keywords eliminates repetitive data entry.
3. **Interactive Autofill Field Checklist**: The visual checklist in the Autofill view allows candidates to click any mapped field to smoothly scroll and highlight it directly on the host application form.

---

### Priority Issues

#### [P1] Form Factor Disconnect & Fixed Viewport Clipping
- **What**: `popup.css` hardcodes `body { width: 390px; max-height: 600px; }` despite the extension operating as a native Chrome Side Panel (`chrome.sidePanel`) in Manifest V3.
- **Why it matters**: In a docked browser side panel, the window is 800–1200px tall and user-resizable. The hardcoded 600px max-height causes awkward dead space below, clips content unnecessarily, and floats sticky action bars in the middle of the screen.
- **Fix**: Update `body` and `.container` to fluid flex containers (`width: 100%; min-height: 100vh; max-height: none; padding-bottom: 72px;`) with a sensible `max-width: 480px; margin: 0 auto;`, allowing responsive scaling in both Side Panel and Popup modes.
- **Suggested command**: `/impeccable adapt`

#### [P1] CTA Spatial Inconsistency Across Companion Tabs
- **What**: The primary action button lives in a sticky bottom bar (`.sticky-action-bar`) on Job, Contact, and Email tabs, but abruptly relocates to the top hero card (`#autofill-hero-card`) on the Autofill tab.
- **Why it matters**: Violates spatial predictability and user muscle memory. Users scanning through tabs expect the primary conversion button in the same physical anchor.
- **Fix**: Unify the primary CTA across all four views into a standardized sticky bottom action bar, standardizing the button labeling syntax (e.g., replace sporadic "⚡" emojis with clean typographic action labels).
- **Suggested command**: `/impeccable layout`

#### [P2] Information Overload & Scroll Fatigue in Job Clipper
- **What**: The Job tab renders 3 stacked cards containing 12 form inputs, a recruiter preview card, a tailored CV dropzone, and a rich text formatting toolbar simultaneously, creating a >1300px scrollable column.
- **Why it matters**: 90% of job saves only require Company, Role, Stage, and URL. Forcing users to scroll through workplace arrangement, employment type, file dropzones, and notes toolbars creates cognitive friction and slows down rapid bookmarking.
- **Fix**: Implement progressive disclosure: display core essentials (Company, Role, Stage, URL) by default, and tuck secondary metadata (Workplace, Type, CV upload, and detailed Notes) into a collapsible "Additional Details" disclosure panel.
- **Suggested command**: `/impeccable distill`

#### [P2] Disruptive Full-Screen Success Takeover & Zero Undo Capability
- **What**: Saving an application completely hides `#main-container` and mounts a full-screen takeover (`#success-view`) for 3.2 seconds with no Undo action.
- **Why it matters**: Directly violates Tracklet's non-blocking notification philosophy (Rule 3.D). It locks the user out of the extension, interrupts rapid multi-tab job hunting, and offers no recourse for accidental submissions.
- **Fix**: Replace the full-screen modal takeover with a lightweight, non-blocking toast/snackbar receipt (with an "Undo" button and an "Open in Workspace" link) displayed inside or above the action bar, keeping the form in context.
- **Suggested command**: `/impeccable harden`

---

### Persona Red Flags

- **Alex (Power User)**: Trapped by the 3.2-second full-screen success animation when attempting rapid multi-tab job saving. Lacks keyboard navigation (`Alt+1..4` or Arrow keys) to switch between companion tabs without reaching for the mouse.
- **Jordan (First-Timer)**: Confronted by an intimidating 1300px wall of 12 fields and controls upon opening the extension. Empty required fields flash with a red border for 1.5 seconds without inline explanatory text ("Company name is required").
- **Sam (Accessibility-Dependent User)**: The `role="tablist"` navigation does not support WAI-ARIA Left/Right arrow key tab switching; custom select dropdowns lack ARIA listbox keyboard navigation; helper text styled at 10px falls below readable contrast and font scale standards.

---

### Minor Observations

- **Linked Application Search**: The Email tab features a searchable popover (`#app-search-input`) for selecting target jobs, but the Contact tab uses a flat select dropdown that degrades when users have 20+ active jobs.
- **Empty `src` Attributes**: `<img id="recruiter-avatar-img">` and `<img id="contact-avatar-img">` ship with empty `src=""` attributes, causing DOM warnings prior to profile data hydration.
- **Token Drift**: Inline `style="font-size: 10px;"` on lines 452 and 468 should use the design token `0.6875rem` (11px) with `JetBrains Mono` or `Plus Jakarta Sans`.

---

### Questions to Consider

- What if the Job tab defaulted to a 3-field "Quick Clip" card that could be saved in under 3 seconds, with an expandable drawer for notes and tailored resumes?
- What if the extension used a persistent snackbar receipt with an instant "Undo" button instead of locking the entire screen behind a 3.2-second success animation?
- How much faster would power users clip if the companion tabs supported instant number shortcuts (`Alt+1` for Job, `Alt+2` for Contact, `Alt+3` for Email, `Alt+4` for Autofill)?
