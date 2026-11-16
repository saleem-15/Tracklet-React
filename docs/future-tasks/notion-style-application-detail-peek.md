# Future Feature Task: Notion-Style Application Detail Peek & Full Page Expansion

## Status: Queued (Immediately Following Unified Applications Hub Refactor)
**Target Branch / Spec**: `feat/application-detail-side-peek`

---

## 1. Background & Context
Currently, clicking an application card in the Kanban board or a row in the Table opens `ApplicationDetailPanel.tsx` as a traditional **Centered Modal Dialog** (`max-w-5xl max-h-[92vh]`). While functional, a centered modal completely blocks the background viewport, disorienting the user and interrupting rapid triage workflows.

Following the completion of the **Unified Applications Hub (`/applications`)** refactor, Tracklet will upgrade the inspection pattern to a **Notion-style Side Peek Drawer with Full-Page Expansion**.

---

## 2. The Vision: Three-Tier Inspection Architecture

Inspired by Notion, Linear, and GitHub Projects:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. DEFAULT: SIDE PEEK DRAWER (~55% Viewport Width)                    │
│    Slides smoothly from the right edge. Left 45% of the board/table    │
│    remains visible. Clicking another card immediately updates the      │
│    drawer in-place with zero open/close animation jitter.              │
├────────────────────────────────────────────────────────────────────────┤
│ 2. FULL PAGE EXPANSION (100% Viewport Width)                           │
│    Clicking the optical [⤢ Open as full page] button smoothly morphs   │
│    the drawer into a dedicated, focused application view.              │
├────────────────────────────────────────────────────────────────────────┤
│ 3. DISMISSAL                                                           │
│    Backdrop click, [✕] button, or ESC key (via useEscapeKey) smoothly  │
│    slides the drawer out to the right.                                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key UX Advantages

1. **Non-Blocking Visual Triage**:
   - Users can keep their eye on the Kanban column or table rows while reading job notes, interview schedules, or email logs.
2. **Instant In-Place Record Morphing**:
   - When the side drawer is open, clicking any other card or table row does NOT close and reopen the drawer. It updates the internal form state instantly (`<100ms`), preserving scroll position in the background list.
3. **Deep Interview Prep & Note Taking**:
   - When preparing for a technical interview or writing extensive notes with `RichTextEditor`, expanding to **Full Page** provides maximum writing focus and horizontal breathing room.
4. **URL Deep-Linking**:
   - Side Peek: `/applications?layout=board&selectedAppId=abc123`
   - Full Page: `/applications/abc123`
   - Browser back button cleanly steps from Full Page back to Side Peek, and from Side Peek back to closed.

---

## 4. Technical Architecture & Components

- **Component**: Refactor `ApplicationDetailPanel.tsx` into:
  - `ApplicationSidePeekDrawer.tsx` (using Framer Motion slide-in with `MOTION_TOKENS.durations.drawer` = 200ms).
  - `ApplicationFullPageView.tsx` (reusing the same modular subcomponents: `ApplicationDetailHeader`, `ApplicationMetricsBar`, `ApplicationNotesSection`, `ContactManagerSection`, `EmailLogSection`).
- **Header Action Cluster**:
  - `[⤢]` / `[⤡]` Toggle: Swaps between Side Peek and Full Page.
  - `[🔗]` Copy direct link button.
  - `[⋯]` More actions (Archive, Delete, Export).
  - `[✕]` Close drawer button.
- **Escape Key Handling**: Register `useEscapeKey` so pressing ESC exits Full Page back to Side Peek, and a second ESC closes Side Peek.

---

## 5. Acceptance Criteria

- [ ] Clicking a card in Board or Table opens the Side Peek drawer from the right edge without hiding the underlying list.
- [ ] Clicking a different card while Side Peek is open updates the active record in-place with zero frame drops.
- [ ] Top-right corner includes an "Expand to full page" icon button (`[⤢]`).
- [ ] Expanding to full page transitions smoothly without page reloads.
- [ ] Pressing ESC closes the drawer (or steps from Full Page to Side Peek) with zero unsaved draft loss (`resolveDraftOnOpen`).
- [ ] Fully responsive: On mobile screens (<640px), the drawer automatically opens full-width (100vw).
