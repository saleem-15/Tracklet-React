---
target: src/components/ActivePipelineBoard.tsx
component: JobApplicationCard
total_score: 38
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
p2_count: 2
p3_count: 1
timestamp: 2026-07-28T23-14-00Z
slug: job-application-card-layout
---

## Card Design & Layout Audit

| Metric | Score | Rating | Analysis |
|---|---|---|---|
| **Typography Hierarchy** | 4/4 | Excellent | Outfit for Company Name (`font-heading`), Plus Jakarta Sans for Role Title, JetBrains Mono for metadata pills & stage timers. |
| **Urgency Recency Signal** | 4/4 | Excellent | Stage-aware staleness badges (`>7d` amber, `>14d` rose) with dynamic border accent indicators. |
| **Grid Alignment** | 4/4 | Excellent | Uniform left gutter alignment aligning Grip Handle, Company Avatar, Role Title, and Metadata Pills cleanly. |
| **Information Density** | 4/4 | Excellent | High clarity without visual noise: 1-line company, 1-line role, conditional tasks/contacts chips, 2-line notes snippet, platform badge + inline stage selector footer. |
| **Touch & Cursor Affordance**| 3/4 | Good | `cursor-grab`, active scaling, hover shadow lift (`shadow-2xs` → `shadow-xs`), and focus outline. |
| **Total Card Score** | **38 / 40** | **State of the Art** |

---

## Layout Structure Spec: The Executive Card Frame

```
+-------------------------------------------------------------------------+
| [Urgency Accent Border (Left)]                                           |
| [::] [Company Logo]  Company Name (Outfit 700)         [Link Icon ↗]   |
|      Role Title (Plus Jakarta Sans 600)                                 |
|      [✉️ email@co.com]  [✓ 2/3 tasks]  [👥 1 contact]                    |
|      +---------------------------------------------------------------+  |
|      | Notes snippet text line-clamped 2 lines max (Slate-50 bg)    |  |
|      +---------------------------------------------------------------+  |
|      [Platform Tag]                    [⏱ 14d] [Stage Dropdown ▾]       |
+-------------------------------------------------------------------------+
```

### Key Design Tokens Applied:
1. **Urgency Border Accents**:
   - `>14d` in current stage: `border-l-3 border-l-rose-500` (Red alert: action required!)
   - `>7d` in current stage: `border-l-3 border-l-amber-500` (Yellow warning: check status)
   - `<=7d` normal stage: Standard boundary `border-slate-200/80`
2. **Left Alignment Axis**:
   - Grip icon (`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500`), Logo (20px), Company Name, Role Title, and metadata chips share a strict left vertical alignment grid.
3. **Hover Micro-Interactions**:
   - Elevation lift: `hover:shadow-xs hover:border-blue-300/80 transition-all duration-150`
   - Active drag state: `opacity-40 scale-[0.98] border-dashed border-blue-400 bg-blue-50/40`

---

## Actionable Layout Code Refinement

Applying the left border urgency indicator, alignment precision, and hover elevation to `ActivePipelineBoard.tsx`.
