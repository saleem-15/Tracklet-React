import React, { useRef, useEffect } from 'react';
import { Search, Plus, Filter, X, ChevronDown } from 'lucide-react';
import { FilterState, JobPlatform, ApplicationStatus } from '../types';
import { FilterSelectDropdown } from './FilterSelectDropdown';

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

const PLATFORM_OPTIONS = [
  { label: 'All', value: 'All' },
  ...PLATFORMS.map((p) => ({ label: p, value: p })),
];

const STATUS_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'Active Only', value: 'Active' },
  ...STATUSES.map((s) => ({ label: s, value: s })),
];

const DATE_OPTIONS = [
  { label: 'All time', value: 'all' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Last 60 days', value: '60days' },
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
        <FilterSelectDropdown
          labelPrefix="Platform"
          value={filter.platform}
          onChange={(val) => setFilter((prev) => ({ ...prev, platform: val as any }))}
          options={PLATFORM_OPTIONS}
          isActive={filter.platform !== 'All'}
        />

        {/* Status Filter */}
        <FilterSelectDropdown
          labelPrefix="Status"
          value={filter.status}
          onChange={(val) => setFilter((prev) => ({ ...prev, status: val as any }))}
          options={STATUS_OPTIONS}
          isActive={filter.status !== 'All'}
        />

        {/* Date Filter */}
        <FilterSelectDropdown
          labelPrefix="Date"
          value={filter.dateRange}
          onChange={(val) => setFilter((prev) => ({ ...prev, dateRange: val as any }))}
          options={DATE_OPTIONS}
          isActive={filter.dateRange !== 'all'}
        />

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
