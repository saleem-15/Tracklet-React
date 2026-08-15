---
target: src/components/StatsView.tsx
total_score: 38
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-14T17-31-56Z
slug: src-components-statsview-tsx
---
# Design Critique: Job Search Analytics Dashboard (`StatsView.tsx`)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Real-time filtered scope banner, live recalculations, and active filter pill indicators. |
| 2 | Match System / Real World | 4 | Domain-accurate stages (Saved → Applied → Screen → Interview → Offer) & candidate metrics. |
| 3 | User Control and Freedom | 4 | Instant filter reset and seamless slideover detail panel integration on click. |
| 4 | Consistency and Standards | 4 | Fully aligned with Tracklet type tokens (`text-[11px]`) and shade-matched color contrast. |
| 5 | Error Prevention | 4 | Division-by-zero safeguards on all percentage calculations and constrained filter controls. |
| 6 | Recognition Rather Than Recall | 4 | Full visual legends on stacked bars and histograms with explicit stage/source names. |
| 7 | Flexibility and Efficiency | 3 | Fast timeframe switching and 1-click email copy; potential for keyboard accelerators. |
| 8 | Aesthetic and Minimalist Design | 4 | Balanced high-density layout respecting the 10% Accent Rule and executive command styling. |
| 9 | Error Recovery | 4 | Dedicated, actionable empty state with "Reset Filters" CTA when zero records match. |
| 10 | Help and Documentation | 3 | Inline benchmark tips and contextual tooltip on weighted ROI score methodology. |
| **Total** | | **38/40** | **Excellent (Ship-ready)** |

### Design Specificity Verdict
- **LLM Assessment**: Highly tailored specifically for job seekers managing complex interview pipelines. Includes first-round progression yield vs market benchmarks (10–20%), ghosting radar with 1-click recruiter email copying, weighted channel ROI yield scores, and weekly pacing momentum.
- **Deterministic Scan**: 0 findings. Clean execution across all components (`detect.mjs` exited with code 0).

### What's Working
1. **Executive Scannability**: 4 high-contrast KPI cards communicate active volume, response yield, offer rate, and ghosting risk in under 3 seconds.
2. **Actionable Velocity Diagnostics**: The Ghosting Radar categorizes application recency and offers instant one-click email copying for recruiter follow-ups.
3. **Step-by-Step Funnel Intelligence**: Full pass-rates and drop-off diagnostics between consecutive hiring milestones with tactical optimization advice.
