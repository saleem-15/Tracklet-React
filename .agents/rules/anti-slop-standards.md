# Tracklet Anti-Slop & Premium Frontend Craft Standards

> **Scope**: All UI components, views, dialogs, drawers, and layouts across Tracklet.  
> **Philosophy**: Tracklet is an **Executive Command Center**—calm, dense, scannable, and respectful of user attention.

---

## The 6 Dimensions of AI Slop

"AI Slop" is the degradation of user interfaces caused by unguided LLM code generation. It manifests across six distinct dimensions:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE 6 DIMENSIONS OF FRONTEND AI SLOP                 │
├──────────────────────────┬──────────────────────────┬──────────────────┤
│ 1. Nested Containers     │ 2. Decorative Icons      │ 3. Static Badges │
│ (Div soup, card-in-card) │ (Icons next to words)    │ (Tag soup walls) │
├──────────────────────────┼──────────────────────────┼──────────────────┤
│ 4. Robotic Copywriting   │ 5. Motion & Easing Traps │ 6. Token Bypass  │
│ (Elevate, subtitles)     │ (transition-all, jank)   │ (Arbitrary hex)  │
└──────────────────────────┴──────────────────────────┴──────────────────┘
```

---

## Dimension 1: Container Nesting & Divitis (Max Depth 1)

### The Anti-Pattern
Wrapping elements in nested cards and redundant wrapper `<div>` layers. Nesting cards inside cards with borders on borders (`p-4` inside `p-6`), starving the viewport of usable content space.

### The Rule
- **Maximum Container Depth = 1**: The page canvas holds sections or cards; cards must NOT contain inner bordered cards.
- **Flat by Default**: Group content using generous whitespace (`space-y-4`), semantic typography, or subtle dividers (`border-b border-slate-100`), rather than surrounding every block in a bordered box.
- **No Redundant Wrappers**: If a `<div>` has only one child and applies no flex/grid layout or aria role, delete it.

### Code Comparison:
```tsx
// ❌ AI SLOP: Card-in-card, 4 nested layers, duplicated borders and padding
<div className="p-6 bg-slate-50">
  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Interview Scheduled</span>
        <span className="text-xs text-slate-500">Tomorrow at 10:00 AM</span>
      </div>
    </div>
  </div>
</div>

// ✅ TRACKLET CRAFT: Flat hierarchy, single container, semantic spacing
<div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
  <div className="flex items-baseline justify-between">
    <span className="text-sm font-semibold text-slate-900">Interview Scheduled</span>
    <time className="text-xs font-mono text-slate-500">Tomorrow, 10:00 AM</time>
  </div>
</div>
```

### Audit Questions:
1. Is there a bordered container inside another bordered container?
2. Does removing an inner `<div>` break layout or accessibility? If NO, eliminate the div.

---

## Dimension 2: Decorative Icon Overload (Icon Fatigue)

### The Anti-Pattern
Dropping Lucide icons next to every plain label, table header, or metadata attribute (e.g., `<Building className="w-4 h-4"/> Stripe`, `<Calendar /> October 31`, or generic Sparkles/Wand/Robot emojis).

### The Rule
- **Icons Must Communicate**: Icons are reserved exclusively for:
  1. Interactive action buttons (`IconButton`, `DeleteIconButton`, `CopyIconButton`).
  2. Persistent primary navigation tabs.
  3. High-contrast alerts/status indicators (warning triangles in error banners).
  4. Brand logos (`CompanyLogo`).
- **Ban Icons on Self-Evident Labels**: Never place an icon next to text that already explains itself.
- **Ban Generic AI Garnish**: Never use `Sparkles`, `Wand2`, or `Bot` icons as decorative badges on standard features.

### Code Comparison:
```tsx
// ❌ AI SLOP: Decorative icon soup on self-explanatory metadata
<div className="flex flex-col gap-2">
  <h3 className="flex items-center gap-2 text-base font-semibold">
    <Building className="w-4 h-4 text-slate-400" /> Stripe
  </h3>
  <div className="flex items-center gap-3 text-xs text-slate-500">
    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> San Francisco, CA</span>
    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> $180,000</span>
    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Applied 3d ago</span>
  </div>
</div>

