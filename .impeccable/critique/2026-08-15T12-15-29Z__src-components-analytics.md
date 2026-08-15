---
target: src/components/analytics
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-15T12-15-29Z
slug: src-components-analytics
---
# Stats Page Critique — `src/components/analytics`

Method: ⚠️ DEGRADED: single-context (no sub-agent tool exposed)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | No loading states on cards; segmented bar tooltips are title-only (no ARIA) |
| 2 | Match System / Real World | 3 | "Loop win rate", "Screening Yield", "Ghosted" are jargon-adjacent; passable for the audience |
| 3 | User Control and Freedom | 3 | Good filter bar with reset; no way to dismiss/collapse individual cards or re-order |
| 4 | Consistency and Standards | 3 | Card anatomy is consistent; funnel percentage baseline inconsistency (100% on two different counts) |
| 5 | Error Prevention | 2 | Needs Attention card clickable with no hover cursor feedback on zero-state; no confirmation on email copy beyond transient icon |
| 6 | Recognition Rather Than Recall | 3 | Filter state is visible; Requires Attention list items are clickable but affordance is weak (only chevron hints) |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts for filter switching; no export/share of analytics; histogram bars not keyboard-navigable |
| 8 | Aesthetic and Minimalist Design | 3 | Clean card system with good hierarchy; minor clutter in Response Velocity header badges when both stale+ghosted present |
| 9 | Error Recovery | 2 | Empty filtered state is handled well; but no recovery path from "Ghosted" or "Stale" badges — what do they do? |
| 10 | Help and Documentation | 1 | No tooltips explaining what "Screening Yield" or "Loop win rate" mean; benchmark "10–20% avg" has no source or context |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: The analytics page is competently built with a consistent card system, strong color vocabulary inherited from the main app, and smart use of semantic color for status segments. However, the page reads as a generic dashboard template applied to job tracking data. There is no product-specific character — no narrative flow guiding the user from "here's your search health" to "here's what to do next." The cards are arranged in a 2×2 grid with no visual weight differentiation; every card looks equally important, which means nothing feels important. The Conversion Funnel and Application Sources cards are structurally identical (label + bar), making the page feel repetitive rather than insightful.

**Deterministic scan**: 9 findings across 4 files:
- 7× `design-system-font-size` (advisory): `text-[10px]` used extensively across ActivityMomentumCard, ConversionFunnelCard, and ResponseVelocityCard — this size is off the DESIGN.md type ramp (smallest documented is `0.6875rem / 11px`).
- 1× `gray-on-color` (warning): `text-slate-500` on `bg-amber-50` in AnalyticsHeroKPIs.tsx line 156 — gray text washes out on amber background.

## Overall Impression

A solid, functional analytics dashboard that does its job but doesn't earn its screen time. The information is there; the insight is not. Every card dumps raw numbers with no interpretation beyond "Benchmark: 10–20% avg." A job seeker in an active search doesn't need another place to stare at numbers — they need the page to tell them something they didn't already know.

The biggest opportunity: **make the page opinionated**. Instead of "here are your numbers," make it "your search is healthy / slowing down / stalled — here's why and what to do."

## What's Working

1. **Consistent card anatomy**: Every card uses the same structure (icon + title + badge header → content → footer). This creates a learnable, predictable rhythm that reduces cognitive load.
2. **Segmented recency bar**: The 4-color pipeline health bar (fresh → normal → stale → ghosted) is the single best visualization on the page. It communicates pipeline health at a glance without requiring any labels.
3. **Actionable Requires Attention list**: Surfacing stale applications with company logos, status badges, and a copy-email button is genuinely useful and well-executed.

## Priority Issues

### [P1] Funnel percentage baseline inconsistency
- **What**: "Opportunities Saved" shows `19 (100%)` and "Applications Submitted" shows `18 (100%)`. Two different counts both display 100%.
- **Why it matters**: Users will read this as a data bug and lose trust in all the numbers on the page. If the funnel's own math looks wrong, nothing else feels reliable.
- **Fix**: Use "Opportunities Saved" (19) as the absolute baseline for all percentage-of-total calculations, so step 2 reads `18 (95%)`. Alternatively, remove the percentage from step 1 entirely since it's trivially 100%.
- **Suggested command**: `/impeccable harden`

