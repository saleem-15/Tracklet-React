import React, { useRef, useState, useEffect, useCallback } from 'react';

export interface PipelineScrollRailProps {
  trackRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * PipelineScrollRail
 *
 * Persistent, draggable horizontal scrollbar indicator that remains calm and
 * visible whenever pipeline columns horizontally exceed the viewport width.
 */
export const PipelineScrollRail: React.FC<PipelineScrollRailProps> = ({ trackRef }) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [geom, setGeom] = useState({ ratio: 1, offset: 0 });
  const [held, setHeld] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const ratio = el.clientWidth / (el.scrollWidth || 1);
    const max = el.scrollWidth - el.clientWidth;
    setGeom({ ratio, offset: max > 0 ? el.scrollLeft / max : 0 });
  }, [trackRef]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(sync);
      ro.observe(el);
      Array.from(el.children).forEach((c) => ro.observe(c));
      return () => {
        el.removeEventListener('scroll', sync);
        ro.disconnect();
      };
    }
    return () => {
      el.removeEventListener('scroll', sync);
    };
  }, [sync, trackRef]);

  const scrollTo = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      const el = trackRef.current;
      if (!rail || !el) return;
      const r = rail.getBoundingClientRect();
      const thumbW = r.width * geom.ratio;
      const p = (clientX - r.left - thumbW / 2) / (r.width - thumbW || 1);
      el.scrollLeft = Math.max(0, Math.min(1, p)) * (el.scrollWidth - el.clientWidth);
    },
    [geom.ratio, trackRef],
  );

  useEffect(() => {
    if (!held) return;
    const onMove = (e: PointerEvent) => scrollTo(e.clientX);
    const onUp = () => setHeld(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [held, scrollTo]);

  // Hide rail if columns fit entirely inside viewport
  if (geom.ratio >= 0.999) return null;

  return (
    <div
      ref={railRef}
      role="scrollbar"
      aria-orientation="horizontal"
      aria-label="Kanban horizontal scroll rail"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        setHeld(true);
        scrollTo(e.clientX);
      }}
      className="mt-2 mx-4 h-[6px] cursor-pointer rounded-full bg-slate-200/60 dark:bg-slate-700/60 shrink-0 hidden md:block"
    >
      <div
        style={{
          width: `${geom.ratio * 100}%`,
          marginLeft: `${geom.offset * (100 - geom.ratio * 100)}%`,
        }}
        className={`h-full rounded-full transition-colors duration-150 ${
          held ? 'bg-slate-500' : 'bg-slate-400/80 hover:bg-slate-500'
        }`}
      />
    </div>
  );
};
