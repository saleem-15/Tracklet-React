# Tracklet: Unified Applications Hub (Board & Table) — Requirements

## Summary
Tracklet is consolidating its two historically separated views—the "Active Pipeline" (Kanban board) and "All Applications" (Table)—into a single, unified destination page at `/applications`. By treating job applications as a single core entity and Kanban/Table as two complementary visual lenses (fast triage vs. dense audit), this refactor eliminates cognitive fragmentation, cleans up persistent navigation, preserves search/filter context across lens changes, and introduces deep-linkable URLs with intelligent status-driven layout routing.

---

## Problem framing

### Problem statement
Job seekers using Tracklet need a way to seamlessly view, triage, and audit their applications through both visual Kanban and dense tabular lenses on a single page, because separating applications across two disconnected pages fragments their mental model, resets active search and filter context, and creates unnecessary navigation friction.

### Primary user snapshot
- **Who they are**: Active job seekers ranging from early-career applicants to senior professionals, across both Free and Pro SaaS tiers, tracking between 5 and 150+ concurrent job applications.
- **Context of use**:
  - *Desktop*: Intensive job-hunting sessions, capturing ATS listings via the Chrome extension, preparing for interview rounds, and auditing salary/stage progression.
  - *Mobile*: Fast status lookups, interview date checks, and on-the-go stage moves.
- **Core Jobs**:
  1. *Visual Triage*: Rapidly review in-flight applications, identify upcoming interviews, and drag cards through pipeline stages.
  2. *Dense Data Audit*: Search, sort, compare salaries/locations/notes, and perform bulk operations across many applications.
  3. *Context-Preserving Lens Switch*: Seamlessly switch between Board and Table without losing active search queries, stage filters, or sorting.
- **Frustrations & Worries**:
  - Cognitive confusion over whether a job lives in "Pipeline" or "All Applications".
  - Losing active filter or search context when switching views.
  - Board clutter from archived or rejected applications, while still requiring frictionless access to historical data.

### Key scenarios
- **Scenario 1: Daily Pipeline Triage (Board)**: User visits `/applications`, landing on their preferred Board layout. They visually scan their active columns, drag an interview card to "Offer", and log an email follow-up without navigating away.
- **Scenario 2: Comparative Salary Audit (Table)**: User searches for "Staff Engineer", clicks the `Table` toggle in the toolbar—retaining the search query—and sorts columns by salary to compare compensation packages.
- **Scenario 3: Historical Review of Past Jobs**: Recruiter contacts the user about a role archived months ago. The user selects `Status: Archived` in the toolbar filter; the view automatically transitions to Table mode to display historical rows chronologically.
- **Scenario 4: Mobile Pipeline Check**: User receives an email while away from their desk, opens Tracklet on their phone, and swipes horizontally through snap-scrolling Kanban columns or scrolls a clean vertical list.

### How might we
- *HMW* make switching between visual triage (Kanban) and structured audit (Table) instantaneous with zero reload?
- *HMW* maintain 100% search, filter, and selection continuity across view toggles?
- *HMW* leverage the existing Status filter to cleanly separate active pipeline triage from historical archive review without confusing page boundaries?
- *HMW* ensure deep-linkability (`?layout=board|table`) so users can bookmark their preferred view while auto-redirecting legacy URLs?

---

## Problem
Tracklet previously separated application tracking into two independent pages: "Active Pipeline" (Kanban) and "All Applications" (Table). This created a false distinction between the data entity (`Application`) and its visual projection. Furthermore, because Kanban excluded archived jobs while Table included them, users experienced fragmented mental models, cluttered top navigation, and lost filter context when navigating between pages.

---

