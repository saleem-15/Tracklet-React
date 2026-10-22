# Antigravity Agent Instructions — Tracklet SaaS

## 1. Project Identity & Business Model
Tracklet is a **commercial, closed-source B2C SaaS web application and Chrome Extension** for job seekers. 
> **IMPORTANT PIVOT NOTICE:** Tracklet previously operated as an open-source, local-first/privacy-first project. It has pivoted to a **Cloud-Native Freemium/Pro SaaS model**. Never propose or implement local-only storage silos (`IndexedDB` or unauthenticated `localStorage` databases) for new features.

## 2. Tech Stack & Key Directories
- **Frontend (`src/`):** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
  - Domain hooks & state: `src/hooks/`, `src/context/` (see `docs/architecture-migration/`).
  - Core views: `ActivePipelineBoard.tsx`, `AllApplicationsTable.tsx`, `ApplicationDetailPanel.tsx`, `StatsView.tsx`.
- **Backend & Persistence:** Firebase Authentication, Cloud Firestore (`firestore.rules`), Firebase Cloud Storage (for resumes/documents), and Vercel/Node Serverless Functions (`api/`).
- **Browser Extension (`extension/`):** Manifest V3 Chrome Extension (`popup.js`, `content.js`, `background.js`, `jobBoardRegistry.js`).
- **Specs & Architecture:**
  - Product & Business Truth: `PRODUCT.md`, `STRATEGY.md`, `DESIGN.md`.
  - SpecKit Constitution: `.specify/memory/constitution.md`.
  - Feature Specs: `specs/` (e.g., `specs/012-contact-email-log`).
  - Architecture Decision Records: `docs/adr/0001` through `0011`.

## 3. Mandatory Architectural Guardrails
1. **Auth & Multi-Tenancy:** All Firestore collections and Cloud Storage paths must be strictly scoped to `users/{userId}/...` (ADR 0003).
2. **SaaS Entitlements:** Always account for `user.planTier` (`'free' | 'pro'`) when modifying application creation, scraping (`api/scrape-job.ts`), ATS autofill, resume uploads, or analytics views (`StatsView.tsx`).
3. **API Security:** Never expose unauthenticated serverless endpoints in `/api`. Always verify the caller's Firebase Auth ID token.
4. **Telemetry:** ADR 0004 (conditional/opt-in telemetry) is superseded by ADR 0011. Error tracking (Sentry) and funnel analytics (PostHog) are standard across authenticated views with PII scrubbing.
5. **UI/UX Craft:** Adhere strictly to `.agents/rules/ui-ux-standards.md` and `DESIGN.md`.

## 4. Workflow & SpecKit Usage
- When planning or building a new feature, check `.specify/memory/constitution.md` and `PRODUCT.md` first.
- When modifying data models, use the `modify-data-model` skill and update both TypeScript interfaces and `firestore.rules`.

---

## 5. Core Architectural Principles

- **Zero Spaghetti Code**: Never put data fetching, storage sync, or business logic directly inside UI view components.
- **Repository Pattern**: All persistence (Firestore & localStorage) MUST go through `ApplicationRepository` (`src/lib/applicationRepository.ts`).
- **Single Source of Truth for Constants**: Never define application statuses, platforms, or styling maps inline in components. Import from `src/lib/constants.ts`.
- **Pure Utility Functions**: Date calculations, formatting, sorting, and filtering belong in `src/lib/dateUtils.ts` and `src/lib/filterUtils.ts`.
- **Rules of Hooks**: NEVER call React hooks conditionally or after early returns (`if (...) return null;`). Place all guards AFTER hook declarations.

---

## 6. Mandatory Coding Conventions

### A. Adding or Modifying Data Attributes (`Application` model)
1. Update `Application` interface in `src/types.ts`.
2. Update `ApplicationRepository` in `src/lib/applicationRepository.ts` if default fields/seed mapping changes.
3. Update sample data in `src/lib/sampleData.ts`.
4. Update CSV export (`src/lib/exportCsv.ts`) and CSV import (`src/lib/importCsv.ts`).

### B. Creating New React Components & Canonical Shared Primitives
- Keep components under **300 lines**. If a component exceeds 300 lines, extract logical sub-components.
- Always define a clear `Props` TypeScript interface.
- Never use inline raw hex colors; use Tailwind utility classes aligned with the design tokens in `DESIGN.md`.
- **Mandatory Canonical Shared Components**:
  1. **Notes & Markdown Editor**: ALWAYS use the shared `RichTextEditor` (`src/components/editor/RichTextEditor.tsx`) for notes, meeting logs, discussion surfaces, and prep notes. Raw HTML `<textarea>` for notes is strictly forbidden.
  2. **Dropdowns & Selects**: ALWAYS use the shared `CustomSelectDropdown` (`src/components/CustomSelectDropdown.tsx`) for select menus. Raw HTML `<select>` elements are strictly forbidden.
  3. **Modals & Drawers Dismissal**: ALL modals, slide-overs, drawers, and overlay dialogs MUST implement an `Escape` keydown listener (`e.key === 'Escape'`) to dismiss cleanly.
  4. **Status & Stages**: ALWAYS use `StatusBadge` or `STAGE_CONFIG_MAP` from `src/lib/constants.ts`. Never hardcode status colors or labels.

