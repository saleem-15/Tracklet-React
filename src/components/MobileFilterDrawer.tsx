import React, { useEffect } from 'react';
import { X, Filter, RotateCcw, Check, Search } from 'lucide-react';
import { FilterState, JobPlatform, ApplicationStatus, WorkLocation, EmploymentType } from '../types';
import { UI_TOKENS } from '../theme/tokens';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  totalFilteredCount: number;
  totalAppCount?: number;
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

const WORK_LOCATIONS: WorkLocation[] = ['Remote', 'Hybrid', 'Onsite'];

const EMPLOYMENT_TYPES: EmploymentType[] = ['Full-time', 'Part-time', 'Contract', 'Internship'];

const STATUSES: { status: ApplicationStatus; label: string; dot: string }[] = [
  { status: 'Saved', label: 'Saved', dot: 'bg-purple-500' },
  { status: 'Applied', label: 'Applied', dot: 'bg-slate-500' },
  { status: 'Screening', label: 'Screening', dot: 'bg-amber-500' },
  { status: 'Interview', label: 'Interview', dot: 'bg-blue-500' },
  { status: 'Offer', label: 'Offer', dot: 'bg-emerald-500' },
  { status: 'Rejected', label: 'Rejected', dot: 'bg-rose-500' },
  { status: 'Archived', label: 'Archived', dot: 'bg-slate-400' },
];

const DATE_RANGES = [
  { label: 'All time', value: 'all' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Last 60 days', value: '60days' },
];

export const MobileFilterDrawer: React.FC<MobileFilterDrawerProps> = ({
  isOpen,
  onClose,
  filter,
  setFilter,
  totalFilteredCount,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const hasActiveFilters =
    filter.search !== '' ||
    filter.platform !== 'All' ||
    filter.status !== 'All' ||
    filter.workLocation !== 'All' ||
    filter.employmentType !== 'All' ||
    filter.dateRange !== 'all';

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-filters-title"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 sm:hidden"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[88vh] bg-white rounded-t-3xl border-t border-slate-200/90 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet Drag / Grab Handle */}
        <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 id="mobile-filters-title" className="font-heading font-bold text-slate-900 text-sm">
                Filter Applications
              </h2>
              <p className="font-mono text-[11px] text-slate-500">
                {totalFilteredCount} {totalFilteredCount === 1 ? 'result' : 'results'} matching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer min-h-[36px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-800">
          {/* Search Input */}
          <div className="space-y-1.5">
            <label htmlFor="mobile-filter-search" className="font-semibold text-slate-700 block">
              Search Keywords
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="mobile-filter-search"
                type="text"
                value={filter.search}
                onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Company, role title, or notes..."
                className={`w-full ${UI_TOKENS.inputBase} h-11 pl-9 pr-9 text-xs`}
              />
              {filter.search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setFilter((prev) => ({ ...prev, search: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 block">Application Stage / Status</label>
              {filter.status !== 'All' && (
                <button
                  type="button"
                  onClick={() => setFilter((prev) => ({ ...prev, status: 'All' }))}
                  className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter((prev) => ({ ...prev, status: 'All' }))}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                  filter.status === 'All'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {filter.status === 'All' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>All Statuses</span>
              </button>

              <button
                type="button"
                onClick={() => setFilter((prev) => ({ ...prev, status: 'Active' }))}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                  filter.status === 'Active'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50/60 hover:bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {filter.status === 'Active' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>Active Only</span>
              </button>

              {STATUSES.map((item) => {
                const isSelected = filter.status === item.status;
                return (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => setFilter((prev) => ({ ...prev, status: item.status }))}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                    <span>{item.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-0.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platform Filter Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 block">Job Platform</label>
              {filter.platform !== 'All' && (
                <button
                  type="button"
                  onClick={() => setFilter((prev) => ({ ...prev, platform: 'All' }))}
                  className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter((prev) => ({ ...prev, platform: 'All' }))}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                  filter.platform === 'All'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {filter.platform === 'All' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>All Platforms</span>
              </button>

              {PLATFORMS.map((platform) => {
                const isSelected = filter.platform === platform;
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setFilter((prev) => ({ ...prev, platform }))}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{platform}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Work Type Filter Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 block">Work Type</label>
              {filter.workLocation !== 'All' && (
                <button
                  type="button"
                  onClick={() => setFilter((prev) => ({ ...prev, workLocation: 'All' }))}
                  className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter((prev) => ({ ...prev, workLocation: 'All' }))}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                  filter.workLocation === 'All'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {filter.workLocation === 'All' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>All Types</span>
              </button>

              {WORK_LOCATIONS.map((loc) => {
                const isSelected = filter.workLocation === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setFilter((prev) => ({ ...prev, workLocation: prev.workLocation === loc ? 'All' : loc }))}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{loc}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Job Type Filter Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 block">Job Type</label>
              {filter.employmentType !== 'All' && (
                <button
                  type="button"
                  onClick={() => setFilter((prev) => ({ ...prev, employmentType: 'All' }))}
                  className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilter((prev) => ({ ...prev, employmentType: 'All' }))}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                  filter.employmentType === 'All'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {filter.employmentType === 'All' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>All Types</span>
              </button>

              {EMPLOYMENT_TYPES.map((emp) => {
                const isSelected = filter.employmentType === emp;
                return (
                  <button
                    key={emp}
                    type="button"
                    onClick={() => setFilter((prev) => ({ ...prev, employmentType: prev.employmentType === emp ? 'All' : emp }))}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{emp}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 block">Date Applied</label>
              {filter.dateRange !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilter((prev) => ({ ...prev, dateRange: 'all' }))}
                  className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DATE_RANGES.map((item) => {
                const isSelected = filter.dateRange === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter((prev) => ({ ...prev, dateRange: item.value as any }))}
                    className={`p-2.5 rounded-xl text-xs font-medium border transition-all text-center cursor-pointer min-h-[42px] flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/80 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2 min-h-[44px] transition-all"
          >
            <span>Show {totalFilteredCount} {totalFilteredCount === 1 ? 'Application' : 'Applications'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
