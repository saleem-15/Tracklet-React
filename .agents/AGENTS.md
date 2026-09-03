# Tracklet Architecture & Development Guidelines

You are working on **Tracklet**, a high-clarity, modern job application tracking system built with React 19, TypeScript, Vite, TailwindCSS v4, and Firebase.

Follow these mandatory architecture rules to keep the codebase clean, modular, and robust.

---

## 1. Core Principles

- **Zero Spaghetti Code**: Never put data fetching, storage sync, or business logic directly inside UI view components.
- **Repository Pattern**: All persistence (Firestore & localStorage) MUST go through `ApplicationRepository` (`src/lib/applicationRepository.ts`).
- **Single Source of Truth for Constants**: Never define application statuses, platforms, or styling maps inline in components. Import from `src/lib/constants.ts`.
- **Pure Utility Functions**: Date calculations, formatting, sorting, and filtering belong in `src/lib/dateUtils.ts` and `src/lib/filterUtils.ts`.
- **Rules of Hooks**: NEVER call React hooks conditionally or after early returns (`if (...) return null;`). Place all guards AFTER hook declarations.

---

## 2. Directory & Layering Structure

```
src/
├── components/          # Pure presentation & modular UI components
│   ├── ErrorBoundary.tsx
│   ├── AllApplicationsTable.tsx
│   ├── ActivePipelineBoard.tsx
│   ├── ApplicationDetailPanel.tsx
│   └── ...
├── lib/                 # Logic, services & utility layer
│   ├── constants.ts              # Shared statuses, platforms, style maps, storage keys
│   ├── applicationRepository.ts  # Unified persistence layer (Firestore + localStorage)
│   ├── dateUtils.ts              # Pure date formatting & calculation helpers
│   ├── filterUtils.ts            # Pure filter & sort logic
│   ├── firebase.ts               # Firebase initialization & exports
│   ├── historyService.ts         # Status history sub-collection service
│   ├── expiryUtils.ts            # Expiry notification calculations
│   └── ...
├── types.ts             # TypeScript interfaces and union types
├── App.tsx              # Root container component (orchestrates layout & state)
└── main.tsx             # Entry point with ErrorBoundary
```

---

## 3. Mandatory Coding Conventions

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

---

## 4. Verification Checklist Before Marking Work Complete
Run these commands to verify code integrity before finalizing any task:
1. `npx tsc --noEmit` — Type checks must pass with zero errors.
2. `npm run build` — Production build must succeed cleanly.
3. **Lighthouse Compliance**: Never use `text-slate-400` on white/light backgrounds for readable text (use `text-slate-500` minimum for WCAG AA compliance). Maintain zero console errors and clean meta tags (see `.agents/skills/lighthouse-audit/SKILL.md`).
