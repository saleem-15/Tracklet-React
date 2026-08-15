import React, { useState, useMemo, useRef } from 'react';
import { Application } from '../types';
import { 
  AnalyticsFilter, 
  filterApplicationsForAnalytics, 
  calculateExecutiveKpis 
} from '../lib/analyticsUtils';
import { AnalyticsFilterBar } from './analytics/AnalyticsFilterBar';
import { AnalyticsHeroKPIs } from './analytics/AnalyticsHeroKPIs';
import { ConversionFunnelCard } from './analytics/ConversionFunnelCard';
import { PlatformRoiCard } from './analytics/PlatformRoiCard';
import { ResponseVelocityCard } from './analytics/ResponseVelocityCard';
import { ActivityMomentumCard } from './analytics/ActivityMomentumCard';
import { BarChart3, FilterX } from 'lucide-react';

interface StatsViewProps {
  applications: Application[];
  onSelectApplication?: (id: string) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ 
  applications,
  onSelectApplication,
}) => {
  const [filter, setFilter] = useState<AnalyticsFilter>({
    timeframe: 'all',
    platform: 'All',
    statusCategory: 'All',
  });

  const responseRadarRef = useRef<HTMLDivElement>(null);

  // Filtered applications based on active analytics scope
  const filteredApps = useMemo(() => {
    return filterApplicationsForAnalytics(applications, filter);
  }, [applications, filter]);

  // Executive KPIs computed on filtered dataset
  const kpis = useMemo(() => {
    return calculateExecutiveKpis(filteredApps);
  }, [filteredApps]);

  const handleResetFilters = () => {
    setFilter({
      timeframe: 'all',
      platform: 'All',
      statusCategory: 'All',
    });
  };

  const handleScrollToStale = () => {
    if (responseRadarRef.current) {
      responseRadarRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 bg-slate-50/50 p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-900 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight font-heading leading-tight">
              Job Search Analytics
            </h2>
            <p className="text-xs text-slate-500">
              Overview across <span className="font-semibold text-slate-700">{filteredApps.length}</span> applications
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <AnalyticsFilterBar
        filter={filter}
        onFilterChange={setFilter}
        totalApplicationsCount={applications.length}
        filteredCount={filteredApps.length}
        onReset={handleResetFilters}
      />

      {/* Handle Empty State if no apps match filter */}
      {filteredApps.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <FilterX className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-bold text-slate-900 text-base">
              No applications match selected filters
            </h3>
            <p className="text-xs text-slate-500">
              Try adjusting the timeframe, platform, or status criteria above.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* 4 Clean Executive KPI Cards */}
          <AnalyticsHeroKPIs 
            kpis={kpis} 
            onViewStaleApps={handleScrollToStale}
          />

          {/* 2-Column Analytics Intelligence Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Column: Conversion Funnel & Ghosting Radar */}
            <div className="space-y-5">
              <ConversionFunnelCard applications={filteredApps} />
              <div ref={responseRadarRef}>
                <ResponseVelocityCard
                  applications={filteredApps}
                  onSelectApplication={onSelectApplication}
                />
              </div>
            </div>

            {/* Right Column: Platform ROI & Activity Momentum */}
            <div className="space-y-5">
              <PlatformRoiCard applications={filteredApps} />
              <ActivityMomentumCard
                applications={filteredApps}
                timeframe={filter.timeframe}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
