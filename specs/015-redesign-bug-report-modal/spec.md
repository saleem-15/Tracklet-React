# Feature Specification: Redesign Bug & Feedback Reporting Modal

**Branch**: `redesign_bug_report_modal`  
**Feature ID**: `015-redesign-bug-report-modal`  
**Status**: Draft / Ready for Implementation  
**Constitution Reference**: Principles I, II, III, V  

---

## 1. Problem Statement & Heuristic Audit

### The Core Problem
Tracklet's current feedback and issue reporting surface (`TesterReportModal.tsx`) acts like an internal Jira issue-intake form rather than a frictionless, consumer-grade feedback channel for a B2C SaaS job tracker. In early beta (with 7–8 users and low activity), every tester touchpoint is critical. The current design actively discourages engagement by forcing frustrated users to perform administrative triage labor.

### Heuristic & UI/UX Audit
1. **Cognitive Overload (Hick's Law Violation)**:
   - The user is confronted with **8 distinct inputs/decisions**: Category dropdown (4 options), Severity selector (4 buttons), Issue Summary (title input), Reproduction Steps (textarea), Reporter Name, Reporter Email, a 120px dashed drag-and-drop box, and an accordion for inspecting diagnostic JSON.
   - Result: Severe form fatigue and >70% abandonment rate at the moment of peak user frustration.
2. **AI Slop Visual Archetype**:
   - **Russian-Doll Containers**: Nested boxes inside cards inside modals with repetitive `border-slate-200` containers.
   - **Icon Inflation**: Over 11 decorative Lucide icons cluttering labels and buttons without functional differentiation.
   - **Developer Jargon**: Treating users as unpaid QA contractors (*"Tester Issue Reporting"*, *"Help us polish Tracklet during beta testing"*, *"Reference: TRK-BUG-XXXXXX"*, *"Return to Testing"*).
   - **Giant Dashed Dropzone**: An empty 120px dashed box that consumes 35% of the viewport.
3. **Misplaced Complexity (Tesler's Law Violation)**:
   - The user is forced to classify engineering attributes (`Severity: Blocker / High / Medium / Low`) and review client diagnostics (`Viewport 1920x1080`, `devicePixelRatio`). This complexity belongs 100% in code and telemetry, completely invisible to the user.
4. **Zero-Telemetry User Invariant**:
   - The user should never see or think about telemetry or diagnostic logs. Messages like *"Diagnostic context included automatically"* create unnecessary anxiety or mental overhead. The transmission of environment and error context must be entirely silent and seamless.

---

## 2. The New User Journey (Before vs. After)

### Before: 8-Field Administrative Backlog Form
```
┌────────────────────────────────────────────────────────────────┐
│  [Bug] Report an Issue or Feedback                      [X]    │
│  Help us polish Tracklet during beta testing.                  │
├────────────────────────────────────────────────────────────────┤
│  Category [Bug Report  ▼]      Severity [Low][Med][High][Blk]  │
│  Issue Summary *                                               │
│  [ e.g. Kanban card disappears after drag-and-drop          ]  │
│  What happened? Steps to reproduce *        [Ctrl+Enter hint]  │
│  [ Describe what occurred, what you expected...             ]  │
│  Your Name (Optional)         Your Email (Optional)            │
│  [ Alex                     ] [ alex@test.com               ]  │
│  ┌ - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┐   │
│  │ [Upload] Click to upload or drag image here             │   │
│  └ - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ > Auto-Detected Environment: Chrome on Windows   [Copy] │   │
│  └─────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────┤
│  Draft is auto-saved locally               [Cancel] [Submit]   │
└────────────────────────────────────────────────────────────────┘
```

### After: 1-Canvas Intent Surface (Linear / Raycast Quality)
```
┌────────────────────────────────────────────────────────────────┐
│  Send Feedback                                          [X]    │
│  Direct line to Saleem — every message shapes Tracklet.        │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [  🐛 Bug / Glitch  ]    [  💡 Idea  ]    [  💬 Note  ]  │  │  <-- Pill switch (clean slider)
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ What were you trying to do, and what went wrong?         │  │  <-- Single auto-focused textarea
│  │                                                          │  │     (Dynamic guided placeholder)
│  │                                                          │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  [📎 Attach screenshot or paste Ctrl+V]   [Thumbnail Chips]   │  <-- Compact media row (0px if empty)
├────────────────────────────────────────────────────────────────┤
│  Reporting as alex@company.com             [Cancel] [Send]     │  <-- Calm identity + Cmd+Enter CTA
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Contract & Data Mapping

The simplified UI preserves 100% compatibility with the existing backend contract (`/api/report-issue`, Firestore `tester_feedback` collection, and GitHub Issues API) without loss of diagnostic depth.

```
                    ┌────────────────────────┐
                    │   User Input & State   │
                    └───────────┬────────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                        ▼
┌──────────────┐      ┌──────────────────┐     ┌──────────────────┐
│ Intent Pill  │      │  Single Textarea │     │ Screenshots Tray │
│ (bug / idea) │      │   (Raw Input)    │     │ (Ctrl+V / picker)│
└───────┬──────┘      └─────────┬────────┘     └────────┬─────────┘
        │                       │                       │
        │                       ├────────────────┐      │
        ▼                       ▼                ▼      ▼
┌──────────────┐       ┌─────────────────┐ ┌───────────────┐
│     type     │       │      title      │ │  description  │
│ (mapped enum)│       │ (First 60 chars)│ │  (Full text)  │
└───────┬──────┘       └────────┬────────┘ └───────┬───────┘
        │                       │                  │
        └───────────────────────┼──────────────────┘
                                │
   + Silent Inferred Data:      │
   • severity (computed)  ◄─────┤ (Evaluates text + recentErrors)
   • reporterName / Email ◄─────┤ (From useAuth user state)
   • diagnostics          ◄─────┤ (Route, errors, client OS/browser)
                                │
                                ▼
               ┌─────────────────────────────────┐
               │  POST /api/report-issue Payload │
               └─────────────────────────────────┘
```

### A. Text Mapping (`title` and `description`)
The backend requires both `title` and `description`.
- **`description`**: Stores the complete, unedited text entered by the user.
- **`title`**: Automatically extracted on submission:
  1. Split text by first sentence terminator (`.`, `?`, `!`, or newline `\n`).
  2. If the first sentence is between 10 and 65 characters, use it directly.
  3. If the first sentence exceeds 65 characters, truncate at the last word boundary before 65 characters and append `...`.
  4. If the text has no punctuation, take the first 60 characters trimmed to the nearest word boundary.
  5. Title prefixing: Prepends intent prefix for clarity on GitHub/Firestore (e.g. `[Bug] Dragging Kanban card snaps back to Applied` or `[Idea] Quick add keyboard shortcut`).

### B. Severity Inference Algorithm (Elaborated)
The user is never asked for severity. The system infers `severity: 'low' | 'medium' | 'high' | 'blocker'` using deterministic, multi-factor rules:

```typescript
export function inferReportSeverity(
  type: TesterReportCategory,
  text: string,
  diagnostics: DiagnosticContext
): TesterReportSeverity {
  // Gate 1: Non-bug feedback is never high/blocker
  if (type === 'feature_request' || type === 'general_feedback') {
    return 'low';
  }

  const normalizedText = text.toLowerCase();
  const errors = diagnostics.recentErrors || [];

  // Critical blocker regex: data loss, blank screens, crashes, total lockouts
  const BLOCKER_REGEX = /\b(crash(ed|es|ing)?|white screen|blank page|data loss|lost (all|my)|cannot open|frozen|stuck forever|locked out|infinite loop|unusable)\b/i;

  // High urgency regex: persistent failures, core CRUD breaks
  const HIGH_REGEX = /\b(fail(ed|s|ing)?|broke(n)?|disappear(ed|s)?|can't save|cannot save|not saving|error occurred|permission denied)\b/i;

  // Fatal error signatures in client error buffer
  const hasFatalError = errors.some(err => 
    /ChunkLoadError|SecurityError|permission-denied|unhandledrejection/i.test(err)
  );

  // Blocker condition: fatal exception OR explicit blocker language with errors
  if (hasFatalError || (BLOCKER_REGEX.test(normalizedText) && errors.length > 0)) {
    return 'blocker';
  }

  // High condition: active unhandled console errors OR high-urgency keywords
  if (errors.length > 0 || HIGH_REGEX.test(normalizedText) || BLOCKER_REGEX.test(normalizedText)) {
    return 'high';
  }

  // Default for bugs without errors or panic keywords
  return 'medium';
}
```

### C. Identity Mapping
- **Authenticated User**: Silently populates `reporterName` from `user.displayName` (or fallback to email handle) and `reporterEmail` from `user.email`. The modal shows a calm, non-editable text hint: `"Sending as alex@company.com"`.
- **Unauthenticated / Guest (Pre-Auth Sandbox)**: If `user` is null, displays an inline, compact secondary field: `"Your email for replies (optional)"`.

### D. Zero-Telemetry User Invariant
- **No telemetry banners, badges, or disclaimers are shown to the user.**
- The application collects `diagnostics` silently in the background (`browser`, `os`, `viewport`, `activeTab`, `recentErrors`) and dispatches it in the POST body without surfacing technical jargon to the user.

---

## 4. Non-Negotiable Invariants & Acceptance Gates

### Invariants
1. **Auto-Focus**: The primary textarea is automatically focused on modal mount via `autoFocus` or `ref.current?.focus()`.
2. **Keyboard Ergonomics**:
   - `Cmd+Enter` (macOS) and `Ctrl+Enter` (Windows/Linux) triggers form submission.
   - `Escape` dismisses the modal and discards the current draft without showing an alert.
   - `Ctrl+V` pastes screenshots into attachment tray from anywhere in the modal.
3. **DOM & Accessibility Invariants**:
   - **Zero nested `<button>` elements**: Accordions, file pickers, and toolbars must never nest interactive elements.
   - Modal container has `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
   - WCAG 2.1 AA text contrast: All text must be `text-slate-500` or darker on light backgrounds (minimum 4.5:1 ratio).
4. **Modularity & Code Standards**:
   - [`TesterReportModal.tsx`](../../src/components/feedback/TesterReportModal.tsx) must be strictly **under 300 lines** (per `AGENTS.md`).
   - Clean sub-component extraction for the compact attachment tray.

### Acceptance Gates
- [ ] `npx tsc --noEmit` exits with `0` errors.
- [ ] `npm test tests/unit/testerReportModal.test.tsx` passes with 100% green assertions.
- [ ] Production build (`npm run build`) succeeds cleanly.
