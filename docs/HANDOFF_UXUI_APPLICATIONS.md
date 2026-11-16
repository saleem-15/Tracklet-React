# Handoff: Unified Applications Hub & UI/UX Polish

> **Date:** November 14, 2026  
> **Workspace:** `C:\Users\Saleem\.gemini\antigravity\worktrees\Tracklet\unified_applications_hub`  
> **Branch:** `unified_applications_hub`  
> **Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion, Cloud Firestore.

---

## 1. Executive Summary & Purpose
Tracklet currently has two disconnected application tracking pages:
1. `/pipeline` — The drag-and-drop Kanban board (`ActivePipelineBoard.tsx`).
2. `/all-applications` — The data table (`AllApplicationsTable.tsx`).

**The Goal:** Unify these into a single destination view (`/applications`) featuring:
- A prominent layout switcher: `[ ⊞ Board | ☰ Table ]` (using concentric `SegmentedTabs`).
- Persistent filter and search state preserved when toggling between Board and Table lenses.
- Deep-linking support via query parameters (`/applications?layout=board` / `?layout=table`).
- Executive-grade UI/UX refinement across the board, progressive filters, and individual job application cards.

---

## 2. Agreed Architectural & Design Decisions

### A. Layout & Global Shell
- **Retained Desktop Sidebar:** The left collapsible navigation sidebar (`Sidebar.tsx`) remains in place. Top navigation headers were explicitly rejected by the user.
- **Direction A (Linear-Style Fluid Command):** Header bar houses the Page Title, Search Bar, Layout Switcher (`SegmentedTabs`), and `+ Add Application` primary CTA on a single unified optical row.
- **Smart Status Routing:** If a user filters by `Archived` or `Rejected` in the Status dropdown, the UI automatically flips to **Table mode** (since Kanban columns only represent active stages).

### B. Progressive Filter Architecture (Approach 2)
- Modeled after Linear and GitHub Projects:
  - **Always-Visible Core:** Global text `Search` input + `Status: Active ▾` dropdown.
  - **Secondary Filters on Demand:** A `[+ Filter ▾]` dropdown button allows users to dynamically add chips for:
    1. `Platform` (LinkedIn, Indeed, Greenhouse, Lever, etc.)
    2. `Work Mode` (Remote, Hybrid, Onsite)
    3. `Job Type` (Full-time, Part-time, Contract, Internship)
    4. `Date Captured` (Last 7d, 30d, 90d, custom)
  - When added, filters appear as compact, dismissible capsule chips (`[ Platform: LinkedIn ⨉ ]`).
  - Active filters synchronize across both Kanban and Table views seamlessly.

### C. Inspection / Detail Model
- **v1 Decision:** Retain the current centered modal dialog (`ApplicationDetailPanel.tsx`) to avoid scope creep during the unification phase.
- **v2 Queued Task:** The Notion-style Side Peek Drawer + Full-Page expansion is fully specified in [`docs/future-tasks/notion-style-application-detail-peek.md`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/docs/future-tasks/notion-style-application-detail-peek.md) and will be implemented in a dedicated subsequent PR.

---

## 3. Job Application Card Refinements (The 6 Pillars)
Based on user feedback and visual audit of the 3x3 Kanban card grid:

| Area | Previous State | New Polished Standard |
| :--- | :--- | :--- |
| **Decluttering** | `[Contact]` mailto link, `[2 emails]`, `[1 contact]`, and `[LinkedIn]` badge. | **Removed entirely.** The card remains calm and uncluttered. |
| **Role & Location** | Inconsistent metadata. | `Role Title` (bold, line-clamp-1) + `Work Mode · Location` (e.g. `Hybrid · San Francisco, CA`). Middle dot delimiter styled with `text-slate-300`. |
| **Salary Notation** | Mixed full numbers (`$190,000`) and ranges (`$185k - $210k`). | **Compact k-Format:** `$190k` or `$185k–$210k` with en-dash (`–`). Styled with `font-mono tabular-nums text-xs font-semibold text-slate-700`. |
| **Task / Next Action** | Linear card showed `[Prepare architecture deck for Thursda...]` cutting off mid-word and stretching the card taller than neighbors. | **Uniform Vertical Rhythm:** Single-line, compact task badge with optical truncation (`max-w-[220px] truncate` or `Architecture deck · Thu`). Prevents column height jitter. |
| **Recency & Stale State** | Repeated `120d ago` everywhere; unexplained pink border on Ramp card. | **Drop "ago":** Clean recency (`2d`, `5d`, `12d` in `text-slate-400 font-mono text-xs`). Staleness (>14d inactive) shown via clear indicator (`• 18d stale`), not an ambiguous border color. |
| **Logo Container** | Mix of circular app icons and raw transparent glyphs. | Standardized soft container: `w-6 h-6 rounded-md bg-slate-50 border border-slate-200/70 flex items-center justify-center p-0.5`. |
| **Card Container** | Standard border. | `rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-colors duration-150`. Zero `transition-all`. Container depth = 1. |

---

## 4. Key Documentation & Interactive Prototypes On Disk

All design assets, specifications, and interactive prototypes are saved in the repo:
- **Requirements & Personas:** [`requirements.md`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/requirements.md)
- **UX Brief & Flows:** [`ux-brief.md`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/ux-brief.md)
- **Design Brief:** [`design-brief.md`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/design-brief.md)
- **Design System Tokens:** [`design-system.md`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/design-system.md)
- **Full Workflow Progress Log:** [`ui-progress.md`](file:///C:/Users/Saleem/.gemini/antigravity/worktrees/Tracklet/unified_applications_hub/ui-progress.md)
- **Interactive Prototypes:**
  - `designs/final/unified-applications-hub.html` — Approved interactive mock with unified header, filter bar, and layout toggle.
  - `designs/round-2/filter-approach-2-progressive-chips.html` — Progressive filter chips prototype.
  - `designs/round-2/a1-with-all-filters.html` — Comparison prototype.

---

## 5. Next Immediate Agenda (Where the New Chat Picks Up)
The user requested to proceed with **fine details on the UI/UX**:
1. **Dropdown & Filter Chip UX Details:**
   - Exact popover behavior, keyboard navigation (Arrow keys, Enter, Esc), click-outside dismissal, and multi-select handling for `[+ Filter ▾]`.
2. **Kanban Card Micro-Interactions:**
   - Drag & drop affordance (`cursor-grab` to `cursor-grabbing`), drop target placeholder styling, and mobile responsiveness.
3. **Empty States & Edge Cases:**
   - 0 search/filter results ("No applications match your active filters [Clear Filters]").
   - Column-level empty states ("Drop applications here or click + to add").
4. **Implementation Plan & Code Scaffolding:**
   - Component extraction strategy (e.g. `FilterBar.tsx`, updating `ActivePipelineBoard.tsx`, updating `App.tsx` routing).