### [P1] No interpretive layer — numbers without narrative
- **What**: Every card shows raw metrics (55%, 29%, 22.3d) with no qualitative interpretation. The only exception is the static "Benchmark: 10–20% avg" text, which is unsourced and unresponsive to the actual value.
- **Why it matters**: A job seeker checking their stats mid-search wants to know "am I doing well?" not "what is 55%?" Without context, the user has to do the mental work themselves, which defeats the purpose of an analytics page.
- **Fix**: Add conditional qualitative labels: if screening yield > 20%, show "Above average" in green; if < 10%, show "Below average" in amber. Apply this pattern to offer rate and average days in stage. Replace the static benchmark with a dynamic comparison.
- **Suggested command**: `/impeccable clarify`

### [P2] Activity histogram breaks on mobile
- **What**: The 8-column grid (`grid-cols-4 sm:grid-cols-8`) wraps into two rows on mobile, breaking the timeline continuity. The second row's count labels collide with the first row's bars.
- **Why it matters**: The chart becomes unreadable on the device most job seekers check between interviews.
- **Fix**: Use `overflow-x-auto` with `flex-nowrap` on a single horizontal row. Alternatively, show only the last 4 weeks on mobile.
- **Suggested command**: `/impeccable adapt`

### [P2] Filter bar clips on mobile
- **What**: The 6 timeframe buttons ("All Time", "Past 30 Days", etc.) overflow and truncate to "Pa..." on narrow viewports with no scroll indicator.
- **Why it matters**: Users don't know there are more options or that they can swipe. The truncated text is unreadable.
- **Fix**: Replace with a select dropdown on `sm:` breakpoint, or add a horizontal scroll fade indicator.
- **Suggested command**: `/impeccable adapt`

### [P2] `text-[10px]` off the design system ramp (7 instances)
- **What**: Used for sub-labels like "submitted", "progressed", "completed", tooltip content, and bar count badges across ActivityMomentumCard, ConversionFunnelCard, and ResponseVelocityCard.
- **Why it matters**: At 10px, this text is below the 11px design floor, risking readability on standard-DPI screens and failing WCAG minimum text size guidance.
- **Fix**: Bump to `text-[11px]` (the documented mono/label size) or `text-xs` (12px). Update DESIGN.md if 10px is intentionally approved.
- **Suggested command**: `/impeccable typeset`

## Persona Red Flags

**Alex (Power User)**: No keyboard navigation through filter tabs. Can't export or share the analytics snapshot. Histogram bars are mouse-only with no keyboard-accessible tooltips. The "Requires Attention" list is capped at 4 items with no "show all" toggle — Alex has 16 stale apps and can only see 4.

**Sam (Accessibility-Dependent)**: Segmented recency bar conveys meaning by color alone — no text labels inside the bar segments. Histogram tooltips use `title` attributes (not ARIA live regions), invisible to screen readers. The stale/ghosted status distinction relies solely on amber vs. rose color coding. Focus indicators not visible on filter tab buttons.

**Jordan (First-Timer)**: "Screening Yield," "Loop win rate," "Ghosted (>21d)" — none of these terms are explained. The benchmark "10–20% avg" appears authoritative but unsourced. A first-time user seeing "55% Screening Yield" doesn't know if that's good or bad without digging.

## Minor Observations

- The `CheckCircle2` import in ConversionFunnelCard is unused (imported but never rendered).
- "Needs Attention" KPI card uses `cursor-pointer` when `ghostedCount > 0` but the click handler (`onViewStaleApps`) smooth-scrolls to the Response Velocity card — the affordance doesn't communicate this behavior.
- Progress bars on KPI cards all use `h-1.5`, but the funnel and sources bars use `h-2.5` and `h-2` respectively — inconsistent bar heights across the page.
- `gray-on-color` finding: line 156 of AnalyticsHeroKPIs uses `text-slate-500` over `bg-amber-50`, which produces low-contrast gray on yellow.

## Questions to Consider

- "The Requires Attention list shows 4 of 16 stale apps. What happens to the other 12 — is truncation intentional, or is this an oversight?"
- "Every card on this page has equal visual weight. If you could only keep two cards, which two would a job seeker actually check daily?"
- "What if the entire stats page opened with a single sentence like 'Your search is slowing — 78% ghosted' instead of four KPI cards?"
