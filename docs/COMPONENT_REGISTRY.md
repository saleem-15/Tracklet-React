# Tracklet Canonical Component Registry & Decision Matrix

> **Single Source of Truth** for UI component discovery, design system adherence, and canonical primitive reuse across Tracklet web and extension workflows.

---

## 1. Architectural Purpose & Executive Summary

Tracklet is an **Executive Command Center** designed for active job seekers. It prioritizes high information density, calm visual scanability, resilient keyboard interactions, and instant operational efficiency.

To maintain code quality and prevent interface degradation ("AI slop"), Tracklet maintains an authoritative library of **8 Canonical Component Classes**. 

### The Fundamental Rule of Component Discovery
**Before writing any inline markup, custom buttons, unstyled dropdowns, or raw inputs, you MUST check this registry.** Creating duplicate, inline, or unstyled substitutes for these canonical primitives is strictly prohibited.

---

## 2. Canonical Component Decision Matrix

Use this quick-lookup decision matrix to select the appropriate canonical component for your UI intent:

| When your UI requires... | You MUST import and use... | Located at file path... | NEVER use / BANNED pattern |
| :--- | :--- | :--- | :--- |
| **Rich notes, interview prep, discussion logs, markdown** | `RichTextEditor` | `src/components/editor/RichTextEditor.tsx` | Raw `<textarea>`, contentEditable divs, plain input |
| **Select dropdown / Single choice picker** | `CustomSelectDropdown` | `src/components/CustomSelectDropdown.tsx` | Raw `<select>` and `<option>` elements |
| **Pipeline stage selector dropdown** | `StageSelectorDropdown` | `src/components/StageSelectorDropdown.tsx` | Generic select or custom stage buttons |
| **Filter select in table / toolbar** | `FilterSelectDropdown` | `src/components/FilterSelectDropdown.tsx` | Raw `<select>` or unstyled button popup |
| **Icon action button (Trash, Close, Copy, Email)** | `IconButton`, `DeleteIconButton`, `CloseIconButton`, `CopyIconButton`, `EmailIconButton` | `src/components/IconButton.tsx` | Raw `<button><Trash2/></button>` without 44px hit target |
| **Application pipeline stage pill** | `StatusBadge` | `src/components/StatusBadge.tsx` | Custom `<span className="rounded-full bg-...">`, hardcoded stage colors |
| **Work location / Employment type chips** | `JobTypeBadges` | `src/components/JobTypeBadges.tsx` | Arbitrary inline badge spans |
| **Segmented tab bar / View mode switcher** | `SegmentedTabs` | `src/components/SegmentedTabs.tsx` | Ad-hoc flex rows with font-weight jumping |
| **Company logo or brand avatar** | `CompanyLogo` | `src/components/CompanyLogo.tsx` | Raw `<img src="...">` without fallback and caching |
| **Safe text with markdown links & auto-linking** | `LinkifiedText` | `src/components/LinkifiedText.tsx` | Raw `<a>` missing `target="_blank" rel="noopener noreferrer"` |
| **Zero-data or filtered empty states** | `EmptyState` / `OnboardingEmptyState` | `src/components/EmptyState.tsx` | Ad-hoc "No data found" unstyled text divs |
| **Initial app boot & in-workspace loading state** | `WorkspaceLoadingState` | `src/components/layout/WorkspaceLoadingState.tsx` | Circular spinning icons, wireframe scaffolding on cold boot, raw "Loading..." text |
| **Hover tooltips with keyboard shortcuts** | `Tooltip` / `useTooltip` | `src/components/Tooltip.tsx` | Browser default `title="..."` attributes alone |
| **Universal Modal / Dialog with Animated Motion** | `Modal` | `src/components/Modal.tsx` | Raw `<div className="fixed inset-0...">`, ad-hoc dialogs |
| **Modal / Drawer / Dialog dismissal** | `useEscapeKey` | `src/lib/useEscapeKey.ts` | Manual keydown listeners that close multiple layers simultaneously |
| **Expandable card drawer / Collapsible text snippet** | `ExpandableContentContainer` | `src/components/ExpandableContentContainer.tsx` | Swapping elements in `<AnimatePresence>`, unclipped height jumps, dancing text |
| **Standard buttons (Primary, Secondary, Outline, Ghost)** | `UI_TOKENS.btnPrimary`, `btnSecondary`, `btnOutline`, `btnGhost` | `src/theme/tokens.ts` | Hand-rolled inline button Tailwind utility strings |
| **Standard form text input** | `UI_TOKENS.inputBase` | `src/theme/tokens.ts` | Arbitrary borders, unstyled inputs, `placeholder-slate-400` |