## Goals and success metrics
- **Unified Destination**: Single route `/applications` replacing two top-level navigation links.
- **Context Continuity**: 100% retention of search queries, date filters, platform filters, and stage selections when toggling between Board and Table.
- **Frictionless Toggle**: Instant (<150ms) client-side layout swap powered by canonical `SegmentedTabs` with critically damped spring animations.
- **Smart Status Routing**: Automatically shift to Table layout when terminal statuses (`Archived`, `Rejected`) are selected in the Status filter.
- **Deep Linkability & Persistence**: Support `?layout=board|table` query parameter sync, with user preference remembered in `localStorage` (defaulting to Board for new users).
- **Zero Regression**: Retain full bulk delete and export features in Table, and retain drag-and-drop plus mobile snap-scrolling in Board.

---

## Users

### Primary user
- Active job seekers (Free and Pro tiers) managing multi-stage job search pipelines.

### Secondary users
- Returning / intermittently active users auditing past applications or pulling resume history.

### Roles and permissions
- Single-tenant authenticated user model (`users/{userId}/applications`).
- Pro tier users benefit from unlimited scraping and advanced analytics, but layout unification is universally available to all tiers.

### Context of use
- Primarily desktop web browsers (Chrome, Safari, Edge, Firefox).
- Responsive mobile web browsers (Safari iOS, Chrome Android) with touch ergonomics.

---

## Core jobs (ranked)
1. **Daily Active Triage (Rank 1)**: Visual overview of active job applications grouped by stage (`Saved`, `Applied`, `Screening`, `Interview`, `Offer`).
2. **Dense Audit & Comparison (Rank 2)**: Scanning structured rows, comparing salary ranges, tracking submission dates, and exporting/bulk-deleting.
3. **Seamless Lens Switching (Rank 3)**: Toggling between Board and Table layouts without losing search or filter state.
4. **Historical Archive Review (Rank 4)**: Auditing past rejected or archived applications.

---

## Scope

### Must have
- Single unified route at `/applications` and single `"Applications"` navbar link.
- Top-right layout switcher using Tracklet's canonical `SegmentedTabs` (`[ ⊞ Board ] [ ☰ Table ]`).
- Hoisted parent filter state synchronizing Search, Status, Platform, Work Location, Job Type, and Date Range across layouts.
- Dynamic URL query parameter synchronization (`/applications?layout=board` vs `/applications?layout=table`).
- Preference persistence via `localStorage.getItem('tracklet_preferred_layout')` (fallback default: `'board'`).
- Auto-redirect legacy routes (`/pipeline`, `/all-applications`) to `/applications`.
- Smart Status routing: Selecting `Archived` or `Rejected` in the Status dropdown automatically shifts layout to Table.
- Preserve existing `OnboardingEmptyState` (for 0 total applications) and `EmptyState` (for 0 filter matches).
- Mobile responsive layout support (horizontal swipe-snap for Board, clean vertical cards for Table).

### Should have
- Animated layout transition with targeted opacity crossfade (<150ms, zero `transition-all`).
- Visual grouping inside the Status dropdown separating meta scopes (`Active Only`, `All`) from individual pipeline stages.

### Won't have (this version)
- Drag-and-drop reordering between columns inside Table view (stage dropdown remains the selector in Table).
- Multi-row bulk checkbox selection inside Kanban cards (bulk actions remain exclusive to Table mode).
- Custom user-created pipeline stages (stages remain fixed to canonical Tracklet stages).

---

## Content and data
- **Entity**: `Application` interface from `src/types.ts`.
- **Persistence**: Managed through `ApplicationRepository` (`src/lib/applicationRepository.ts`) synced with Firestore and local cache.
- **Zero Schema Changes**: This is a frontend architectural refactor; no Firestore rules or database migrations required.

---

## Platform and integrations
- **Platform**: Web application (Vite, React 19, Tailwind CSS).
- **Chrome Extension Compatibility**: Extension continues capturing to user's Firestore collection; links to `/applications`.
- **Browser History**: Integration with browser `popstate` / query params for back/forward navigation.

---

