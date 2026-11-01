# Component Registry & Pre-Flight Discovery Rule

> **Priority**: Critical Invariant  
> **Target Files**: `src/components/**/*.tsx`, `src/views/**/*.tsx`, `src/App.tsx`  
> **Standard**: Agent-enforced component discovery and canonical primitive reuse.

---

## 1. Mandatory Step 0 Pre-Flight Discovery Protocol

Before creating or editing any React component or UI view in Tracklet, every agent **MUST** run the Step 0 Pre-Flight Discovery Protocol.

### The Manifest Requirement
You MUST declare your resolved components before providing code edits:

```markdown
### 🛡️ Pre-Flight Component Discovery Manifest
1. UI Intent: [e.g., Adding an interview prep note section with stage selector]
2. Resolved Canonical Primitives:
   - Notes / Markdown -> `RichTextEditor` (`src/components/editor/RichTextEditor.tsx`)
   - Stage Selector -> `StageSelectorDropdown` (`src/components/StageSelectorDropdown.tsx`) or `CustomSelectDropdown`
   - Actions -> `DeleteIconButton` / `IconButton` (`src/components/IconButton.tsx`)
   - Container -> `UI_TOKENS.card` (`src/theme/tokens.ts`)
3. Prohibited Elements Verified:
   - `<select>`: [None used; using CustomSelectDropdown]
   - `<textarea>`: [None used for notes; using RichTextEditor]
   - Inline buttons: [None used; using UI_TOKENS or IconButton]
4. Design Tokens & Styling:
   - Tokens: `UI_TOKENS.card`, `UI_TOKENS.btnPrimary`
   - Transitions: `transition-colors duration-150` (Strictly NO `transition-all`)
```

---

## 2. Canonical Primitive Lookup Table

| UI Requirement | Canonical Component | Import Path | Prohibited Anti-Pattern |
| :--- | :--- | :--- | :--- |
| **Notes / Markdown** | `RichTextEditor` | `src/components/editor/RichTextEditor.tsx` | Raw `<textarea>`, contentEditable divs |
| **Select / Dropdown** | `CustomSelectDropdown` | `src/components/CustomSelectDropdown.tsx` | Raw `<select>` and `<option>` elements |
| **Stage Selector** | `StageSelectorDropdown` | `src/components/StageSelectorDropdown.tsx` | Hardcoded stage buttons or generic select |
| **Filter Dropdown** | `FilterSelectDropdown` | `src/components/FilterSelectDropdown.tsx` | Raw HTML `<select>` |
| **Icon Action Button** | `IconButton`, `DeleteIconButton`, `CloseIconButton`, `CopyIconButton` | `src/components/IconButton.tsx` | Raw `<button><Trash2/></button>` lacking 44px target |
| **Status Badge** | `StatusBadge` | `src/components/StatusBadge.tsx` | Hardcoded pill `<span className="bg-...">` |
| **Job Meta Badges** | `JobTypeBadges` | `src/components/JobTypeBadges.tsx` | Ad-hoc rounded spans for location/type |
| **Segmented Tabs** | `SegmentedTabs` | `src/components/SegmentedTabs.tsx` | Ad-hoc button row with layout-jumping fonts |
| **Company Logo** | `CompanyLogo` | `src/components/CompanyLogo.tsx` | Raw `<img src="...">` without fallback |
| **Safe Links** | `LinkifiedText` | `src/components/LinkifiedText.tsx` | Missing `target="_blank" rel="noopener noreferrer"` |
| **Empty State** | `EmptyState` | `src/components/EmptyState.tsx` | Unstyled "No data found" div |
| **Tooltip** | `Tooltip` / `useTooltip` | `src/components/Tooltip.tsx` | Browser `title="..."` alone |
| **Modal Dismissal** | `useEscapeKey` | `src/lib/useEscapeKey.ts` | Manual keydown closing multiple layers |
| **Action Buttons** | `UI_TOKENS.btnPrimary` etc. | `src/theme/tokens.ts` | Hand-rolled inline button Tailwind classes |
| **Text Inputs** | `UI_TOKENS.inputBase` | `src/theme/tokens.ts` | `placeholder-slate-400` (WCAG AA violation) |

---

## 3. Negative Invariants (Strictly Prohibited Patterns)

1. **PROHIBITION: `<select>`**: Never render raw HTML `<select>` elements. Always import `CustomSelectDropdown`.
2. **PROHIBITION: Raw `<textarea>` for notes**: Never render `<textarea>` for rich notes, discussion surfaces, or logs. Always import `RichTextEditor`. For plain multi-line inputs (e.g. bug descriptions), use tokenized `<textarea className={UI_TOKENS.inputBase + " h-auto min-h-[80px] p-2.5 resize-y"}>`.
3. **PROHIBITION: Permanent red buttons**: Standard delete actions must use `DeleteIconButton` or `DESTRUCTIVE_ACTION_STYLE` (`text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors`). Never style resting state in bright red.
4. **PROHIBITION: Arbitrary hex styles**: Never use Tailwind bracket arbitrary styles like `bg-[#2563eb]` or `rounded-[14px]`.
5. **PROHIBITION: `transition-all` on cards or navigation**: Enforce `transition-colors duration-150` to eliminate layout jank.
