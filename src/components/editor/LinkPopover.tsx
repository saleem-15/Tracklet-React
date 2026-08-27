import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

export interface LinkPopoverProps {
  open: boolean;
  url: string;
  editingExisting: boolean;
  rect: { anchorTop: number; anchorBottom: number; left: number } | null;
  onUrlChange: (url: string) => void;
  onApply: (explicitUrl?: string) => void;
  onClose: () => void;
}

const POPOVER_MAX_WIDTH = 320;
/** Approximate rendered height — used for above/below flip decision. */
const POPOVER_EST_HEIGHT = 38;

/**
 * Floating link popover anchored to the selection that invoked it.
 * Auto-saves on Enter or blur/outside click (never on keystroke).
 * Closes on Escape.
 */
export const LinkPopover: React.FC<LinkPopoverProps> = ({
  open,
  url,
  editingExisting,
  rect,
  onUrlChange,
  onApply,
  onClose,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isAppliedRef = useRef(false);
  const [flipAbove, setFlipAbove] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Position + viewport flip once mounted/opened
  useLayoutEffect(() => {
    if (!open || !rect) {
      setPos(null);
      isAppliedRef.current = false;
      return;
    }
    const belowFits =
      rect.anchorBottom + POPOVER_EST_HEIGHT < window.innerHeight - 8;
    setFlipAbove(!belowFits);
    setPos({
      top: belowFits ? rect.anchorBottom + 6 : (undefined as unknown as number),
      left: Math.max(
        8,
        Math.min(rect.left, window.innerWidth - POPOVER_MAX_WIDTH - 8)
      ),
    });
  }, [open, rect]);

  // Outside-press auto-saves and closes
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        if (!isAppliedRef.current) {
          const trimmed = url.trim();
          if (trimmed && trimmed !== 'https://' && trimmed !== 'http://') {
            onApply();
          } else {
            onClose();
          }
        }
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, url, onApply, onClose]);

  // Escape cancels and closes without applying
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !pos || !rect) return null;

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isAppliedRef.current = true;
    onUrlChange('');
    onApply('');
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={editingExisting ? 'Edit link' : 'Insert link'}
      className="fixed z-[70] flex items-center gap-1.5 bg-slate-900 text-slate-100 rounded-lg shadow-xl border border-slate-700/60 px-2 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: flipAbove ? undefined : pos.top,
        bottom: flipAbove
          ? window.innerHeight - rect.anchorTop + 6
          : undefined,
        left: pos.left,
        width: `min(${POPOVER_MAX_WIDTH}px, calc(100vw - 16px))`,
      }}
    >
      <input
        type="url"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            isAppliedRef.current = true;
            onApply();
          }
        }}
        placeholder="https://..."
        aria-label="Link URL"
        autoFocus
        className="flex-1 min-w-0 bg-transparent border-0 focus:outline-none focus:ring-0 px-1 py-0.5 text-xs text-slate-100 font-mono placeholder:text-slate-500"
      />
      {editingExisting && (
        <>
          <div className="h-3.5 w-px bg-slate-700/80 mx-0.5 shrink-0" />
          <button
            type="button"
            title="Remove link (keep text)"
            aria-label="Remove link"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={handleRemove}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0 flex items-center justify-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

export default LinkPopover;
