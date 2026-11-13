---
name: anti-slop-craft
description: >
  Eliminates frontend AI slop and enforces canonical component reuse across Tracklet UI.
  Autonomous Triggers: Use whenever the user asks to "make this look cleaner", "clean up the UI",
  "audit UI", "remove AI slop", "polish this card", "too many boxes/icons", "tag soup", "why does
  this look generated/cluttered", "fix button styles", or when creating/editing any JSX/TSX view.
  Enforces Tracklet's 8 Canonical Component Classes (RichTextEditor, CustomSelectDropdown, IconButton,
  StatusBadge, SegmentedTabs, CompanyLogo, LinkifiedText, EmptyState) and audits against the 6 Anti-Slop
  Dimensions (container depth <= 1, decorative icon restraint, static badge demotion, robotic copy removal,
  zero transition-all, UI_TOKENS consumption).
  Boundaries: Use this skill for UI refinement, anti-slop auditing, and canonical component enforcement.
  For greenfield component authoring from scratch with custom prop contracts, use add-component. For
  high-level aesthetic direction and visitor mode scoping, use impeccable.
---

# Anti-Slop Craft & Canonical Component Reuse Skill

This skill enforces high-craft frontend engineering in Tracklet by systematically eliminating the six dimensions of AI slop and compelling 100% reuse of canonical shared components.

---

## 1. Step 0: Mandatory Pre-Flight Component Discovery Protocol

Before writing or editing any JSX/TSX in any UI component or view, you **MUST** run the Pre-Flight Discovery Protocol and emit the manifest in your thoughts or message:

### Pre-Flight Component Discovery Manifest Template
```markdown
### 🛡️ Pre-Flight Component Discovery Manifest
1. UI Intent: [Describe what interface capability or view you are implementing]
2. Resolved Canonical Primitives:
   - [UI Need: e.g. Notes] -> `RichTextEditor` (`src/components/editor/RichTextEditor.tsx`)
   - [UI Need: e.g. Select] -> `CustomSelectDropdown` (`src/components/CustomSelectDropdown.tsx`)
   - [UI Need: e.g. Delete] -> `DeleteIconButton` (`src/components/IconButton.tsx`)
   - [UI Need: e.g. Stage]  -> `StatusBadge` (`src/components/StatusBadge.tsx`)
   - [UI Need: e.g. Container] -> `UI_TOKENS.card` (`src/theme/tokens.ts`)
3. Prohibited Native Elements Checked:
   - `<select>`: [Verified: NONE used. Using CustomSelectDropdown]
   - `<textarea>`: [Verified: NONE used for notes. Using RichTextEditor or tokenized inputBase]
   - Inline buttons: [Verified: NONE used. Using UI_TOKENS or IconButton]
4. Design Tokens & Styling:
   - Radii / Shadows / Colors: [Using UI_TOKENS and Tailwind design tokens]
   - Transitions: [transition-colors duration-150; strictly ZERO transition-all]
```

---

## 2. Canonical Primitive Reference Table

Always resolve against `.agents/rules/component-registry.md` and `docs/COMPONENT_REGISTRY.md`:

| Intent | Canonical Component | Source File Path | Banned Anti-Pattern |
| :--- | :--- | :--- | :--- |
| **Notes / Markdown** | `RichTextEditor` | `src/components/editor/RichTextEditor.tsx` | Raw `<textarea>`, contentEditable divs |
| **Select / Dropdown** | `CustomSelectDropdown` | `src/components/CustomSelectDropdown.tsx` | Raw `<select>` and `<option>` |
| **Stage Selector** | `StageSelectorDropdown` | `src/components/StageSelectorDropdown.tsx` | Ad-hoc stage buttons |
| **Filter Dropdown** | `FilterSelectDropdown` | `src/components/FilterSelectDropdown.tsx` | Raw `<select>` in filter bars |
| **Icon Action Button** | `IconButton`, `DeleteIconButton` | `src/components/IconButton.tsx` | `<button><Trash/></button>` lacking 44px hit target |
| **Status Badge** | `StatusBadge` | `src/components/StatusBadge.tsx` | Inline `<span className="rounded-full bg-...">` |
| **Job Type Badges** | `JobTypeBadges` | `src/components/JobTypeBadges.tsx` | Inline badge spans |
| **Segmented Tabs** | `SegmentedTabs` | `src/components/SegmentedTabs.tsx` | Ad-hoc button row with shifting font-weights |
| **Company Logo** | `CompanyLogo` | `src/components/CompanyLogo.tsx` | Raw `<img>` lacking frame-0 session cache |
| **Safe Links** | `LinkifiedText` | `src/components/LinkifiedText.tsx` | Missing `target="_blank" rel="noopener noreferrer"` |
| **Empty State** | `EmptyState` | `src/components/EmptyState.tsx` | Ad-hoc unstyled "No items" text |
| **Tooltip** | `Tooltip` / `useTooltip` | `src/components/Tooltip.tsx` | Native browser `title` alone |
| **Escape Dismissal** | `useEscapeKey` | `src/lib/useEscapeKey.ts` | Multi-layer modal simultaneous close |
| **Button Tokens** | `UI_TOKENS.btnPrimary` etc. | `src/theme/tokens.ts` | Hand-rolled inline button Tailwind classes |
| **Input Tokens** | `UI_TOKENS.inputBase` | `src/theme/tokens.ts` | `placeholder-slate-400` contrast violation |