## Constraints
- **Canonical Primitives**: Must use `SegmentedTabs` (`src/components/SegmentedTabs.tsx`), `FilterSelectDropdown` (`src/components/FilterSelectDropdown.tsx`), `EmptyState` (`src/components/EmptyState.tsx`), and `OnboardingEmptyState` (`src/components/OnboardingEmptyState.tsx`).
- **Design Tokens**: Strict adherence to `UI_TOKENS` and `MOTION_TOKENS` (zero arbitrary hex colors, zero `transition-all`, 44px hit targets).
- **Modularity**: Individual components kept under 300 lines by extracting subcomponents.
- **Accessibility**: Full WCAG AA contrast (minimum `text-slate-500` on light backgrounds) and keyboard navigability.

---

## Brand and tone
- **Personality**: Calm, precise, empowering, respectful of the user's attention.
- **Must never feel**: Cluttered, chaotic, sluggish, or like "AI slop" with unnecessary icons or nested cards.
- **References**: Linear (view switching fluidity & keyboard ease), Notion/Airtable (clean lens toggling).
- **Competitors**: Huntr, Teal, Simplify (Tracklet differentiates via speed, privacy, and zero visual bloat).

---

## Lifecycle
- **Day 1 (0 total applications)**: Displays `OnboardingEmptyState` with the 3-step setup checklist and 4-action grid (Add Job, Import CSV, Connect Extension, Seed Demo Data).
- **Day 30+ (Active Pipeline)**: Default landing on Board (or user's saved preference) with active jobs populated.
- **Filtered Zero State**: If an active filter returns 0 jobs, displays `EmptyState` with a 1-click *"Reset Filters"* button.

---

## Edge cases and states
1. **Direct Deep Link**: User navigates directly to `/applications?layout=table` -> Renders Table layout regardless of localStorage default.
2. **Archived Filter Selection**: User on Board selects `Status: Archived` -> System smoothly shifts layout to Table mode, where archived rows are clearly presented.
3. **Stage Change Optimistic Feedback**: Dragging card on Board or changing dropdown in Table updates UI in 0ms with a 4-second Undo snackbar receipt.
4. **Mobile Width (<640px)**: Board utilizes CSS snap-scrolling (`snap-x snap-mandatory`) for fluid horizontal stage panning; Table renders responsive cards.
5. **Rapid Toggle Clicking**: Layout transitions use idempotent state updates to prevent animation lockups or race conditions.

---

## Assumptions (signed off)
- **Status Filter Terminology**: Keep the existing label `"Status"` for the dropdown, as users already recognize it and it houses `Active Only`, `All`, and specific stages.
- **Toolbar Placement**: The layout switcher lives on the right side of the main toolbar as a compact `SegmentedTabs` control.
- **Bulk Operations**: Bulk selection remains exclusive to Table mode in v1.
- **Default for New Users**: First-time users land on **Board** view (`?layout=board`).

---

## Decision log

| Decision | Options considered | Chosen | Why |
|---|---|---|---|
| **View Architecture** | Separate pages vs. Unified page | Unified page (`/applications`) | Eliminates dual mental models, removes navbar bloat, and preserves filter context. |
| **Data Scope Management** | Separate Scope filter vs. Existing Status filter | Leverage existing Status filter | Tracklet already has `Status` with `Active Only`, `All`, and individual stages; keeps toolbar clean. |
| **Archived Filter Reaction** | Dedicated column vs. Auto-switch to Table | Auto-switch to Table | Archived applications are for dense audit and historical review, not drag-and-drop triage. |
| **Layout Switcher UI** | Dropdown vs. View tabs vs. Segmented control | Canonical `SegmentedTabs` in toolbar | Compact, optical spring animation, matches Tracklet's design tokens. |
| **URL & State Sync** | Internal state only vs. URL query param sync | URL query param (`?layout=`) + localStorage | Enables deep bookmarking, browser back/forward navigation, and remembers user preference. |
| **Mobile Ergonomics** | Force Table only vs. Support both with snap-scroll | Support both (snap-scroll Board + vertical Table) | Empowers user preference while maintaining 44px touch targets and smooth horizontal snapping. |
| **Empty State Strategy** | Skeleton columns vs. Existing Onboarding State | Preserve existing `OnboardingEmptyState` | Provides higher conversion with actionable setup checklist and demo data loader. |
