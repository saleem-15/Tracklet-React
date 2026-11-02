# Tracklet Universal UI/UX & Interaction Standards

This document establishes the mandatory interaction rules, visual standards, and UX patterns for **Tracklet**. All developers and AI agents must strictly adhere to these rules across all components and features.

---

## 1. Universal Outbound Links Rule
**Rule**: All links that navigate outside the current application view (`mailto:`, `tel:`, external company websites, job postings, LinkedIn profiles, etc.) **MUST open in a new browser tab**.
- Always include: `target="_blank" rel="noopener noreferrer"`.
- **Zero Session Hijacking**: A user must NEVER be navigated away from their active Tracklet session when clicking an email icon, a phone number, or a job board link.

```tsx
// Correct
<a href={`mailto:${email}`} target="_blank" rel="noopener noreferrer" className="...">
  <Mail className="w-3.5 h-3.5" />
</a>

// Forbidden: Navigates current tab or triggers browser loss of state
<a href={`mailto:${email}`}>
```

---

## 2. Universal Optimistic UI Standard
**Rule**: All entity creations, status transitions, and fast updates must feel instantaneous to the user.
1. **Immediate Modal/Form Dismissal**: When the user clicks "Save" or "Submit", close the modal or drawer **immediately** (`onClose()`). Never force the user to look at a disabled "Saving..." spinner or freeze the UI while waiting for Firebase/Firestore network promises to resolve.
2. **Synchronous State Update**: Immediately update the local React state with an optimistic entity containing a temporary ID (e.g., `opt-${Date.now()}`).
3. **Immediate Toast Feedback**: Dispatch an action confirmation receipt toast immediately (`addToast('success', 'Created', item.name)`).
4. **Background Persistence & Automatic Rollback**: Trigger the persistence layer in the background. If the network call succeeds, quietly replace the temporary ID with the Firestore ID. If the call fails, revert the state to the previous snapshot and present an error notification with an undo/retry action.

---

## 3. Standardized Destructive Action Palette
**Rule**: Danger/destructive actions (such as delete, discard, unlink, or remove) must follow a calm, non-distracting rest state that transitions cleanly to rose on hover.
- **Base Style**: `text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors`
- **Never use permanent alarming red**: Do not style standard delete buttons in table rows, card footers, or drawer headers with permanent bright red (`text-rose-600` or `bg-rose-600` in the resting state). Destructive affordances should be subtle until intentionally hovered.
- Always use the centralized `DESTRUCTIVE_ACTION_STYLE` token from `src/lib/constants.ts` or `DeleteIconButton` from `src/components/IconButton.tsx`.

---

## 4. Form Input Resiliency & Validation
**Rule**: Forms must be resilient to user copy-pasting, multi-word emails, and international formats.
1. **Always Use `noValidate`**: Add `noValidate` to all `<form>` elements. Rigid, browser-specific HTML5 validation bubbles (which often fail on valid emails like `first.last@company.com` or strings with accidental trailing whitespace) must never block form submission.
2. **Auto-Trim on Input & Submission**: Always automatically trim whitespace (`input.trim()`) on submission and on blur.
3. **Permissive Validation**: Validate email fields using permissive RFC-compliant regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
4. **Inline Form Errors**: Render human-friendly error messages inside the modal's error banner or beneath the specific input rather than relying on browser native tooltips.

---

## 5. Header Hierarchy & Subtitle Standards
**Rule**: Headers must be clean, high-density, and scannable. Avoid "decorative explanation clutter" and dynamic tally subtitles.

1. **Primary Operational Views (Zero Subtitles)**:
   - Views like **Applications**, **Active Pipeline**, **Contacts**, and **Analytics** MUST NOT have filler subtitles (e.g. avoid *"Professional network & touchpoints"* or *"Overview across 15 applications"*).
   - Use clean, punchy noun headings aligned on a single horizontal axis with action buttons to maximize vertical viewport density.
   - Never place dynamic record counters directly as subtitles under primary headings. Place counters in filter toolbars, status bars, or compact inline badges.
   - Timelines and audit logs (e.g. `Status History`) must not show meaningless tally badges (e.g. `3 events`).

2. **Legitimate Edge Cases Where Subtitles ARE Permitted & Encouraged**:
   - **Edge Case A: Zero-Data & Empty States**: Subtitles are mandatory when guiding first-time or empty states (e.g. *"No contacts yet. Add your first recruiter or mentor to track communication history"*).
   - **Edge Case B: Destructive Confirmation & Pre-Action Modals**: Subtitles are essential for explaining irreversible consequences before a destructive action (e.g. *"This action cannot be undone. All associated notes and logs will be permanently deleted"*).
   - **Edge Case C: Settings Cards & Technical Field Descriptions**: Subtitles/helper text are valuable below specific complex settings toggles (e.g. explaining what the 48-hour expiration threshold governs), though top-level page headers themselves should remain succinct.

---

## 6. Micro-interaction & Transition Stability
**Rule**: UI elements must never jitter, jump, or cause layout shifts during hover or tab transitions.
1. **No `transition-all` on Complex Box Models**: Never use `transition-all` on navigation items, sidebar tabs, or cards where borders, rings, or font-weights change. Use `transition-colors duration-150` instead.
2. **Constant Font-Weights**: Do not transition from `font-normal` to `font-bold` between inactive and active states. Browsers snap font-weight abruptly, altering character widths and causing layout jumps. Keep font-weights constant (e.g. `font-semibold` in both states).
3. **Zero Layout Shift Borders**: If an active state displays a border (e.g. `border border-slate-200`), ensure the inactive state has an identical width transparent border (`border border-transparent`) so activating the item does not alter its dimensions.

