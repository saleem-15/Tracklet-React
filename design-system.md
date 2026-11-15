# Tracklet Design System Specification: Unified Applications Hub

## 1. System Overview
Tracklet operates on a refined, high-craft SaaS design language built for job seekers. It emphasizes **calm visual hierarchy, optical concentricity ($R = r + p$), critically damped spring motion, and progressive disclosure**.

---

## 2. Color Palette & Token Roles

| Token Role | Tailwind Class / Hex | Usage & Invariants |
|---|---|---|
| **Canvas Background** | `bg-slate-50/60` (`#f8fafc`) | Universal application background; calm, ambient foundation. |
| **Kanban Column Track** | `bg-slate-100/80 border-slate-200/80` | Lane gutter; houses cards and provides clear optical separation. |
| **Kanban Column Header** | `bg-white/90 border-slate-200/70 shadow-2xs` | Integrated header per lane with status dot, title, and count pill. |
| **Surface (Card / Row)** | `bg-white` (`#ffffff`) | Kanban cards, table matrix container, modal panels. Physical pop off tracks. |
| **Surface Alt (Sub-bars)** | `bg-slate-100/70` (`#f1f5f9`) | Segmented control backgrounds, secondary toolbars. |
| **Dividers & Borders** | `border-slate-200/80` (`#e2e8f0`) | 1px clean separators; never exceed 1px border width. |
| **Primary Brand (Action)** | `bg-brand-600` (`#4f46e5`) | Primary `+ Add Job` CTA, active focus rings, active tab text. |
| **Brand Surface** | `bg-brand-50 text-brand-700` | Active progressive filter chips, active count pill badges. |
| **Text Primary** | `text-slate-900` (`#0f172a`) | Job titles, headings, primary values. |
| **Text Secondary** | `text-slate-600` (`#475569`) | Company names, table control labels, secondary metadata. |
| **Text Muted / Mono** | `text-slate-500` (`#64748b`) | Dates, salary labels, days in stage. WCAG AA compliant. |
| **Destructive / Reset** | `text-rose-600 hover:bg-rose-50` | Reset button, chip dismiss hover, delete actions. |
| **Drag Insertion Ghost** | `border-2 border-dashed border-blue-400/80 bg-blue-50/50` | In-flight target drop placeholder slot. Zero count mutation. |

---

## 3. Typography Scale & Font Roles

- **Heading Font**: `Outfit` (`font-heading`) — Primary page headings and Kanban stage column titles. Bold/semibold, tight tracking (`tracking-tight`). Zero subtitles under primary page headings.
- **Sans Font**: `Plus Jakarta Sans` (`font-sans`) — Universal body, form inputs, button labels, and navigation links.
- **Mono Font**: `JetBrains Mono` (`font-mono`) — All salaries (`$240k Base`), dates (`Nov 11`), stage days (`4d ago`), keyboard shortcuts (`⌘K`), and numeric counts.

---

## 4. Optical Radii & Concentricity Formula ($R = r + p$)

Outer container radius MUST equal inner child radius plus padding to eliminate visual pinching:
- **SegmentedTabs Container**: `rounded-[10px]` with `p-1` (`4px` padding).
- **SegmentedTabs Sliding Pill**: `rounded-[6px]` (`10px - 4px = 6px`).
- **Standard Cards**: `rounded-lg` (`8px`) with `p-3.5` (`14px` padding).
- **Kanban Column Shell**: `rounded-xl` (`12px`) with `border-slate-200/80`.
- **Progressive Filter Chips**: `rounded-full` with 28px accessible hit target for dismiss button.

---

## 5. Micro-Motion & Kinematics (`src/theme/motion.ts`)

- **Physics**: Critically damped spring only (`stiffness: 400, damping: 35`). Zero oscillation, zero bounce.
- **Durations**:
  - Button presses / hover: `100ms`.
  - Dropdown & Popover entrance: `150ms`.
  - View crossfade (Board ⇄ Table): `150ms` (opacity swap, zero layout reflow).
  - Drawer slide-over: `200ms`.
- **Negative Invariant**: `transition-all` is strictly prohibited. Use targeted transitions (`transition-colors duration-150`, `transition-transform duration-200`).
- **Accessibility**: Instant `0ms` fallback when `prefers-reduced-motion` is detected.

---

## 6. Core Component Contracts

### 1. `SegmentedTabs` (Canonical View Switcher)
- **Props**: `tabs: { id: string; label: string; icon?: ReactNode }[]`, `activeId: string`, `onChange: (id: string) => void`.
- **States**: Resting, Hover, Active (spring pill indicator beneath active tab), Keyboard Focused (`ArrowLeft`/`ArrowRight`).

### 2. `ProgressiveFilterBar` (New Pattern)
- **Components**:
  - `StatusScopeSelect`: Fixed select dropdown housing `Active Only (default)`, `All`, and specific pipeline stages.
  - `AddFilterPopover`: Dashed button `[+ Filter ▾]` opening secondary attributes (`Platform`, `Work`, `Job Type`, `Date`). Auto-dismisses on ESC or outside click.
  - `FilterChip`: Removable pill (`Platform: LinkedIn ✕`) with 28px hit target, `aria-label`, and rose-tinted hover.
  - `ResetButton`: Conditional button rendered only when filters are active (`hasActiveFilters`).

### 3. `EmptyDropZone` (Board Mode)
- **Visual**: `h-24 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400`.
- **Role**: Rendered inside any Kanban column that has 0 cards under current filters, guiding drag-and-drop.
