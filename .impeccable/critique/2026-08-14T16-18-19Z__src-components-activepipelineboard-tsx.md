---
target: src/components/ActivePipelineBoard.tsx
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-14T16-18-19Z
slug: src-components-activepipelineboard-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Live column counters, stale warning banner, and move toast with Undo work well; drop cues on empty columns could be more prominent. |
| 2 | Match System / Real World | 4/4 | 5-stage pipeline (Saved → Applied → Screening → Interview → Offer) aligns naturally with hiring search workflows. |
| 3 | User Control and Freedom | 3/4 | Status changes include instant Undo toast; however, cards cannot be reordered within a column. |
| 4 | Consistency and Standards | 3/4 | Uses `border-l-4` side-tab borders and non-standard `text-[10px]` classes, deviating from DESIGN.md type ramp and flat tokens. |
| 5 | Error Prevention | 3/4 | Quick-drop zones (Archive/Reject) are distinct; however, accidental drag releases lack confirmation or preview. |
| 6 | Recognition Rather Than Recall | 3/4 | Company logos, roles, platform badges, task counters, and days-in-stage are visible; quick-move actions are hidden. |
| 7 | Flexibility and Efficiency | 2/4 | No keyboard shortcuts to advance or move cards between stages; no touch drag support for mobile. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Clean card density, but side-tab borders and competing task/contact badges create unnecessary visual noise. |
| 9 | Error Recovery | 3/4 | Reliable Undo toast for stage moves; clean empty state when filters return zero results. |
| 10 | Help and Documentation | 3/4 | Empty state guidance is clear, but bottom drag-to-archive/reject affordances are undiscoverable until dragging begins. |
| **Total** | | **30/40** | **Good** |

#### Design Specificity Verdict

**LLM assessment**: Tracklet's active pipeline board has strong domain grounding: the 5-stage job application flow, company logo integration, stage staleness warnings (>14 days in hiring loop), and quick-action chips directly serve job seekers. However, certain design elements suffer from generic dashboard patterns: specifically, the `border-l-4` side-tab colored card borders (a classic AI-generated tell) and the expanding bottom quick-drop bar that introduces layout shift.

**Deterministic scan**: `detect.mjs` identified 4 findings across `src/components/ActivePipelineBoard.tsx`:
- `side-tab` (line 296): `border-l-4` accent border on stale cards.
- `gray-on-color` (line 329): `text-slate-600 on bg-blue-50` in contact email badge.
- `design-system-font-size` (lines 324, 367): `text-[10px]` font size outside the DESIGN.md type ramp (which specifies JetBrains Mono 11px).

#### Overall Impression
Tracklet's Kanban board provides an efficient, highly focused application workflow with thoughtful details (like stage recency badges and an undoable move toast). The single biggest opportunity is elevating the board from a generic drag-and-drop grid to a polished, keyboard-friendly command center by removing the AI-slop side-tab borders, fixing layout shifts during drag, and adding keyboard stage accelerators.

#### What's Working
- **Stage-Aware Urgency**: Stale application banner (>14d without progress updates) and color-coded duration pills (`7d`, `14d`) provide immediate actionable signal without overwhelming the user.
- **Undoable Micro-Interactions**: The floating bottom toast with a 1-click Undo button prevents anxiety when moving applications across columns.
- **Rich Card Metadata**: Company logos, roles, platform tags, task progress pills, and contact links are neatly packed into compact 3.5-padding cards.

#### Priority Issues

- **[P1] AI-Slop Side-Tab Accent Borders**:
  - *Why it matters*: Thick colored left borders (`border-l-4 border-l-rose-500` / `border-l-amber-500`) are a recognizable tell of boilerplate AI interfaces and clash with Tracklet's crisp, micro-bordered design tokens.
  - *Fix*: Replace the heavy side border with a subtle border tint (`border-amber-200/80` or `border-rose-200/80`) paired with the existing `Clock` duration badge.
  - *Suggested command*: `/impeccable polish`

- **[P1] Missing Keyboard Stage Navigation**:
  - *Why it matters*: While cards can be focused with `Tab` and selected with `Enter`, power users cannot move cards across columns without switching to a mouse.
  - *Fix*: Add keyboard accelerators when a card is focused (e.g. `1`–`5` for direct stage jumps or `Shift + ArrowRight / ArrowLeft` to advance/regress stages).
  - *Suggested command*: `/impeccable polish`

- **[P2] Quick-Drop Zones Layout Shift During Drag**:
  - *Why it matters*: Expanding the bottom drop bar from `max-h-0` to `max-h-24` during drag triggers a visible layout reflow across all 5 columns, shifting card drop targets beneath the user's cursor.
  - *Fix*: Convert the quick drop zone to a floating bottom overlay dock (`fixed` / `absolute bottom-4`) with smooth backdrop blur that does not resize the board container.
  - *Suggested command*: `/impeccable layout`

- **[P2] Mobile / Touch Gesture Gap**:
  - *Why it matters*: The native HTML5 drag-and-drop API fails on mobile touchscreens and tablets, locking touch users out of moving cards.
  - *Fix*: Provide a contextual stage dropdown or quick-move button on each card for non-drag environments.
  - *Suggested command*: `/impeccable adapt`

- **[P3] Type Ramp & Color Contrast Drift**:
  - *Why it matters*: Arbitrary `text-[10px]` classes bypass the design system token ramp, and `text-slate-600` on `bg-blue-50` reduces contrast readability.
  - *Fix*: Standardize on `text-[11px]` (the DESIGN.md mono scale) and use shade-matched text (e.g. `text-blue-700` over `bg-blue-50`).
  - *Suggested command*: `/impeccable typeset`

#### Persona Red Flags

- **Alex (Power User)**: Cannot triage applications rapidly with keyboard shortcuts alone; forced to drag each card individually with a mouse.
- **Sam (Accessibility-Dependent)**: Card dragging is inaccessible via screen reader or keyboard-only navigation; no ARIA live announcements for drag over/drop events.
- **Casey (Mobile User)**: Cannot drag cards on touch devices; the 5-column layout requires horizontal scrolling on narrow screens without sticky column indicators.

#### Minor Observations
- Column headers have inline counts `(3)`, but when a column has 0 items, the empty dashed box takes up 120px min-height, which is clean, but could offer a direct "+ Add to stage" button.
- Contact email pill uses an external link style without an explicit copy button or direct quick action.

#### Questions to Consider
- What if pressing `1`–`5` on any focused card instantly moved it to that stage with an animated transition?
- What if the quick-drop zones (Archive / Reject) floated above the canvas rather than pushing column contents up?
- Could columns offer a quick "+ Add" button at the top to create an application directly in that stage?