---

## 7. Action-Only Navigation Badges & Contextual Inventory Placement Rule
**Rule**: Persistent navigation items (sidebar tabs, navigation drawers, segmented tabs) must remain calm and clutter-free. Raw entity tallies must NEVER appear on persistent navigation tabs.

1. **The Action-Only Badge Policy**:
   - Navigation badges are strictly reserved for **time-sensitive, actionable events** requiring immediate user attention (e.g. overdue recruiter follow-ups or tasks expiring within the configured threshold).
   - Never show static inventory tallies on navigation items (e.g. do not show total application counts on "All Applications", total active items on "Active Pipeline", or total contacts on "Contacts").
   - When no urgent action is pending, the navigation tab must render cleanly with zero badges or phantom collapsed notification dots (`no badge = peace of mind`).

2. **Contextual Placement of Entity Counts**:
   - Entity counts belong **in context**, inside the active view where the user is looking at and interacting with those records.
   - **Table View**: In the table toolbar / filter bar (`25 items`, or `3 of 25 items` when filtered).
   - **Kanban Board**: Above each individual column header (`Interview · 3`).
   - **Analytics**: In dedicated metric cards with historical trends and context.

---

## 8. Mandatory Component Discovery & Canonical Primitive Reuse
**Rule**: Before writing inline UI elements or hand-rolling styles, you MUST consult `.agents/rules/component-registry.md` and `docs/COMPONENT_REGISTRY.md`.
1. **Zero Native `<select>`**: NEVER generate raw HTML `<select>` elements. ALWAYS use `CustomSelectDropdown` (`src/components/CustomSelectDropdown.tsx`) or `StageSelectorDropdown` / `FilterSelectDropdown`.
2. **Zero Raw `<textarea>` for Notes**: ALWAYS use `RichTextEditor` (`src/components/editor/RichTextEditor.tsx`) for notes, discussions, interview prep, or markdown. Plain multi-line inputs must use `<textarea className={UI_TOKENS.inputBase + " h-auto min-h-[80px] p-2.5 resize-y"}>` with `placeholder-slate-500`.
3. **Canonical Action Buttons**: Use `IconButton` suite (`DeleteIconButton`, `CloseIconButton`, `CopyIconButton`, `EmailIconButton` from `src/components/IconButton.tsx`) or `UI_TOKENS.btnPrimary` / `btnSecondary`. Never hand-roll custom button styling strings.
4. **Standard Badges & Tabs**: Use `StatusBadge` for stages, `JobTypeBadges` for work attributes, and `SegmentedTabs` for tabbed views.

---

## 9. Structural Container Flatness (Max Depth = 1)
**Rule**: Prevent "divitis" and nested container syndrome.
1. **Max Depth 1**: Page canvases contain cards or panels; cards must NEVER enclose inner bordered cards.
2. **Flat by Default**: Use whitespace (`space-y-4`), semantic typography, or subtle dividers (`border-b border-slate-100`) rather than enclosing every sub-block in bordered containers.
3. **No Redundant Wrappers**: Eliminate wrapper `<div>`s that do not provide flex, grid, or aria roles.

---

## 10. Decorative Icon Overload & Restraint
**Rule**: Icons must serve a clear communicative purpose or interactive affordance.
1. **Ban Icons on Self-Evident Labels**: Never pair an icon with text that already describes the data (e.g. no `<Calendar/>` next to a date string, no `<Building/>` next to a company name).
2. **Ban Generic AI Garnish**: Never use decorative emojis or generic icons (`Sparkles`, `Wand2`, `Bot`) as badges on standard features.
3. **Reserved Icon Usage**: Icons are strictly reserved for interactive action buttons (`IconButton`), primary navigation items, critical status alerts, and verified brand marks (`CompanyLogo`).

---

## 11. Static Metadata Chip & Tag Soup Elimination
**Rule**: Do not wrap every secondary attribute in a pill container.
1. **Single Status Badge**: Limit cards to at most 1 primary status badge (`StatusBadge`).
2. **Typographic Demotion**: Secondary attributes (salary, platform, location, date) belong in clean typographic rhythm (`font-mono text-xs text-slate-500`) separated by subtle dots (`·` in `text-slate-300`) or slashes (`/`).

---

## 12. Copywriting & Typographic Discipline
**Rule**: Tone must match an Executive Command Center—calm, confident, concise, and action-oriented.
1. **Zero Filler Subtitles**: Operational views have no subtitles beneath primary headers.
2. **Ban AI Buzzwords**: Eliminate words like *"seamlessly"*, *"elevate"*, *"streamline"*, *"delve"*, *"powerhouse"*.
3. **Strict 3-Tier Font System**:
   - Headings: `Outfit` (`font-heading font-bold text-slate-900 tracking-tight`).
   - Body / Controls: `Plus Jakarta Sans` (`font-sans text-xs sm:text-sm text-slate-700`).
   - Data / Monospace: `JetBrains Mono` (`font-mono text-xs text-slate-500`).

---

## 13. Pre-Flight Verification & Skill Integration
**Rule**: Before submitting any UI pull request or task completion:
1. Execute the **Step 0 Pre-Flight Discovery Protocol** defined in `.agents/rules/component-registry.md`.
2. Verify all changes against the **6-Point Anti-Slop Verification Checklist** in `.agents/rules/anti-slop-standards.md` and `.agents/skills/anti-slop-craft/SKILL.md`.
