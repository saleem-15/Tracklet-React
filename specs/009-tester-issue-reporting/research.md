# Research: Tester Issue & Feedback Reporting System

**Branch**: `feat/tester-issue-reporting` | **Feature**: `009-tester-issue-reporting` | **Date**: 2026-10-07

## Overview & Architecture Decisions

This research resolves all technical unknowns for building a zero-cost, credit-card-free tester bug and feedback reporting engine for Tracklet across React 19, TypeScript, Firebase (Spark Free Tier), and Vercel (Hobby Free Tier).

---

### Decision 1: Zero-Cost GitHub Issue Creation (Vercel Serverless vs Client-Side)

- **Selected Approach**: Vercel Serverless Function (`api/report-issue.ts`) with Graceful Fallbacks.
- **Rationale**:
  - Google Firebase Cloud Functions strictly requires upgrading to the Blaze pay-as-you-go plan (which requires a credit card). On the free Spark tier, outbound network requests to external APIs (like `api.github.com`) are blocked.
  - Vercel's Hobby plan is **100% free with no credit card required**, offering 100,000 free serverless function invocations per month.
  - Putting the GitHub REST call inside `/api/report-issue.ts` keeps the GitHub Personal Access Token (PAT) secure inside Vercel environment variables (`GITHUB_TOKEN`), completely inaccessible to client-side code.
  - Testers do NOT need a GitHub account; the issue is created on their behalf under a repository label (`tester-feedback`, `bug`).
- **Local Dev / Offline Fallback**:
  - When running `npm run dev` locally (where Vercel serverless routes aren't running unless using `vercel dev`), the reporter client detects the absence of the API route or API errors and gracefully writes directly to Firestore `tester_feedback` collection and offers a 1-click pre-filled GitHub Issue URL (`https://github.com/{owner}/{repo}/issues/new?...`).
- **Alternatives Considered**:
  - *Direct client-side GitHub API call*: Rejected because embedding a personal access token in client bundle is a critical security vulnerability.
  - *Pure mailto / email link*: Rejected because it requires testers to have a desktop email client configured and doesn't capture formatted diagnostics.

---

### Decision 2: Screenshot Capture & Attachment Handling

- **Selected Approach**: Manual Clipboard Paste (`Ctrl + V`), Drag-and-Drop, and File Picker (`<input type="file" accept="image/*">`).
- **Rationale**:
  - Eliminates browser permission dialogs ("Tracklet wants to record your screen"), which confuse or alarm non-technical testers and frequently fail on mobile browsers.
  - Testers use familiar native OS shortcuts (`Win + Shift + S` on Windows, `Cmd + Shift + 4` on Mac) and simply paste (`Ctrl + V`) directly into the reporting modal.
  - Zero heavy third-party canvas-capturing libraries (like `html2canvas`), preventing bundle bloat and canvas security taint issues with external company logos.
- **Image Optimization & Storage**:
  - Client-side image downscaling/compression using an HTML Canvas element before transmission, capping images to max 1280px width and ~300KB WebP/JPEG payload.
  - **Storage Strategy**:
    1. If Firebase Storage bucket is active: upload compressed image to `feedback_screenshots/{reportId}.webp` $\rightarrow$ obtain public download URL $\rightarrow$ embed directly into GitHub issue as `![Screenshot](url)`.
    2. Fallback / Guest mode: If Firebase Storage is unavailable, store compressed base64 thumbnail in Firestore `tester_feedback` record and link to it.

---

### Decision 3: Client Diagnostic Context Collection & Privacy Guardrails

- **Selected Approach**: Pure, non-invasive runtime environment introspection.
- **Data Points Captured**:
  - `appVersion`: Tracklet application version (from `package.json` / build meta).
  - `activeRoute`: Current URL path and active workspace tab (`pipeline`, `table`, `contacts`, `stats`, `settings`).
  - `browser`: User-Agent engine, browser family (Chrome, Firefox, Safari, Edge), and version.
  - `os`: Client operating system (Windows, macOS, iOS, Android, Linux).
  - `viewport`: Viewport dimensions (`window.innerWidth` × `window.innerHeight`), device pixel ratio (`window.devicePixelRatio`), and screen orientation.
  - `authMode`: Authentication state (`Authenticated (UID)` vs `Guest Mode`).
  - `recentErrors`: Circular buffer of last 3 uncaught window errors / unhandled promise rejections (sanitized).
- **Privacy & Security Boundaries**:
  - **STRICT PROHIBITION**: Diagnostic collectors MUST NEVER inspect or serialize user job applications, company names, contact phone numbers, notes content, or authentication tokens.
  - Sanitization utility strips email patterns and bearer tokens from error messages prior to packaging.

---

### Decision 4: Entry Points & Information Architecture

- **Selected Approach**: Settings Hub Card + Persistent Sidebar Footer Quick Action + Global Hotkey.
- **Rationale**:
  - **Settings View**: A new "Help & Feedback" card in `SettingsView.tsx` provides testers a comprehensive feedback center, including a "Report Issue / Suggestion" action, diagnostic environment summary, and a 1-click "Copy Diagnostics" button.
  - **Sidebar Footer**: A clean, accessible "Report Issue" action in `Sidebar.tsx` (next to Settings and Auth) provides 1-click access from any view without cluttering the board with a permanent floating badge.
  - **Global Hotkey**: Pressing `?` or `Ctrl + Alt + B` (when not inside an active text input/editor) instantly summons the reporter modal.

---

### Decision 5: Architectural Compliance with AGENTS.md

- **Repository Pattern**: All Firestore persistence routes through a dedicated `FeedbackRepository` (`src/lib/feedbackRepository.ts`). No raw Firestore SDK calls inside UI components.
- **Canonical UI Primitives**:
  - Category and severity dropdowns use `CustomSelectDropdown` (`src/components/CustomSelectDropdown.tsx`).
  - Notes / description use standard accessible form inputs.
  - Modal implements `useEscapeKey` with dirty-form confirmation prompt.
  - Toast receipts use the global `ToastContext` (`useToastContext`).
  - Strict compliance with `DESIGN.md` design tokens and WCAG AA contrast standards.
