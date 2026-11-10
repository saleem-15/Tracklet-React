import React from 'react';
import { AnalyticsFilter, AnalyticsTimeframe } from '../../lib/analyticsUtils';
import { JobPlatform } from '../../types';
import { JOB_PLATFORMS } from '../../lib/constants';
import { Calendar, RotateCcw } from 'lucide-react';
import { CustomSelectDropdown } from '../CustomSelectDropdown';
import { SegmentedTabs } from '../SegmentedTabs';

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
          <SegmentedTabs<AnalyticsTimeframe>
            tabs={TIMEFRAME_OPTIONS.map((opt) => ({
              id: opt.value,
              label: opt.label,
            }))}
            activeTab={filter.timeframe}
            onChange={handleTimeframeChange}
            size="sm"
            fullWidth={false}
            hasBorder={false}
            pillBorder={false}
            gap={true}
            activeColor="blue"
            inactiveWeight="medium"
            className="bg-slate-100/80 p-1 rounded-xl shrink-0"
            tabClassName="px-3 py-1 text-xs rounded-lg shrink-0"
            prefix={<Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5 shrink-0" />}
          />
        </div>

        {/* Right: Platform & Status Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Scope Toggle */}
          <SegmentedTabs<'All' | 'Active' | 'Terminal'>
            tabs={[
              { id: 'All', label: 'All' },
              { id: 'Active', label: 'Active' },
              { id: 'Terminal', label: 'Closed' },
            ]}
            activeTab={filter.statusCategory}
            onChange={handleStatusCategoryChange}
            size="sm"
            fullWidth={false}
            hasBorder={false}
            pillBorder={false}
            inactiveWeight="medium"
            tabClassName="px-2.5 py-1 text-xs rounded-lg"
            className="bg-slate-100/80 p-1 rounded-xl shrink-0"
          />

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
