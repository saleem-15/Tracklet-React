import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, Plus, ChevronDown } from 'lucide-react';
import { FilterState, JobPlatform, WorkLocation, EmploymentType } from '../types';
import { CustomSelectDropdown, SelectOption } from './CustomSelectDropdown';
import { UI_TOKENS } from '../theme/tokens';

export interface ProgressiveFilterBarProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  onStatusChange: (status: string) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  totalFilteredCount: number;
}

const STATUS_OPTIONS: SelectOption<string>[] = [
  { label: 'Active Only', value: 'Active' },
  { label: 'All', value: 'All' },
  { label: 'Saved', value: 'Saved' },
  { label: 'Applied', value: 'Applied' },
  { label: 'Screening', value: 'Screening' },
  { label: 'Interview', value: 'Interview' },
  { label: 'Offer', value: 'Offer' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Archived ⚡ (Auto-Table)', value: 'Archived' },
];

const PLATFORMS: JobPlatform[] = [
  'LinkedIn',
  'Greenhouse',
  'Indeed',
  'Lever',
  'Bayt',
  'Otta',
  'Company Site',
  'Referral',
  'Wellfound',
  'Other',
];

const WORK_LOCATIONS: WorkLocation[] = ['Remote', 'Hybrid', 'Onsite'];

const EMPLOYMENT_TYPES: EmploymentType[] = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
];

const DATE_LABELS: Record<string, string> = {
  all: 'All time',
  '7days': 'Last 7 days',
  this_week: 'This Week',
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  '30days': 'Last 30 days',
  '60days': 'Last 60 days',
};