// ✅ TRACKLET CRAFT: Typographic hierarchy with clean delimiter rhythm
<div className="space-y-1">
  <h3 className="text-base font-bold text-slate-900 tracking-tight">Stripe</h3>
  <p className="text-xs text-slate-500 font-mono tracking-tight">
    San Francisco, CA <span className="text-slate-300">·</span> $180,000 <span className="text-slate-300">·</span> Applied 3d ago
  </p>
</div>
```

### Audit Questions:
1. If the icon is removed, does the UI lose any functional meaning?
2. Are there decorative icons attached to static column headers or section labels?

---

## Dimension 3: Static Metadata Chips & Badges (Tag Soup)

### The Anti-Pattern
Wrapping every entity attribute in a colored pill badge (`rounded-full px-2.5 py-0.5 text-xs bg-slate-100`). This creates a chaotic rainbow of static badges that drowns out critical pipeline status.

### The Rule
- **Max 1–2 Badges per Card**: Only active lifecycle stages (`StatusBadge`) and standardized work attributes (`JobTypeBadges`) may be rendered as badges.
- **Action-Only Navigation Badges**: Persistent navigation tabs must never display static inventory counts. Badges are strictly reserved for urgent/actionable deadlines (e.g. overdue follow-ups).
- **Typographic Demotion for Metadata**: Format creation dates, salaries, platforms, and locations as raw typographic text (`font-mono text-xs text-slate-500`), separated by lightweight dots (`·` in `text-slate-300`) or slashes (`/`).

### Code Comparison:
```tsx
// ❌ AI SLOP: Tag soup with 5 competing pastel pill badges
<div className="flex flex-wrap items-center gap-1.5">
  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">Interview</span>
  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">Full-time</span>
  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">Remote</span>
  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">LinkedIn</span>
  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">High Priority</span>
</div>

// ✅ TRACKLET CRAFT: Exactly ONE status badge; remaining metadata in typographic rhythm
<div className="flex items-center gap-2">
  <StatusBadge status="Interview" size="sm" />
  <span className="text-xs font-mono text-slate-500">
    Full-time <span className="text-slate-300">/</span> Remote <span className="text-slate-300">/</span> LinkedIn
  </span>
</div>
```

### Audit Questions:
1. Are non-status attributes wrapped in pill containers?
2. Does the card contain more than 2 badges?

---

## Dimension 4: Robotic Copywriting & Typography Quirks

### The Anti-Pattern
Boilerplate corporate buzzwords (*"seamlessly"*, *"elevate"*, *"streamline"*, *"delve"*), filler subtitles under primary page headers (*"All Applications — Overview across 15 active career opportunities"*), and flat font scales where everything is `font-medium`.

### The Rule
- **Zero Subtitles on Primary Operational Views**: Applications, Active Pipeline, Contacts, and Analytics must have clean noun headers on a single horizontal axis with action buttons. (Subtitles are permitted ONLY on empty states, destructive prompts, and settings descriptions).
- **Terse, Action-Led Voice**: Use plain verbs for actions (*"Export CSV"*, *"Add Contact"*).
- **Strict 3-Tier Font System**:
  1. Headings: `Outfit` (`font-heading font-bold text-slate-900 tracking-tight`).
  2. Body & Controls: `Plus Jakarta Sans` (`font-sans text-xs sm:text-sm text-slate-700`).
  3. Data & Monospace: `JetBrains Mono` (`font-mono text-xs text-slate-500`).

### Banned AI Buzzwords & Replacements:
| Banned Buzzword / Phrase | Why It Fails | Clean Tracklet Replacement |
| :--- | :--- | :--- |
| *"Streamline your application lifecycle seamlessly"* | Sycophantic corporate fluff | *"Track every stage of your search."* |
| *"Overview across 15 applications"* | Meaningless tally subtitle | *[Remove subtitle; count belongs in table toolbar]* |
| *"Elevate / Supercharge your career"* | Marketing hype in an operational tool | Functional action: *"Export CSV"*, *"Add Application"* |
| *"An unexpected error was encountered by the server"* | Passive bureaucratic jargon | *"Failed to save application. Check connection and retry."* |

### Audit Questions:
1. Does the primary view header have a dynamic count subtitle directly beneath it? (Banned).
2. Does any label or microcopy contain AI buzzwords?

---

## Dimension 5: Motion, Easing Traps & The `transition-all` Hazard

### The Anti-Pattern
Adding `transition-all duration-300` or `ease-in-out` indiscriminately. Transitioning font-weights (`font-normal` to `font-bold` on hover), which snaps character widths and causes adjacent buttons to jump horizontally.

### The Rule
- **Strict Ban on `transition-all`**: Never use `transition-all` on cards, menus, or navigation items. Explicitly transition properties: `transition-colors duration-150` or `transition-opacity duration-150`.
- **Constant Font-Weights**: Never change font-weight on hover or selection (e.g. use `font-semibold` in both active and inactive states).
- **Zero-Shift Borders**: If an active state has a border, ensure the inactive state has an identical width transparent border (`border border-transparent`).
- **Snappy Durations (< 200ms)**: Micro-interactions must complete in 100ms–150ms. Dropdowns and modals enter at 150ms–200ms using `ease-out`. Always respect `motion-reduce:transition-none`.

### Code Comparison:
```tsx
// ❌ AI SLOP: transition-all causes reflow; font-weight change causes horizontal jitter
<button className="px-3 py-1.5 font-normal text-slate-600 hover:font-bold hover:border hover:border-slate-300 transition-all duration-300">
  Overview
