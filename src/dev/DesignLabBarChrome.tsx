import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, ChevronUp, GripVertical, Layers } from 'lucide-react';
import type { DesignLabSurface, DesignLabVariant } from './designLabUtils';

export const LAB_SURFACE_ROOT: Record<DesignLabSurface, string> = {
  dark:
    'bg-slate-950/92 text-slate-100 border-slate-800/85 ring-white/10 shadow-[0_12px_36px_rgba(2,6,23,0.45),0_2px_8px_rgba(2,6,23,0.28)]',
  light:
    'bg-white/95 text-slate-900 border-slate-200/90 ring-slate-900/5 shadow-[0_12px_36px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.08)]',
};

export const LAB_TRANSITION = 'transition-colors duration-150';
export const LAB_FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 motion-reduce:transition-none';

const UTILITY: Record<DesignLabSurface, string> = {
  dark: 'text-slate-300 hover:text-white hover:bg-white/10',
  light: 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/5',
};

export const LAB_CHIP: Record<DesignLabSurface, string> = {
  dark: 'bg-white/10 text-slate-200',
  light: 'bg-slate-900/5 text-slate-600',
};

export function LabSeparator({ surface }: { surface: DesignLabSurface }) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      className={`h-4 w-px shrink-0 ${surface === 'dark' ? 'bg-white/10' : 'bg-slate-900/10'}`}
    />
  );
}

export function LabTitleChip({ title, surface }: { title: string; surface: DesignLabSurface }) {
  const isDark = surface === 'dark';

  return (
    <div className="flex items-center gap-1.5 pl-0.5 pr-1 select-none">
      <span
        className={`rounded px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider font-semibold ${LAB_CHIP[surface]}`}
      >
        LAB
      </span>
      <span
        className={`font-heading text-xs font-semibold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
      >
        {title}
      </span>
    </div>
  );
}

interface LabIconButtonProps {
  label: string;
  title?: string;
  ariaExpanded?: boolean;
  surface: DesignLabSurface;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
}

export function LabIconButton({
  label,
  title,
  ariaExpanded,
  surface,
  onClick,
  children,
  testId,
}: LabIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={ariaExpanded}
      title={title ?? label}
      data-testid={testId}
      onClick={onClick}
      className={`inline-flex min-h-7 min-w-7 items-center justify-center rounded-md select-none cursor-pointer ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${UTILITY[surface]}`}
    >
      {children}
    </button>
  );
}

interface VariantSwitcherProps<T extends string> {
  labId: string;
  variants: readonly DesignLabVariant<T>[];
  activeVariant: T;
  onVariantChange: (variant: T) => void;
  surface: DesignLabSurface;
  reducedMotion: boolean;
}

export function VariantSwitcher<T extends string>({
  labId,
  variants,
  activeVariant,
  onVariantChange,
  surface,
  reducedMotion,
}: VariantSwitcherProps<T>) {
  const isDark = surface === 'dark';

  return (
    <div
      role="group"
      aria-label="Design variants"
      className={`flex items-center gap-0.5 rounded-lg p-0.5 ${isDark ? 'bg-white/5' : 'bg-slate-900/5'}`}
    >
      {variants.map((variant, index) => {
        const isActive = variant.id === activeVariant;

        return (
          <button
            key={variant.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onVariantChange(variant.id)}
            className={`relative flex items-center gap-1 rounded-md px-2 py-1 font-sans text-[11px] font-semibold select-none cursor-pointer ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
              isActive
                ? isDark
                  ? 'text-white'
                  : 'text-slate-900'
                : isDark
                  ? 'text-slate-300 hover:text-white'
                  : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`design-lab-active-${labId}`}
                aria-hidden="true"
                transition={
                  reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 36 }
                }
                className={`absolute inset-0 rounded-md ${
                  isDark
                    ? 'bg-white/10 ring-1 ring-inset ring-white/10'
                    : 'bg-white ring-1 ring-inset ring-slate-900/10'
                }`}
              />
            )}
            <span
              className={`relative z-10 font-mono text-[9px] ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
            >
              {index + 1}
            </span>
            <span className="relative z-10">{variant.shortLabel || variant.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface PointerDragHandlers {
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLElement>) => void;
  onLostPointerCapture?: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface LabCollapsedPillProps extends PointerDragHandlers {
  label: string;
  surface: DesignLabSurface;
  onClick: () => void;
}

export function LabCollapsedPill({ label, surface, onClick, ...dragHandlers }: LabCollapsedPillProps) {
  const isDark = surface === 'dark';

  return (
    <button
      type="button"
      aria-expanded={false}
      aria-label="Expand design lab bar (Alt+L)"
      title="Expand design lab bar (Alt+L)"
      data-testid="design-lab-expand"
      onClick={onClick}
      {...dragHandlers}
      className={`flex items-center gap-1.5 rounded-full px-1.5 py-1 touch-none select-none cursor-pointer ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
        isDark ? 'hover:bg-white/10' : 'hover:bg-slate-900/5'
      }`}
    >
      <Layers size={13} aria-hidden="true" className={isDark ? 'text-slate-300' : 'text-slate-500'} />
      <span
        className={`font-mono text-[10px] uppercase tracking-wider font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
      >
        {label}
      </span>
      <ChevronUp className="w-3 h-3" aria-hidden="true" />
    </button>
  );
}

interface LabScenarioTriggerProps {
  label: string;
  isOpen: boolean;
  surface: DesignLabSurface;
  onClick: () => void;
  children: ReactNode;
}

export function LabScenarioTrigger({
  label,
  isOpen,
  surface,
  onClick,
  children,
}: LabScenarioTriggerProps) {
  const isDark = surface === 'dark';

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Switch scenario preset"
        data-testid="design-lab-scenario-trigger"
        onClick={onClick}
        className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold select-none cursor-pointer ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${UTILITY[surface]}`}
      >
        <span
          className={`font-mono text-[9px] uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
        >
          Scenario
        </span>
        <span className="max-w-[110px] truncate">{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={`w-3 h-3 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {children}
    </div>
  );
}

export interface LabDragHandleProps extends PointerDragHandlers {
  title: string;
  surface: DesignLabSurface;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
}

export function LabDragHandle({ title, surface, onKeyDown, onDoubleClick, ...dragHandlers }: LabDragHandleProps) {
  return (
    <button
      type="button"
      aria-label={`${title} drag handle. Use arrow keys to move, double-click to reset position.`}
      title="Drag to move (arrow keys, double-click to reset)"
      data-testid="design-lab-drag-handle"
      {...dragHandlers}
      onKeyDown={onKeyDown}
      onDoubleClick={onDoubleClick}
      className={`inline-flex shrink-0 items-center justify-center rounded-md p-1 cursor-grab active:cursor-grabbing touch-none select-none ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${UTILITY[surface]}`}
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
    >
      <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  );
}
