import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  ReactNode,
  ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import {
  TooltipPlacement,
  TooltipCoordinates,
  parseTooltipText,
  formatShortcutForPlatform,
  calculateTooltipPosition,
} from '../lib/tooltipUtils';

export type { TooltipPlacement };
export { parseTooltipText, formatShortcutForPlatform };

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  placement?: TooltipPlacement;
  shortcut?: string;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

interface ActiveTooltipState {
  target: HTMLElement;
  content: ReactNode;
  shortcut?: string;
  placement: TooltipPlacement;
  delay?: number;
  isWarm?: boolean;
}

interface TooltipContextType {
  showTooltip: (state: ActiveTooltipState) => void;
  hideTooltip: (target?: HTMLElement) => void;
}

const TooltipContext = createContext<TooltipContextType | null>(null);

export const useTooltip = (): TooltipContextType => {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return ctx;
};

export const TooltipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [active, setActive] = useState<ActiveTooltipState | null>(null);
  const [coords, setCoords] = useState<TooltipCoordinates | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const activeRef = useRef<ActiveTooltipState | null>(null);
  activeRef.current = active;

  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClosedTimeRef = useRef<number>(0);
  const isWarmRef = useRef<boolean>(false);
  const tooltipUniqueId = useId();

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideTooltip = useCallback(
    (target?: HTMLElement) => {
      clearTimer();
      setActive((prev) => {
        if (!prev) return null;
        if (target && prev.target !== target) return prev;
        lastClosedTimeRef.current = Date.now();
        setIsVisible(false);
        setCoords(null);
        return null;
      });
    },
    [clearTimer]
  );

  const showTooltip = useCallback(
    (state: ActiveTooltipState) => {
      clearTimer();
      const isWarm = Date.now() - lastClosedTimeRef.current < 350;
      isWarmRef.current = isWarm;
      const delay = isWarm ? 0 : state.delay ?? 220;

      timerRef.current = setTimeout(() => {
        setActive({ ...state, isWarm });
        setIsVisible(true);
      }, delay);
    },
    [clearTimer]
  );

  // Position calculation for floating island (8px gap)
  useEffect(() => {
    if (!active || !tooltipRef.current) return;
    const targetRect = active.target.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const calculated = calculateTooltipPosition(targetRect, tooltipRect, active.placement, 8);
    setCoords(calculated);
  }, [active]);

  // Global delegated listener for hover, keyboard focus, and native title suppression
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const resolveTooltipTarget = (target: HTMLElement | null): HTMLElement | null => {
      let curr: HTMLElement | null = target;
      let innermostTooltipEl: HTMLElement | null = null;

      while (curr && curr !== document.body && curr !== document.documentElement) {
        if (curr.hasAttribute('title')) {
          const rawTitle = curr.getAttribute('title');
          if (rawTitle && rawTitle.trim()) {
            if (!curr.hasAttribute('data-tooltip')) {
              curr.setAttribute('data-tooltip', rawTitle);
            }
            curr.setAttribute('data-original-title', rawTitle);
            if (!curr.hasAttribute('aria-label')) {
              curr.setAttribute('aria-label', rawTitle);
            }
            curr.removeAttribute('title');
          }
        }

        if (
          !innermostTooltipEl &&
          (curr.hasAttribute('data-tooltip') || curr.hasAttribute('data-original-title')) &&
          !curr.hasAttribute('data-no-tooltip')
        ) {
          innermostTooltipEl = curr;
        }

        curr = curr.parentElement;
      }

      return innermostTooltipEl;
    };

    const triggerElementTooltip = (el: HTMLElement) => {
      const text = el.getAttribute('data-tooltip');
      if (!text || !text.trim()) return;

      const placement = (el.getAttribute('data-tooltip-placement') as TooltipPlacement) || 'top';
      const shortcut = el.getAttribute('data-tooltip-shortcut') || undefined;
      const rawDelay = el.getAttribute('data-tooltip-delay');
      const delay = rawDelay ? parseInt(rawDelay, 10) : undefined;

      showTooltip({
        target: el,
        content: text,
        shortcut,
        placement,
        delay,
      });
    };

    const handlePointerOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const el = resolveTooltipTarget(e.target as HTMLElement | null);
      if (el) triggerElementTooltip(el);
    };

    const handlePointerOut = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const related = e.relatedTarget as Node | null;

      let curr: HTMLElement | null = target;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        if (curr.hasAttribute('data-original-title')) {
          if (!related || !curr.contains(related)) {
            curr.setAttribute('title', curr.getAttribute('data-original-title')!);
            curr.removeAttribute('data-original-title');
          }
        }
        curr = curr.parentElement;
      }

      const activeState = activeRef.current;
      if (activeState && (!related || !activeState.target.contains(related))) {
        hideTooltip(activeState.target);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const el = resolveTooltipTarget(e.target as HTMLElement | null);
      if (el) triggerElementTooltip(el);
    };

    const handleFocusOut = (e: FocusEvent) => {
      const activeState = activeRef.current;
      if (activeState && e.target === activeState.target) {
        hideTooltip(activeState.target);
      }
    };

    const handleDismissImmediate = () => hideTooltip();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideTooltip();
    };

    document.addEventListener('pointerover', handlePointerOver, { capture: true, passive: true });
    document.addEventListener('pointerout', handlePointerOut, { capture: true, passive: true });
    document.addEventListener('focusin', handleFocusIn, { capture: true, passive: true });
    document.addEventListener('focusout', handleFocusOut, { capture: true, passive: true });
    document.addEventListener('pointerdown', handleDismissImmediate, { capture: true, passive: true });
    window.addEventListener('scroll', handleDismissImmediate, { capture: true, passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimer();
      document.removeEventListener('pointerover', handlePointerOver, { capture: true });
      document.removeEventListener('pointerout', handlePointerOut, { capture: true });
      document.removeEventListener('focusin', handleFocusIn, { capture: true });
      document.removeEventListener('focusout', handleFocusOut, { capture: true });
      document.removeEventListener('pointerdown', handleDismissImmediate, { capture: true });
      window.removeEventListener('scroll', handleDismissImmediate, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showTooltip, hideTooltip, clearTimer]);

  const parsed =
    active && typeof active.content === 'string'
      ? parseTooltipText(active.content, active.shortcut)
      : null;

  const currentPlacement = coords?.placement ?? active?.placement ?? 'top';
  const isWarm = active?.isWarm ?? false;

  // Whisper-settling micro-motion (1.5px spatial drift without scale distortion)
  const getDirectionalTransform = () => {
    if (isVisible && coords) {
      return 'translate-x-0 translate-y-0 opacity-100';
    }
    if (isWarm) {
      return 'opacity-0';
    }
    switch (currentPlacement) {
      case 'top':
        return 'translate-y-0.5 opacity-0';
      case 'bottom':
        return '-translate-y-0.5 opacity-0';
      case 'left':
        return 'translate-x-0.5 opacity-0';
      case 'right':
        return '-translate-x-0.5 opacity-0';
      default:
        return 'opacity-0';
    }
  };

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}

      {typeof document !== 'undefined' &&
        active &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            id={tooltipUniqueId}
            style={{
              position: 'fixed',
              top: `${coords?.top ?? -9999}px`,
              left: `${coords?.left ?? -9999}px`,
              zIndex: 9999,
            }}
            className={`pointer-events-none select-none flex items-center gap-1.5 max-w-xs transition-[opacity,transform] ${
              isVisible && coords
                ? 'duration-100 ease-out'
                : 'duration-60 ease-in'
            } motion-reduce:transition-none motion-reduce:transform-none ${getDirectionalTransform()} px-2.5 py-1 bg-slate-950/92 backdrop-blur-md text-slate-50 text-[11.5px] font-sans font-medium tracking-tight rounded-md ring-1 ring-inset ring-white/10 shadow-[0_2px_4px_rgba(0,0,0,0.3),0_8px_18px_rgba(0,0,0,0.4)]`}
          >
            {parsed ? (
              <>
                <span className={parsed.label.length > 50 ? 'whitespace-normal' : 'whitespace-nowrap'}>
                  {parsed.label}
                </span>
                {parsed.shortcut && (
                  <kbd className="inline-flex items-center font-mono uppercase px-1.5 py-0.5 bg-white/10 text-slate-300 text-[9px] font-medium rounded ring-1 ring-white/15 shadow-inner">
                    {formatShortcutForPlatform(parsed.shortcut)}
                  </kbd>
                )}
              </>
            ) : (
              active.content
            )}
          </div>,
          document.body
        )}
    </TooltipContext.Provider>
  );
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  shortcut,
  delay,
  disabled = false,
}) => {
  const { showTooltip, hideTooltip } = useTooltip();

  if (disabled || !content) {
    return children;
  }

  const childProps = children.props as React.HTMLAttributes<HTMLElement>;

  const handlePointerEnter = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    showTooltip({
      target: e.currentTarget,
      content,
      shortcut,
      placement,
      delay,
    });
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    hideTooltip(e.currentTarget);
  };

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    showTooltip({
      target: e.currentTarget,
      content,
      shortcut,
      placement,
      delay,
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    hideTooltip(e.currentTarget);
  };

  return React.cloneElement(children, {
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      childProps.onPointerEnter?.(e);
      handlePointerEnter(e);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
      childProps.onPointerLeave?.(e);
      handlePointerLeave(e);
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(e);
      handleFocus(e);
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(e);
      handleBlur(e);
    },
    'data-tooltip': typeof content === 'string' ? content : undefined,
    'data-tooltip-placement': placement,
    'data-tooltip-shortcut': shortcut,
  } as React.HTMLAttributes<HTMLElement>);
};

export default Tooltip;
