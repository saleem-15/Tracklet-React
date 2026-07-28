import React, { useRef, useEffect } from 'react';
import { Search, Plus, Filter, X, ChevronDown } from 'lucide-react';
import { FilterState, JobPlatform, ApplicationStatus } from '../types';

interface TopBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  onOpenAddModal: () => void;
  totalFilteredCount: number;
  onExportCSV?: () => void;
}

const PLATFORMS: JobPlatform[] = [
  'LinkedIn',
  'Indeed',
  'Lever',
  'Greenhouse',
  'Otta',
  'Company Site',
  'Referral',
  'Wellfound',
  'Other',
];

const STATUSES: ApplicationStatus[] = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

export const TopBar: React.FC<TopBarProps> = ({
  filter,
  setFilter,
  onOpenAddModal,
  totalFilteredCount,
  onExportCSV,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search bar on Cmd+K or Ctrl+K or /
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        (e.key === '/' || e.key.toLowerCase() === 'n') &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        if (e.key.toLowerCase() === 'n') {
          onOpenAddModal();
        } else {
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenAddModal]);

  const hasActiveFilters =
    filter.search !== '' ||
    filter.platform !== 'All' ||
    filter.status !== 'All' ||
    filter.dateRange !== 'all';

  const resetFilters = () => {
    setFilter({
      search: '',
      platform: 'All',
      status: 'All',
      dateRange: 'all',
    });
  };

  return (
    <header className="h-13 bg-white/95 border-b border-slate-200/80 px-4 flex items-center justify-between gap-3 sticky top-0 z-10 text-xs backdrop-blur-xs">
      {/* Search & Filters */}
      <div className="flex items-center gap-2 flex-1 max-w-3xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search company, role, notes..."
            className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-9 pr-8 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white font-sans text-xs transition-all shadow-2xs"
          />
          {filter.search ? (
            <button
              onClick={() => setFilter((prev) => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Platform Filter */}
        <div className="relative">
          <select
            value={filter.platform}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, platform: e.target.value as any }))
            }
            className={`appearance-none border rounded-xl pl-3 pr-8 py-1.5 font-sans text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all shadow-2xs ${
              filter.platform !== 'All'
                ? 'bg-blue-50/90 text-blue-900 border-blue-300 font-bold ring-1 ring-blue-400/20'
                : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/90 font-medium'
            }`}
          >
            <option value="All">Platform: All</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${filter.platform !== 'All' ? 'text-blue-600' : 'text-slate-400'}`} />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={filter.status}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, status: e.target.value as any }))
            }
            className={`appearance-none border rounded-xl pl-3 pr-8 py-1.5 font-sans text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all shadow-2xs ${
              filter.status !== 'All'
                ? 'bg-blue-50/90 text-blue-900 border-blue-300 font-bold ring-1 ring-blue-400/20'
                : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/90 font-medium'
            }`}
          >
            <option value="All">Status: All</option>
            <option value="Active">Status: Active Only</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${filter.status !== 'All' ? 'text-blue-600' : 'text-slate-400'}`} />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <select
            value={filter.dateRange}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, dateRange: e.target.value as any }))
            }
            className={`appearance-none border rounded-xl pl-3 pr-8 py-1.5 font-sans text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all shadow-2xs ${
              filter.dateRange !== 'all'
                ? 'bg-blue-50/90 text-blue-900 border-blue-300 font-bold ring-1 ring-blue-400/20'
                : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/90 font-medium'
            }`}
          >
            <option value="all">Date: All time</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="60days">Last 60 days</option>
          </select>
          <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${filter.dateRange !== 'all' ? 'text-blue-600' : 'text-slate-400'}`} />
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-blue-700 hover:text-blue-900 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 font-sans text-xs transition-all font-semibold cursor-pointer shadow-2xs"
          >
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Reset Filters</span>
          </button>
        )}

        <span className="font-mono text-[11px] text-slate-400 ml-1">
          {totalFilteredCount} {totalFilteredCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenAddModal}
          title="Add new application (Press 'N')"
          className="bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs text-xs shadow-blue-500/20 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add application</span>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-blue-700/80 px-1.5 py-0.2 rounded border border-blue-400/40 text-blue-100 font-normal">N</kbd>
        </button>
      </div>
    </header>
  );
};
