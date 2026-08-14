import React, { useRef, useEffect } from 'react';
import { Search, Plus, Filter, X, ChevronDown } from 'lucide-react';
import { FilterState, JobPlatform, ApplicationStatus, ActiveTab } from '../types';
import { FilterSelectDropdown } from './FilterSelectDropdown';
import { UI_TOKENS } from '../theme/tokens';

interface TopBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  onOpenAddModal: () => void;
  totalFilteredCount: number;
  onExportCSV?: () => void;
  activeTab?: ActiveTab;
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
  'Saved',
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
  activeTab,
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
    <header className="h-13 bg-white/95 border-b border-slate-200/80 px-4 flex items-center justify-between gap-3 sticky top-0 z-30 text-xs backdrop-blur-xs">
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
            className={`w-full ${UI_TOKENS.inputBase} pl-9 pr-8 font-sans`}
          />
          {filter.search && (
            <button
              onClick={() => setFilter((prev) => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
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

        {/* Status Filter - Only render in All view or when active filter present */}
        {(activeTab !== 'pipeline' || filter.status !== 'All') && (
          <FilterSelectDropdown
            labelPrefix="Status"
            value={filter.status}
            onChange={(val) => setFilter((prev) => ({ ...prev, status: val as any }))}
            options={STATUS_OPTIONS}
            isActive={filter.status !== 'All'}
          />
        )}

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
            className={UI_TOKENS.btnSecondary}
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
          title="Add application (Press 'N')"
          className={UI_TOKENS.btnPrimary}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Application</span>
        </button>
      </div>
    </header>
  );
};
