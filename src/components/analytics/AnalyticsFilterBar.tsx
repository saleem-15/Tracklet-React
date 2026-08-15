import React from 'react';
import { AnalyticsFilter, AnalyticsTimeframe } from '../../lib/analyticsUtils';
import { JobPlatform } from '../../types';
import { JOB_PLATFORMS } from '../../lib/constants';
import { Calendar, RotateCcw } from 'lucide-react';
import { CustomSelectDropdown } from '../CustomSelectDropdown';

interface AnalyticsFilterBarProps {
  filter: AnalyticsFilter;
  onFilterChange: (newFilter: AnalyticsFilter) => void;
  totalApplicationsCount: number;
  filteredCount: number;
  onReset: () => void;
}

const TIMEFRAME_OPTIONS: { value: AnalyticsTimeframe; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: 'Past 30 Days' },
  { value: '90d', label: 'Past 90 Days' },
  { value: '7d', label: 'Past 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_year', label: 'This Year' },
];

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  filter,
  onFilterChange,
  onReset,
}) => {
  const isFiltered =
    filter.timeframe !== 'all' ||
    filter.platform !== 'All' ||
    filter.statusCategory !== 'All';

  const handleTimeframeChange = (timeframe: AnalyticsTimeframe) => {
    onFilterChange({ ...filter, timeframe });
  };

  const handlePlatformChange = (platform: JobPlatform | 'All') => {
    onFilterChange({ ...filter, platform });
  };

  const handleStatusCategoryChange = (statusCategory: 'All' | 'Active' | 'Terminal') => {
    onFilterChange({ ...filter, statusCategory });
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Quick Timeframe Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none max-w-full">
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5 shrink-0" />
            {TIMEFRAME_OPTIONS.map((opt) => {
              const isActive = filter.timeframe === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleTimeframeChange(opt.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer select-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Platform & Status Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Scope Toggle */}
          <div className="bg-slate-100/80 p-1 rounded-xl flex items-center shrink-0">
            {(['All', 'Active', 'Terminal'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleStatusCategoryChange(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  filter.statusCategory === cat
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {cat === 'All' ? 'All' : cat === 'Active' ? 'Active' : 'Closed'}
              </button>
            ))}
          </div>

          {/* Platform Selector Dropdown */}
          <div className="min-w-[130px] shrink-0">
            <CustomSelectDropdown<JobPlatform | 'All'>
              value={filter.platform}
              onChange={handlePlatformChange}
              options={[
                { label: 'All Sources', value: 'All' },
                ...JOB_PLATFORMS.map((p) => ({ label: p, value: p })),
              ]}
              size="sm"
            />
          </div>

          {/* Filter Reset if active */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              title="Reset all filters"
              className="p-1.5 h-8 w-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/80 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
