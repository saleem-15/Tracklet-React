import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';
import { useEscapeKey } from '../lib/useEscapeKey';
import { useLabDrag } from './useLabDrag';
import { DesignLabExpandedControls } from './DesignLabBarControls';
import {
  LAB_SURFACE_ROOT,
  LabCollapsedPill,
  LabDragHandle,
} from './DesignLabBarChrome';
import {
  isEditableEventTarget,
  readLabStoredState,
  writeLabStoredState,
  type DesignLabScenario,
  type DesignLabSurface,
  type DesignLabVariant,
} from './designLabUtils';

export interface DesignLabBarProps<T extends string = string, S extends string = string> {
  labId: string;
  title: string;
  variants: readonly DesignLabVariant<T>[];
  activeVariant: T;
  onVariantChange: (variant: T) => void;
  scenarios?: readonly DesignLabScenario<S>[];
  activeScenario?: S;
  onScenarioChange?: (scenario: S) => void;
  defaultCollapsed?: boolean;
  defaultSurface?: DesignLabSurface;
  topLayer?: boolean;
  /** Allows rendering in non-DEV environments such as specialized harnesses/tests */
  forceRender?: boolean;
}

function resolveDigitIndex(event: KeyboardEvent): number | null {
  if (/^[1-9]$/.test(event.key)) return Number(event.key) - 1;
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code ?? '');
  return match ? Number(match[1]) - 1 : null;
}

