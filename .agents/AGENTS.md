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

### B. Creating New React Components
- Keep components under **300 lines**. If a component exceeds 400 lines, extract logical sub-components.
- Always define a clear `Props` TypeScript interface.
- Never use inline raw hex colors; use Tailwind utility classes aligned with the design tokens in `DESIGN.md`.

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

---

## 4. Verification Checklist Before Marking Work Complete
Run these commands to verify code integrity before finalizing any task:
1. `npx tsc --noEmit` — Type checks must pass with zero errors.
2. `npm run build` — Production build must succeed cleanly.
3. **Lighthouse Compliance**: Never use `text-slate-400` on white/light backgrounds for readable text (use `text-slate-500` minimum for WCAG AA compliance). Maintain zero console errors and clean meta tags (see `.agents/skills/lighthouse-audit/SKILL.md`).
