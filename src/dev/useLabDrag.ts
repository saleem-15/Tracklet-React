import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DRAG_THRESHOLD_PX,
  KEYBOARD_MOVE_STEP_PX,
  clampLabPosition,
  getDefaultLabPosition,
  getMovementAnnouncement,
  readLabBarMetrics,
  readLabStoredState,
  snapLabPosition,
  writeLabStoredState,
  type DesignLabPosition,
} from './designLabUtils';

export interface UseLabDragOptions {
  labId: string;
  title: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  initialPos?: DesignLabPosition;
  /** Layout-affecting values (e.g. collapsed state) that trigger re-clamping & centering. */
  deps?: unknown[];
}

export interface UseLabDragResult {
  position: DesignLabPosition;
  isDragging: boolean;
  announcement: string;
  suppressClickRef: React.RefObject<boolean>;
  handlePointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  resetPosition: () => void;
}

const FALLBACK_POSITION: DesignLabPosition = { x: 12, y: 12 };

interface PointerStart {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

/**
 * Pointer + keyboard positioning for the floating lab bar: 4px drag threshold,
 * deferred pointer capture (so child button clicks are never hijacked),
 * zero-re-render GPU transforms during drag, and center-anchored collapse/expand.
 */
export function useLabDrag({
  labId,
  title,
  containerRef,
  initialPos,
  deps = [],
}: UseLabDragOptions): UseLabDragResult {
  const [storedState] = useState(() => readLabStoredState(labId));
  const [position, setPosition] = useState<DesignLabPosition | null>(
    () => storedState.pos ?? initialPos ?? null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const suppressClickRef = useRef(false);
  const pointerStartRef = useRef<PointerStart | null>(null);
  const isDraggingRef = useRef(false);
  const dragDeltaRef = useRef({ dx: 0, dy: 0 });
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const lastWidthRef = useRef(0);
  const anchorCenterXRef = useRef<number | null>(null);
  const anchorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMountRef = useRef(false);

  const measure = useCallback(() => readLabBarMetrics(containerRef.current), [containerRef]);

  const computeDefaultPosition = useCallback(() => {
    const m = measure();
    return getDefaultLabPosition(m.width, m.height, m.viewportWidth, m.viewportHeight);
  }, [measure]);

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    announcementTimerRef.current = setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  useEffect(() => () => {
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current);
    cleanupListenersRef.current?.();
  }, []);

  const reclamp = useCallback(() => {
    const m = measure();
    lastWidthRef.current = m.width;
    const anchorCenterX = anchorCenterXRef.current;

    setPosition((prev) => {
      const current = prev ?? getDefaultLabPosition(m.width, m.height, m.viewportWidth, m.viewportHeight);
      const targetX =
        anchorCenterX !== null && m.width > 0 ? anchorCenterX - m.width / 2 : current.x;
      const clamped = clampLabPosition(
        targetX, current.y, m.width, m.height, m.viewportWidth, m.viewportHeight
      );
      return clamped.x === current.x && clamped.y === current.y ? prev ?? clamped : clamped;
    });
  }, [measure]);

  useLayoutEffect(() => {
    const { width } = measure();
    if (didMountRef.current) {
      const knownWidth = width > 0 ? width : lastWidthRef.current;
      if (knownWidth > 0 && position) {
        anchorCenterXRef.current = position.x + knownWidth / 2;
        if (anchorTimerRef.current) clearTimeout(anchorTimerRef.current);
        anchorTimerRef.current = setTimeout(() => {
          anchorCenterXRef.current = null;
        }, 500);
      }
    } else {
      didMountRef.current = true;
      lastWidthRef.current = width;
    }
    reclamp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reclamp, labId, ...deps]);

  useEffect(() => {
    const handleResize = () => reclamp();
    window.addEventListener('resize', handleResize);
    let observer: ResizeObserver | null = null;
    const element = containerRef.current;
    if (typeof ResizeObserver !== 'undefined' && element) {
      observer = new ResizeObserver(() => reclamp());
      observer.observe(element);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [containerRef, reclamp]);

  const commitPosition = useCallback(
    (next: DesignLabPosition, message?: string) => {
      setPosition(next);
      writeLabStoredState(labId, { pos: next });
      if (message) announce(message);
    },
    [announce, labId]
  );

  const resetPosition = useCallback(() => {
    commitPosition(computeDefaultPosition(), `${title} reset to default position`);
  }, [commitPosition, computeDefaultPosition, title]);

  const finishDrag = useCallback(
    (commit: boolean) => {
      cleanupListenersRef.current?.();
      cleanupListenersRef.current = null;

      const start = pointerStartRef.current;
      if (!start) return;
      pointerStartRef.current = null;

      const element = containerRef.current;
      if (element?.hasPointerCapture?.(start.pointerId)) {
        try {
          element.releasePointerCapture(start.pointerId);
        } catch {
          // Capture already released.
        }
      }

      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;
      if (wasDragging) setIsDragging(false);
      if (element) element.style.transform = '';

      const { dx, dy } = dragDeltaRef.current;
      dragDeltaRef.current = { dx: 0, dy: 0 };
      if (!wasDragging) {
        suppressClickRef.current = false;
        return;
      }

      setTimeout(() => { suppressClickRef.current = false; }, 0);
      if (!commit) return;
      const m = measure();
      commitPosition(
        snapLabPosition(start.originX + dx, start.originY + dy, m.width, m.height, m.viewportWidth, m.viewportHeight)
      );
    },
    [commitPosition, containerRef, measure]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if ((event.target as HTMLElement | null)?.closest('[data-lab-popover]')) return;

      anchorCenterXRef.current = null;
      cleanupListenersRef.current?.();

      const origin = position ?? computeDefaultPosition();
      const start: PointerStart = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: origin.x,
        originY: origin.y,
      };
      pointerStartRef.current = start;
      dragDeltaRef.current = { dx: 0, dy: 0 };

      const onMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== start.pointerId) return;
        const rawDx = moveEvent.clientX - start.startX;
        const rawDy = moveEvent.clientY - start.startY;

        if (!isDraggingRef.current) {
          if (Math.abs(rawDx) < DRAG_THRESHOLD_PX && Math.abs(rawDy) < DRAG_THRESHOLD_PX) return;
          isDraggingRef.current = true;
          suppressClickRef.current = true;
          setIsDragging(true);
          // Defer pointer capture until a real drag begins so normal clicks on child buttons work natively.
          const el = containerRef.current;
          if (el && typeof el.setPointerCapture === 'function') {
            try {
              el.setPointerCapture(start.pointerId);
            } catch {
              // Window listeners remain active as fallback.
            }
          }
        }

        const m = measure();
        const clamped = clampLabPosition(
          start.originX + rawDx, start.originY + rawDy, m.width, m.height, m.viewportWidth, m.viewportHeight
        );
        const delta = { dx: clamped.x - start.originX, dy: clamped.y - start.originY };
        dragDeltaRef.current = delta;

        const el = containerRef.current;
        if (el) el.style.transform = `translate3d(${delta.dx}px, ${delta.dy}px, 0)`;
      };

      const onUp = (upEvent: PointerEvent) => { if (upEvent.pointerId === start.pointerId) finishDrag(true); };
      const onCancel = (cancelEvent: PointerEvent) => { if (cancelEvent.pointerId === start.pointerId) finishDrag(false); };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      cleanupListenersRef.current = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
      };
    },
    [computeDefaultPosition, containerRef, finishDrag, measure, position]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Home') {
        event.preventDefault();
        resetPosition();
        return;
      }

      let dx = 0;
      let dy = 0;
      if (event.key === 'ArrowUp') dy = -KEYBOARD_MOVE_STEP_PX;
      else if (event.key === 'ArrowDown') dy = KEYBOARD_MOVE_STEP_PX;
      else if (event.key === 'ArrowLeft') dx = -KEYBOARD_MOVE_STEP_PX;
      else if (event.key === 'ArrowRight') dx = KEYBOARD_MOVE_STEP_PX;
      else return;

      event.preventDefault();
      const current = position ?? computeDefaultPosition();
      const m = measure();
      commitPosition(
        clampLabPosition(current.x + dx, current.y + dy, m.width, m.height, m.viewportWidth, m.viewportHeight),
        getMovementAnnouncement(dx, dy, title)
      );
    },
    [commitPosition, computeDefaultPosition, measure, position, resetPosition, title]
  );

  return {
    position: position ?? initialPos ?? FALLBACK_POSITION,
    isDragging,
    announcement,
    suppressClickRef,
    handlePointerDown,
    handleKeyDown,
    resetPosition,
  };
}
