---
target: src/components/StatsView.tsx
total_score: 36
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-14T17-28-19Z
slug: src-components-statsview-tsx
---
# Design Critique: Job Search Analytics Dashboard (`StatsView.tsx`)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Real-time filtered scope banner, live recalculations, and active filter pill indicators. |
| 2 | Match System / Real World | 4 | Domain-accurate stages (Saved → Applied → Screen → Interview → Offer) & candidate metrics. |
| 3 | User Control and Freedom | 3 | Instant filter reset and navigation, but lacking direct bulk-archive action for stale items. |
| 4 | Consistency and Standards | 3 | Matches Tracklet tokens, though several sub-labels use `text-[10px]` off DESIGN.md ramp. |
| 5 | Error Prevention | 4 | Division-by-zero safeguards on all percentage calculations and constrained filter controls. |
| 6 | Recognition Rather Than Recall | 4 | Full visual legends on stacked bars and histograms with explicit stage/source names. |
| 7 | Flexibility and Efficiency | 3 | Fast timeframe switching and 1-click email copy; could add keyboard accelerators. |
| 8 | Aesthetic and Minimalist Design | 4 | Balanced high-density layout respecting the 10% Accent Rule and executive command styling. |
| 9 | Error Recovery | 4 | Dedicated, actionable empty state with "Reset Filters" CTA when zero records match. |
| 10 | Help and Documentation | 3 | Good inline benchmark tips; could add hover explanation on weighted ROI scores. |
| **Total** | | **36/40** | **Excellent (Ship-ready)** |

### Design Specificity Verdict
- **LLM Assessment**: Highly tailored specifically for job seekers managing complex interview pipelines. The inclusion of first-round progression yield vs market benchmarks (10–20%), ghosting radar with 1-click recruiter email copying, and channel ROI yield directly solves core job hunter pain points without generic filler widgets.
- **Deterministic Scan**: 14 findings detected by `detect.mjs` across `StatsView` and subcomponents: 13 advisory font-size ramp deviations (`text-[10px]` instead of `text-[11px]`) and 1 gray-on-amber contrast warning (`text-slate-500 on bg-amber-50`).

### Priority Issues
- **[P2] Type Ramp & Color Contrast Standardization**: Several sub-badges and secondary labels use literal `text-[10px]` instead of documented `text-[11px]`, and `text-slate-500` on `bg-amber-50` triggers contrast warnings.
  - *Fix*: Normalize font sizes to `text-[11px]` / `0.6875rem` and shade-match colored badge text (e.g. `text-amber-800`).
  - *Suggested command*: `/impeccable polish`
- **[P2] ROI Score Formula Tooltip**: The weighted 0–100 ROI score is valuable but unexplained to first-time users.
  - *Fix*: Add an informative hover tooltip (`title` or micro-popup) explaining the formula.
  - *Suggested command*: `/impeccable clarify`
- **[P3] Bulk Action Bridge to Stale Applications**: Users with multiple ghosted apps currently navigate one by one.
  - *Fix*: Add a "Filter in Table" shortcut button to jump directly to AllApplicationsTable with the stale filter active.
  - *Suggested command*: `/impeccable delight`

### Persona Red Flags
- **Alex (Power User)**: High satisfaction with density and quick email copy; would benefit from keyboard hotkeys for timeframe toggles.
- **Jordan (First-Timer)**: Clear feedback and reassuring market benchmarks; needs a quick tooltip explaining how channel ROI is computed.
- **Sam (Accessibility-Dependent User)**: Keyboard focusable elements are responsive; ensure all interactive card triggers have explicit `:focus-visible` rings.