---

## 3. The 8 Canonical Component Classes

---

### Class 1: Rich Notes & Markdown Editing

#### Canonical Component: `RichTextEditor`
- **File Path**: `src/components/editor/RichTextEditor.tsx`
- **When to Use**: Notes, interview prep logs, recruiter communication logs, discussion fields, markdown logs.
- **Key Capabilities**: Full WYSIWYG markdown support, Slash command menu (`/` commands), floating formatting bubble (`SelectionBubble`), starter template pills (`TemplatePills`), interactive link popovers, bidirectional RTL support, caret preservation across background autosaves, and optional drag-to-resize handle.

#### TypeScript Interface & Prop Contract:
```typescript
export interface RichTextEditorProps {
  /** Markdown source of truth */
  value: string;
  /** Fired on mutations with canonicalized Markdown */
  onChange: (markdown: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  minRows?: number;
  /** Empty-state starter templates (pass null or [] to disable) */
  templates?: readonly NoteTemplate[] | null;
  /** Called when a template pill is selected */
  onTemplateSelect?: (id: NoteTemplateId, skeleton: string) => void;
  /** Shows a drag handle on the bottom edge for height control */
  resizable?: boolean;
}
```

#### Code Example:
```tsx
import { RichTextEditor } from '../components/editor/RichTextEditor';

export const PrepNotesSection: React.FC<{ notes: string; onSave: (val: string) => void }> = ({
  notes,
  onSave,
}) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-700">Interview Notes</label>
      <RichTextEditor
        value={notes}
        onChange={onSave}
        placeholder="Type notes or '/' for commands..."
        minRows={6}
        resizable
      />
    </div>
  );
};
```

---

### Class 2: Dropdowns & Selects

#### Canonical Components:
1. `CustomSelectDropdown` (`src/components/CustomSelectDropdown.tsx`)
2. `StageSelectorDropdown` (`src/components/StageSelectorDropdown.tsx`)
3. `FilterSelectDropdown` (`src/components/FilterSelectDropdown.tsx`)

- **When to Use**: Any single-choice dropdown, filter menu, or status selector.
- **Key Capabilities**: Accessible ARIA `listbox` pattern, full keyboard arrow navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Space`, `Escape`), click-outside listener, automated scroll-into-view, zero layout shift, sizes (`sm`: 32px, `md`: 38px), variants (`default`, `filter`, `subtle`).

#### TypeScript Interface & Prop Contract:
```typescript
export interface SelectOption<T = string | number> {
  label: string;
  value: T;
  icon?: React.ReactNode;
}

export interface CustomSelectDropdownProps<T = string | number> {
  value: T;
  onChange: (val: T) => void;
  options: SelectOption<T>[];
  labelPrefix?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'filter' | 'subtle';
  isActive?: boolean;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
}
```

#### Code Example:
```tsx
import { CustomSelectDropdown, SelectOption } from '../components/CustomSelectDropdown';

const WORK_LOCATION_OPTIONS: SelectOption<string>[] = [
  { label: 'Remote', value: 'Remote' },
  { label: 'Hybrid', value: 'Hybrid' },
  { label: 'Onsite', value: 'Onsite' },
];

export const LocationSelector: React.FC<{ value: string; onChange: (v: string) => void }> = ({
  value,
  onChange,
}) => (
  <CustomSelectDropdown
    value={value}
    onChange={onChange}
    options={WORK_LOCATION_OPTIONS}
    size="md"
    variant="default"
  />
);
```

---

### Class 3: Icon & Utility Buttons

#### Canonical Components: `IconButton`, `DeleteIconButton`, `CloseIconButton`, `CopyIconButton`, `EmailIconButton`
- **File Path**: `src/components/IconButton.tsx`
- **When to Use**: Table row actions, modal headers, toolbar icons, clipboard actions, mailto triggers.
- **Key Capabilities**: Standardized 44x44px accessible touch target (`after:min-w-[44px]`), integrated tooltip support (`data-tooltip`), standardized calm-to-rose destructive styling (`DESTRUCTIVE_ACTION_STYLE`), copy confirmation feedback state, and safe outbound links (`target="_blank" rel="noopener noreferrer"`).

#### TypeScript Interface & Prop Contract:
```typescript
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'primary' | 'subtle';
  size?: 'sm' | 'md';
  title?: string;
  tooltipPlacement?: TooltipPlacement;
  shortcut?: string;
}

