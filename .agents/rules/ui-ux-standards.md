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

## 5. Header Hierarchy & Metadata Hygiene
**Rule**: Page titles and modal headers must communicate clear contextual orientation, not raw database counters.
1. **No Counter Subtitles**: Never place dynamic record counts (e.g. `4 of 12 contacts` or `Overview across 15 applications`) directly underneath primary `<h1>` or `<h2>` headings.
2. **Contextual Placement**:
   - Total or filtered item counts belong in **filter toolbars**, **table status bars**, or **compact inline badges** beside the title.
   - Headers in audit logs and timelines (e.g. `Status History`) must not show meaningless tally badges (e.g. `3 events`). An audit trail's value is in the chronological timeline, not in a raw transition count.

---

## 6. Micro-interaction & Transition Stability
**Rule**: UI elements must never jitter, jump, or cause layout shifts during hover or tab transitions.
1. **No `transition-all` on Complex Box Models**: Never use `transition-all` on navigation items, sidebar tabs, or cards where borders, rings, or font-weights change. Use `transition-colors duration-150` instead.
2. **Constant Font-Weights**: Do not transition from `font-normal` to `font-bold` between inactive and active states. Browsers snap font-weight abruptly, altering character widths and causing layout jumps. Keep font-weights constant (e.g. `font-semibold` in both states).
3. **Zero Layout Shift Borders**: If an active state displays a border (e.g. `border border-slate-200`), ensure the inactive state has an identical width transparent border (`border border-transparent`) so activating the item does not alter its dimensions.
