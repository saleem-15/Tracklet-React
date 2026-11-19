import { useLayoutEffect, useRef, useState } from 'react';
import { LAB_FOCUS_RING, LAB_TRANSITION } from './DesignLabBarChrome';
import { LabTooltip } from './DesignLabTooltip';
import type { DesignLabSurface, DesignLabVariant } from './designLabUtils';

const ACTIVE_PILL: Record<DesignLabSurface, string> = {
  dark: 'bg-white/[0.18]',
  light: 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]',
};

export interface VariantSwitcherProps<T extends string> {
  variants: readonly DesignLabVariant<T>[];
  activeVariant: T;
  onVariantChange: (variant: T) => void;
  eliminatedIds?: readonly string[];
  onToggleEliminate?: (variant: T) => void;
  surface: DesignLabSurface;
  barTop: number;
  reducedMotion: boolean;
}

/**
 * Container-relative sliding variant pill switcher with hover ghost tint,
 * custom session tooltips, and right-click shortlist elimination.
 */
export function VariantSwitcher<T extends string>({
  variants,
  activeVariant,
  onVariantChange,
  eliminatedIds = [],
  onToggleEliminate,
  surface,
  barTop,
  reducedMotion,
}: VariantSwitcherProps<T>) {
  const isDark = surface === 'dark';
  const groupRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [hasMeasured, setHasMeasured] = useState(false);

  const foundIndex = variants.findIndex((variant) => variant.id === activeVariant);
  const activeIndex = foundIndex === -1 ? 0 : foundIndex;

  useLayoutEffect(() => {
    const measureIndicator = () => {
      const button = buttonRefs.current[activeIndex];
      const group = groupRef.current;
      if (!button) return;
      const anchor = button.offsetParent === group ? button : (button.parentElement ?? button);
      const next = { left: anchor.offsetLeft, width: button.offsetWidth };
      setIndicator((prev) => (prev.left === next.left && prev.width === next.width ? prev : next));
      setHasMeasured(true);
    };
    measureIndicator();
    if (typeof ResizeObserver === 'undefined' || !groupRef.current) return;
    const observer = new ResizeObserver(measureIndicator);
    observer.observe(groupRef.current);
    return () => observer.disconnect();
  }, [activeIndex, variants.length]);

  const slideTransition =
    hasMeasured && !reducedMotion
      ? 'transition-[transform,width] duration-200 ease-[cubic-bezier(0.19,1,0.22,1)] motion-reduce:transition-none'
      : '';

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label="Design variants"
      className={`relative flex items-center gap-0.5 rounded-full p-0.5 ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]'}`}
    >
      <span
        aria-hidden="true"
        data-testid="design-lab-active-indicator"
        className={`pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full ${slideTransition} ${ACTIVE_PILL[surface]}`}
        style={{ transform: `translate3d(${indicator.left}px, 0, 0)`, width: `${indicator.width}px` }}
      />
      {variants.map((variant, index) => {
        const isActive = variant.id === activeVariant;
        const isEliminated = eliminatedIds.includes(variant.id);
        const fallbackPill = isActive && indicator.width === 0;
        const hoverGhost = isActive
          ? ''
          : isDark
            ? 'hover:bg-white/[0.06]'
            : 'hover:bg-black/[0.04]';

        return (
          <LabTooltip
            key={variant.id}
            label={isEliminated ? `${variant.label} (ruled out)` : variant.label}
            shortcut={index < 9 ? `Alt+${index + 1}` : undefined}
            surface={surface}
            barTop={barTop}
          >
            <button
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
              type="button"
              aria-pressed={isActive}
              data-eliminated={isEliminated ? 'true' : undefined}
              onClick={() => onVariantChange(variant.id)}
              onContextMenu={(event) => {
                if (!onToggleEliminate) return;
                event.preventDefault();
                onToggleEliminate(variant.id);
              }}
              className={`relative z-10 flex items-center gap-1 rounded-full px-2.5 py-1 font-sans text-[11px] font-semibold select-none cursor-pointer active:scale-[0.92] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
                fallbackPill ? ACTIVE_PILL[surface] : ''
              } ${hoverGhost} ${isEliminated ? 'opacity-45 line-through' : ''} ${
                isActive
                  ? isDark
                    ? 'text-white'
                    : 'text-neutral-900'
                  : isDark
                    ? 'text-white/70 hover:text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className={`font-mono text-[9px] ${isDark ? 'text-white/55' : 'text-neutral-500'}`}>
                {index + 1}
              </span>
              <span>{variant.shortLabel || variant.label}</span>
            </button>
          </LabTooltip>
        );
      })}
    </div>
  );
}
