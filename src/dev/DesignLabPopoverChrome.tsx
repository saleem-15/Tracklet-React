import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, type TargetAndTransition } from 'motion/react';
import { MOTION_EASE, modalReducedVariants } from '../lib/motion';
import {
  AGENTATION_CONTENT_EASE,
  LAB_FOCUS_RING,
  LAB_TRANSITION,
} from './DesignLabBarChrome';
import type { DesignLabSurface } from './designLabUtils';

export interface LabSurfaceSkin {
  panel: string;
  heading: string;
  body: string;
  meta: string;
  divider: string;
  pill: string;
  bullet: string;
  kbd: string;
  itemHover: string;
}

export const LAB_POPOVER_SKINS: Record<DesignLabSurface, LabSurfaceSkin> = {
  dark: {
    panel:
      'bg-[#1a1a1a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.08)]',
    heading: 'text-white',
    body: 'text-white/75',
    meta: 'text-white/60',
    divider: 'border-white/[0.07]',
    pill: 'bg-white/[0.12] text-white/90',
    bullet: 'bg-white/40',
    kbd: 'bg-white/[0.12] text-white/85',
    itemHover: 'hover:bg-white/[0.10]',
  },
  light: {
    panel:
      'bg-white text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]',
    heading: 'text-neutral-900',
    body: 'text-neutral-600',
    meta: 'text-neutral-500',
    divider: 'border-black/[0.07]',
    pill: 'bg-black/[0.06] text-neutral-700',
    bullet: 'bg-neutral-400',
    kbd: 'bg-black/[0.06] text-neutral-700',
    itemHover: 'hover:bg-black/[0.05]',
  },
};

const PLACEMENT_CLASS = {
  aboveLeft: 'bottom-full mb-2 left-0 origin-bottom-left',
  aboveRight: 'bottom-full mb-2 right-0 origin-bottom-right',
  belowLeft: 'top-full mt-2 left-0 origin-top-left',
  belowRight: 'top-full mt-2 right-0 origin-top-right',
} as const;

/** Flips vertical and horizontal anchors when viewport headroom is tight. */
export function getLabPopoverPlacement(barTop: number, barLeft: number): string {
  const isAbove = barTop >= 260;
  const isLeft = barLeft < 300;

  if (isAbove) return isLeft ? PLACEMENT_CLASS.aboveLeft : PLACEMENT_CLASS.aboveRight;
  return isLeft ? PLACEMENT_CLASS.belowLeft : PLACEMENT_CLASS.belowRight;
}

/** Anchors settings popover directly above the settings icon trigger. */
export function getSettingsPopoverPlacement(barTop: number): string {
  const isAbove = barTop >= 200;
  return isAbove ? PLACEMENT_CLASS.aboveRight : PLACEMENT_CLASS.belowRight;
}

export interface LabPopoverMotion {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
}

const REDUCED_MOTION: LabPopoverMotion = {
  initial: modalReducedVariants.closed as TargetAndTransition,
  animate: modalReducedVariants.open as TargetAndTransition,
  exit: modalReducedVariants.closed as TargetAndTransition,
};

/** Agentation-matched blur + scale popover enter/exit animation. */
export function getLabPopoverMotion(
  barTop: number,
  reducedMotion: boolean,
  threshold = 260
): LabPopoverMotion {
  if (reducedMotion) return REDUCED_MOTION;

  const isAbove = barTop >= threshold;
  const offsetY = isAbove ? 8 : -8;
  return {
    initial: { opacity: 0, scale: 0.95, y: offsetY, filter: 'blur(5px)' },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.2, ease: AGENTATION_CONTENT_EASE },
      transitionEnd: { filter: 'none' },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: offsetY,
      filter: 'blur(5px)',
      transition: { duration: 0.14, ease: MOTION_EASE.exit },
    },
  };
}

/** Agentation-matched blur + scale cross-fade for collapsed/expanded toolbar body. */
export function getLabBarContentMotion(isCollapsed: boolean): LabPopoverMotion {
  if (isCollapsed) {
    return {
      initial: { opacity: 0, scale: 0.65, filter: 'blur(4px)' },
      animate: {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.32, ease: MOTION_EASE.command },
        transitionEnd: { filter: 'none' },
      },
      exit: {
        opacity: 0,
        scale: 0.65,
        filter: 'blur(4px)',
        transition: { duration: 0.18, ease: MOTION_EASE.exit },
      },
    };
  }
  return {
    initial: { opacity: 0, scale: 0.85, filter: 'blur(6px)' },
    animate: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.32, ease: MOTION_EASE.command },
      transitionEnd: { filter: 'none' },
    },
    exit: {
      opacity: 0,
      scale: 0.78,
      filter: 'blur(6px)',
      transition: { duration: 0.18, ease: MOTION_EASE.exit },
    },
  };
}

/**
 * Keeps exit animations in production, while act() test environments swap
 * instantly so assertions never wait on animation frames.
 */
export function LabPopoverPresence({
  instant,
  children,
}: {
  instant: boolean;
  children: ReactNode;
}) {
  if (instant) return <>{children}</>;
  return <AnimatePresence>{children}</AnimatePresence>;
}

const APPEARANCE_OPTIONS = ['dark', 'light'] as const;

export function LabAppearanceToggle({
  surface,
  reducedMotion,
  onChange,
}: {
  surface: DesignLabSurface;
  reducedMotion: boolean;
  onChange: (surface: DesignLabSurface) => void;
}) {
  const isDark = surface === 'dark';
  const groupRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const [measured, setMeasured] = useState(false);
  const activeIndex = surface === 'dark' ? 0 : 1;

  useLayoutEffect(() => {
    const measure = () => {
      const btn = buttonRefs.current[activeIndex];
      if (!btn) return;
      const next = { left: btn.offsetLeft, width: btn.offsetWidth };
      setPill((prev) => (prev.left === next.left && prev.width === next.width ? prev : next));
      setMeasured(true);
    };
    measure();
    if (typeof ResizeObserver === 'undefined' || !groupRef.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(groupRef.current);
    return () => observer.disconnect();
  }, [activeIndex]);

  const slideClass =
    measured && !reducedMotion
      ? 'transition-[transform,width,background-color] duration-200 ease-[cubic-bezier(0.19,1,0.22,1)] motion-reduce:transition-none'
      : '';
  const activePillClass = isDark
    ? 'bg-white/[0.15]'
    : 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.05)]';

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Bar surface theme"
      className={`relative flex items-center gap-0.5 rounded-full p-0.5 transition-colors duration-200 ${
        isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]'
      }`}
    >
      <span
        aria-hidden="true"
        data-testid="design-lab-theme-indicator"
        className={`pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full ${slideClass} ${activePillClass}`}
        style={{ transform: `translate3d(${pill.left}px, 0, 0)`, width: `${pill.width}px` }}
      />
      {APPEARANCE_OPTIONS.map((option, index) => {
        const selected = surface === option;
        const fallback = selected && pill.width === 0 ? activePillClass : '';
        return (
          <button
            key={option}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={`relative z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold cursor-pointer active:scale-[0.92] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${fallback} ${
              selected
                ? isDark
                  ? 'text-white'
                  : 'text-neutral-900'
                : isDark
                  ? 'text-white/65 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {option === 'dark' ? (
              <Moon className="w-3 h-3" aria-hidden="true" />
            ) : (
              <Sun className="w-3 h-3" aria-hidden="true" />
            )}
            <span>{option === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        );
      })}
    </div>
  );
}
