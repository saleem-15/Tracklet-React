import React, { useEffect, useRef, useState } from 'react';
import type { FormattingAction } from './editorActions';

export interface SelectionBubbleProps {
  editorRef: React.RefObject<HTMLElement | null>;
  actions: readonly FormattingAction[];
  /** Applies an action; the bubble guarantees selection is still active. */
  onApply: (action: FormattingAction) => void;
}

interface BubblePosition {
  top: number;
  left: number;
}

/**
 * Floating formatting bubble (Linear-style). Appears above an active,
 * non-collapsed selection that lives fully inside the editor and lists
 * every registry action valid in context — future actions appear here
 * automatically (FR-008). Desktop pointer interaction only.
 */
const SelectionBubble: React.FC<SelectionBubbleProps> = ({
  editorRef,
  actions,
  onApply,
}) => {
  const [position, setPosition] = useState<BubblePosition | null>(null);
  const [applicable, setApplicable] = useState<FormattingAction[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const evaluate = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const editor = editorRef.current;
        const sel = window.getSelection();
        if (
          !editor ||
          !sel ||
          sel.isCollapsed ||
          sel.rangeCount === 0 ||
          !editor.contains(sel.anchorNode) ||
          !editor.contains(sel.focusNode)
        ) {
          setPosition(null);
          return;
        }

        const range = sel.getRangeAt(0);
        // Ignore selections inside code fences for formatting purposes
        const anchorEl =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as HTMLElement)
            : range.startContainer.parentElement;
        if (!anchorEl || anchorEl.closest('pre')) {
          setPosition(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setPosition(null);
          return;
        }

        const ctx = { editor };
        setApplicable(actions.filter((a) => a.appliesTo(ctx)));
        setPosition({
          top: Math.max(4, rect.top - 34),
          left: Math.max(8, rect.left + rect.width / 2),
        });
      });
    };

    document.addEventListener('selectionchange', evaluate);
    window.addEventListener('scroll', () => setPosition(null), { passive: true });
    window.addEventListener('resize', () => setPosition(null));
    return () => {
      document.removeEventListener('selectionchange', evaluate);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, editorRef]);

  if (!position) return null;

  return (
    <div
      role="toolbar"
      aria-label="Format selection"
      className="fixed z-[60] -translate-x-1/2 flex items-center gap-0.5 bg-slate-900 text-white rounded-lg shadow-xl px-1 py-0.5 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: position.top, left: position.left }}
    >
      {applicable.length === 0 ? (
        <span className="px-2 py-1 text-[10px] font-mono text-slate-400 select-none">
          No actions
        </span>
      ) : (
        applicable.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
              aria-label={action.label}
              // preventDefault keeps the browser selection alive through mousedown
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onApply(action)}
              className="p-1.5 hover:bg-slate-700 rounded-md cursor-pointer transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })
      )}
    </div>
  );
};

export default SelectionBubble;
