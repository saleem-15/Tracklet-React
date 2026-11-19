import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEscapeKey } from '../lib/useEscapeKey';
import { useLabDrag } from './useLabDrag';
import { useLabBarInteractions } from './useLabBarInteractions';
import { DesignLabExpandedControls } from './DesignLabBarControls';
import {
  AGENTATION_MORPH_EASE,
  LAB_SURFACE_DRAG_LIFT,
  LAB_SURFACE_ROOT,
  LAB_SURFACE_TRANSITION,
  LabCollapsedPill,
} from './DesignLabBarChrome';
import { MOTION_EASE } from '../lib/motion';
import { getLabBarContentMotion } from './DesignLabPopoverChrome';
import { LabTooltipProvider } from './DesignLabTooltip';
import {
  isActTestEnvironment,
  readLabStoredState,
  writeLabStoredState,
  type DesignLabScenario,
  type DesignLabSurface,
  type DesignLabVariant,
} from './designLabUtils';
import type { DesignLabVariablesBinding } from './designLabVariables';

export interface DesignLabBarProps<T extends string = string, S extends string = string> {
  labId: string;
  title: string;
  variants: readonly DesignLabVariant<T>[];
  activeVariant: T;
  onVariantChange: (variant: NoInfer<T>) => void;
  baselineVariant?: NoInfer<T>;
  variables?: DesignLabVariablesBinding;
  scenarios?: readonly DesignLabScenario<S>[];
  activeScenario?: S;
  onScenarioChange?: (scenario: NoInfer<S>) => void;
  defaultCollapsed?: boolean;
  defaultSurface?: DesignLabSurface;
  topLayer?: boolean;
  /** Allows rendering in non-DEV environments such as specialized harnesses/tests */
  forceRender?: boolean;
}

type ActivePopover = 'notes' | 'variables' | 'scenario' | 'settings' | null;

