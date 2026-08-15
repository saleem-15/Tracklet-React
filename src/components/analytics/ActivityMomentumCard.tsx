import React from 'react';
import { calculateMomentumAnalysis, AnalyticsTimeframe } from '../../lib/analyticsUtils';
import { Application } from '../../types';
import { TrendingUp, Flame } from 'lucide-react';

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
    totalActions,
    streakWeeks,
    weeklyTrend,
  } = momentum;

  const maxActivity = Math.max(1, ...weeklyTrend.map((w) => w.totalActivity));

  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Activity & Cadence
            </h3>
          </div>
        </div>

        {/* Streak & Total Actions */}
        <div className="flex items-center gap-2">
          {streakWeeks > 0 && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg text-xs text-amber-900 font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>{streakWeeks}w streak</span>
            </div>
          )}

          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            {totalActions} actions
          </span>
        </div>
      </div>

      {/* Activity Histogram */}
      <div className="space-y-2 pt-1">
        {/* Legend */}
        <div className="flex items-center justify-end gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Apps
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Stage moves
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Tasks
          </span>
        </div>

        {/* Histogram Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 items-end h-32 pt-2 px-1">
          {weeklyTrend.map((item, idx) => {
            const heightPct = Math.round((item.totalActivity / maxActivity) * 100);

            return (
              <div key={idx} className="flex flex-col items-center h-full justify-end group">
                {/* Count tooltip on hover */}
                <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                  {item.totalActivity}
                </div>

                {/* Vertical Bar */}
                <div className="w-full max-w-[28px] bg-slate-100 rounded-t-md h-20 flex flex-col justify-end overflow-hidden">
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
                  <span className="block text-[10px] font-medium text-slate-500">
                    {item.periodLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
