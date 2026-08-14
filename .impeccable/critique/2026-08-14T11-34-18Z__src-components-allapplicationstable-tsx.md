---
timestamp: 2026-08-14T11-34-18Z
slug: src-components-allapplicationstable-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good visual status badges and stage staleness counters; bulk action progress lacks explicit pending state |
| 2 | Match System / Real World | 4 | Natural job search pipeline vocabulary (Applied, Screening, Interview, Offer, Rejected, Days in Stage) |
| 3 | User Control and Freedom | 3 | Full bulk selection, inline stage switching, drawer open/close; lacks multi-action Undo toast |
| 4 | Consistency and Standards | 3 | Unified slate/blue design system; minor button hover color mismatch on bulk delete |
| 5 | Error Prevention | 3 | Destructive bulk delete asks confirmation via native prompt; inline edit lacks draft auto-save |
| 6 | Recognition Rather Than Recall | 4 | Search bar shortcuts (`/`, `Ctrl+K`), direct platform tags, clear column headers, company logos |
| 7 | Flexibility and Efficiency | 3 | Quick bulk actions, keyboard search focus, fast stage dropdowns; lacks keyboard navigation through table rows |
| 8 | Aesthetic and Minimalist Design | 4 | Crisp tabular hierarchy, tight density, clean typography (Outfit + Plus Jakarta Sans + JetBrains Mono) |
| 9 | Error Recovery | 3 | Empty state with quick reset filters; search bar clear button restores default view instantly |
| 10 | Help and Documentation | 3 | Contextual tooltips on days in stage and shortcuts; missing empty state help for new zero-application users |
| **Total** | | **33/40** | **Good** |

## Design Specificity Verdict

**LLM assessment**: The All Applications table strikes a strong, purpose-built executive command center aesthetic. It avoids generic table bloat by tailoring every column to the emotional and operational realities of a job seeker: company logos for fast visual scanning, platform badges (LinkedIn, Lever, Greenhouse), inline status switching, and stage urgency color coding (`daysInStage`). The slide-over detail drawer pairing works seamlessly without jarring full-page context shifts.

**Deterministic scan**: Detector identified 1 styling issue in `src/components/AllApplicationsTable.tsx`:
- `gray-on-color` at line 200: `text-slate-600` on `bg-rose-100` hover state for the bulk delete button.

## Overall Impression
Tracklet's All Applications table delivers exceptional density, clarity, and utilitarian speed. The high-contrast slate borders, stage color indicators, and bulk action bar create an efficient workflow for high-volume job seekers.

## What's Working
1. **Stage-Aware Urgency Signaling**: The `daysInStage` pill adapts dynamically (e.g. amber/rose warning highlights when applications linger >14d or offers >3d), instantly guiding where to follow up.
2. **Context-Preserving Slide-over**: Clicking any row smoothly inspects contacts, tasks, and history in the detail panel without losing scroll position or filter state.
3. **Streamlined Bulk Bar**: Multi-select triggers a top action bar for batch archiving, marking rejected, or CSV export.

## Priority Issues

### [P1] Missing In-App Undo for Bulk Status Transitions and Deletions
- **Why it matters**: Accidental bulk status updates or deletions create immediate anxiety for job seekers who lose track of application history.
- **Fix**: Replace native `confirm()` with a toast notification containing an immediate 5-second `Undo` action.
- **Suggested command**: `/impeccable harden src/components/AllApplicationsTable.tsx`

### [P2] Contrast Polish on Bulk Action Buttons (Anti-Pattern Fix)
- **Why it matters**: Muted slate text on light rose hover backgrounds fails WCAG contrast and feels visually muddy.
- **Fix**: Align hover state to use semantic rose tokens (`hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300`).
- **Suggested command**: `/impeccable polish src/components/AllApplicationsTable.tsx`

### [P3] Table Keyboard Navigation (Arrow Keys + Space Selection)
- **Why it matters**: Power users reviewing 50+ applications rely on rapid keyboard scrolling (`↑` / `↓`) and spacebar selection rather than clicking small checkboxes.
- **Fix**: Add roving `tabIndex` and arrow key listener to navigate table rows and open detail panel on `Enter`.
- **Suggested command**: `/impeccable refine src/components/AllApplicationsTable.tsx`

## Persona Red Flags

- **Alex (Power User)**: `Ctrl+K` focuses search, but once inside the table, Alex cannot use `j`/`k` or `ArrowDown` to cycle through application rows without reaching for the mouse.
- **Jordan (First-Timer)**: When all filters are cleared or empty results appear, the empty state guides filter resetting, but when 0 applications exist initially, onboarding guidance could be more prominent.
- **Sam (Accessibility)**: Table header checkboxes use custom SVG icons without explicit `aria-label="Select all applications"` or `aria-checked`.

## Minor Observations
- Platform tags use monochromatic slate badges; adding subtle brand tinting could make multi-platform identification even faster.
- Date column displays formatted dates (e.g., "Aug 14"); adding relative time tooltip ("3 days ago") enhances scanability.

## Questions to Consider
- What if pressing `↑` / `↓` automatically previewed the selected application in the side panel for ultra-fast skimming?
- Should bulk actions support moving selected applications to specific stages (e.g. "Bulk Move to Interview") instead of only Archive/Reject?