---

## 3. The 6-Point Anti-Slop Verification Checklist

Before considering any UI implementation complete, verify code against all 6 dimensions from `.agents/rules/anti-slop-standards.md`:

- [ ] **1. Container Nesting (Max Depth 1)**:
  - No card or bordered panel nested inside another card or bordered panel.
  - No redundant wrapper `<div>`s that serve no layout/accessibility purpose.
  - Grouping achieved via whitespace (`space-y-4`) or subtle dividers (`border-b border-slate-100`).

- [ ] **2. Decorative Icon Restraint**:
  - Zero decorative icons on self-evident text labels or column headers.
  - Zero generic AI decorative badges (`Sparkles`, `Wand2`, `Bot`).
  - Icons reserved strictly for interactive `IconButton`s, primary navigation, alerts, or `CompanyLogo`.

- [ ] **3. Static Badge & Chip Discipline**:
  - Exactly 1 status badge (`StatusBadge`) per entity card/row.
  - Secondary metadata (salary, platform, date, location) rendered in clean typography (`font-mono text-xs text-slate-500`) with dot (`·`) or slash (`/`) delimiters.
  - Zero raw database inventory counts on persistent navigation tabs.

- [ ] **4. Human Copywriting & Typography**:
  - Primary operational views (Applications, Pipeline, Contacts, Analytics) have **zero subtitles** under headings.
  - Zero AI buzzwords (*"seamlessly"*, *"elevate"*, *"streamline"*, *"delve"*).
  - Fonts strictly follow the 3-tier hierarchy: `Outfit` (headings), `Plus Jakarta Sans` (body), `JetBrains Mono` (data/dates).

- [ ] **5. Motion & Easing Stability**:
  - **Zero `transition-all`** in any new or modified class string.
  - Specific transitions used: `transition-colors duration-150` or `transition-opacity duration-150`.
  - Constant font-weights on hover (never snap from `font-normal` to `font-bold`).
  - Active borders paired with `border-transparent` on inactive states to prevent 1px layout shifts.

- [ ] **6. Design Token Enforcement & Contrast**:
  - All standard buttons consume `UI_TOKENS.btnPrimary`, `btnSecondary`, `btnOutline`, or `btnGhost`.
  - All standard inputs consume `UI_TOKENS.inputBase`.
  - Zero bracketed arbitrary hex values (`bg-[#...]`).
  - Readable text and placeholders maintain WCAG AA contrast (≥ 4.5:1; never use `text-slate-400` on white).

- [ ] **7. Ban on Pulsing Glow Dots, Radar Pings & AI Halos**:
  - Zero `animate-pulse` or `animate-ping` on indicator dots, live status badges, notification pips, icon buttons, or drop zones (skeletons in `src/components/layout/skeletons/` are the only approved pulse use).
  - Zero neon glowing drop shadows or halos (`box-shadow: 0 0 ...` chromatic halos).
  - Status indicators must be calm, solid, static pips (e.g. `<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />`).

---

## 4. Concrete Remediation Recipes

### Remediation A: Replacing Raw `<select>`
```tsx
// BEFORE (Slop):
<select value={stage} onChange={(e) => setStage(e.target.value)} className="border rounded p-1">
  <option value="Applied">Applied</option>
  <option value="Interview">Interview</option>
</select>

// AFTER (Craft):
<CustomSelectDropdown
  value={stage}
  onChange={setStage}
  options={[
    { label: 'Applied', value: 'Applied' },
    { label: 'Interview', value: 'Interview' },
  ]}
  size="sm"
/>
```

### Remediation B: Replacing Raw `<textarea>` for Notes
```tsx
// BEFORE (Slop):
<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="w-full border p-2" />

// AFTER (Craft):
<RichTextEditor value={notes} onChange={setNotes} placeholder="Type notes or '/' for commands..." minRows={5} resizable />
```

### Remediation C: Replacing Hand-Rolled Destructive Button
```tsx
// BEFORE (Slop):
<button onClick={handleDelete} className="p-2 text-red-600 hover:bg-red-50 rounded">
  <Trash2 className="w-4 h-4" />
</button>

// AFTER (Craft):
<DeleteIconButton onClick={handleDelete} title="Delete record" />
```

### Remediation D: Flattening Nested Container Soup
```tsx
// BEFORE (Slop):
<div className="bg-white border rounded-xl p-4">
  <div className="bg-slate-50 border rounded-lg p-3">
    <div className="bg-white border rounded p-2">
      <p className="text-sm font-semibold">Senior Engineer</p>
    </div>
  </div>
</div>

// AFTER (Craft):
<div className={UI_TOKENS.card + " p-5"}>
  <p className="text-sm font-bold text-slate-900 tracking-tight">Senior Engineer</p>
</div>
```
