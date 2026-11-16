import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup, useMotionValue, useReducedMotion, animate } from 'motion/react';
import { Application, ApplicationStatus } from '../types';
import { EmptyState } from './EmptyState';
import { OnboardingEmptyState } from './OnboardingEmptyState';
import { MetricRoller } from './MetricRoller';
import { PipelineCard, PipelineCardShell } from './pipeline/PipelineCard';
import { PipelineScrollRail } from './pipeline/PipelineScrollRail';
import { ArrowRight } from 'lucide-react';
import { LIFT_SPRING, FLOW_SPRING, DROP_EASE, DROP_DURATION_SEC } from '../lib/motion';

export interface ActiveQuotaInfo {
  current: number;
  max: number;
  isGrandfathered?: boolean;
  onUpgradeClick?: () => void;
}

export interface ActivePipelineBoardProps {
  activeQuota?: ActiveQuotaInfo;
  applications: Application[];
  totalAppCount?: number;
  onOpenAddModal?: () => void;
  onResetFilters?: () => void;
  onSeedDemoData?: () => void;
  onSelectApp: (app: Application) => void;
  selectedAppId: string | null;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus, newOrder?: number) => void;
  onDeleteApp?: (id: string) => void;
}

const PIPELINE_COLUMNS: { status: ApplicationStatus; title: string; dot: string; tagBg: string }[] = [
  { status: 'Saved', title: 'Saved', dot: 'bg-purple-500', tagBg: 'text-purple-700 bg-purple-50' },
  { status: 'Applied', title: 'Applied', dot: 'bg-slate-500', tagBg: 'text-slate-600 bg-slate-100' },
  { status: 'Screening', title: 'Screening', dot: 'bg-amber-500', tagBg: 'text-amber-700 bg-amber-50' },
  { status: 'Interview', title: 'Interview', dot: 'bg-blue-500', tagBg: 'text-blue-700 bg-blue-50' },
  { status: 'Offer', title: 'Offer', dot: 'bg-emerald-500', tagBg: 'text-emerald-700 bg-emerald-50' },
];

const GAP = 10;

/**
 * Calculates a fractional order value for dropping a card into a column at slotIndex.
 * Standard base gap is 10,000 to allow dozens of midpoint splits without precision degradation.
 */
export function calculateNewOrder(
  slotIndex: number,
  destinationCards: Application[]
): number {
  const BASE_GAP = 10000;

  if (destinationCards.length === 0) {
    return BASE_GAP;
  }

  // Normalize ranks to a strictly increasing sequence
  const ranks: number[] = [];
  let lastRank = -Infinity;
  for (let i = 0; i < destinationCards.length; i++) {
    const explicit = destinationCards[i].order;
    let rank: number;
    if (typeof explicit === 'number' && explicit > lastRank) {
      rank = explicit;
    } else if (lastRank === -Infinity) {
      rank = typeof explicit === 'number' ? explicit : BASE_GAP;
    } else {
      rank = lastRank + BASE_GAP;
    }
    ranks.push(rank);
    lastRank = rank;
  }

  // Dropped at the very top (index 0)
  if (slotIndex <= 0) {
    return ranks[0] - BASE_GAP;
  }

  // Dropped at the very bottom
  if (slotIndex >= ranks.length) {
    return ranks[ranks.length - 1] + BASE_GAP;
  }

  // Dropped between two cards
  const prevOrder = ranks[slotIndex - 1];
  const nextOrder = ranks[slotIndex];

  return (prevOrder + nextOrder) / 2;
}

