import React, { useEffect, useRef } from 'react';
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
 * with keyboard scroll tracking to keep the highlighted item in view.
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

  // Keep highlighted item in view when navigating via arrow keys
  useEffect(() => {
    if (open && selectedIndex >= 0 && optionRefs.current[selectedIndex]) {
      optionRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, open]);

  if (!open || items.length === 0) return null;

  const top = rect
    ? 'anchorBottom' in rect && rect.anchorBottom !== undefined
      ? rect.anchorBottom + 4
      : rect.top ?? 0
    : 0;
  const left = rect?.left ?? 0;

  return (
    <div
      role="listbox"
      aria-label="Formatting commands"
      aria-activedescendant={`slash-option-${items[selectedIndex]?.id ?? ''}`}
      tabIndex={-1}
      className="fixed z-[60] w-56 max-h-60 overflow-y-auto bg-white border border-slate-200/90 rounded-[12px] shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150"
      style={{ top, left }}
    >
      {items.map((action, index) => {
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
            // Keep editor selection intact while picking with the mouse
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(action)}
            onMouseEnter={() => onHover(index)}
            className={`w-full text-left px-3 py-1.5 rounded-[8px] text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
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
    </div>
  );
};

export default SlashMenu;
