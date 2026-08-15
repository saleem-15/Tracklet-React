---
target: src/components/analytics
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-15T13-11-58Z
slug: src-components-analytics
---
# Stats Page Critique — `src/components/analytics`

Method: ⚠️ DEGRADED: single-context (no sub-agent tool exposed)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Health banner now surfaces search status at a glance. Loading states still absent on filter changes. |
| 2 | Match System / Real World | 3 | "Loop win rate", "Ghosted (>21d)" still unexplained to first-timers. |
| 3 | User Control and Freedom | 4 | Filter bar + reset; Show all / Show less toggle is excellent. Cards not dismissible. |
| 4 | Consistency and Standards | 4 | Funnel math is now correct — Step 2 reads 18 (95%). |
| 5 | Error Prevention | 3 | Needs Attention card cursor gated on ghostedCount. No focus ring on hover-only cards. |
| 6 | Recognition Rather Than Recall | 4 | Dynamic benchmark labels. Histogram color legend clear. |
| 7 | Flexibility and Efficiency | 2 | Filter tabs still keyboard-inaccessible. No export. Histogram bars not keyboard-navigable. |
| 8 | Aesthetic and Minimalist Design | 4 | Health banner adds hierarchy without clutter. Minor scrollbar on histogram at wide viewport. |
| 9 | Error Recovery | 3 | Show All expands gracefully. Review Stale Apps CTA scrolls correctly. |
| 10 | Help and Documentation | 2 | Benchmark label dynamic now. Jargon terms (Screening Yield, Loop win rate, Ghosted) still unexplained. |
| **Total** | | **33/40** | **Good** |

## Design Specificity Verdict

**LLM assessment**: The page has meaningfully levelled up. The Health Banner is the single biggest quality lift — it gives the page a voice and makes it feel purpose-built for job seekers rather than assembled from dashboard components. The dynamic benchmark on Screening Yield, the correct funnel math, and the expandable stale apps queue are all solid improvements. What remains: jargon terminology is still unexplained and the filter bar clips silently on mobile.

**Deterministic scan**: 0 findings. All text-[10px], gray-on-color, and unused import violations resolved.

## Overall Impression

Strong. The page earned its screen time. The P1 issues from the first critique are resolved. The remaining gaps are P2/P3 polish items around accessibility and mobile edge cases.

## Priority Issues

### [P2] Filter bar clips on narrow mobile viewports
- **What**: At 480px, "This Month" and "This Year" overflow silently with no fade or scroll indicator.
- **Fix**: Add a right-side CSS gradient fade on the tab container, or replace with a select+chip combo below sm:.
- **Suggested command**: /impeccable adapt

### [P2] No hover tooltips explaining jargon terms
- **What**: "Screening Yield", "Loop win rate", "Ghosted (>21d)" have no in-UI definition.
- **Fix**: Add a ? icon popover on KPI card titles. One sentence each.
- **Suggested command**: /impeccable clarify

### [P3] Histogram scrollbar visible at desktop widths
- **What**: The overflow-x-auto from the responsive fix leaks a horizontal scrollbar at 1280px+.
- **Fix**: Scope to sm:overflow-x-visible or only below lg breakpoint.
- **Suggested command**: /impeccable polish

### [P3] Keyboard navigation missing on filter tabs and histogram
- **What**: Filter tab buttons have no visible focus ring. Histogram bars have no keyboard equivalent.
- **Fix**: Add focus-visible:ring-2 to tab buttons. Add tabindex and keydown handlers to histogram bars.
- **Suggested command**: /impeccable polish

## Persona Red Flags

**Alex (Power User)**: Show all (16) now working. Keyboard navigation still absent. No export.

**Sam (Accessibility-Dependent)**: ARIA label on recency bar added. Focus rings still missing on filter buttons. Histogram not keyboard-navigable.

**Jordan (First-Timer)**: Health banner and dynamic benchmark are a massive help. Jargon terms still unexplained.

## Minor Observations

- Health banner icon uses BarChart3 for all 3 states — differentiated icons (Trophy, AlertTriangle, TrendingUp) would add semantic clarity.
- Bottleneck advice cites ~2-4% market benchmark with no in-UI attribution.
- Conversion Funnel bar height is h-2, Pipeline Health is h-2.5 — standardize to h-2.
