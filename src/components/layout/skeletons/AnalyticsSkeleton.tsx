import { 
  BarChart3, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Award, 
  Clock, 
  Filter, 
  Globe 
} from 'lucide-react';

/**
 * AnalyticsSkeleton
 *
 * Deterministic skeleton matching StatsView.tsx geometry (0 CLS):
 * - Top header with BarChart3 icon badge and title
 * - AnalyticsFilterBar with timeframe tabs & scope toggle
 * - 4 executive KPI cards (Active Pipeline, Screening Yield, Offer Rate, Decision Pending)
 * - 2-column intelligence grid: Conversion Funnel, Response Velocity, Sources ROI, Activity Cadence
 */
export function AnalyticsSkeleton() {
  return (
    <div className="flex-1 bg-slate-50/50 p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-900 select-none">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight font-heading leading-tight">
              Job Search Analytics
            </h2>
          </div>
        </div>
      </div>

      {/* ── Interactive Filter Bar Silhouette ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Quick Timeframe Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none max-w-full">
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5 shrink-0" />
              <div className="px-3 py-1 text-xs font-semibold rounded-lg bg-white text-blue-700 shadow-2xs">
                All Time
              </div>
              {['Past 30 Days', 'Past 90 Days', 'Past 7 Days', 'This Month'].map((tab) => (
                <div
                  key={tab}
                  className="px-3 py-1 text-xs font-medium rounded-lg text-slate-600 hidden sm:block"
                >
                  {tab}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Platform & Status Filter Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-slate-100/80 p-1 rounded-xl flex items-center">
              <div className="px-3 py-1 text-xs font-semibold rounded-lg bg-white text-slate-900 shadow-2xs">
                All
              </div>
              <div className="px-3 py-1 text-xs font-medium rounded-lg text-slate-600">
                Active
              </div>
              <div className="px-3 py-1 text-xs font-medium rounded-lg text-slate-600">
                Terminal
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Executive KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Active Pipeline', icon: Activity, color: 'bg-blue-50 text-blue-600' },
          { title: 'Screening Yield', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
          { title: 'Offer Rate', icon: Award, color: 'bg-purple-50 text-purple-600' },
          { title: 'Decision Pending', icon: Clock, color: 'bg-amber-50 text-amber-600' },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-2xs flex flex-col justify-between animate-pulse motion-reduce:animate-none min-h-[148px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {kpi.title}
              </span>
              <div className={`w-8 h-8 rounded-xl ${kpi.color} flex items-center justify-center shrink-0`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>

            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <div className="w-12 h-7 bg-slate-200/70 rounded" />
                <div className="w-16 h-3 bg-slate-200/40 rounded" />
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div className="bg-slate-200/60 h-full rounded-full w-1/3" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100/80">
              <div className="w-16 h-3 bg-slate-100 rounded" />
              <div className="w-8 h-3 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* ── 2-Column Analytics Intelligence Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Conversion Funnel & Ghosting Radar */}
        <div className="space-y-5">
          {/* Conversion Funnel Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 animate-pulse motion-reduce:animate-none min-h-[290px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Filter className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Conversion Funnel
                </h3>
              </div>
              <div className="w-24 h-5 rounded-lg bg-purple-50" />
            </div>

            <div className="space-y-3.5 pt-1">
              {[100, 75, 45, 25, 10].map((width, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="w-16 h-3 bg-slate-200/50 rounded" />
                    <div className="w-12 h-3 bg-slate-200/40 rounded" />
                  </div>
                  <div className="w-full bg-slate-100 rounded-lg h-5 overflow-hidden p-0.5">
                    <div
                      className="bg-slate-200/70 h-full rounded-md"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response Velocity Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 animate-pulse motion-reduce:animate-none min-h-[240px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Response Velocity &amp; Follow-Up Radar
                </h3>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <div className="w-full h-4 bg-slate-100 rounded-md overflow-hidden flex gap-1 p-0.5">
                <div className="bg-slate-200/70 h-full rounded w-1/3" />
                <div className="bg-slate-200/50 h-full rounded w-1/4" />
                <div className="bg-slate-200/40 h-full rounded w-1/4" />
              </div>
              <div className="space-y-2 pt-3">
                {[...Array(2)].map((_, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-200/60" />
                      <div className="space-y-1">
                        <div className="w-24 h-3.5 bg-slate-200/60 rounded" />
                        <div className="w-32 h-2.5 bg-slate-200/40 rounded" />
                      </div>
                    </div>
                    <div className="w-16 h-4 bg-slate-200/50 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Platform ROI & Activity Momentum */}
        <div className="space-y-5">
          {/* Application Sources / Platform ROI */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 animate-pulse motion-reduce:animate-none min-h-[290px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Application Sources
                </h3>
              </div>
              <div className="w-28 h-5 rounded-lg bg-amber-50" />
            </div>

            <div className="space-y-3 pt-1">
              {['LinkedIn', 'Indeed', 'Company Site', 'Referral'].map((platform, idx) => (
                <div key={platform} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="w-20 h-3 bg-slate-200/60 rounded" />
                    <div className="w-10 h-3 bg-slate-200/40 rounded" />
                  </div>
                  <div className="w-full bg-slate-100 rounded-lg h-4 overflow-hidden">
                    <div
                      className="bg-slate-200/60 h-full rounded"
                      style={{ width: `${80 - idx * 18}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity & Consistency Cadence */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 animate-pulse motion-reduce:animate-none min-h-[240px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Activity &amp; Consistency Cadence
                </h3>
              </div>
              <div className="w-20 h-5 rounded-lg bg-emerald-50" />
            </div>

            <div className="pt-2">
              <div className="flex items-end justify-between gap-2 h-28 pt-4 pb-2 border-b border-slate-100">
                {[40, 65, 30, 85, 55, 90, 70, 45].map((h, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div
                      className="w-full max-w-[28px] bg-slate-200/60 rounded-t"
                      style={{ height: `${h}%` }}
                    />
                    <div className="w-4 h-2 bg-slate-200/30 rounded" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-3">
                <div className="w-20 h-3 bg-slate-100 rounded" />
                <div className="w-24 h-3 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
