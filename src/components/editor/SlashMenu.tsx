import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'motion/react';
import { MOTION_TIMING, MOTION_EASE } from '../../lib/motion';
import type { FormattingAction } from './editorActions';

export interface SlashMenuProps {
  open: boolean;
  items: FormattingAction[];
  selectedIndex: number;
  rect: { anchorTop?: number; anchorBottom?: number; top?: number; left: number } | null;
  onSelect: (action: FormattingAction) => void;
  onHover: (index: number) => void;
}

/**
 * Linear-style "/" command menu. Presentational: positioning + item list.
 * Styled to match the app's unified dropdown token system (CustomSelectDropdown),
 * with smooth GPU-accelerated entrance and exit animations (AnimatePresence),
 * origin-aware directional transforms, and keyboard scroll tracking to keep the
 * highlighted item in view.
 */
const SlashMenu: React.FC<SlashMenuProps> = ({
  open,
  items,
  selectedIndex,
  rect,
  onSelect,
  onHover,
}) => {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Test and accessibility environment detection
  const isTest =
    typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' || Boolean((globalThis as any).IS_REACT_ACT_ENVIRONMENT));
  const prefersReduced = useReducedMotion();
  const shouldReduceMotion = prefersReduced || isTest;

  // Cache last valid rect & items so AnimatePresence exit transitions render stably at caret position
  const lastRectRef = useRef(rect);
  if (rect) {
    lastRectRef.current = rect;
  }
  const activeRect = rect || lastRectRef.current;

  const lastItemsRef = useRef(items);
  if (items.length > 0) {
    lastItemsRef.current = items;
  }
  const activeItems = items.length > 0 ? items : lastItemsRef.current;

  // Keep highlighted item in view when navigating via arrow keys
  useEffect(() => {
    if (open && selectedIndex >= 0 && optionRefs.current[selectedIndex]) {
      optionRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, open]);

  const menuHeight = 240; // max-h-60 is 240px
  const menuWidth = 224; // w-56 is 224px

  const anchorBottom =
    activeRect && 'anchorBottom' in activeRect && activeRect.anchorBottom !== undefined
      ? activeRect.anchorBottom
      : activeRect?.top ?? 0;
  const anchorTop = activeRect?.anchorTop ?? activeRect?.top ?? anchorBottom;
  const rawLeft = activeRect?.left ?? 0;

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

  // If opening below would overflow off-screen, flip upward above caret
  const spaceBelow = viewportHeight - anchorBottom;
  const shouldFlipUp = spaceBelow < menuHeight + 20 && anchorTop > menuHeight;

  const top = shouldFlipUp
    ? Math.max(8, anchorTop - menuHeight - 6)
    : Math.max(8, Math.min(anchorBottom + 4, viewportHeight - menuHeight - 8));

  // Clamp left coordinate within viewport boundaries with safety fallback for narrow viewports
  const maxLeft = Math.max(12, viewportWidth - menuWidth - 12);
  const left = Math.max(12, Math.min(rawLeft, maxLeft));

  const variants: Variants = useMemo(() => {
    if (shouldReduceMotion) {
      return {
        closed: {
          opacity: 0,
          transition: { duration: 0 },
        },
        open: {
          opacity: 1,
          transition: { duration: 0 },
        },
      };
    }

    return {
      closed: {
        opacity: 0,
        scale: 0.96,
        y: shouldFlipUp ? 4 : -4,
        transition: {
          duration: MOTION_TIMING.instant,
          ease: MOTION_EASE.exit,
        },
      },
      open: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          duration: MOTION_TIMING.snappy,
          ease: MOTION_EASE.command,
        },
      },
    };
  }, [shouldReduceMotion, shouldFlipUp]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && items.length > 0 && activeRect && (
        <motion.div
          key="slash-command-menu"
          role="listbox"
          aria-label="Formatting commands"
          aria-activedescendant={`slash-option-${activeItems[selectedIndex]?.id ?? ''}`}
          data-slash-menu="true"
          tabIndex={-1}
          variants={variants}
          initial="closed"
          animate="open"
          exit="closed"
          style={{
            top,
            left,
            transformOrigin: shouldFlipUp ? 'bottom left' : 'top left',
          }}
          className="fixed z-[100] w-56 max-w-[calc(100vw-24px)] max-h-60 overflow-y-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-[12px] shadow-2xl p-1.5 will-change-transform"
        >
          {activeItems.map((action, index) => {
            const Icon = action.icon;
            const selected = index === selectedIndex;
            return (
              <button
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                key={action.id}
                id={`slash-option-${action.id}`}
                role="option"
                aria-selected={selected}
                type="button"
                // Keep editor selection intact while picking with the mouse; stop propagation to avoid closing
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => onSelect(action)}
                onMouseEnter={() => onHover(index)}
                className={`w-full text-left px-3 py-1.5 rounded-[8px] text-xs font-medium flex items-center justify-between transition-colors duration-150 ease-out cursor-pointer ${
                  selected
                    ? 'bg-blue-50 text-blue-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${selected ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="truncate">{action.label}</span>
                </span>
                {action.shortcut && (
                  <span className="font-mono text-[9px] text-slate-400 select-none ml-2 shrink-0">
                    {action.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SlashMenu;
