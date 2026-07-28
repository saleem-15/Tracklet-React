---
name: Tracklet
description: Modern, high-clarity job application tracker & career command center
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-subtle: "#eff6ff"
  neutral-dark: "#0f172a"
  neutral-body: "#334155"
  neutral-muted: "#64748b"
  neutral-subtle: "#94a3b8"
  neutral-border: "#e2e8f0"
  neutral-bg: "#f8fafc"
  surface: "#ffffff"
  status-screening: "#d97706"
  status-screening-bg: "#fffbeb"
  status-interview: "#2563eb"
  status-interview-bg: "#eff6ff"
  status-offer: "#059669"
  status-offer-bg: "#ecfdf5"
  status-rejected: "#e11d48"
  status-rejected-bg: "#fff1f2"
typography:
  display:
    fontFamily: "Outfit, Plus Jakarta Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.25"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Outfit, Plus Jakarta Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: "1.3"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1.5"
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "6px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral-body}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Tracklet

## Overview

**Creative North Star: "The Executive Command Center"**

Tracklet is designed as a crisp, dense, and high-clarity dashboard built for active job seekers managing high-stakes career pipelines. Every pixel prioritizes scanability, status recency, and immediate actionability over decorative clutter. Information density is kept high yet disciplined, allowing users to parse 30+ applications at a glance without visual exhaustion.

The interface combines a precise slate-and-white surface canvas with purposeful color accents reserved strictly for pipeline stage coding and urgency signaling. Headings command authority using **Outfit**, body text maintains calm legibility in **Plus Jakarta Sans**, and data attributes use **JetBrains Mono**.

### Key Characteristics:
- **High Information Density**: Dense, tabular data presentation with zero wasted padding.
- **Stage-Aware Urgency**: Color-coded staleness badges that adapt based on the active stage.
- **Subtle Depth Hierarchy**: Flat surfaces defined by micro-borders (`border-slate-200`) and soft hover shadows (`shadow-2xs` / `shadow-xs`).
- **Keyboard-First Efficiency**: Instant shortcuts (`Ctrl+K` for search, `N` for Add Application) for power users.

---

## Colors

The Tracklet color system pairs a neutral Slate palette with vibrant, semantic status colors.

### Primary
- **Command Blue** (`#2563eb` / `bg-blue-600`): Used for primary calls to action, active navigation states, selected table rows, and interactive control highlights. The primary accent is kept focused to maintain signal clarity.

### Status Accent Colors
- **Screening Amber** (`#d97706` / `bg-amber-500` / `bg-amber-50`): Signals active initial recruiter screening and early-stage dialogue.
- **Interview Blue** (`#2563eb` / `bg-blue-600` / `bg-blue-50`): Denotes active technical or manager interview loops.
- **Offer Emerald** (`#059669` / `bg-emerald-600` / `bg-emerald-50`): Highlights active job offers received.
- **Rejected Rose** (`#e11d48` / `bg-rose-600` / `bg-rose-50`): Used for rejected applications or destructive bulk operations.
- **Applied / Archived Neutral** (`#64748b` / `bg-slate-500` / `bg-slate-100`): Quiet neutral tone for newly submitted or archived entries.

### Neutral
- **Canvas Slate** (`#f8fafc` / `bg-slate-50`): Page background tint providing subtle contrast against white cards.
- **Surface White** (`#ffffff` / `bg-white`): Container, table row, and modal background surface.
- **Border Slate** (`#e2e8f0` / `border-slate-200`): Structural micro-divider and card boundary.
- **Text Primary** (`#0f172a` / `text-slate-900`): Used for company names, primary headers, and active text.
- **Text Muted** (`#64748b` / `text-slate-500`): Used for metadata, dates, and secondary labels.

### Named Rules
**The 10% Accent Rule.** Accent colors (`#2563eb`, `#059669`, `#d97706`) appear on ≤10% of any given view surface. Their rarity preserves instant scanability.

---

## Typography

**Display/Heading Font:** Outfit (weights 600, 700, 800) with `Plus Jakarta Sans` fallback.  
**Body Font:** Plus Jakarta Sans (weights 400, 500, 600).  
**Data/Mono Font:** JetBrains Mono (weights 400, 500, 600) for dates, status durations, counts, and tags.

