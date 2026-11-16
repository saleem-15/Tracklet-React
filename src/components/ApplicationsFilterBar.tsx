import React, { useRef, useEffect, useMemo } from 'react';
import { Search, Plus, X, Kanban, Table, Globe, Laptop, Briefcase, Calendar } from 'lucide-react';
import { FilterState, JobPlatform, WorkLocation, EmploymentType, ApplicationLayout } from '../types';
import { SegmentedTabs, TabOption } from './SegmentedTabs';
import { FilterToolbar, FilterChip, FilterField } from './ui/filter-toolbar';

export interface ApplicationsFilterBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  layout: ApplicationLayout;
  onLayoutChange: (layout: ApplicationLayout) => void;
  onOpenAddModal: () => void;
  totalFilteredCount?: number;
  onOpenMobileSidebar?: () => void;
  className?: string;
}

const PLATFORMS: JobPlatform[] = [
  'LinkedIn', 'Greenhouse', 'Indeed', 'Lever', 'Bayt', 'Otta', 'Company Site', 'Referral', 'Wellfound', 'Other'
];
const WORK_LOCATIONS: WorkLocation[] = ['Remote', 'Hybrid', 'Onsite'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const DATE_OPTIONS: Array<{ label: string; value: FilterState['dateRange'] }> = [
  { label: 'Last 7 days', value: '7days' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Last 60 days', value: '60days' },
];
const DATE_LABELS: Record<string, string> = {
  all: 'All time', '7days': 'Last 7d', this_week: 'This Week', last_week: 'Last Week',
  this_month: 'This Month', last_month: 'Last Month', '30days': 'Last 30d', '60days': 'Last 60d',
};

export const ApplicationsFilterBar: React.FC<ApplicationsFilterBarProps> = ({
  filter,
  setFilter,
  layout,
  onLayoutChange,
  onOpenAddModal,
  totalFilteredCount,
  onOpenMobileSidebar,
  className = '',
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcuts (⌘K / Ctrl+K, '/', 'N')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isEditable = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.isContentEditable || activeEl?.getAttribute('contenteditable') === 'true';
      const hasOpenModal = document.querySelector('[role="dialog"]') !== null ||
        document.querySelector('.fixed.inset-0.z-50') !== null ||
        document.querySelector('[aria-modal="true"]') !== null;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (!isEditable && !hasOpenModal) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
        return;
      }

      if (isEditable || hasOpenModal) return;

      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onOpenAddModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenAddModal]);

  const handleLayoutSwitch = (newLayout: ApplicationLayout) => {
    if (newLayout === 'board' && filter.status !== 'Active' && filter.status !== 'All') {
      setFilter((prev) => ({ ...prev, status: 'Active' }));
    }
    onLayoutChange(newLayout);
  };

  const layoutTabs: TabOption<ApplicationLayout>[] = useMemo(() => [
    { id: 'board', label: 'Board', icon: <Kanban className="w-3.5 h-3.5" />, 'aria-label': 'Board layout' },
    { id: 'table', label: 'Table', icon: <Table className="w-3.5 h-3.5" />, 'aria-label': 'Table layout' },
  ], []);

  // FilterToolbar fields definition with unified Status as the 1st option
  const filterFields: FilterField[] = useMemo(() => [
    {
      id: 'status',
      label: 'Status',
      icon: <Kanban className="w-3.5 h-3.5 text-blue-600" />,
      options: [
        { value: 'Active', label: 'Active Only', hint: 'Pipeline' },
        { value: 'All', label: 'All Statuses' },
        { value: 'Saved', label: 'Saved', icon: <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />, hint: 'Table' },
        { value: 'Applied', label: 'Applied', icon: <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />, hint: 'Table' },
        { value: 'Screening', label: 'Screening', icon: <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />, hint: 'Table' },
        { value: 'Interview', label: 'Interview', icon: <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />, hint: 'Table' },
        { value: 'Offer', label: 'Offer', icon: <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />, hint: 'Table' },
        { value: 'Rejected', label: 'Rejected', icon: <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />, hint: 'Table' },
        { value: 'Archived', label: 'Archived', icon: <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />, hint: 'Table' },
      ],
    },
    {
      id: 'platform',
      label: 'Platform',
      icon: <Globe className="w-3.5 h-3.5" />,
      options: PLATFORMS.map((p) => ({ value: p })),
    },
    {
      id: 'workLocation',
      label: 'Work Mode',
      icon: <Laptop className="w-3.5 h-3.5" />,
      options: WORK_LOCATIONS.map((w) => ({ value: w })),
    },
    {
      id: 'employmentType',
      label: 'Job Type',
      icon: <Briefcase className="w-3.5 h-3.5" />,
      options: EMPLOYMENT_TYPES.map((e) => ({ value: e })),
    },
    {
      id: 'dateRange',
      label: 'Date Added',
      icon: <Calendar className="w-3.5 h-3.5" />,
      options: DATE_OPTIONS.map((d) => ({ value: d.label })),
    },
  ], []);

  // Active chips derived from FilterState (including Status when not 'All')
  const activeFilterChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [];
    if (filter.status && filter.status !== 'All') {
      chips.push({
        id: 'status',
        label: 'Status',
        value: filter.status === 'Active' ? 'Active Only' : filter.status,
      });
    }
    if (filter.platform && filter.platform !== 'All') {
      chips.push({ id: 'platform', label: 'Platform', value: filter.platform });
    }
    if (filter.workLocation && filter.workLocation !== 'All') {
      chips.push({ id: 'workLocation', label: 'Work', value: filter.workLocation });
    }
    if (filter.employmentType && filter.employmentType !== 'All') {
      chips.push({ id: 'employmentType', label: 'Job Type', value: filter.employmentType });
    }
    if (filter.dateRange && filter.dateRange !== 'all') {
      chips.push({ id: 'dateRange', label: 'Date', value: DATE_LABELS[filter.dateRange] || filter.dateRange });
    }
    return chips;
  }, [filter.status, filter.platform, filter.workLocation, filter.employmentType, filter.dateRange]);

  const handleRemoveFilterChip = (id: string) => {
    setFilter((prev) => {
      switch (id) {
        case 'status': return { ...prev, status: 'All' };
        case 'platform': return { ...prev, platform: 'All' };
        case 'workLocation': return { ...prev, workLocation: 'All' };
        case 'employmentType': return { ...prev, employmentType: 'All' };
        case 'dateRange': return { ...prev, dateRange: 'all' };
        default: return prev;
      }
    });
  };

  const handleAddFilterChip = (chip: FilterChip, field: FilterField) => {
    setFilter((prev) => {
      if (field.id === 'status') {
        const rawVal = chip.value || chip.label;
        const rawStatus = rawVal === 'Active Only'
          ? 'Active'
          : (rawVal === 'All Statuses' || rawVal === 'All' ? 'All' : rawVal);
        if (rawStatus !== 'All' && rawStatus !== 'Active') {
          onLayoutChange('table');
        }
        return { ...prev, status: rawStatus as any };
      }
      if (field.id === 'platform') return { ...prev, platform: (chip.value || chip.label) as JobPlatform };
      if (field.id === 'workLocation') return { ...prev, workLocation: (chip.value || chip.label) as WorkLocation };
      if (field.id === 'employmentType') return { ...prev, employmentType: (chip.value || chip.label) as EmploymentType };
      if (field.id === 'dateRange') {
        const match = DATE_OPTIONS.find((d) => d.label === chip.value || DATE_LABELS[d.value] === chip.value);
        return { ...prev, dateRange: match ? match.value : 'all' };
      }
      return prev;
    });
  };

  const handleClearAllFilters = () => {
    setFilter((prev) => ({
      ...prev,
      status: 'All',
      platform: 'All',
      workLocation: 'All',
      employmentType: 'All',
      dateRange: 'all',
    }));
  };

  const hasSearchFilter = filter.search !== '';

  return (
    <div className={`flex items-center justify-between gap-2 sm:gap-3 w-full min-w-0 ${className}`}>
      {/* Left: Mobile menu button + Search + Unified Animated FilterToolbar */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {onOpenMobileSidebar && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open navigation menu"
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 min-h-[38px] min-w-[38px] flex items-center justify-center -ml-1"
          >
            <span className="sr-only">Menu</span>
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" /></svg>
          </button>
        )}

        {/* Search Input with ⌘K Badge */}
        <div className="relative w-36 sm:w-48 md:w-56 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search jobs..."
            aria-label="Search applications"
            className="w-full pl-8 pr-11 py-1.5 h-[34px] text-xs bg-slate-50 border border-slate-200/90 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
          {filter.search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setFilter((prev) => ({ ...prev, search: '' }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-500 bg-white border border-slate-200 px-1 py-0.5 rounded shadow-2xs pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Unified Animated Fluid FilterToolbar (Status + Platform + Work Mode + Job Type + Date) */}
        <FilterToolbar
          filters={activeFilterChips}
          onRemove={handleRemoveFilterChip}
          onClearAll={handleClearAllFilters}
          emptyLabel=""
          addFilter={{
            fields: filterFields,
            onAdd: handleAddFilterChip,
            label: 'Filter',
            align: 'start',
          }}
        />

        {/* Quick Reset for Search when active */}
        {hasSearchFilter && (
          <button
            type="button"
            onClick={() => setFilter((prev) => ({ ...prev, search: '' }))}
            className="shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
            title="Reset search"
          >
            Reset
          </button>
        )}
      </div>

      {/* Right: Canonical SegmentedTabs (Concentric radii R=10, p=4, r=6) + Add Application CTA */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <SegmentedTabs<ApplicationLayout>
          tabs={layoutTabs}
          activeTab={layout}
          onChange={handleLayoutSwitch}
          size="sm"
          fullWidth={false}
          rounded="rounded-[10px]"
          pillRadius="rounded-[6px]"
          className="bg-slate-100 p-1 border border-slate-200/80 shrink-0"
          tabClassName="gap-1.5 px-3 py-1 font-medium"
        />

        <button
          type="button"
          onClick={onOpenAddModal}
          title="Add application (Press 'N')"
          className="h-[34px] px-3 rounded-[10px] bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold shadow-xs text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Add Job</span>
        </button>
      </div>
    </div>
  );
};
