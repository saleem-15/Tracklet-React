import React from 'react';
import { calculateMomentumAnalysis, AnalyticsTimeframe } from '../../lib/analyticsUtils';
import { Application } from '../../types';
import { 
  TrendingUp, 
  Flame, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight, 
  PlusCircle, 
  ArrowRightLeft, 
  CheckCircle2 
} from 'lucide-react';

interface ActivityMomentumCardProps {
  applications: Application[];
  timeframe: AnalyticsTimeframe;
  className?: string;
}

export const ActivityMomentumCard: React.FC<ActivityMomentumCardProps> = ({
  applications,
  timeframe,
  className = '',
}) => {
  const momentum = calculateMomentumAnalysis(applications, timeframe);
  const {
    timeframeLabel,
    totalActions,
    currentPeriodApps,
    prevPeriodApps,
    paceChangePct,
    streakWeeks,
    weeklyTrend,
  } = momentum;

  const maxActivity = Math.max(1, ...weeklyTrend.map((w) => w.totalActivity));

  // Compute breakdown totals
  const totalAppsAdded = weeklyTrend.reduce((sum, w) => sum + w.appsCount, 0);
  const totalStatusMoves = weeklyTrend.reduce((sum, w) => sum + w.statusChangesCount, 0);
  const totalTasksDone = weeklyTrend.reduce((sum, w) => sum + w.tasksDoneCount, 0);

  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Job Search Momentum & Pacing
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">
              Weekly cadence, activity velocity, and goal consistency
            </p>
          </div>
        </div>

        {/* Streak & Pacing Indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          {streakWeeks > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200/80 px-2.5 py-1 rounded-lg text-xs font-mono text-orange-900 font-bold">
              <Flame className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
              <span>{streakWeeks} Week Streak</span>
            </div>
          )}

          <div className="bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-700">
            Total Actions: <strong className="text-slate-900 font-bold">{totalActions}</strong>
          </div>
        </div>
      </div>

      {/* 3 Metric Pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
              Apps Submitted
            </span>
            <span className="text-lg font-extrabold text-slate-900 font-mono">
              +{totalAppsAdded}
            </span>
          </div>
          <PlusCircle className="w-4 h-4 text-blue-600" />
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
              Stage Moves
            </span>
            <span className="text-lg font-extrabold text-slate-900 font-mono">
              {totalStatusMoves}
            </span>
          </div>
          <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
        </div>

        <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
              Tasks Done
            </span>
            <span className="text-lg font-extrabold text-slate-900 font-mono">
              {totalTasksDone}
            </span>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
      </div>

      {/* Visual Activity Histogram */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
          <span className="text-slate-700 font-medium">Activity Distribution ({timeframeLabel})</span>
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Apps
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Stage
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Tasks
            </span>
          </div>
        </div>

        {/* Histogram Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 items-end h-28 pt-3 px-1">
          {weeklyTrend.map((item, idx) => {
            const heightPct = Math.round((item.totalActivity / maxActivity) * 100);

            return (
              <div key={idx} className="flex flex-col items-center h-full justify-end group">
                {/* Count tooltip on hover */}
                <div className="text-[10px] font-mono font-bold text-slate-700 opacity-80 group-hover:opacity-100 transition-opacity mb-1">
                  {item.totalActivity > 0 ? item.totalActivity : ''}
                </div>

                {/* Stacked Vertical Bar */}
                <div className="w-full max-w-[28px] bg-slate-100 rounded-t-md h-18 flex flex-col justify-end overflow-hidden relative">
                  {item.totalActivity > 0 ? (
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 via-indigo-500 to-emerald-400 rounded-t-md transition-all duration-300 group-hover:brightness-110"
                      style={{ height: `${Math.max(15, heightPct)}%` }}
                    />
                  ) : (
                    <div className="w-full h-1 bg-slate-200/60 rounded-t-md" />
                  )}
                </div>

                {/* Label */}
                <div className="text-center mt-1.5 min-w-0 w-full">
                  <span className="block text-[10px] font-mono font-semibold text-slate-600">
                    {item.periodLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Momentum Pacing Banner */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-700">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Current pacing:{' '}
            <strong className="text-slate-900 font-bold">{currentPeriodApps} applications</strong> in recent half
          </span>
        </div>

        {prevPeriodApps > 0 ? (
          <span className={`text-[11px] font-bold flex items-center gap-0.5 ${
            paceChangePct >= 0 ? 'text-emerald-700' : 'text-slate-500'
          }`}>
            {paceChangePct >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            {paceChangePct >= 0 ? `+${paceChangePct}%` : `${paceChangePct}%`} vs prior
          </span>
        ) : null}
      </div>
    </div>
  );
};
