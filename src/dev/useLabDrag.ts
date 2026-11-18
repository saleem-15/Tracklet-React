import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DRAG_THRESHOLD_PX,
  KEYBOARD_MOVE_STEP_PX,
  clampLabPosition,
  getDefaultLabPosition,
  getMovementAnnouncement,
  readLabStoredState,
  writeLabStoredState,
  type DesignLabPosition,
} from './designLabUtils';

export interface UseLabDragOptions {
  labId: string;
  title: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  initialPos?: DesignLabPosition;
  /** Layout-affecting values (e.g. collapsed state) that should trigger a re-clamp. */
  deps?: unknown[];
}

export interface UseLabDragResult {
  position: DesignLabPosition;
  dragDelta: { dx: number; dy: number };
  isDragging: boolean;
  announcement: string;
  suppressClickRef: React.RefObject<boolean>;
  handlePointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  handlePointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  handleLostPointerCapture: (event: React.PointerEvent<HTMLElement>) => void;
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
 * GPU transform during drag, clamped commits, and polite announcements.
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
  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const suppressClickRef = useRef(false);
  const pointerStartRef = useRef<PointerStart | null>(null);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragDeltaRef = useRef({ dx: 0, dy: 0 });
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measure = useCallback(() => {
    const element = containerRef.current;
    const rect = element?.getBoundingClientRect?.();
    return {
      width: rect?.width || element?.offsetWidth || 0,
      height: rect?.height || element?.offsetHeight || 0,
      viewportWidth: typeof window === 'undefined' ? 0 : window.innerWidth,
      viewportHeight: typeof window === 'undefined' ? 0 : window.innerHeight,
    };
  }, [containerRef]);

  const computeDefaultPosition = useCallback(() => {
    const { width, height, viewportWidth, viewportHeight } = measure();
    return getDefaultLabPosition(width, height, viewportWidth, viewportHeight);
  }, [measure]);

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    announcementTimerRef.current = setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  useEffect(
    () => () => {
      if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    },
    []
  );

  const reclamp = useCallback(() => {
    const { width, height, viewportWidth, viewportHeight } = measure();
    setPosition((previous) => {
      const current = previous ?? getDefaultLabPosition(width, height, viewportWidth, viewportHeight);
      const clamped = clampLabPosition(current.x, current.y, width, height, viewportWidth, viewportHeight);
      return clamped.x === current.x && clamped.y === current.y ? previous ?? clamped : clamped;
    });
  }, [measure]);

  // Position once before paint, then re-clamp whenever layout-affecting props change.
  useLayoutEffect(() => {
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

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;

      const origin = position ?? computeDefaultPosition();
      pointerStartRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: origin.x,
        originY: origin.y,
      };
      dragDeltaRef.current = { dx: 0, dy: 0 };
      captureTargetRef.current = event.currentTarget;

      const target = event.currentTarget;
      if (typeof target.setPointerCapture === 'function') {
        try {
          target.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture unsupported (Happy-DOM): document-level fallback still works.
        }
      }
    },
    [computeDefaultPosition, position]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const start = pointerStartRef.current;
      if (!start) return;

      const rawDx = event.clientX - start.startX;
      const rawDy = event.clientY - start.startY;

      if (!isDraggingRef.current) {
        if (Math.abs(rawDx) < DRAG_THRESHOLD_PX && Math.abs(rawDy) < DRAG_THRESHOLD_PX) return;
        isDraggingRef.current = true;
        suppressClickRef.current = true;
        setIsDragging(true);
      }

      const m = measure();
      const clamped = clampLabPosition(
        start.originX + rawDx,
        start.originY + rawDy,
        m.width,
        m.height,
        m.viewportWidth,
        m.viewportHeight
      );
      const delta = { dx: clamped.x - start.originX, dy: clamped.y - start.originY };
      dragDeltaRef.current = delta;
      setDragDelta(delta);
    },
    [measure]
  );

  const finishDrag = useCallback(
    (commit: boolean) => {
      const start = pointerStartRef.current;
      if (!start) return;

      pointerStartRef.current = null;
      const captureTarget = captureTargetRef.current;
      captureTargetRef.current = null;

      if (captureTarget && typeof captureTarget.releasePointerCapture === 'function') {
        try {
          captureTarget.releasePointerCapture(start.pointerId);
        } catch {
          // Capture may already be gone after pointercancel / lostpointercapture.
        }
      }

      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragDelta({ dx: 0, dy: 0 });

      const { dx, dy } = dragDeltaRef.current;
      dragDeltaRef.current = { dx: 0, dy: 0 };

      if (!wasDragging) return;

      // A trailing click fires right after pointerup; clear the suppression on the next tick.
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);

      if (!commit) return;

      const m = measure();
      commitPosition(
        clampLabPosition(start.originX + dx, start.originY + dy, m.width, m.height, m.viewportWidth, m.viewportHeight)
      );
    },
    [commitPosition, measure]
  );

  const handlePointerUp = useCallback(() => finishDrag(true), [finishDrag]);
  const handlePointerCancel = useCallback(() => finishDrag(false), [finishDrag]);
  const handleLostPointerCapture = useCallback(() => finishDrag(true), [finishDrag]);

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
  };
}
