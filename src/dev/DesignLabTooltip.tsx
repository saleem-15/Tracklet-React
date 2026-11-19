import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DesignLabSurface } from './designLabUtils';

interface LabTooltipContextValue {
  isSessionActive: boolean;
  suppressed: boolean;
  notifyOpen: () => void;
  notifyClose: () => void;
}

const LabTooltipContext = createContext<LabTooltipContextValue>({
  isSessionActive: false,
  suppressed: false,
  notifyOpen: () => {},
  notifyClose: () => {},
});

const INITIAL_DELAY_MS = 350;
const SESSION_RESET_MS = 200;

export function LabTooltipProvider({
  suppressed,
  children,
}: {
  suppressed: boolean;
  children: ReactNode;
}) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReset = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const notifyOpen = useCallback(() => {
    clearReset();
    setIsSessionActive(true);
  }, [clearReset]);

  const notifyClose = useCallback(() => {
    clearReset();
    resetTimerRef.current = setTimeout(() => {
      setIsSessionActive(false);
    }, SESSION_RESET_MS);
  }, [clearReset]);

  useEffect(() => {
    if (suppressed) {
      clearReset();
      setIsSessionActive(false);
    }
  }, [clearReset, suppressed]);

  useEffect(() => clearReset, [clearReset]);

  return (
    <LabTooltipContext.Provider value={{ isSessionActive, suppressed, notifyOpen, notifyClose }}>
      {children}
    </LabTooltipContext.Provider>
  );
}

const TOOLTIP_SKIN: Record<DesignLabSurface, { bubble: string; caret: string; shortcut: string }> = {
  dark: {
    bubble:
      'bg-[#1a1a1a] text-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.08)]',
    caret: 'bg-[#1a1a1a]',
    shortcut: 'text-white/50',
  },
  light: {
    bubble:
      'bg-white text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]',
    caret: 'bg-white',
    shortcut: 'text-neutral-500',
  },
};

export interface LabTooltipProps {
  label: string;
  shortcut?: string;
  surface: DesignLabSurface;
  barTop: number;
  disabled?: boolean;
  children: ReactNode;
}

/**
 * Agentation-style session tooltip: 350ms warm-up on first hover, 0ms instant
 * across sibling buttons, auto-suppressed while dragging or when a popover is open.
 */
export function LabTooltip({
  label,
  shortcut,
  surface,
  barTop,
  disabled = false,
  children,
}: LabTooltipProps) {
  const { isSessionActive, suppressed, notifyOpen, notifyClose } = useContext(LabTooltipContext);
  const [open, setOpen] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    if (disabled || suppressed) return;
    clearOpenTimer();
    if (isSessionActive) {
      setOpen(true);
      notifyOpen();
      return;
    }
    openTimerRef.current = setTimeout(() => {
      setOpen(true);
      notifyOpen();
    }, INITIAL_DELAY_MS);
  }, [clearOpenTimer, disabled, isSessionActive, notifyOpen, suppressed]);

  const hide = useCallback(() => {
    clearOpenTimer();
    setOpen((prev) => {
      if (prev) notifyClose();
      return false;
    });
  }, [clearOpenTimer, notifyClose]);

  useEffect(() => {
    if (disabled || suppressed) {
      clearOpenTimer();
      setOpen(false);
    }
  }, [clearOpenTimer, disabled, suppressed]);

  useEffect(() => clearOpenTimer, [clearOpenTimer]);

  const isVisible = open && !disabled && !suppressed;
  const placeBelow = barTop < 100;
  const skin = TOOLTIP_SKIN[surface];

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && (
        <span
          role="tooltip"
          data-testid="design-lab-tooltip"
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-30 flex items-center rounded-lg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap select-none transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${
            placeBelow ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
          } ${skin.bubble}`}
        >
          <span>{label}</span>
          {shortcut && (
            <span className={`ml-1.5 font-mono text-[10px] font-semibold ${skin.shortcut}`}>
              {shortcut}
            </span>
          )}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 ${
              placeBelow ? '-top-1 rounded-tl-[2px]' : '-bottom-1 rounded-br-[2px]'
            } ${skin.caret}`}
          />
        </span>
      )}
    </span>
  );
}