export function DesignLabBar<T extends string = string, S extends string = string>({
  labId,
  title,
  variants,
  activeVariant,
  onVariantChange,
  baselineVariant,
  variables,
  scenarios,
  activeScenario,
  onScenarioChange,
  defaultCollapsed = false,
  defaultSurface = 'dark',
  topLayer = false,
  forceRender = false,
}: DesignLabBarProps<T, S>) {
  const reducedMotion = Boolean(useReducedMotion());
  const instantMotion = reducedMotion || isActTestEnvironment();
  const containerRef = useRef<HTMLDivElement>(null);
  const expandedMeasureRef = useRef<HTMLDivElement>(null);
  const [storedState] = useState(() => readLabStoredState(labId));
  const [isCollapsed, setIsCollapsed] = useState(() => storedState.collapsed ?? defaultCollapsed);
  const [surface, setSurface] = useState<DesignLabSurface>(() => storedState.surface ?? defaultSurface);
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [isMorphing, setIsMorphing] = useState(false);
  const [expandedWidth, setExpandedWidth] = useState<number | null>(null);

  const {
    position, isDragging, announcement, suppressClickRef, handlePointerDown, handleKeyDown,
  } = useLabDrag({ labId, title, containerRef, deps: [isCollapsed] });

  const {
    eliminatedIds, toggleEliminate, canPeekBaseline, isPeekingBaseline,
    startPeekBaseline, stopPeekBaseline, copiedDecision, handleCopyDecision, statusAnnouncement,
  } = useLabBarInteractions({
    labId, title, variants, activeVariant, onVariantChange,
    baselineVariant, scenarios, activeScenario, variables,
  });

  const foundIndex = variants.findIndex((variant) => variant.id === activeVariant);
  const activeIndex = foundIndex === -1 ? 0 : foundIndex;
  const activeVariantObj = variants[activeIndex];
  const baselineObj = baselineVariant ? variants.find((v) => v.id === baselineVariant) : undefined;
  const activeScenarioObj = scenarios?.find((scenario) => scenario.id === activeScenario);
  const activeScenarioLabel = activeScenarioObj?.label ?? 'Select';
  const collapsedLabel = activeVariantObj?.shortLabel || activeVariantObj?.label || activeVariant;
  const pinnedSignature = variables ? variables.pinnedKeys.join(',') : '';

  useLayoutEffect(() => {
    if (isCollapsed) return;
    const node = expandedMeasureRef.current;
    if (!node) return;
    const measure = () => {
      const next = Math.ceil(node.offsetWidth);
      if (next > 0) setExpandedWidth((prev) => (prev === next ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [isCollapsed, variants.length, activeScenarioLabel, pinnedSignature, canPeekBaseline]);

  const closePopovers = useCallback(() => setActivePopover(null), []);
  const togglePopover = useCallback((target: Exclude<ActivePopover, null>) => {
    setActivePopover((previous) => (previous === target ? null : target));
  }, []);

  const collapseBar = useCallback(() => {
    setActivePopover(null);
    setIsCollapsed(true);
  }, []);

  useEffect(() => {
    writeLabStoredState(labId, { collapsed: isCollapsed });
  }, [isCollapsed, labId]);

  useEffect(() => {
    writeLabStoredState(labId, { surface });
  }, [labId, surface]);

  useEffect(() => {
    if (!activePopover) return;
    const handleOutsidePointer = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setActivePopover(null);
    };
    document.addEventListener('mousedown', handleOutsidePointer);
    return () => document.removeEventListener('mousedown', handleOutsidePointer);
  }, [activePopover]);

  useEffect(() => {
    if (!topLayer) return;
    const element = containerRef.current as (HTMLDivElement & { showPopover?: () => void }) | null;
    if (!element || typeof element.showPopover !== 'function') return;
    try {
      element.showPopover();
    } catch {
      // Already open or Popover API unsupported.
    }
  }, [topLayer]);

  // LIFO Escape order: open popover closes first; otherwise Escape collapses the expanded bar.
  useEscapeKey(collapseBar, !isCollapsed);
  useEscapeKey(closePopovers, activePopover !== null);

  if (!import.meta.env.DEV && !forceRender) return null;
  if (typeof document === 'undefined') return null;

  const rootStyle: CSSProperties = {
    left: position.x,
    top: position.y,
    height: 44,
    margin: 0,
    overflow: isMorphing && !activePopover ? 'hidden' : 'visible',
    willChange: isDragging ? 'transform' : undefined,
    ...(topLayer ? { right: 'auto', bottom: 'auto' } : {}),
  };

  const innerContent = isCollapsed ? (
    <LabCollapsedPill
      label={collapsedLabel}
      activeIndex={activeIndex}
      variantCount={variants.length}
      surface={surface}
      barTop={position.y}
      reducedMotion={reducedMotion}
      onClick={() => setIsCollapsed(false)}
      onKeyDown={handleKeyDown}
    />
  ) : (
    <DesignLabExpandedControls
      title={title}
      variants={variants}
      activeVariant={activeVariant}
      onVariantChange={onVariantChange}
      eliminatedIds={eliminatedIds}
      onToggleEliminate={toggleEliminate}
      canPeekBaseline={canPeekBaseline}
      isPeekingBaseline={isPeekingBaseline}
      baselineLabel={baselineObj?.shortLabel || baselineObj?.label}
      onStartPeekBaseline={startPeekBaseline}
      onStopPeekBaseline={stopPeekBaseline}
      variables={variables}
      scenarios={scenarios}
      activeScenario={activeScenario}
      activeScenarioLabel={activeScenarioLabel}
      surface={surface}
      reducedMotion={reducedMotion}
      isNotesOpen={activePopover === 'notes'}
      isVariablesOpen={activePopover === 'variables'}
      isScenarioMenuOpen={activePopover === 'scenario'}
      isSettingsOpen={activePopover === 'settings'}
      copiedDecision={copiedDecision}
      onToggleNotes={() => togglePopover('notes')}
      onToggleVariables={() => togglePopover('variables')}
      onToggleScenarioMenu={() => togglePopover('scenario')}
      onToggleSettings={() => togglePopover('settings')}
      onSelectScenario={(scenario) => {
        onScenarioChange?.(scenario);
        setActivePopover(null);
      }}
      onCopyDecision={handleCopyDecision}
      onSurfaceChange={setSurface}
      onCollapse={collapseBar}
      barTop={position.y}
      barLeft={position.x}
    />
  );

  const bodyClass = `flex h-full items-center whitespace-nowrap ${isCollapsed ? '' : 'w-max gap-1.5 px-1.5'}`;
  const contentAnim = getLabBarContentMotion(isCollapsed);

  const animatedBody = instantMotion ? (
    <div ref={isCollapsed ? undefined : expandedMeasureRef} className={bodyClass}>
      {innerContent}
    </div>
  ) : (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={isCollapsed ? 'collapsed' : 'expanded'}
        ref={isCollapsed ? undefined : expandedMeasureRef}
        initial={contentAnim.initial}
        animate={contentAnim.animate}
        exit={contentAnim.exit}
        className={bodyClass}
      >
        {innerContent}
      </motion.div>
    </AnimatePresence>
  );

  const liveAnnouncement = statusAnnouncement || announcement;

  const toolbar = (
    <motion.div
      ref={containerRef}
      role="toolbar"
      aria-label={`${title} design lab`}
      aria-orientation="horizontal"
      data-testid="design-lab-bar"
      data-surface={surface}
      data-dragging={isDragging ? 'true' : undefined}
      {...(topLayer ? ({ popover: 'manual' } as Record<string, string>) : {})}
      initial={false}
      animate={{ width: isCollapsed ? 44 : (expandedWidth ?? 'auto'), borderRadius: 22 }}
      transition={instantMotion ? { duration: 0 } : { duration: 0.44, ease: MOTION_EASE.command }}
      onAnimationStart={() => { if (!instantMotion) setIsMorphing(true); }}
      onAnimationComplete={() => { if (!instantMotion) setIsMorphing(false); }}
      className={`fixed z-[9990] flex items-center justify-center rounded-full font-sans select-none touch-none ${
        isDragging ? `cursor-grabbing ${LAB_SURFACE_DRAG_LIFT[surface]}` : 'cursor-grab'
      } ${LAB_SURFACE_TRANSITION} ${LAB_SURFACE_ROOT[surface]}`}
      style={rootStyle}
      onPointerDown={(event) => {
        event.stopPropagation();
        handlePointerDown(event);
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onClickCapture={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClickRef.current = false;
        }
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <LabTooltipProvider suppressed={isDragging || activePopover !== null}>
        {animatedBody}
      </LabTooltipProvider>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </span>
    </motion.div>
  );

  return createPortal(toolbar, document.body);
}

export default DesignLabBar;
