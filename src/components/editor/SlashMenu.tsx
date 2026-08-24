import React from 'react';
import type { FormattingAction } from './editorActions';

export interface SlashMenuProps {
  open: boolean;
  items: FormattingAction[];
  selectedIndex: number;
  rect: { top: number; left: number } | null;
  onSelect: (action: FormattingAction) => void;
  onHover: (index: number) => void;
}

/**
 * Linear-style "/" command menu. Presentational: positioning + item list.
 * Keyboard interaction lives in the editor hook (combobox owner);
 * this component carries the listbox semantics for assistive tech (FR-020).
 */
const SlashMenu: React.FC<SlashMenuProps> = ({
  open,
  items,
  selectedIndex,
  rect,
  onSelect,
  onHover,
}) => {
  if (!open || items.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Formatting commands"
      aria-activedescendant={`slash-option-${items[selectedIndex]?.id ?? ''}`}
      className="fixed z-[60] w-52 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ top: rect?.top ?? 0, left: rect?.left ?? 0 }}
    >
      {items.map((action, index) => {
        const Icon = action.icon;
        const selected = index === selectedIndex;
        return (
          <button
            key={action.id}
            id={`slash-option-${action.id}`}
            role="option"
            aria-selected={selected}
            type="button"
            // Keep editor selection intact while picking with the mouse
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(action)}
            onMouseEnter={() => onHover(index)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
              selected ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span className="flex-1 font-medium">{action.label}</span>
            {action.shortcut && (
              <span className="font-mono text-[9px] text-slate-400 select-none">
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