export interface DeleteIconButtonProps extends Omit<IconButtonProps, 'icon' | 'variant'> {}
export interface CloseIconButtonProps extends Omit<IconButtonProps, 'icon'> {}
export interface CopyIconButtonProps extends Omit<IconButtonProps, 'icon' | 'onClick'> {
  textToCopy: string;
  onCopied?: () => void;
}
export interface EmailIconButtonProps extends Omit<IconButtonProps, 'icon'> {
  email: string;
}
```

#### Code Example:
```tsx
import { DeleteIconButton, CloseIconButton, CopyIconButton } from '../components/IconButton';

export const CardActions: React.FC<{ onDelete: () => void; jobUrl: string }> = ({
  onDelete,
  jobUrl,
}) => (
  <div className="flex items-center gap-1">
    <CopyIconButton textToCopy={jobUrl} title="Copy link" />
    <DeleteIconButton onClick={onDelete} title="Delete application" />
  </div>
);
```

---

### Class 4: Status & Domain Badges

#### Canonical Components:
1. `StatusBadge` (`src/components/StatusBadge.tsx`)
2. `JobTypeBadges` (`src/components/JobTypeBadges.tsx`)

- **When to Use**: Pipeline lifecycle stage indicators (`Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, `Archived`), and job metadata chips (`WorkLocation`, `EmploymentType`).
- **Key Capabilities**: Driven by the single source of truth `STAGE_CONFIG_MAP` from `src/lib/constants.ts`. Features semantic dot indicator, high-contrast readable text, domain-tinted background, and JetBrains Mono monospace typography.

#### TypeScript Interface & Prop Contract:
```typescript
export interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md';
}

export interface JobTypeBadgesProps {
  workLocation?: WorkLocation;
  employmentType?: EmploymentType;
  className?: string;
}
```

#### Code Example:
```tsx
import { StatusBadge } from '../components/StatusBadge';
import { JobTypeBadges } from '../components/JobTypeBadges';

export const ApplicationHeader: React.FC<{ status: ApplicationStatus; location?: WorkLocation }> = ({
  status,
  location,
}) => (
  <div className="flex items-center gap-2">
    <StatusBadge status={status} size="sm" />
    <JobTypeBadges workLocation={location} />
  </div>
);
```

---

### Class 5: Segmented Navigation

#### Canonical Component: `SegmentedTabs`
- **File Path**: `src/components/SegmentedTabs.tsx`
- **When to Use**: Top-level view switchers, modal tabs, filter segment switchers.
- **Key Capabilities**: Smooth sliding background pill indicator, full arrow keyboard navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`), sizes (`sm`, `md`, `lg`), support for badges/counts, zero layout shifts.

#### TypeScript Interface & Prop Contract:
```typescript
export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}
```

#### Code Example:
```tsx
import { SegmentedTabs, TabOption } from '../components/SegmentedTabs';

type DetailTab = 'overview' | 'notes' | 'contacts';

const TABS: TabOption<DetailTab>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'notes', label: 'Notes' },
  { id: 'contacts', label: 'Contacts', badge: 3 },
];

export const DetailNavigation: React.FC<{ active: DetailTab; onChange: (t: DetailTab) => void }> = ({
  active,
  onChange,
}) => (
  <SegmentedTabs tabs={TABS} activeTab={active} onChange={onChange} size="sm" />
);
```

---

### Class 6: Media, Brand & Company Logos

#### Canonical Component: `CompanyLogo`
- **File Path**: `src/components/CompanyLogo.tsx`
- **When to Use**: Application cards, table rows, detail drawers, company headings.
- **Key Capabilities**: Multi-tiered logo resolution (Direct URL $\rightarrow$ Clearbit $\rightarrow$ Google Favicon $\rightarrow$ Monogram Fallback), instant in-memory session cache lookup (frame 0 render, zero flicker), rejection of low-resolution 16x16 Google globe fallbacks, and standard size presets (`xs`, `sm`, `md`, `lg`, `xl`).

#### TypeScript Interface & Prop Contract:
```typescript
export interface CompanyLogoProps {
  company: string;
  jobLink?: string;
  logoUrl?: string;
  companyDomain?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}