</button>

// ✅ TRACKLET CRAFT: Constant weight, zero-shift border, specific color transition
<button className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200 rounded-[10px] transition-colors duration-150">
  Overview
</button>
```

### Audit Questions:
1. Does any class string include `transition-all`?
2. Does hover change `font-normal` to `font-bold`?

---

## Dimension 6: Design Token Enforcement & Contrast Discipline

### The Anti-Pattern
Introducing arbitrary Tailwind bracket styles (`bg-[#2563eb]`, `rounded-[14px]`, `w-[320px]`), hand-rolling button utility classes, or using low-contrast `text-slate-400` on white backgrounds for readable text.

### The Rule
- **Consume `UI_TOKENS`**: Buttons must use `UI_TOKENS.btnPrimary`, `btnSecondary`, `btnOutline`, or `btnGhost`. Containers must use `UI_TOKENS.card` or `UI_TOKENS.modal`.
- **Zero Arbitrary Brackets**: Never use bracketed hex codes (`#[...]`) or non-standard pixel values. Use Tailwind's defined scales (`slate-*`, `blue-*`, etc.).
- **WCAG AA Contrast Minimum**: Never use `text-slate-400` or `placeholder-slate-400` on white/light surfaces. Readable text and placeholders must use `text-slate-500` minimum (4.5:1 contrast).

### Audit Questions:
1. Are there bracketed arbitrary values (`#[...]`) in the file?
2. Does any readable text or placeholder use `text-slate-400` on a light background?


---

## Dimension 7: Generic Circular Spinners & Destructive Layout Shifts

### The Anti-Pattern
Dropping an `<Loader2 className="animate-spin" />` in the middle of a blank canvas, rendering raw text fallbacks (`"Loading workspace..."`), or popping elements abruptly into the layout causing Cumulative Layout Shift (CLS).

### The Rule
- **Strict Ban on Full-Screen Spinners**: Never render standalone circular spinners or spinning Lucide icons on view canvasses.
- **Use `WorkspaceLoadingState` & Skeletons**: 
  - For cold boot: Use the Staged Dissolve monolith (`fullScreen`) with the 1.5px top vitality rail, logo entry fade, and 300ms delayed text reveal via `transitions.dev`.
  - For in-workspace tabs: Use deterministic skeletons from `src/components/layout/skeletons/` matching exact production row/card heights (`h-[38px]`, `min-h-[96px]`, `min-h-[170px]`, `min-h-[148px]`).
- **Zero AI Cheerleading Copy**: Never render conversational fluff like *"Preparing your dashboard... ✨"*. Use calm, technical status labels (`loading ...`, `WORKSPACE SYNC`).
- **Inline Spinners Only on Action Buttons**: The ONLY acceptable use of a spinning icon is inside a mounted button executing an in-place asynchronous action (e.g. `isSaving ? <Loader2 className="animate-spin" /> : "Save"`).

### Audit Questions:
1. Does any loading view render a circular spinner or raw unstyled text?
2. Does the view suffer Cumulative Layout Shift (CLS > 0) when transitioning from loading to mounted state?
