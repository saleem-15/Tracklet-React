import {
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Layers } from 'lucide-react';
import { LabTooltip } from './DesignLabTooltip';
import { isActTestEnvironment, type DesignLabSurface } from './designLabUtils';

/** Agentation toolbar morph & content reveal easing curves. */
export const AGENTATION_MORPH_EASE: [number, number, number, number] = [0.19, 1, 0.22, 1];
export const AGENTATION_CONTENT_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const LAB_SURFACE_ROOT: Record<DesignLabSurface, string> = {
  dark: 'bg-neutral-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.08)]',
  light: 'bg-white text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]',
};

export const LAB_SURFACE_DRAG_LIFT: Record<DesignLabSurface, string> = {
  dark: 'scale-[1.02] shadow-[0_10px_28px_rgba(0,0,0,0.34),0_4px_12px_rgba(0,0,0,0.22),0_0_0_1px_rgba(255,255,255,0.12)]',
  light: 'scale-[1.02] shadow-[0_10px_28px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.06)]',
};

export const LAB_SURFACE_TRANSITION =
  'transition-[background-color,color,box-shadow,scale] duration-250 ease-out motion-reduce:transition-none';

export const LAB_TRANSITION = 'transition-[color,background-color,box-shadow,transform] duration-150 ease-out';
export const LAB_FOCUS_RING = 'outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 motion-reduce:transition-none';

const UTILITY: Record<DesignLabSurface, string> = {
  dark: 'text-white/85 hover:text-white hover:bg-white/[0.12]',
  light: 'text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.06]',
};

const UTILITY_ACTIVE: Record<DesignLabSurface, string> = {
  dark: 'bg-white/[0.16] text-white',
  light: 'bg-black/[0.09] text-neutral-900',
};

export function LabSeparator({ surface }: { surface: DesignLabSurface }) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      className={`h-3 w-px shrink-0 mx-0.5 ${surface === 'dark' ? 'bg-white/15' : 'bg-black/10'}`}
    />
  );
}

interface LabIconButtonProps {
  label: string;
  tooltip?: string;
  shortcut?: string;
  barTop?: number;
  isActive?: boolean;
  badge?: number;
  ariaExpanded?: boolean;
  ariaHasPopup?: 'dialog' | 'menu';
  surface: DesignLabSurface;
  onClick?: () => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerLeave?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  testId?: string;
}

export function LabIconButton({
  label,
  tooltip,
  shortcut,
  barTop = 300,
  isActive = false,
  badge,
  ariaExpanded,
  ariaHasPopup,
  surface,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  children,
  testId,
}: LabIconButtonProps) {
  const isDark = surface === 'dark';
  return (
    <LabTooltip label={tooltip ?? label} shortcut={shortcut} surface={surface} barTop={barTop}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        data-active={isActive ? 'true' : undefined}
        data-testid={testId}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerCancel}
        className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full select-none cursor-pointer active:scale-[0.92] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
          isActive ? UTILITY_ACTIVE[surface] : UTILITY[surface]
        }`}
      >
        {children}
        {badge !== undefined && badge > 0 && (
          <span
            aria-hidden="true"
            data-testid={testId ? `${testId}-badge` : undefined}
            className={`pointer-events-none absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold leading-none tabular-nums ${
              isDark
                ? 'bg-white text-neutral-900 ring-2 ring-neutral-900'
                : 'bg-neutral-900 text-white ring-2 ring-white'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    </LabTooltip>
  );
}

interface LabCollapsedPillProps {
  label: string;
  activeIndex: number;
  variantCount: number;
  surface: DesignLabSurface;
  barTop: number;
  reducedMotion: boolean;
  onClick: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

export function LabCollapsedPill({
  label,
  activeIndex,
  variantCount,
  surface,
  barTop,
  reducedMotion,
  onClick,
  onKeyDown,
}: LabCollapsedPillProps) {
  const isDark = surface === 'dark';
  const instant = reducedMotion || isActTestEnvironment();
  const [tracker, setTracker] = useState({ index: activeIndex, direction: 1 });
  if (tracker.index !== activeIndex) {
    setTracker({ index: activeIndex, direction: activeIndex > tracker.index ? 1 : -1 });
  }
  const direction = tracker.direction;
  const positionTag = `${activeIndex + 1}/${Math.max(1, variantCount)}`;

  return (
    <LabTooltip label={`${label} · Expand`} surface={surface} barTop={barTop}>
      <button
        type="button"
        aria-expanded={false}
        aria-label={`Expand design lab bar (${label}, ${activeIndex + 1} of ${Math.max(1, variantCount)})`}
        data-testid="design-lab-expand"
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={`flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-full touch-none select-none cursor-grab active:cursor-grabbing active:scale-[0.95] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
          isDark ? 'hover:bg-neutral-800' : 'hover:bg-neutral-100'
        }`}
      >
        <Layers size={15} aria-hidden="true" className={isDark ? 'text-white' : 'text-neutral-900'} />
        <motion.span
          key={positionTag}
          initial={instant ? false : { opacity: 0, y: direction > 0 ? 6 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={instant ? { duration: 0 } : { duration: 0.16, ease: AGENTATION_CONTENT_EASE }}
          className={`font-mono text-[9px] font-bold leading-none tabular-nums tracking-tight ${
            isDark ? 'text-white/70' : 'text-neutral-600'
          }`}
        >
          {positionTag}
        </motion.span>
      </button>
    </LabTooltip>
  );
}

interface LabScenarioTriggerProps {
  label: string;
  isOpen: boolean;
  surface: DesignLabSurface;
  barTop: number;
  onClick: () => void;
  children: ReactNode;
}

export function LabScenarioTrigger({
  label,
  isOpen,
  surface,
  barTop,
  onClick,
  children,
}: LabScenarioTriggerProps) {
  const isDark = surface === 'dark';
  return (
    <div className="relative">
      <LabTooltip label="Switch scenario" surface={surface} barTop={barTop} disabled={isOpen}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Switch scenario preset"
          data-active={isOpen ? 'true' : undefined}
          data-testid="design-lab-scenario-trigger"
          onClick={onClick}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold select-none cursor-pointer active:scale-[0.95] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
            isOpen ? UTILITY_ACTIVE[surface] : UTILITY[surface]
          }`}
        >
          <span className={`font-mono text-[9px] uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-neutral-500'}`}>
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
      </LabTooltip>
      {children}
    </div>
  );
}

export { VariantSwitcher, type VariantSwitcherProps } from './DesignLabVariantSwitcher';