```

#### Code Example:
```tsx
import { CompanyLogo } from '../components/CompanyLogo';

export const CompanyHeader: React.FC<{ company: string; logoUrl?: string }> = ({
  company,
  logoUrl,
}) => (
  <div className="flex items-center gap-3">
    <CompanyLogo company={company} logoUrl={logoUrl} size="md" />
    <h2 className="text-base font-bold text-slate-900 tracking-tight">{company}</h2>
  </div>
);
```

---

### Class 7: Safe Markdown & Outbound URLs

#### Canonical Component: `LinkifiedText`
- **File Path**: `src/components/LinkifiedText.tsx`
- **When to Use**: Job descriptions, email snippet logs, user-supplied text with embedded URLs or markdown links.
- **Key Capabilities**: Tokenizes plain URLs and Markdown `[text](url)` links, renders outbound links with mandatory `target="_blank" rel="noopener noreferrer"`, supports inline formatting (bold, italic, code), stops click propagation when embedded inside clickable cards, and supports `requireCtrlClick` mode.

#### TypeScript Interface & Prop Contract:
```typescript
export interface LinkifiedTextProps {
  text?: string | null;
  className?: string;
  linkClassName?: string;
  showIcon?: boolean;
  stopClickPropagation?: boolean;
  requireCtrlClick?: boolean;
}
```

#### Code Example:
```tsx
import { LinkifiedText } from '../components/LinkifiedText';

export const DescriptionSnippet: React.FC<{ rawText: string }> = ({ rawText }) => (
  <p className="text-xs text-slate-600 leading-relaxed">
    <LinkifiedText text={rawText} showIcon stopClickPropagation />
  </p>
);
```

---

### Class 8: State, Feedback & Interaction Primitives

#### Canonical Components:
1. `EmptyState` (`src/components/EmptyState.tsx`)
2. `Modal` (`src/components/Modal.tsx`)
3. `Tooltip` / `TooltipProvider` / `useTooltip` (`src/components/Tooltip.tsx`)
4. `useEscapeKey` (`src/lib/useEscapeKey.ts`)
5. `WorkspaceLoadingState` (`src/components/layout/WorkspaceLoadingState.tsx`)

- **When to Use**: Zero-data screens, filter empty states, animated modal dialogs, contextual tooltips with keyboard shortcuts, modal dismissal, and initial cold boot or in-workspace loading.
- **Key Capabilities**:
  - `EmptyState`: Visually distinguishes initial zero-state from filtered search empty-state; uses standardized `UI_TOKENS` action buttons.
  - `Modal`: Universal executive modal dialog primitive. Features 160ms entrance and 100ms exit motion via `AnimatePresence`, WAI-ARIA 1.2 focus trapping and restoration, intelligent auto-focus (`autoFocus?: boolean`, default `true`; set `false` for detail panels so no inner child receives focus), `initialFocusRef` support, stack-aware Escape dismissal via `useEscapeKey`, backdrop press/release origin validation (drags across modal borders do not dismiss), and clean utility class override handling (`rounded-*` and `border-*`).
  - `Tooltip`: Portal-based rendering, warm-up delay tracking (zero delay on subsequent hovers), viewport collision avoidance, and shortcut hints.
  - `useEscapeKey`: Global LIFO stack that dismisses **only** the topmost overlay, preventing multi-layered drawers/modals from simultaneously closing on Escape.
  - `WorkspaceLoadingState`: Executive Linear-grade loading experience implementing the Staged Dissolve architecture (`fullScreen` cold boot monolith with 1.5px hairline progress rail and "Texts reveal" transition from transitions.dev revealing "loading ..." after 300ms, plus in-workspace deterministic skeletons for all 5 workspace views: Table, Board, Contacts, Analytics, and Settings with 0 Cumulative Layout Shift). Organized via modular sub-skeletons in `src/components/layout/skeletons/`.

#### Code Examples:
```tsx
// 1. Modal (Universal Animated Dialog)
import { Modal } from '../components/Modal';

