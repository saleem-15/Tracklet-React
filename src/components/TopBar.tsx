import React, { useRef, useEffect, useState } from 'react';
import { Search, Plus, Filter, X, Menu, SlidersHorizontal } from 'lucide-react';
import { FilterState, JobPlatform, ApplicationStatus, ActiveTab, WorkLocation, EmploymentType } from '../types';
import { FilterSelectDropdown } from './FilterSelectDropdown';
import { MobileFilterDrawer } from './MobileFilterDrawer';
import { UI_TOKENS } from '../theme/tokens';

interface TopBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  onOpenAddModal: () => void;
  totalFilteredCount: number;
  onExportCSV?: () => void;
  activeTab?: ActiveTab;
  onOpenMobileSidebar?: () => void;
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

const WORK_LOCATIONS: WorkLocation[] = ['Remote', 'Hybrid', 'Onsite'];

const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Part-time', 'Contract', 'Internship'];

const WORK_LOCATION_OPTIONS = [
  { label: 'All', value: 'All' },
  ...WORK_LOCATIONS.map((w) => ({ label: w, value: w })),
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { label: 'All', value: 'All' },
  ...EMPLOYMENT_TYPES.map((e) => ({ label: e, value: e })),
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
  activeTab,
  onOpenMobileSidebar,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search bar on Cmd+K or Ctrl+K (only when not inside an editable element or open modal)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const activeEl = document.activeElement as HTMLElement | null;
        const isEditable =
          activeEl?.tagName === 'INPUT' ||
          activeEl?.tagName === 'TEXTAREA' ||
          activeEl?.isContentEditable ||
          activeEl?.getAttribute('contenteditable') === 'true' ||
          activeEl?.closest('[contenteditable="true"]') !== null;

        const hasOpenModal =
          document.querySelector('[role="dialog"]') !== null ||
          document.querySelector('.fixed.inset-0.z-50') !== null ||
          document.querySelector('[aria-modal="true"]') !== null;

        if (!isEditable && !hasOpenModal) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      // Check if user is typing in any editable element (input, textarea, or contentEditable)
      const activeEl = document.activeElement as HTMLElement | null;
      const isEditable =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable ||
        activeEl?.getAttribute('contenteditable') === 'true' ||
        activeEl?.closest('[contenteditable="true"]') !== null;

      // Check if any modal or dialog is currently open in the application
      const hasOpenModal =
        document.querySelector('[role="dialog"]') !== null ||
        document.querySelector('.fixed.inset-0.z-50') !== null ||
        document.querySelector('[aria-modal="true"]') !== null;

      if (isEditable || hasOpenModal) {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        e.key.toLowerCase() === 'n' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        onOpenAddModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenAddModal]);

  const activeFiltersCount = [
    filter.search !== '',
    filter.platform !== 'All',
    filter.status !== 'All',
    filter.workLocation !== 'All',
    filter.employmentType !== 'All',
    filter.dateRange !== 'all',
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0;

  const resetFilters = () => {
    setFilter({
      search: '',
      platform: 'All',
      status: 'All',
      workLocation: 'All',
      employmentType: 'All',
      dateRange: 'all',
    });
  };

  return (
    <>
      <header className="h-13 bg-white/95 border-b border-slate-200/80 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 sticky top-0 z-30 text-xs backdrop-blur-xs">
        {/* Left Section: Mobile Menu Trigger + Search & Desktop Filters */}
        <div className="flex items-center gap-2 flex-1 min-w-0 max-w-4xl">
          {/* Mobile Sidebar Hamburger Trigger (Visible only on < 768px) */}
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center -ml-1"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Input (Responsive width) */}
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={filter.search}
              onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search..."
              className={`w-full ${UI_TOKENS.inputBase} pl-9 pr-7 sm:pr-8 font-sans h-9 sm:h-[34px] text-xs`}
            />
            {filter.search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setFilter((prev) => ({ ...prev, search: '' }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1 min-h-[30px] min-w-[30px] flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop Filter Pills (Hidden on < 640px / sm) */}
          <div className="hidden sm:flex items-center gap-2">
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

            {/* Work Location Filter (Remote / Hybrid / Onsite) */}
            <FilterSelectDropdown
              labelPrefix="Work"
              value={filter.workLocation}
              onChange={(val) => setFilter((prev) => ({ ...prev, workLocation: val as any }))}
              options={WORK_LOCATION_OPTIONS}
              isActive={filter.workLocation !== 'All'}
            />

            {/* Employment Type Filter (Full-time / Part-time / Contract / Internship) */}
            <FilterSelectDropdown
              labelPrefix="Job Type"
              value={filter.employmentType}
              onChange={(val) => setFilter((prev) => ({ ...prev, employmentType: val as any }))}
              options={EMPLOYMENT_TYPE_OPTIONS}
              isActive={filter.employmentType !== 'All'}
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
                className={UI_TOKENS.btnSecondary}
                title="Reset all applied filters"
              >
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Reset</span>
              </button>
            )}

            <span className="font-mono text-[11px] text-slate-500 ml-1 whitespace-nowrap hidden lg:inline">
              {totalFilteredCount} {totalFilteredCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Mobile Filter Button (Visible only on < 640px) */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              aria-label="Open filter options"
              className={`h-9 px-2.5 rounded-[10px] border font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                hasActiveFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <SlidersHorizontal className={`w-3.5 h-3.5 ${hasActiveFilters ? 'text-blue-600' : 'text-slate-500'}`} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="font-mono text-[11px] font-bold bg-blue-600 text-white min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Section: Add Application Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onOpenAddModal}
            title="Add application (Press 'N')"
            className="h-9 sm:h-[34px] px-2.5 sm:px-3.5 rounded-[10px] bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold border border-transparent shadow-xs text-xs shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5 transition-all min-h-[38px]"
          >
            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline sm:inline">Add Application</span>
          </button>
        </div>
      </header>

      {/* Mobile Filter Bottom Sheet / Drawer */}
      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        filter={filter}
        setFilter={setFilter}
        totalFilteredCount={totalFilteredCount}
      />
    </>
  );
};
