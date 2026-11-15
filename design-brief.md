# Design Brief: Tracklet Unified Applications Hub

## 1. Product & Problem Statement
Tracklet is a modern B2C SaaS job application tracker and Chrome Extension. Active job seekers currently navigate between two disconnected pages—"Active Pipeline" (Kanban) and "All Applications" (Table)—which fragments their mental model, resets search/filter context, and creates unnecessary navigation bloat. This project unifies both layouts into a single destination page at `/applications`, where users seamlessly switch between a visual Kanban board and a dense data table via an animated in-page toggle while preserving 100% of their active filter context.

---

## 2. Primary User & Context of Use
* **Primary User**: Active job seekers (Free and Pro SaaS tiers) tracking 5 to 150+ applications across various hiring stages.
* **Context of Use**:
  * *Desktop (1280px–1920px)*: High-focus work sessions—clipping jobs via Chrome extension, managing interview schedules, auditing salary ranges, and running bulk operations.
  * *Mobile (375px–430px)*: Quick on-the-go status checks, interview date verification, and immediate status moves via fluid thumb gestures.

---

## 3. Chosen Concept & Mental Model
* **Concept**: The Dual-Lens Workspace.
* **Mental Model**: *"One unified database of job applications, viewed through two complementary lenses."*
  * **Board Lens**: High-velocity visual triage and pipeline drag-and-drop.
  * **Table Lens**: Dense, structured data audit, column sorting, and bulk management.

---

## 4. Condensed Core Job Flows
1. **Daily Pipeline Triage (Board)**: User lands on `/applications` (defaults to Board), scans 5 stage columns, drags a card to "Interview". UI updates in 0ms with a 4-second Undo snackbar receipt.
2. **Search & Lens Switch**: User types "React" into the search bar, clicks the `Table` tab in the toolbar `SegmentedTabs`. View swaps in <150ms with "React" search preserved. User sorts by Salary descending and reviews compensation figures.
3. **Smart Archive Routing**: User opens the Status dropdown and selects `Archived`. System auto-switches to Table mode with all archived jobs sorted chronologically.

---

## 5. Navigation Model & Screen Inventory

### Navigation Model
* Single `"Applications"` tab in the global navbar (`/applications`).
* Legacy paths (`/pipeline`, `/all-applications`) automatically redirect to `/applications`.
* URL synchronizes with layout state (`/applications?layout=board` vs `/applications?layout=table`).

### Screen Inventory (Journey Order)
1. **The Unified Applications Hub (Hero Screen — KEY SCREEN)**:
   * *Primary Action*: `+ Add Job` (opens modal) or dragging a card to advance stages.
   * *Secondary Actions*: Layout toggle (`Board` ⇄ `Table`), Filter by Status/Platform/Date, Column Sorting, Bulk Delete (in Table).
   * *Content Priority*: 
     1. Sticky Command Toolbar (Search, Filter Pills, Layout Switcher, Add Job CTA).
     2. Main Applications Canvas (5-Column Kanban Board or Dense Table Matrix).
     3. In-card metadata (Days in stage, interview badges, salary tags).
   * *States*:
     * *Day 1 (0 Total Apps)*: `OnboardingEmptyState` with setup checklist and action grid.
     * *Filtered 0 State*: `EmptyState` with *"No applications match your filter"* and a 1-click *"Reset Filters"* button.
     * *Loading*: Column/row skeleton loaders with zero layout shift.
     * *Error*: Non-blocking inline banner with retry.
2. **Application Detail Modal (Supporting Screen)**:
   * *Primary Action*: Edit Application / Update Stage.
   * *Secondary Actions*: Add Contact, Log Email, Delete Application.
   * *Note*: Kept as centered modal (`ApplicationDetailPanel.tsx`) for v1. Future upgrade to Notion-style Side Peek Drawer is specified in `docs/future-tasks/notion-style-application-detail-peek.md`.

---

## 6. The Hero Screen to Design First
* **Screen**: **The Unified Applications Hub (`/applications`) with the Sticky Command Toolbar**.
* **Why**: It anchors the entire product experience. Defining the optical math of the toolbar, the spring physics of the `SegmentedTabs` toggle, and the in-place view crossfade dictates the design quality for the entire application.

---

## 7. UX Principles
1. **Lens, Not Location**: Board and Table are two views of the same data. Switching views must never reload the page or wipe filter inputs.
2. **Zero-Lag Optimism with Forgiveness**: All status mutations update in 0ms, backed by a 4-second Undo snackbar.
3. **Calm by Default**: Focus on active applications; archived records remain 1 click away without cluttering the daily triage canvas.
4. **Ergonomic Touch Targets**: Minimum 44x44px clickable areas on all mobile controls.

---

## 8. Brand, Tone & Design System Constraints
* **Personality**: Calm, precise, empowering, respectful of the user's focus.
* **Must Never Feel**: Cluttered, gimmicky, slow, or like AI slop (no nested bordered cards, no gratuitous icons on self-evident labels).
* **References**: Linear (view switching fluidity & optical craft), Notion/Airtable (clean lens toggling).
* **Design System Tokens (`src/theme/tokens.ts` & `src/theme/motion.ts`)**:
  * *Typography*: Outfit (`font-heading`), Plus Jakarta Sans (`font-sans`), JetBrains Mono (`font-mono`).
  * *Motion*: Critically damped springs (`stiffness: 400, damping: 35`), targeted transitions only (`transition-colors duration-150`), strict ban on `transition-all`.
  * *Colors*: Neutral slate palette; minimum WCAG AA contrast (minimum `text-slate-500` on light backgrounds).
  * *Canonical Primitives*: `SegmentedTabs`, `FilterSelectDropdown`, `EmptyState`, `OnboardingEmptyState`.

---

## 9. Platform, Breakpoints & Accessibility
* **Desktop (1024px+)**: 5-column Kanban grid; full multi-column sortable table.
* **Mobile (<640px)**: 
  * Board layout: Horizontal snap-scrolling columns (`snap-x snap-mandatory`).
  * Table layout: Clean responsive row cards for ergonomic vertical thumb scrolling.
* **Accessibility**: Keyboard navigable layout switcher (`ArrowLeft`/`ArrowRight`), ARIA roles on tabs, full contrast compliance.

---

## 10. Must-Haves vs. Won't-Haves
* **Must Have**:
  * Single `/applications` route.
  * Canonical `SegmentedTabs` layout toggle in the top-right toolbar.
  * Hoisted parent filter state (Search, Status, Platform, Date) synchronized across both layouts.
  * URL query param sync (`?layout=board|table`) and `localStorage` preference memory.
  * Smart Status routing: Selecting `Archived` or `Rejected` auto-shifts layout to Table.
* **Won't Have (v1)**:
  * Multi-row bulk selection checkboxes inside Kanban cards.
  * Custom user-defined pipeline stages.
  * Notion-style Side Peek Drawer (formally queued for follow-up).