export const MyDialog: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Edit Profile"
    maxWidthClassName="max-w-md"
    autoFocus={true} // Default: true for forms, set false for read-only / detail panels
  >
    <div className="p-6">Dialog content</div>
  </Modal>
);

// 2. EmptyState
import { EmptyState } from '../components/EmptyState';

export const ApplicationListEmpty: React.FC<{ isFiltered: boolean; onClear: () => void }> = ({
  isFiltered,
  onClear,
}) => (
  <EmptyState
    isFiltered={isFiltered}
    onResetFilters={onClear}
    title={isFiltered ? 'No matches found' : 'No applications yet'}
  />
);

// 2. useEscapeKey
import { useEscapeKey } from '../lib/useEscapeKey';

export const SlideOverDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  useEscapeKey(onClose, isOpen);
  if (!isOpen) return null;
  return <div role="dialog" className="...">...</div>;
};

// 3. Tooltip
import { Tooltip } from '../components/Tooltip';

export const SaveButton: React.FC<{ onSave: () => void }> = ({ onSave }) => (
  <Tooltip content="Save changes" shortcut="Ctrl+S" placement="bottom">
    <button type="button" onClick={onSave} className={UI_TOKENS.btnPrimary}>
      Save
    </button>
  </Tooltip>
);
```

---

## 4. Tracklet Design Tokens (`src/theme/tokens.ts`)

Always consume canonical design tokens rather than composing arbitrary Tailwind strings:

```typescript
export const UI_TOKENS = {
  // Container & Card Shells
  card: 'bg-white border border-slate-200/90 rounded-2xl shadow-2xs',
  modal: 'bg-white border border-slate-200/90 rounded-2xl shadow-2xl',

  // Buttons
  btnPrimary: 'h-[34px] px-3.5 rounded-[10px] bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold border border-transparent shadow-xs text-xs shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5 transition-all',
  btnSecondary: 'h-[34px] px-3 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 shadow-2xs text-xs cursor-pointer flex items-center justify-between gap-1.5 transition-all',
  btnOutline: 'h-[34px] px-3 rounded-[10px] bg-white hover:bg-slate-100 text-slate-700 font-medium border border-slate-200 shadow-2xs text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all',
  btnGhost: 'h-8 px-2 rounded-[10px] bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs transition-colors cursor-pointer',

  // Text Inputs
  inputBase: 'h-[34px] bg-slate-50 text-slate-900 placeholder-slate-500 rounded-[10px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white text-xs transition-all shadow-2xs',
};
```

---

## 5. Absolute Negative Constraints (Banned Elements)

1. **NO Raw `<select>` Elements**: ALWAYS use `CustomSelectDropdown`. Raw HTML `<select>` elements lack keyboard handling, search filtering, and brand styling.
2. **NO Raw `<textarea>` for Notes**: ALWAYS use `RichTextEditor` for notes, logs, discussions, and markdown. For plain multi-line inputs (e.g. bug description), use `<textarea className={UI_TOKENS.inputBase + " h-auto min-h-[80px] p-2.5 resize-y"}>` with `placeholder-slate-500`. Never leave textareas unstyled or with `text-slate-400`.
3. **NO Permanent Bright Red Buttons**: NEVER style standard delete buttons in table rows or cards with permanent `bg-red-600` or `text-rose-600`. Use `DeleteIconButton` or `DESTRUCTIVE_ACTION_STYLE` from `src/lib/constants.ts` (`text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors`).
4. **NO Arbitrary Tailwind Hex Brackets**: NEVER write `bg-[#2563eb]`, `text-[#0f172a]`, or `rounded-[14px]`. Rely on Tailwind semantic color scales (`slate-*`, `blue-*`) and `UI_TOKENS`.
5. **NO Native Browser Dialogs**: NEVER call `window.alert()`, `window.confirm()`, or `window.prompt()`. Use custom modal prompts or receipts with `addToast`.
6. **NO Hand-Rolled Collapsible Text / Drawer Animations**: NEVER swap or cross-fade alternate text nodes in `<AnimatePresence>` to create expandable cards. Doing so causes line-wrap recalculations and text jitter ("dancing text"). ALWAYS use `ExpandableContentContainer`.
