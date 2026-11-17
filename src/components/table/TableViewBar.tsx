import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { TableViewPrefs } from '../../types';

export interface TableViewBarProps {
  prefs: TableViewPrefs;
  onPrefsChange: (updates: Partial<TableViewPrefs>) => void;
  visibleRowCount?: number;
}

/**
 * TableViewBar
 *
 * The table lens' own toolbar: provides row count context and houses
 * the optional column toggles. The table is a flat lens, so there is no
 * grouping control here (stage grouping belongs to the Kanban board).
 */
export const TableViewBar: React.FC<TableViewBarProps> = ({
  prefs,
  onPrefsChange,
  visibleRowCount,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSettingsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSettingsOpen]);

  const columnToggles: { key: keyof TableViewPrefs; label: string }[] = [
    { key: 'showLocation', label: 'Location' },
    { key: 'showEmploymentType', label: 'Type' },
    { key: 'showSalary', label: 'Salary' },
    { key: 'showLastActivity', label: 'Last activity' },
  ];

  return (
    <div className="shrink-0 border-b border-slate-200/70 bg-white flex items-center justify-between gap-3 px-3 py-1.5 select-none">
      <div className="text-[11px] font-mono text-slate-400 tabular-nums">
        {visibleRowCount !== undefined && (
          <span>
            {visibleRowCount} {visibleRowCount === 1 ? 'application' : 'applications'}
          </span>
        )}
      </div>

      {/* Column visibility */}
      <div className="relative shrink-0" ref={settingsRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isSettingsOpen}
          aria-label="Toggle visible columns"
          onClick={() => setIsSettingsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          Columns
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
        </button>

        {isSettingsOpen && (
          <div
            role="menu"
            aria-label="Columns"
            className="absolute right-0 top-full mt-1.5 w-52 rounded-[12px] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl z-40 p-2 space-y-2.5"
          >
            {/* Optional columns */}
            <div>
              <div className="px-1 pb-1 text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Columns</div>
              <div className="space-y-0.5">
                {columnToggles.map(({ key, label }) => {
                  const checked = Boolean(prefs[key]);
                  return (
                    <button
                      key={key}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={checked}
                      onClick={() => onPrefsChange({ [key]: !checked } as Partial<TableViewPrefs>)}
                      className="w-full flex items-center justify-between px-2 py-1 rounded-md text-xs text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                    >
                      <span>{label}</span>
                      {checked && <Check className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