### Hierarchy
- **Display / H1** (`Outfit 800`, `1.5rem / 24px`, `letter-spacing: -0.025em`): Main view headers and modal title blocks.
- **Headline / H2** (`Outfit 700`, `1.125rem / 18px`, `letter-spacing: -0.025em`): Card titles and section headers.
- **Title / H3** (`Outfit 600`, `0.875rem / 14px`, `letter-spacing: -0.02em`): Table column headers and group labels.
- **Body** (`Plus Jakarta Sans 400/500`, `0.75rem / 12px`, `line-height: 1.5`): Table row text, role descriptions, notes, and task titles.
- **Label / Mono** (`JetBrains Mono 500/600`, `0.6875rem / 11px`): Dates (`Jul 15`), stage durations (`14d`), platform badges, and keyboard shortcuts (`N`, `Cmd+K`).

### Named Rules
**The Dual Register Rule.** Headings use geometric display face `Outfit` for brand authority; data values use `JetBrains Mono` for tabular precision.

---

## Layout

Tracklet utilizes a fixed left sidebar combined with a sticky top bar filter header and a fluid main content area.

- **Sidebar Width**: 240px expanded / 64px collapsed (`transition-all duration-200`).
- **TopBar Height**: 52px sticky header (`h-13 border-b border-slate-200/80 backdrop-blur-xs`).
- **Grid & Table Density**: Table rows maintain a strict `38px` fixed height (`h-[38px]`) with `px-3 py-1` padding for maximum vertical scannability.
- **Kanban Board Grid**: 4 equal-width columns (`grid-cols-4 min-w-[900px]`) with vertical scrolling per container.

---

## Elevation & Depth

Tracklet uses a flat-by-default surface model with crisp 1px borders and micro-shadows.

### Shadow Vocabulary
- **Micro Shadow** (`shadow-2xs` / `shadow-xs`): Default card elevation and subtle hover lift (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`).
- **Modal Overlay** (`shadow-2xl` + `backdrop-blur-sm`): Used for `AddApplicationModal`, `ApplicationDetailPanel`, and unsaved changes dialogs.

### Named Rules
**The Flat-by-Default Rule.** Containers rest flat on the `#f8fafc` canvas bounded by `border-slate-200`. Shadows appear only during hover or modal elevation.

---

## Shapes

- **Buttons & Badges**: `rounded-lg` (8px) or `rounded-xl` (12px).
- **Modals & Cards**: `rounded-2xl` (16px) with 1px border `border-slate-200/90`.
- **Status Pills & Kbd Badges**: `rounded-md` (6px) or `rounded-full` for numeric counters.

---

## Components

### Primary Button
- **Shape:** `rounded-lg` (8px) or `rounded-xl` (12px)
- **Primary:** `bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs`
- **Disabled State:** `disabled:opacity-50 disabled:cursor-not-allowed`

### Table Row
- **Default:** `h-[38px] bg-white text-slate-700 hover:bg-slate-50/80 cursor-pointer`
- **Active Selection:** `bg-blue-50/70 text-blue-950 font-semibold`
- **Company Cell:** Logo (20px) + Company Name + External Link (on hover).

### Stage Selector Dropdown
- **Trigger:** Compact status badge (`px-2 py-0.5 rounded-md font-mono text-[11px]`) matching stage color tint.
- **Menu:** Dropdown overlay with full list of pipeline stages.

---

## Do's and Don'ts

### Do:
- **Do** format dates in short human-readable form (`Jul 15`) with a full ISO date hover tooltip.
- **Do** shade-match text colors on colored background badges (e.g. `text-rose-700` over `bg-rose-50`).
- **Do** keep table rows at 38px height with 1–3 clear visual signals max.

### Don't:
- **Don't** cram mail icons, contact badges, and task indicators into the table row company cell; keep them in the detail panel.
- **Don't** use generic perpetual `animate-bounce` animations; use subtle `animate-pulse` on numeric counters instead.
- **Don't** fall back silently to guest mode on cloud errors; always emit a clear user-facing toast.
