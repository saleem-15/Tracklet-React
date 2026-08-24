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
      className="fixed z-[60] w-56 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
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
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors cursor-pointer ${
              selected ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0 text-slate-500" />
            <span className="flex-1 font-medium">{action.label}</span>
            {action.shortcut && (
              <span className="font-mono text-[10px] text-slate-400 select-none">
                {action.shortcut}
              </span>
            )}
          </button>
        );
      })}
      <div
        aria-hidden="true"
        className="mt-1 px-3 py-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400 select-none"
      >
        <span>↑↓ navigate</span>
        <span>↵ apply</span>
        <span>esc close</span>
      </div>
    </div>
  );
};

export default SlashMenu;