export function DesignLabBar<T extends string = string, S extends string = string>({
  labId,
  title,
  variants,
  activeVariant,
  onVariantChange,
  scenarios,
  activeScenario,
  onScenarioChange,
  defaultCollapsed = false,
  defaultSurface = 'dark',
  topLayer = false,
  forceRender = false,
}: DesignLabBarProps<T, S>) {
  const reducedMotion = Boolean(useReducedMotion());
  const containerRef = useRef<HTMLDivElement>(null);
  const [storedState] = useState(() => readLabStoredState(labId));
  const [isCollapsed, setIsCollapsed] = useState(() => storedState.collapsed ?? defaultCollapsed);
  const [surface, setSurface] = useState<DesignLabSurface>(() => storedState.surface ?? defaultSurface);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isScenarioMenuOpen, setIsScenarioMenuOpen] = useState(false);

  const {
    position,
    dragDelta,
    isDragging,
    announcement,
    suppressClickRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleLostPointerCapture,
    handleKeyDown,
    resetPosition,
  } = useLabDrag({ labId, title, containerRef, deps: [isCollapsed] });

  const activeVariantObj = variants.find((variant) => variant.id === activeVariant);
  const activeScenarioObj = scenarios?.find((scenario) => scenario.id === activeScenario);
  const collapsedLabel = activeVariantObj?.shortLabel || activeVariantObj?.label || activeVariant;

  const closePopovers = useCallback(() => {
    setIsNotesOpen(false);
    setIsScenarioMenuOpen(false);
  }, []);

  const cycleVariant = useCallback(
    (direction: 1 | -1) => {
      if (variants.length === 0) return;
      const index = variants.findIndex((variant) => variant.id === activeVariant);
      const nextIndex = ((index === -1 ? 0 : index) + direction + variants.length) % variants.length;
      onVariantChange(variants[nextIndex].id);
    },
    [activeVariant, onVariantChange, variants]
  );

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((previous) => !previous);
    closePopovers();
  }, [closePopovers]);

  useEffect(() => {
    writeLabStoredState(labId, { collapsed: isCollapsed });
  }, [isCollapsed, labId]);

  useEffect(() => {
    writeLabStoredState(labId, { surface });
  }, [labId, surface]);

  useEffect(() => {
    if (!isNotesOpen && !isScenarioMenuOpen) return;

    const handleOutsidePointer = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      closePopovers();
    };

    document.addEventListener('mousedown', handleOutsidePointer);
    return () => document.removeEventListener('mousedown', handleOutsidePointer);
  }, [closePopovers, isNotesOpen, isScenarioMenuOpen]);

  useEffect(() => {
    if (!topLayer) return;
    const element = containerRef.current as (HTMLDivElement & { showPopover?: () => void }) | null;
    if (!element || typeof element.showPopover !== 'function') return;

    try {
      element.showPopover();
    } catch {
      // Already open or the Popover API is unavailable in this browser.
    }
  }, [topLayer]);

  // Escape only closes the lab popover; the LIFO overlay stack keeps an underlying Modal open.
  useEscapeKey(closePopovers, isNotesOpen || isScenarioMenuOpen);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target) || event.ctrlKey || event.metaKey) return;

      if (event.altKey) {
        const digitIndex = resolveDigitIndex(event);
        if (digitIndex !== null) {
          if (digitIndex < variants.length) {
            event.preventDefault();
            onVariantChange(variants[digitIndex].id);
          }
          return;
        }

        if (event.key === '[' || event.code === 'BracketLeft') {
          event.preventDefault();
          cycleVariant(-1);
          return;
        }

        if (event.key === ']' || event.code === 'BracketRight') {
          event.preventDefault();
          cycleVariant(1);
          return;
        }

        if (event.key.toLowerCase() === 'l' || event.code === 'KeyL') {
          event.preventDefault();
          toggleCollapsed();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    cycleVariant,
    onVariantChange,
    toggleCollapsed,
    variants,
  ]);

  if (!import.meta.env.DEV && !forceRender) return null;
  if (typeof document === 'undefined') return null;

  const handleExpand = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setIsCollapsed(false);
  };

  const rootStyle: CSSProperties = {
    left: position.x,
    top: position.y,
    margin: 0,
    transform: isDragging ? `translate3d(${dragDelta.dx}px, ${dragDelta.dy}px, 0)` : undefined,
    willChange: isDragging ? 'transform' : undefined,
    ...(topLayer ? { right: 'auto', bottom: 'auto' } : {}),
  };

  const toolbar = (
    <div
      ref={containerRef}
      role="toolbar"
      aria-label={`${title} design lab`}
      aria-orientation="horizontal"
      data-testid="design-lab-bar"
      data-surface={surface}
      {...(topLayer ? ({ popover: 'manual' } as Record<string, string>) : {})}
      className={`fixed z-[9990] flex items-center backdrop-blur-md border ring-1 ring-inset font-sans select-none ${
        isCollapsed ? 'gap-1 rounded-full pl-1.5 pr-2.5 py-1' : 'gap-1.5 rounded-2xl px-2 py-1.5'
      } ${LAB_SURFACE_ROOT[surface]}`}
      style={rootStyle}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <LabDragHandle
        title={title}
        surface={surface}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        onKeyDown={handleKeyDown}
        onDoubleClick={resetPosition}
      />

      {isCollapsed ? (
        <LabCollapsedPill
          label={collapsedLabel}
          surface={surface}
          onClick={handleExpand}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handleLostPointerCapture}
        />
      ) : (
        <DesignLabExpandedControls
          labId={labId}
          title={title}
          variants={variants}
          activeVariant={activeVariant}
          onVariantChange={onVariantChange}
          scenarios={scenarios}
          activeScenario={activeScenario}
          activeScenarioLabel={activeScenarioObj?.label ?? 'Select'}
          surface={surface}
          reducedMotion={reducedMotion}
          isNotesOpen={isNotesOpen}
          isScenarioMenuOpen={isScenarioMenuOpen}
          onToggleNotes={() => {
            setIsNotesOpen((previous) => !previous);
            setIsScenarioMenuOpen(false);
          }}
          onToggleScenarioMenu={() => {
            setIsScenarioMenuOpen((previous) => !previous);
            setIsNotesOpen(false);
          }}
          onSelectScenario={(scenario) => {
            onScenarioChange?.(scenario);
            setIsScenarioMenuOpen(false);
          }}
          onToggleSurface={() => setSurface((previous) => (previous === 'dark' ? 'light' : 'dark'))}
          onCollapse={toggleCollapsed}
          barTop={position.y}
          barLeft={position.x}
        />
      )}

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );

  return createPortal(toolbar, document.body);
}

export default DesignLabBar;