### C. State Management
- `App.tsx` holds top-level state (`applications`, `filter`, `sort`, `user`, `activeTab`, `selectedAppId`).
- Do NOT add new global state to `App.tsx` unless necessary. Component-specific transient UI state (e.g., active dropdown tab) should remain local.

### D. User Feedback & Notification Hierarchy
1. **Single Notification System**: Always dispatch notifications via the top-level `addToast` / `onShowToast` prop. Never create local floating toast state inside child components.
2. **Notification Types & Hierarchy**:
   - **Snackbar (`addToast`)**: For immediate action receipts (3–6s).
     - Status changes: ALWAYS pass the target `stage` token and an `Undo` callback.
     - Destructive item/contact/task deletes: ALWAYS provide an `Undo` callback.
     - Created/Updated items: Short, compact confirmation receipt.
   - **Inline Banner**: For persistent/contextual information that requires user attention (e.g., >14 days stale warning, unverified email gate).
   - **Modal Dialog**: For pre-action destructive confirmations (e.g., "Reset workspace?", "Delete account?"). Follow with a lightweight receipt snackbar.
3. **Zero Browser Dialogs**: NEVER use native `window.alert()`, `window.confirm()`, or `window.prompt()`. Use custom in-app modal dialogs (e.g. `UnsavedChangesPrompt`) for pre-action gates, or lightweight Snackbars with `Undo` callbacks for immediate reversible actions.

### E. Git & Commits Policy
1. **Trunk-Based Workflow**:
   - Always branch directly from `main` (`feat/*`, `fix/*`, `refactor/*`, `docs/*`).
   - Keep feature branches short-lived (< 1–2 days) and focused on a single capability.
   - Merge into `main` via GitHub PR using **Squash and Merge**.
   - Delete feature branches immediately after merging.
2. **No Unprompted Commits**: NEVER run `git commit` or commit changes unless the user **explicitly asks/commands** you to do so in the prompt. Always leave modified files uncommitted in the working tree for the user to review.

### F. Universal UI/UX Standards
All components must follow the formalized guidelines in `.agents/rules/ui-ux-standards.md`:
1. **Universal Outbound Links**: All `mailto:`, `tel:`, and external URLs MUST have `target="_blank" rel="noopener noreferrer"`. Never navigate the current tab away from Tracklet.
2. **Universal Optimistic UI**: Modals/forms dismiss immediately on submit (`onClose()`), React state updates synchronously with a local optimistic ID, and background Firestore syncing executes with automatic rollback on error.
3. **Standardized Destructive Palette**: Destructive actions (delete, discard, unlink) must use subtle rest and rose hover: `text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors`. Never use permanent alarming red for row or card buttons.
4. **Resilient Form Validation**: Always include `noValidate` on forms, auto-trim strings, and use permissive RFC-compliant regex with inline error messaging.
5. **Header Hierarchy**: Do not place dynamic record counts as subtitles directly under primary page or modal headings.
6. **Micro-interaction Stability**: Use `transition-colors duration-150` instead of `transition-all`. Keep font-weights and borders constant across states to prevent layout shifts.
7. **Action-Only Navigation Badges**: Persistent navigation tabs must remain calm and free of raw database tallies. Badges are strictly reserved for urgent/actionable events (e.g. pending follow-ups or expiring deadlines). Entity inventory counts belong in context within toolbars and column headers.

### G. Browser Extension Versioning & Distribution
1. **Synchronized Versioning**: Whenever modifying files inside `extension/`, you MUST bump the `"version"` string in `extension/manifest.json` AND update `LATEST_EXTENSION_VERSION` in `src/lib/constants.ts` in lockstep.
2. **Automated Verification**: The test suite in `tests/unit/versionSync.test.ts` validates that `extension/manifest.json` matches `constants.ts`. Never push changes where these two values drift.
3. **Artifact Bundling**: Run `npm run package:ext` or `npm run build` to package `public/tracklet-extension.zip`. The download anchor uses `download="tracklet-extension-v<version>.zip"` to guarantee version clarity on the user's local disk.

---

## 7. Verification Checklist Before Marking Work Complete
Run these commands to verify code integrity before finalizing any task:
1. `npx tsc --noEmit` — Type checks must pass with zero errors.
2. `npm run build` — Production build must succeed cleanly.
3. **Lighthouse Compliance**: Never use `text-slate-400` on white/light backgrounds for readable text (use `text-slate-500` minimum for WCAG AA compliance). Maintain zero console errors and clean meta tags (see `.agents/skills/lighthouse-audit/SKILL.md`).
