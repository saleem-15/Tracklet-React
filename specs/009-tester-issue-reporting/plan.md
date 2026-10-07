# Implementation Plan: Tester Issue & Feedback Reporting System

**Branch**: `feat/tester-issue-reporting` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-tester-issue-reporting/spec.md`

---

## Summary

Build an in-app tester bug and feedback reporting engine for Tracklet that operates 100% free with zero credit cards, leveraging Vercel Serverless Functions on the Hobby free tier and Firebase Spark.
The feature introduces:
1. **Frictionless In-App Reporter Modal**: Modal with category classification (Bug Report, Visual Glitch, Feature Request, Feedback), severity ranking, title, and description.
2. **Automated Diagnostic Introspection**: Silently captures non-invasive environment metadata (browser, OS, viewport, active route, auth mode, sanitized recent console errors) without user manual entry.
3. **Visual Evidence Attachment**: Drag-and-drop, native file picker, and direct clipboard image paste (`Ctrl + V`) with client-side canvas compression (<300KB) and instant preview/removal controls.
4. **Zero-Cost Issue Routing**: Dispatches to GitHub Issues via Vercel Serverless Function `/api/report-issue` (or fallback pre-filled issue URL) backed by persistent storage in Firestore (`tester_feedback`).
5. **Dual Surface Access**: Dedicated "Help & Feedback" card in Settings (`SettingsView.tsx`), quick link in Sidebar footer (`Sidebar.tsx`), and optional global hotkey (`?`).

---

## Technical Context

**Language/Version**: TypeScript 5.8+ / React 19  
**Primary Dependencies**: Vite 6, TailwindCSS v4, Lucide React (unified blue/slate tokens)  
**Storage**: Firestore `tester_feedback` collection (Firebase Spark Free Tier, no credit card); `localStorage` (`tracklet_tester_report_draft`) for offline draft resilience  
**Serverless Endpoint**: Vercel Hobby Free Tier (`api/report-issue.ts`) with GitHub REST API (`octokit` / `fetch`) using repository secret `GITHUB_TOKEN` (zero credit card required)  
**Testing**: Vitest (`npm test`)  
**Target Platform**: Desktop and Mobile responsive web browsers  
**Performance Goals**: <45s average report submission; <300ms modal summon; image compression capped to <300KB WebP  
**Constraints**: 100% free tier only; zero credit cards; strictly no scraping of candidate resume or application notes into diagnostics; WCAG AA contrast compliance  

---

## Constitution Check

- [x] **Repository Pattern**: All Firestore persistence routes strictly through `FeedbackRepository` (`src/lib/feedbackRepository.ts`). Zero Firestore calls directly in UI views.
- [x] **Single Source of Truth**: Report categories, severities, and status options defined in `src/lib/constants.ts`.
- [x] **Pure Utility Functions**: Diagnostic gathering (`src/lib/diagnosticUtils.ts`) and image compression/clipboard parsing (`src/lib/imageUtils.ts`) isolated as pure, testable helpers.
- [x] **Canonical Shared Primitives**:
  - Category and severity dropdowns use `CustomSelectDropdown` (`src/components/CustomSelectDropdown.tsx`).
  - Modal implements `useEscapeKey` with dirty form confirmation prompt.
  - Success feedback uses the top-level notification snackbar system (`useToastContext`).
- [x] **Design Tokens Compliance**: Aligns with `DESIGN.md` (no rogue colors, standard blue/slate palette, subtle rose hover for delete).
- [x] **Component Line Limits**: Modal and cards broken into focused sub-components under 300 lines.

---

## Project Structure

### Documentation (this feature)

```text
specs/009-tester-issue-reporting/
├── spec.md                  # Feature specification
├── plan.md                  # Implementation plan (this file)
├── research.md              # Research & technical decisions
├── data-model.md            # TypeScript interfaces & Firestore schema
├── quickstart.md            # Manual walkthrough & verification guide
├── contracts/
│   └── api-report-issue.json # API schema for Vercel -> GitHub issue
└── checklists/
    └── requirements.md      # Spec completeness checklist
```

### Source Code

```text
api/
└── report-issue.ts                       # Vercel Serverless Function (GitHub REST API dispatcher)

src/
├── types.ts                              # TesterIssueReport, DiagnosticContext, TesterAttachment
├── lib/
│   ├── constants.ts                      # TESTER_REPORT_CATEGORIES, TESTER_REPORT_SEVERITIES
│   ├── diagnosticUtils.ts                # Pure environment diagnostic collection & error sanitization
│   ├── imageUtils.ts                     # Clipboard image extraction & client canvas compression
│   └── feedbackRepository.ts             # Persistence layer for tester reports (Firestore + draft cache)
├── components/
│   ├── feedback/
│   │   ├── TesterReportModal.tsx         # Main accessible issue reporter modal dialog
│   │   ├── DiagnosticSummaryCard.tsx     # Collapsible diagnostic viewer inside modal
│   │   ├── AttachmentDropzone.tsx        # File picker, drag-and-drop, & clipboard paste zone
│   │   └── FeedbackSettingsCard.tsx      # Help & Feedback card for SettingsView
│   ├── SettingsView.tsx                  # Embeds FeedbackSettingsCard
│   └── Sidebar.tsx                       # Adds "Report Issue" action in bottom footer
tests/
└── unit/
    ├── diagnosticUtils.test.ts           # Tests environment detection & error sanitization
    ├── imageUtils.test.ts                # Tests clipboard parsing & compression thresholds
    └── feedbackRepository.test.ts        # Tests CRUD operations & draft preservation
```

---

## Complexity Tracking

| Decision | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| Vercel Serverless Function (`api/report-issue.ts`) | Dispatches to GitHub REST API securely without exposing token | Client-side API token embedding is a fatal security leak; Firebase Functions requires credit card |
| Canvas Image Compression | Caps screenshots to <300KB before transmission | Sending multi-megabyte 4K raw screenshots causes upload timeouts on mobile/poor connections |
| Native Paste Listener (`Ctrl+V`) | Enables immediate screenshot pasting from OS snippet tools | Heavy screenshot libraries like `html2canvas` add bloat and break with cross-origin assets |

---

## Verification Plan

### Automated Tests
- Run `npm test tests/unit/diagnosticUtils.test.ts`
- Run `npm test tests/unit/imageUtils.test.ts`
- Run `npm test tests/unit/feedbackRepository.test.ts`
- Run full test suite: `npm test`
- Type checking: `npx tsc --noEmit`
- Production build: `npm run build`

### Manual Verification
1. Open modal from Settings and Sidebar footer.
2. Verify diagnostics accordion reflects current route, browser, and auth mode.
3. Paste an image using `Win+Shift+S` and `Ctrl+V` $\rightarrow$ inspect thumbnail and full-size preview.
4. Submit report $\rightarrow$ verify receipt snackbar with report reference ID.
5. Simulate offline connection in DevTools $\rightarrow$ verify error banner, retry button, and zero text loss.
