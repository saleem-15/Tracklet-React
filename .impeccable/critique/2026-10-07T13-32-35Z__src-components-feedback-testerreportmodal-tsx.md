---
target: src/components/feedback/TesterReportModal.tsx
total_score: 36
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-10-07T13-32-35Z
slug: src-components-feedback-testerreportmodal-tsx
---
Method: dual-agent (A: 58538720-271d-43da-947a-d3870edb9e1c · B: ea9b2851-6fee-44cd-96ec-43692bf286fd)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 4 | Real-time auto-save indicator, submit spinner, and instant receipt with reference ID. |
| 2 | Match System / Real World | 4 | Clear testing terminology (Bug, Visual Glitch, Blocker) aligned with developer mental models. |
| 3 | User Control and Freedom | 3 | Discard dialog causes confusion: says "draft is saved" while offering alarming red "Discard & Close". |
| 4 | Consistency and Standards | 3 | Active severity buttons collapse semantic colors (high/blocker turn dark slate instead of amber/rose). |
| 5 | Error Prevention | 4 | Client sanitization masks emails/bearer tokens; validates length; clamps uploads to 2MB. |
| 6 | Recognition Rather Than Recall | 4 | Auto-captures environment diagnostics and tester identity; thumbnail previews with file sizes. |
| 7 | Flexibility and Efficiency | 3 | Direct Ctrl+V clipboard pasting works anywhere; lacks Ctrl+Enter submission from textarea. |
| 8 | Aesthetic and Minimalist Design | 4 | Strict respect for 10% accent rule; clean slate canvas; diagnostics tucked in accordion. |
| 9 | Error Recovery | 3 | Graceful GitHub fallback; nested `<button>` inside accordion header breaks assistive tree. |
| 10 | Help and Documentation | 4 | In-field examples and transparent privacy disclaimer explaining data masking. |
| **Total** | | **36/40** | **Good (Solid Foundation, Minor Polish Before Release)** |

#### Design Specificity Verdict

**LLM Assessment**: 
The tester reporting experience feels 80% custom-built for Tracklet rather than a generic third-party feedback widget (like Intercom or UserVoice). It directly leverages Tracklet's dense operational aesthetics, capturing specific route/tab state (`activeTab`), auth mode (`guest` vs `authenticated`), and recent intercepted console errors. The primary specificity gap is that it does not yet allow linking the bug directly to the active candidate application card currently inspected on the Kanban board or table.

**Deterministic Scan**:
The mechanical detector flagged 7 findings (1 warning, 6 advisories):
- 1 Warning (`gray-on-color` at `AttachmentDropzone.tsx:214`): Verified as a **False Positive** (the detector flagged `text-slate-500` with `hover:bg-rose-50`, but at rest it renders on transparent/white).
- 6 Advisories (`design-system-font-size` at `AttachmentDropzone.tsx:150` and `DiagnosticSummaryCard.tsx:46, 85, 89, 93, 97`): Flagged `text-[10px]` usage which falls outside the primary `DESIGN.md` typography ramp (minimum 11px / 0.6875rem).
- Code inspection revealed an HTML specification violation: **Nested `<button>` inside `<button>`** in `DiagnosticSummaryCard.tsx:33-78` (copy button nested within accordion toggle).

**Visual Overlays**:
Deterministic scan completed via CLI; no active live browser session was injected.

#### Overall Impression
A highly responsive, engineer-friendly bug capture tool with standout clipboard screenshot ergonomics (`Ctrl+V`). It respects tester velocity and privacy. It needs accessibility hardening (dropzone keyboard navigation, modal focus traps, and HTML button unnesting) and mental-model clarity on draft dismissal.

#### What's Working
1. **Zero-Friction Visual Proof (`Ctrl+V` Clipboard Paste)**: Testers take a snip (`Win+Shift+S`) and press `Ctrl+V` anywhere in the modal; the image is immediately compressed to client WebP and attached with an interactive thumbnail.
2. **Transparent Diagnostic Sanitization**: Automatically logs browser, OS, viewport, tab route, and console errors while actively redacting user credentials and auth tokens.
3. **Resilient Multi-Tier Submission Flow**: If cloud APIs fail or the user is offline, the report is saved locally and an instant 1-click pre-filled GitHub issue URL is generated.