const DATE_OPTIONS: Array<{ label: string; value: FilterState['dateRange'] }> = [
  { label: 'Last 7 days', value: '7days' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Last 60 days', value: '60days' },
];

export const ProgressiveFilterBar: React.FC<ProgressiveFilterBarProps> = ({
  filter,
  setFilter,
  onStatusChange,
  hasActiveFilters,
  onResetFilters,
  totalFilteredCount,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'platform' | 'work' | 'jobType' | 'date'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popover on outside click or Escape key
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
        setActiveCategory('all');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPopoverOpen(false);
        setActiveCategory('all');
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPopoverOpen]);

  const removeChip = (key: 'platform' | 'workLocation' | 'employmentType' | 'dateRange') => {
    setFilter((prev) => ({
      ...prev,
      [key]: key === 'dateRange' ? 'all' : 'All',
    }));
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Status Scope Selector */}
      <CustomSelectDropdown
        value={filter.status}
        onChange={onStatusChange}
        options={STATUS_OPTIONS}
        labelPrefix="Status"
        variant="filter"
        size="sm"
        isActive={filter.status !== 'All' && filter.status !== 'Active'}
        className="shrink-0"
      />

      {/* Progressive "+ Filter" Dropdown Popover */}
      <div className="relative shrink-0" ref={popoverRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setIsPopoverOpen((prev) => !prev);
            setActiveCategory('all');
          }}
          aria-haspopup="true"
          aria-expanded={isPopoverOpen}
          aria-label="Add secondary filter"
          className="inline-flex items-center gap-1.5 h-[34px] px-2.5 rounded-[10px] border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 font-medium text-xs transition-colors cursor-pointer select-none"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>Filter</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {isPopoverOpen && (
          <div
            role="dialog"
            aria-label="Filter options"
            className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200/90 rounded-xl shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto"
          >
            {activeCategory === 'all' && (
              <>
                <div className="px-3 py-1 font-mono text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Add Filter
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCategory('platform')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">Platform</span>
                  <span className="text-slate-500 text-[10px] font-mono">Job Board / ATS ›</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('work')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">Work Location</span>
                  <span className="text-slate-500 text-[10px] font-mono">Remote / Onsite ›</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('jobType')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">Job Type</span>
                  <span className="text-slate-500 text-[10px] font-mono">Employment ›</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('date')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">Date Applied</span>
                  <span className="text-slate-500 text-[10px] font-mono">Timeframe ›</span>
                </button>
              </>
            )}

            {activeCategory === 'platform' && (
              <>
                <div className="px-3 py-1 flex items-center justify-between border-b border-slate-100 mb-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <span className="font-mono text-[10px] text-slate-500 uppercase">Platform</span>
                </div>
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setFilter((prev) => ({ ...prev, platform: p }));
                      setIsPopoverOpen(false);
                      setActiveCategory('all');
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                      filter.platform === p ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{p}</span>
                  </button>
                ))}
              </>
            )}

            {activeCategory === 'work' && (
              <>
                <div className="px-3 py-1 flex items-center justify-between border-b border-slate-100 mb-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <span className="font-mono text-[10px] text-slate-500 uppercase">Location</span>
                </div>
                {WORK_LOCATIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setFilter((prev) => ({ ...prev, workLocation: w }));
                      setIsPopoverOpen(false);
                      setActiveCategory('all');
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                      filter.workLocation === w ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{w}</span>
                  </button>
                ))}
              </>
            )}

            {activeCategory === 'jobType' && (
              <>
                <div className="px-3 py-1 flex items-center justify-between border-b border-slate-100 mb-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <span className="font-mono text-[10px] text-slate-500 uppercase">Job Type</span>
                </div>
                {EMPLOYMENT_TYPES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setFilter((prev) => ({ ...prev, employmentType: e }));
                      setIsPopoverOpen(false);
                      setActiveCategory('all');
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                      filter.employmentType === e ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{e}</span>
                  </button>
                ))}
              </>
            )}

            {activeCategory === 'date' && (
              <>
                <div className="px-3 py-1 flex items-center justify-between border-b border-slate-100 mb-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    ‹ Back
                  </button>
                  <span className="font-mono text-[10px] text-slate-500 uppercase">Date Range</span>
                </div>
                {DATE_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      setFilter((prev) => ({ ...prev, dateRange: d.value }));
                      setIsPopoverOpen(false);
                      setActiveCategory('all');
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                      filter.dateRange === d.value ? 'text-blue-600 font-semibold bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{d.label}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Dismissible Filter Chips Container */}
      <div
        className="flex items-center gap-1.5 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 shrink-0"
        role="region"
        aria-label="Active filters"
      >
        {filter.platform !== 'All' && (
          <span className="inline-flex items-center gap-1 pl-2.5 pr-0.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs transition-colors">
            <span>Platform: {filter.platform}</span>
            <button
              type="button"
              onClick={() => removeChip('platform')}
              aria-label={`Remove filter Platform: ${filter.platform}`}
              className="w-7 h-7 -my-1 -mr-0.5 rounded-full hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}

        {filter.workLocation !== 'All' && (
          <span className="inline-flex items-center gap-1 pl-2.5 pr-0.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs transition-colors">
            <span>Work: {filter.workLocation}</span>
            <button
              type="button"
              onClick={() => removeChip('workLocation')}
              aria-label={`Remove filter Work: ${filter.workLocation}`}
              className="w-7 h-7 -my-1 -mr-0.5 rounded-full hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}

        {filter.employmentType !== 'All' && (
          <span className="inline-flex items-center gap-1 pl-2.5 pr-0.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs transition-colors">
            <span>Job Type: {filter.employmentType}</span>
            <button
              type="button"
              onClick={() => removeChip('employmentType')}
              aria-label={`Remove filter Job Type: ${filter.employmentType}`}
              className="w-7 h-7 -my-1 -mr-0.5 rounded-full hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}

        {filter.dateRange !== 'all' && (
          <span className="inline-flex items-center gap-1 pl-2.5 pr-0.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs transition-colors">
            <span>Date: {DATE_LABELS[filter.dateRange] || filter.dateRange}</span>
            <button
              type="button"
              onClick={() => removeChip('dateRange')}
              aria-label={`Remove filter Date: ${DATE_LABELS[filter.dateRange]}`}
              className="w-7 h-7 -my-1 -mr-0.5 rounded-full hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        )}
      </div>

      {/* Conditional Reset Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="shrink-0 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
          title="Reset all applied filters"
        >
          Reset
        </button>
      )}

      {/* Active Count Label */}
      <span className="font-mono text-[11px] text-slate-500 shrink-0 hidden lg:inline ml-1 whitespace-nowrap">
        {totalFilteredCount} {totalFilteredCount === 1 ? 'item' : 'items'}
      </span>
    </div>
  );
};
