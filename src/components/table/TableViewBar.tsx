import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { Application, ApplicationStatus, TableViewPrefs } from '../../types';
import { ACTIVE_STATUSES } from '../../lib/constants';

export interface TableViewBarProps {
  /** Unfiltered list used for the summary chip counts */
  allApplications: Application[];
  activeStatusFilter: ApplicationStatus | 'All' | 'Active';
  onStatusFilterChange?: (status: ApplicationStatus | 'All' | 'Active') => void;
  prefs: TableViewPrefs;
  onPrefsChange: (updates: Partial<TableViewPrefs>) => void;
  visibleRowCount: number;
}

interface SummaryChip {
  key: string;
  label: string;
  count: number;
  dot: string;
  filterValue: ApplicationStatus | 'Active';
}

/**
 * TableViewBar
 *
 * The table lens' own toolbar: left side answers "how much volume, at which
 * stage?" at a glance (clickable status chips that double as quick filters);
 * right side holds the view settings (grouping, optional columns).
 */
export const TableViewBar: React.FC<TableViewBarProps> = ({
  allApplications,
  activeStatusFilter,
  onStatusFilterChange,
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

  const countByStatus = new Map<ApplicationStatus, number>();
  for (const app of allApplications) {
    countByStatus.set(app.status, (countByStatus.get(app.status) || 0) + 1);
  }

  const chips: SummaryChip[] = [
    {
      key: 'active',
      label: 'Active',
      count: ACTIVE_STATUSES.reduce((sum, s) => sum + (countByStatus.get(s) || 0), 0),
      dot: 'bg-blue-500',
      filterValue: 'Active',
    },
    {
      key: 'interview',
      label: 'Interview',
      count: countByStatus.get('Interview') || 0,
      dot: 'bg-blue-400',
      filterValue: 'Interview',
    },
    {
      key: 'offer',
      label: 'Offer',
      count: countByStatus.get('Offer') || 0,
      dot: 'bg-emerald-400',
      filterValue: 'Offer',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      count: countByStatus.get('Rejected') || 0,
      dot: 'bg-rose-400',
      filterValue: 'Rejected',
    },
    {
      key: 'archived',
      label: 'Archived',
      count: countByStatus.get('Archived') || 0,
      dot: 'bg-slate-400',
      filterValue: 'Archived',
    },
  ];

  const columnToggles: { key: keyof TableViewPrefs; label: string }[] = [
    { key: 'showLocation', label: 'Location' },
    { key: 'showEmploymentType', label: 'Type' },
    { key: 'showSalary', label: 'Salary' },
    { key: 'showLastActivity', label: 'Last activity' },
  ];

  return (
    <div className="shrink-0 border-b border-slate-200/70 bg-white flex items-center justify-between gap-3 pl-3 pr-2 py-1.5 select-none">
      {/* Summary chips: volume by stage, clickable to filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto min-w-0" role="group" aria-label="Applications by stage">
        {chips.map((chip) => {
          const isActive = activeStatusFilter === chip.filterValue;
          const className = `inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-mono whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
            isActive
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          } ${onStatusFilterChange ? 'cursor-pointer' : 'cursor-default'}`;
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={isActive}
              aria-label={`Filter by ${chip.label}: ${chip.count} applications`}
              onClick={onStatusFilterChange ? () => onStatusFilterChange(isActive ? 'All' : chip.filterValue) : undefined}
              className={className}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${chip.dot} shrink-0`} />
              <span className="font-semibold tabular-nums">{chip.count}</span>
              <span className={isActive ? 'text-slate-300' : 'text-slate-400'}>{chip.label}</span>
            </button>
          );
        })}
        <span className="ml-1 text-[11px] font-mono text-slate-400 whitespace-nowrap hidden lg:inline" title="Rows matching the current search and filters">
          {visibleRowCount} shown
        </span>
      </div>

      {/* View settings */}
      <div className="relative shrink-0" ref={settingsRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isSettingsOpen}
          aria-label="Table view settings"
          onClick={() => setIsSettingsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          View
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
        </button>

        {isSettingsOpen && (
          <div
            role="menu"
            aria-label="View settings"
            className="absolute right-0 top-full mt-1.5 w-52 rounded-[12px] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl z-40 p-2 space-y-2.5"
          >
            {/* Grouping */}
            <div>
              <div className="px-1 pb-1 text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Group by</div>
              <div className="flex gap-1 px-1">
                {(['none', 'status'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="menuitemradio"
                    aria-checked={prefs.grouping === g}
                    onClick={() => onPrefsChange({ grouping: g })}
                    className={`flex-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors duration-150 cursor-pointer ${
                      prefs.grouping === g
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {g === 'none' ? 'Flat' : 'Status'}
                  </button>
                ))}
              </div>
            </div>

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