#### Priority Issues

- **[P1] What**: Dropzone is completely inaccessible via keyboard navigation (`AttachmentDropzone.tsx:124-142`).
  - **Why it matters**: The dropzone container is a `<div>` with `onClick` and `<input className="hidden">`. Keyboard-only and screen reader users cannot focus or activate file upload via Tab, Enter, or Space.
  - **Fix**: Add `tabIndex={0}`, `role="button"`, `aria-label="Upload screenshot or drag image"`, and `onKeyDown` handlers for Enter/Space.
  - **Suggested command**: `/impeccable a11y`

- **[P1] What**: Discard dialog creates cognitive dissonance between "Draft Saved" and "Discard & Close" (`TesterReportModal.tsx:440-471`).
  - **Why it matters**: The dialog warns "Discard changes?" with a red destructive button labeled "Discard & Close", while stating the draft is saved. Closing actually preserves the draft, causing anxiety.
  - **Fix**: Reframe as a neutral exit confirmation ("Save Draft & Close" in slate-900) and provide an explicit separate action if the user truly wants to discard and clear the draft.
  - **Suggested command**: `/impeccable clarify`

- **[P1] What**: Invalid HTML nesting: `<button>` inside `<button>` in `DiagnosticSummaryCard.tsx:33-78`.
  - **Why it matters**: Violates W3C HTML5 specs. Causes unpredictable click bubbling and corrupts the accessibility tree for screen readers.
  - **Fix**: Move the "Copy diagnostics" button outside the accordion toggle header or restructure into sibling elements.
  - **Suggested command**: `/impeccable harden`

- **[P2] What**: Active severity buttons collapse semantic urgency into uniform dark slate (`TesterReportModal.tsx:313-323`).
  - **Why it matters**: Selecting "Blocker" or "High" turns the button dark slate (`bg-slate-900`), losing visceral urgency.
  - **Fix**: Apply Tracklet status badge token styling: Low (Slate), Medium (Blue), High (Amber), Blocker (Rose).
  - **Suggested command**: `/impeccable colorize`

- **[P2] What**: Low-contrast text violations using `text-slate-400` on white cards (`TesterReportModal.tsx:362, 374`).
  - **Why it matters**: Contrast ratio is ~3.2:1 (fails WCAG AA 4.5:1 minimum and Tracklet Lighthouse rules).
  - **Fix**: Upgrade all `text-slate-400` subtitle text to `text-slate-500`.
  - **Suggested command**: `/impeccable polish`

#### Persona Red Flags

- **Alex (Power User)**: Types a description and instinctively presses `Ctrl+Enter` (or `Cmd+Enter`) to submit; nothing happens. Furthermore, pressing `?` opens the bug reporter instead of the keyboard shortcuts list.
- **Jordan (First-Timer)**: Panics when clicking Close because a red "Discard & Close" warning appears, fearing typed bug reproduction steps will be lost.
- **Sam (Accessibility-Dependent)**: Navigates using Tab key; the dropzone is completely skipped. Reaching the image preview overlay strands focus with no Escape key listener.
- **Riley (Stress Tester)**: Rapidly attaches screenshots past the 2-image limit; the dropzone blocks further additions with an inline alert without offering a 1-click "Replace existing" option.

#### Minor Observations
1. `TESTER_REPORT_CATEGORIES` provides descriptive subtitles, but `CustomSelectDropdown` only renders the title text.
2. Full image preview modal in `AttachmentDropzone.tsx` lacks an Escape key listener.
3. Severity toggle group lacks `role="radiogroup"` / `role="radio"` and `aria-checked` attributes.
4. Input fields lack character count indicators (`120` max on title).

#### Questions to Consider
- What if closing an in-progress bug report triggered an instant toast (*"Draft saved — reopen anytime with Ctrl+Alt+B"*), completely eliminating the jarring discard confirmation modal?
- What if the reporter allowed attaching the active job application card (`selectedAppId`) with 1 click?
