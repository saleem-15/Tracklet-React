import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link2, X } from 'lucide-react';

export interface LinkPopoverProps {
  open: boolean;
  url: string;
  editingExisting: boolean;
  rect: { anchorTop: number; anchorBottom: number; left: number } | null;
  onUrlChange: (url: string) => void;
  onApply: (explicitUrl?: string) => void;
  onClose: () => void;
}

const POPOVER_MAX_WIDTH = 340;
/** Approximate rendered height — used for above/below flip decision. */
const POPOVER_EST_HEIGHT = 46;

/**
 * Floating link popover anchored to the selection that invoked it
 * (same visual family as the selection bubble). Closes on Escape or any
 * pointer press outside its root.
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
  const [flipAbove, setFlipAbove] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Position + viewport flip once mounted/opened
  useLayoutEffect(() => {
    if (!open || !rect) {
      setPos(null);
      return;
    }
    const belowFits =
      rect.anchorBottom + POPOVER_EST_HEIGHT < window.innerHeight - 8;
    setFlipAbove(!belowFits);
    setPos({
      top: belowFits ? rect.anchorBottom + 6 : undefined as unknown as number,
      left: Math.max(
        8,
        Math.min(rect.left, window.innerWidth - POPOVER_MAX_WIDTH - 8)
      ),
    });
  }, [open, rect]);

  // Outside-press closes (pointerdown so drags starting outside count)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, onClose]);

  // Escape closes
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

  const handleRemove = () => {
    onUrlChange('');
    onApply('');
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={editingExisting ? 'Edit link' : 'Insert link'}
      className="fixed z-[70] flex items-center gap-2 bg-slate-900 text-white rounded-xl shadow-2xl px-2 py-1.5 animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: flipAbove ? undefined : pos.top,
        bottom: flipAbove
          ? window.innerHeight - rect.anchorTop + 6
          : undefined,
        left: pos.left,
        width: `min(${POPOVER_MAX_WIDTH}px, calc(100vw - 16px))`,
      }}
    >
      <Link2 className="w-4 h-4 text-blue-300 shrink-0" />
      <input
        type="url"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onApply();
          }
        }}
        placeholder="https://..."
        aria-label="Link URL"
        autoFocus
        className="flex-1 min-w-0 px-2.5 py-1 text-xs bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono text-slate-100 placeholder:text-slate-500"
      />
      {editingExisting && (
        <button
          type="button"
          title="Remove link"
          aria-label="Remove link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleRemove}
          className="px-2 py-1 text-[11px] font-medium text-rose-300 hover:text-rose-200 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors shrink-0"
        >
          Remove
        </button>
      )}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onApply()}
        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer shrink-0"
      >
        Apply
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
        aria-label="Cancel"
        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default LinkPopover;