type DragState = {
  taskId: string;
  fromCol: ApplicationStatus;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

type Slot = {
  col: ApplicationStatus;
  index: number;
};

export const ActivePipelineBoard: React.FC<ActivePipelineBoardProps> = ({
  applications,
  totalAppCount = 0,
  onOpenAddModal,
  onResetFilters,
  onSeedDemoData,
  onSelectApp,
  selectedAppId,
  onUpdateStatus,
  onDeleteApp,
  activeQuota,
}) => {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [activeMenuAppId, setActiveMenuAppId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef(new Map<ApplicationStatus, HTMLDivElement>());
  const listRefs = useRef(new Map<ApplicationStatus, HTMLDivElement>());
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const dragRef = useRef<DragState | null>(null);
  const slotRef = useRef<Slot | null>(null);
  const isDroppingRef = useRef(false);
  const dropAnimControlsRef = useRef<{ stop: () => void } | null>(null);
  const snapRef = useRef(new Map<ApplicationStatus, number[]>());
  const originSlotRef = useRef<{ col: ApplicationStatus; index: number } | null>(null);
  const dragOccurredRef = useRef(false);
  const pendingDragRef = useRef<{
    startX: number;
    startY: number;
    app: Application;
    colStatus: ApplicationStatus;
    index: number;
    rect: DOMRect;
  } | null>(null);

  const autoScroll = useRef(0);
  const rafRef = useRef<number | null>(null);
  const applicationsRef = useRef(applications);
  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  useEffect(() => {
    return () => {
      dropAnimControlsRef.current?.stop();
    };
  }, []);

  // Horizontal edge fade detection
  const syncEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    syncEdges();
    const el = trackRef.current;
    if (!el) return;
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(syncEdges);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [syncEdges, applications.length]);

  const fade = '24px';
  const maskStops = [
    `transparent 0%, #000 ${atStart ? '0%' : fade}`,
    `#000 ${atEnd ? '100%' : `calc(100% - ${fade})`}, transparent 100%`,
  ].join(', ');
  const mask = atStart && atEnd ? undefined : `linear-gradient(to right, ${maskStops})`;

  // Re-focus grabbed card if stage changes through keyboard navigation
  useEffect(() => {
    if (!grabbed) return;
    const el = cardRefs.current.get(grabbed);
    if (el && document.activeElement !== el) {
      el.focus({ preventScroll: true });
    }
  }, [applications, grabbed]);

  // Snapshot card midpoints for frictionless coordinate calculation
  const snapshot = useCallback((taskId: string, fromCol: ApplicationStatus) => {
    const map = new Map<ApplicationStatus, number[]>();
    listRefs.current.forEach((list, colStatus) => {
      if (!list) return;
      const listTop = list.getBoundingClientRect().top;
      const cards = Array.from(list.querySelectorAll<HTMLElement>('[data-kanban-card]'));
      let removed = -1;
      let removedH = 0;
      const rows = cards.map((el, i) => {
        const r = el.getBoundingClientRect();
        const isDragged = colStatus === fromCol && el.dataset.kanbanCard === taskId;
        if (isDragged) {
          removed = i;
          removedH = r.height;
        }
        return { top: r.top - listTop, h: r.height, isDragged };
      });
      const mids = rows
        .filter((row) => !row.isDragged)
        .map((row, i) => {
          const shift = removed > -1 && i >= removed ? removedH + GAP : 0;
          return row.top - shift + row.h / 2;
        });
      map.set(colStatus, mids);
    });
    snapRef.current = map;
  }, []);

  // Determine which column and slot the pointer is currently hovering over
  const slotAt = useCallback((clientX: number, clientY: number): Slot | null => {
    const d = dragRef.current;
    if (!d) return null;

    let inside: ApplicationStatus | null = null;
    let nearestStatus: ApplicationStatus = 'Saved';
    let nearest = Infinity;

    colRefs.current.forEach((el, status) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) inside = status;
      const dx = Math.abs(clientX - (r.left + r.width / 2));
      if (dx < nearest) {
        nearest = dx;
        nearestStatus = status;
      }
    });

    const colId = inside || nearestStatus;
    const list = listRefs.current.get(colId);
    if (!list) return { col: colId, index: 0 };

    const listTop = list.getBoundingClientRect().top;
    const mids = snapRef.current.get(colId) ?? [];

    let index = mids.length;
    for (let i = 0; i < mids.length; i++) {
      if (clientY < listTop + mids[i]) {
        index = i;
        break;
      }
    }
    return { col: colId, index };
  }, []);

  const startAutoScroll = useCallback(() => {
    if (rafRef.current) return;
    const tick = () => {
      if (autoScroll.current && trackRef.current) {
        trackRef.current.scrollLeft += autoScroll.current;
      }
      if (dragRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    autoScroll.current = 0;
  }, []);

  const cancelPointerDrag = useCallback(() => {
    if (isDroppingRef.current) return;
    const d = dragRef.current;
    if (!d) return;

    stopAutoScroll();
    pendingDragRef.current = null;

    const originEl = cardRefs.current.get(d.taskId);
    const originRect = originEl?.getBoundingClientRect();

    if (reduceMotion || !originRect || (originRect.width === 0 && originRect.height === 0)) {
      dragRef.current = null;
      slotRef.current = null;
      setDrag(null);
      setSlot(null);
      return;
    }

    setIsDropping(true);
    isDroppingRef.current = true;

    let doneCount = 0;
    const finish = () => {
      doneCount++;
      if (doneCount >= 2) {
        dragRef.current = null;
        slotRef.current = null;
        isDroppingRef.current = false;
        setIsDropping(false);
        setDrag(null);
        setSlot(null);
      }
    };

    try {
      const ctrlX = animate(x, originRect.left, {
        duration: DROP_DURATION_SEC,
        ease: DROP_EASE,
        onComplete: finish,
      });
      const ctrlY = animate(y, originRect.top, {
        duration: DROP_DURATION_SEC,
        ease: DROP_EASE,
        onComplete: finish,
      });
      dropAnimControlsRef.current = {
        stop: () => {
          ctrlX.stop();
          ctrlY.stop();
        },
      };
    } catch {
      dragRef.current = null;
      slotRef.current = null;
      isDroppingRef.current = false;
      setIsDropping(false);
      setDrag(null);
      setSlot(null);
    }
  }, [reduceMotion, stopAutoScroll, x, y]);

  const endDrag = useCallback(() => {
    if (isDroppingRef.current) return;
    const d = dragRef.current;
    const s = slotRef.current;
    if (!d || !s) {
      dragRef.current = null;
      slotRef.current = null;
      pendingDragRef.current = null;
      stopAutoScroll();
      setDrag(null);
      setSlot(null);
      return;
    }

    const destApps = applicationsRef.current
      .filter((app) => app.status === s.col && app.id !== d.taskId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const newOrder = calculateNewOrder(s.index, destApps);

    stopAutoScroll();
    pendingDragRef.current = null;

    // Find the placeholder DOM node to measure destination rect
    const placeholderEl = document.querySelector('[data-kanban-placeholder]') as HTMLElement | null;
    const targetRect = placeholderEl?.getBoundingClientRect();

    const hasValidTarget = targetRect && targetRect.width > 0 && targetRect.height > 0;

    if (reduceMotion || !hasValidTarget) {
      // In reduced motion or headless test environments, commit immediately
      onUpdateStatus(d.taskId, s.col, newOrder);
      dragRef.current = null;
      slotRef.current = null;
      setDrag(null);
      setSlot(null);
      return;
    }

    // Begin @dnd-kit style drop flight animation
    setIsDropping(true);
    isDroppingRef.current = true;

    let doneCount = 0;
    const finish = () => {
      doneCount++;
      if (doneCount >= 2) {
        onUpdateStatus(d.taskId, s.col, newOrder);
        dragRef.current = null;
        slotRef.current = null;
        isDroppingRef.current = false;
        setIsDropping(false);
        setDrag(null);
        setSlot(null);
      }
    };

    try {
      const ctrlX = animate(x, targetRect.left, {
        duration: DROP_DURATION_SEC,
        ease: DROP_EASE,
        onComplete: finish,
      });
      const ctrlY = animate(y, targetRect.top, {
        duration: DROP_DURATION_SEC,
        ease: DROP_EASE,
        onComplete: finish,
      });
      dropAnimControlsRef.current = {
        stop: () => {
          ctrlX.stop();
          ctrlY.stop();
        },
      };
    } catch {
      // Fallback
      onUpdateStatus(d.taskId, s.col, newOrder);
      dragRef.current = null;
      slotRef.current = null;
      isDroppingRef.current = false;
      setIsDropping(false);
      setDrag(null);
      setSlot(null);
    }
  }, [onUpdateStatus, reduceMotion, stopAutoScroll, x, y]);

  // Pointer drag event handlers
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (isDroppingRef.current) return;
      const pending = pendingDragRef.current;
      if (pending && !dragRef.current) {
        const dist = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
        if (dist > 4) {
          dragOccurredRef.current = true;
          const state: DragState = {
            taskId: pending.app.id,
            fromCol: pending.colStatus,
            width: pending.rect.width,
            height: pending.rect.height,
            offsetX: pending.startX - pending.rect.left,
            offsetY: pending.startY - pending.rect.top,
          };
          x.set(e.clientX - state.offsetX);
          y.set(e.clientY - state.offsetY);
          snapshot(pending.app.id, pending.colStatus);
          dragRef.current = state;
          slotRef.current = { col: pending.colStatus, index: pending.index };
          setDrag(state);
          setSlot({ col: pending.colStatus, index: pending.index });
          setGrabbed(null);
          setActiveMenuAppId(null);
          startAutoScroll();
        }
      }

      const d = dragRef.current;
      if (!d) return;

      x.set(e.clientX - d.offsetX);
      y.set(e.clientY - d.offsetY);

      const next = slotAt(e.clientX, e.clientY);
      const cur = slotRef.current;
      if (next && (!cur || cur.col !== next.col || cur.index !== next.index)) {
        slotRef.current = next;
        setSlot(next);
      }

      // Edge track nudge during drag
      const track = trackRef.current;
      if (track) {
        const r = track.getBoundingClientRect();
        const edge = 72;
        autoScroll.current =
          e.clientX < r.left + edge ? -14 : e.clientX > r.right - edge ? 14 : 0;
      }
    };

    const onUp = () => {
      if (isDroppingRef.current) return;
      if (dragRef.current) {
        endDrag();
      } else {
        pendingDragRef.current = null;
        stopAutoScroll();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current && !isDroppingRef.current) {
        e.preventDefault();
        cancelPointerDrag();
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKeyDown);
      stopAutoScroll();
    };
  }, [cancelPointerDrag, endDrag, slotAt, snapshot, startAutoScroll, stopAutoScroll, x, y]);

  const handlePointerDownCard = (
    e: React.PointerEvent<HTMLDivElement>,
    app: Application,
    colStatus: ApplicationStatus,
    index: number
  ) => {
    if (isDroppingRef.current) return;
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, a')) return;
    dragOccurredRef.current = false;
    const el = e.currentTarget;
    pendingDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      app,
      colStatus,
      index,
      rect: el.getBoundingClientRect(),
    };
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, app: Application) => {
    if (e.target !== e.currentTarget) {
      return;
    }
    const isGrabbed = grabbed === app.id;

    if (e.key === ' ') {
      e.preventDefault();
      if (isGrabbed) {
        setGrabbed(null);
        setAnnouncement(`Dropped ${app.company} ${app.role} in ${app.status}.`);
      } else {
        originSlotRef.current = { col: app.status, index: 0 };
        setGrabbed(app.id);
        setAnnouncement(
          `Picked up ${app.company} ${app.role}. Use arrow keys to move between stages, Space to drop, Escape to cancel.`
        );
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isGrabbed) {
        setGrabbed(null);
        setAnnouncement(`Dropped ${app.company} ${app.role} in ${app.status}.`);
      } else {
        onSelectApp(app);
      }
      return;
    }

    if (e.key === 'Escape' && isGrabbed) {
      e.preventDefault();
      if (originSlotRef.current && originSlotRef.current.col !== app.status) {
        onUpdateStatus(app.id, originSlotRef.current.col);
      }
      setGrabbed(null);
      setAnnouncement(`Cancelled. ${app.company} ${app.role} restored to ${originSlotRef.current?.col ?? app.status}.`);
      return;
    }

    if (!isGrabbed) return;

    const currentColApps = applicationsRef.current
      .filter((c) => c.status === app.status)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const cardIdx = currentColApps.findIndex((c) => c.id === app.id);

    if (e.key === 'ArrowUp' && cardIdx > 0) {
      e.preventDefault();
      const targetSlot = cardIdx - 1;
      const otherApps = currentColApps.filter((c) => c.id !== app.id);
      const newOrder = calculateNewOrder(targetSlot, otherApps);
      onUpdateStatus(app.id, app.status, newOrder);
      setAnnouncement(`${app.company} moved up to position ${targetSlot + 1}.`);
      return;
    } else if (e.key === 'ArrowDown' && cardIdx < currentColApps.length - 1) {
      e.preventDefault();
      const targetSlot = cardIdx + 1;
      const otherApps = currentColApps.filter((c) => c.id !== app.id);
      const newOrder = calculateNewOrder(targetSlot, otherApps);
      onUpdateStatus(app.id, app.status, newOrder);
      setAnnouncement(`${app.company} moved down to position ${targetSlot + 1}.`);
      return;
    }

    const colIndex = PIPELINE_COLUMNS.findIndex((c) => c.status === app.status);

    if (e.key === 'ArrowRight' && colIndex < PIPELINE_COLUMNS.length - 1) {
      e.preventDefault();
      const nextCol = PIPELINE_COLUMNS[colIndex + 1];
      onUpdateStatus(app.id, nextCol.status);
      setAnnouncement(`${app.company} moved to ${nextCol.title}.`);
    } else if (e.key === 'ArrowLeft' && colIndex > 0) {
      e.preventDefault();
      const prevCol = PIPELINE_COLUMNS[colIndex - 1];
      onUpdateStatus(app.id, prevCol.status);
      setAnnouncement(`${app.company} moved to ${prevCol.title}.`);
    }
  };

  const scrollToColumn = (status: ApplicationStatus) => {
    const el = colRefs.current.get(status);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const draggedApp = useMemo(() => {
    return drag ? applications.find((a) => a.id === drag.taskId) ?? null : null;
  }, [applications, drag]);

  const draggedNextColumn = useMemo(() => {
    if (!draggedApp) return null;
    const colIndex = PIPELINE_COLUMNS.findIndex((c) => c.status === draggedApp.status);
    if (colIndex >= 0 && colIndex < PIPELINE_COLUMNS.length - 1) {
      return PIPELINE_COLUMNS[colIndex + 1];
    }
    return null;
  }, [draggedApp]);

  return (
    <div className="flex-1 bg-slate-50/60 flex flex-col h-full min-h-0 overflow-hidden relative">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile Stage Jump Tabs Bar */}
        <div className="md:hidden flex items-center gap-1.5 p-2 bg-slate-50/95 border-b border-slate-200/80 overflow-x-auto shrink-0 no-scrollbar select-none">
          {PIPELINE_COLUMNS.map((col) => {
            const count = applications.filter((app) => app.status === col.status).length;
            return (
              <button
                key={col.status}
                type="button"
                onClick={() => scrollToColumn(col.status)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs font-semibold text-xs whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[34px]"
              >
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span>{col.title}</span>
                <MetricRoller
                  value={count}
                  className="font-mono text-[11px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded-full tabular-nums"
                  valueClassName="text-slate-500"
                />
              </button>
            );
          })}
        </div>

        {/* Active Capacity Banner */}
        {activeQuota && (
          <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">Active Capacity:</span>
              <span className="font-mono font-bold text-slate-900">
                {activeQuota.current} / {activeQuota.max === Infinity ? '∞' : activeQuota.max}
              </span>
              {activeQuota.isGrandfathered && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Grandfathered Access
                </span>
              )}
            </div>
            {activeQuota.onUpgradeClick && activeQuota.current >= activeQuota.max && (
              <button
                type="button"
                onClick={activeQuota.onUpgradeClick}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                Upgrade to Pro →
              </button>
            )}
          </div>
        )}

        {/* Empty States */}
        {applications.length === 0 ? (
          <div className="flex-1 overflow-y-auto">
            {totalAppCount === 0 && onOpenAddModal && onSeedDemoData ? (
              <OnboardingEmptyState
                onOpenAddModal={onOpenAddModal}
                onSeedDemoData={onSeedDemoData}
                applicationsCount={totalAppCount ?? applications.length}
              />
            ) : (
              <EmptyState
                isFiltered={totalAppCount > 0}
                onAddApplication={onOpenAddModal}
                onResetFilters={onResetFilters}
              />
            )}
          </div>
        ) : (
          <>
            {/* Kanban Columns Track with Edge Fade Masks */}
            <div
              ref={trackRef}
              onScroll={syncEdges}
              style={mask ? ({ maskImage: mask, WebkitMaskImage: mask } as React.CSSProperties) : undefined}
              className="flex-1 min-h-0 min-w-0 w-full overflow-x-auto md:overflow-y-auto snap-x snap-mandatory md:snap-none scroll-smooth p-3 md:p-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex md:grid md:grid-cols-5 min-h-full gap-3 md:gap-3 md:min-w-[900px]">
              <LayoutGroup>
                {PIPELINE_COLUMNS.map((col, index) => {
                  const columnApps = applications
                    .filter((app) => app.status === col.status)
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                  const isTargeting = slot?.col === col.status && (!!drag || isDropping);
                  const prevColumn = index > 0 ? PIPELINE_COLUMNS[index - 1] : null;
                  const nextColumn = index < PIPELINE_COLUMNS.length - 1 ? PIPELINE_COLUMNS[index + 1] : null;

                  const filteredApps = columnApps.filter((t) => t.id !== drag?.taskId);

                  return (
                    <div
                      key={col.status}
                      data-pipeline-column={col.status}
                      ref={(el) => {
                        if (el) colRefs.current.set(col.status, el);
                        else colRefs.current.delete(col.status);
                      }}
                      className={`w-[85vw] sm:w-[320px] md:w-auto shrink-0 snap-center md:shrink md:snap-align-none rounded-2xl p-2 flex flex-col space-y-2 transition-colors duration-150 min-h-[400px] ${
                        isTargeting ? 'bg-blue-50/40 ring-1 ring-blue-300/60 rounded-2xl' : ''
                      }`}
                    >
                      {/* Seamless Lane Header: Unboxed native header directly on column runway */}
                      <div className="px-1.5 pt-0.5 pb-1.5 flex items-center justify-between shrink-0 select-none">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${col.dot} shrink-0`} />
                          <span className="font-heading font-semibold text-slate-800 text-xs tracking-tight">
                            {col.title}
                          </span>
                          <MetricRoller
                            value={columnApps.length}
                            className="font-mono text-[11px] font-medium text-slate-400 tabular-nums"
                            valueClassName="text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Cards List Container */}
                      <div
                        ref={(el) => {
                          if (el) listRefs.current.set(col.status, el);
                          else listRefs.current.delete(col.status);
                        }}
                        className="flex flex-col gap-2.5 flex-1 min-h-[140px]"
                      >
                        {filteredApps.length === 0 && !isTargeting ? (
                          <div className="flex-1 min-h-[140px] flex items-center justify-center p-4 text-center select-none">
                            <span className="font-mono text-[11px] text-slate-400/80 tracking-tight">
                              No applications in {col.title.toLowerCase()}
                            </span>
                          </div>
                        ) : (
                          <>
                            {filteredApps.map((app, i) => {
                              return (
                                <React.Fragment key={app.id}>
                                  {isTargeting && slot?.index === i && (
                                    <motion.div
                                      layout
                                      data-kanban-placeholder
                                      initial={{ opacity: 0, scaleY: 0.7 }}
                                      animate={{ opacity: isDropping ? 0.35 : 1, scaleY: 1 }}
                                      exit={{ opacity: 0, scaleY: 0.7 }}
                                      transition={FLOW_SPRING}
                                      style={{ height: drag?.height || 88 }}
                                      className={`origin-top rounded-xl border-2 border-dashed flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 transition-colors duration-150 ${
                                        isDropping
                                          ? 'border-blue-300 bg-blue-50/30 text-blue-400'
                                          : 'border-blue-400 bg-blue-50/70 text-blue-700'
                                      }`}
                                    >
                                      <ArrowRight className="w-3.5 h-3.5" />
                                      <span>{isDropping ? 'Placing application...' : 'Drop application here'}</span>
                                    </motion.div>
                                  )}
                                  <PipelineCard
                                    app={app}
                                    colTitle={col.title}
                                    isSelected={selectedAppId === app.id}
                                    isGrabbed={grabbed === app.id}
                                    reduceMotion={Boolean(reduceMotion)}
                                    nextColumn={nextColumn}
                                    elRef={(el) => {
                                      if (el) cardRefs.current.set(app.id, el);
                                      else cardRefs.current.delete(app.id);
                                    }}
                                    onPointerDown={(e) => handlePointerDownCard(e, app, col.status, i)}
                                    onClick={() => {
                                      if (dragOccurredRef.current) {
                                        dragOccurredRef.current = false;
                                        return;
                                      }
                                      onSelectApp(app);
                                    }}
                                    onKeyDown={(e) => handleCardKeyDown(e, app)}
                                    onQuickAdvance={(e, nextStatus) => {
                                      e.stopPropagation();
                                      onUpdateStatus(app.id, nextStatus);
                                    }}
                                    onUpdateStatus={onUpdateStatus}
                                    onDeleteApp={onDeleteApp}
                                    isMenuOpen={activeMenuAppId === app.id}
                                    onToggleMenu={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuAppId((prev) => (prev === app.id ? null : app.id));
                                    }}
                                    onCloseMenu={() => setActiveMenuAppId(null)}
                                  />
                                </React.Fragment>
                              );
                            })}
                            {isTargeting && slot && slot.index >= filteredApps.length && (
                              <motion.div
                                layout
                                data-kanban-placeholder
                                initial={{ opacity: 0, scaleY: 0.7 }}
                                animate={{ opacity: isDropping ? 0.35 : 1, scaleY: 1 }}
                                exit={{ opacity: 0, scaleY: 0.7 }}
                                transition={FLOW_SPRING}
                                style={{ height: drag?.height || 88 }}
                                className={`origin-top rounded-xl border-2 border-dashed flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 transition-colors duration-150 ${
                                  isDropping
                                    ? 'border-blue-300 bg-blue-50/30 text-blue-400'
                                    : 'border-blue-400 bg-blue-50/70 text-blue-700'
                                }`}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>{isDropping ? 'Placing application...' : 'Drop application here'}</span>
                              </motion.div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </LayoutGroup>
              </div>
            </div>

            {/* Draggable Persistent Scroll Rail */}
            <PipelineScrollRail trackRef={trackRef} />
          </>
        )}

        {/* Floating Card Riding Cursor */}
        <AnimatePresence>
          {drag && draggedApp && (
            <motion.div
              style={{ x, y, width: drag.width }}
              initial={{ scale: 1, rotate: 0, opacity: 1 }}
              animate={{
                scale: 1,
                rotate: 0,
                opacity: 1,
              }}
              exit={{ scale: 1, rotate: 0, opacity: 0 }}
              transition={{
                duration: isDropping ? DROP_DURATION_SEC : 0.15,
                ease: DROP_EASE,
              }}
              className="pointer-events-none fixed left-0 top-0 z-50 origin-top-left"
            >
              <PipelineCardShell
                app={draggedApp}
                isFloating
                isDropping={isDropping}
                nextColumn={draggedNextColumn}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Screen Reader Announcement Live Region */}
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
    </div>
  );
};
