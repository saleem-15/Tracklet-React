import React, { useState } from 'react';
import { calculateMomentumAnalysis, AnalyticsTimeframe, VelocityTrendPoint } from '../../lib/analyticsUtils';
import { Application } from '../../types';
import { TrendingUp, Flame, PlusCircle, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const momentum = calculateMomentumAnalysis(applications, timeframe);
  const {
    totalActions,
    streakWeeks,
    weeklyTrend,
  } = momentum;

  // Aggregate totals across all periods in scope
  const totalApps = weeklyTrend.reduce((sum, w) => sum + w.appsCount, 0);
  const totalStageMoves = weeklyTrend.reduce((sum, w) => sum + w.statusChangesCount, 0);
  const totalTasks = weeklyTrend.reduce((sum, w) => sum + w.tasksDoneCount, 0);

  const maxActivity = Math.max(1, ...weeklyTrend.map((w) => w.totalActivity));

  const hoveredItem: VelocityTrendPoint | null = 
    hoveredIndex !== null && weeklyTrend[hoveredIndex] ? weeklyTrend[hoveredIndex] : null;

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

      {/* Clean 3-Category Breakdown Summary Strip */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
            <span className="text-xs text-slate-600 font-medium">Apps</span>
          </div>
          <span className="text-sm font-bold text-slate-900 font-mono">
            +{totalApps}
          </span>
        </div>

        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-xs text-slate-600 font-medium">Stage moves</span>
          </div>
          <span className="text-sm font-bold text-slate-900 font-mono">
            {totalStageMoves}
          </span>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs text-slate-600 font-medium">Tasks</span>
          </div>
          <span className="text-sm font-bold text-slate-900 font-mono">
            {totalTasks}
          </span>
        </div>
      </div>

      {/* Stacked Histogram Chart Area */}
      <div className="space-y-2 pt-1 relative">
        {/* Dynamic Detail Tooltip on Hover */}
        {hoveredItem && (
          <div className="bg-slate-900 text-white rounded-xl px-3 py-1.5 text-xs shadow-lg flex items-center justify-between gap-4 animate-in fade-in duration-150">
            <span className="font-medium text-slate-300">
              {hoveredItem.periodLabel} ({hoveredItem.fullDate}):
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-blue-300">+{hoveredItem.appsCount} apps</span>
              <span className="text-indigo-300">{hoveredItem.statusChangesCount} moves</span>
              <span className="text-emerald-300">{hoveredItem.tasksDoneCount} tasks</span>
              <strong className="text-white font-bold">Total: {hoveredItem.totalActivity}</strong>
            </div>
          </div>
        )}

        {/* Stacked Vertical Bars Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 items-end h-28 pt-2 px-1">
          {weeklyTrend.map((item, idx) => {
            const isHovered = hoveredIndex === idx;
            const totalH = Math.round((item.totalActivity / maxActivity) * 100);

            // Sub-segment heights proportional to item.totalActivity
            const appsPct = item.totalActivity > 0 ? (item.appsCount / item.totalActivity) * 100 : 0;
            const stagePct = item.totalActivity > 0 ? (item.statusChangesCount / item.totalActivity) * 100 : 0;
            const tasksPct = item.totalActivity > 0 ? (item.tasksDoneCount / item.totalActivity) * 100 : 0;

            return (
              <div 
                key={idx} 
                className="flex flex-col items-center h-full justify-end group cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Total count badge above bar */}
                <div className={`text-[10px] font-bold font-mono transition-opacity mb-1 ${
                  item.totalActivity > 0 ? 'text-slate-700 opacity-80 group-hover:opacity-100' : 'opacity-0'
                }`}>
                  {item.totalActivity > 0 ? item.totalActivity : ''}
                </div>

                {/* Stacked Vertical Bar */}
                <div className={`w-full max-w-[28px] bg-slate-100 rounded-t-md h-20 flex flex-col justify-end overflow-hidden border transition-all ${
                  isHovered ? 'border-blue-400 ring-2 ring-blue-100 scale-105' : 'border-slate-200/50'
                }`}>
                  {item.totalActivity > 0 ? (
                    <div 
                      className="w-full flex flex-col-reverse rounded-t-md overflow-hidden transition-all duration-300"
                      style={{ height: `${Math.max(18, totalH)}%` }}
                    >
                      {/* Apps segment (bottom, blue) */}
                      {item.appsCount > 0 && (
                        <div 
                          className="w-full bg-blue-600"
                          style={{ height: `${appsPct}%` }}
                          title={`${item.appsCount} Applications`}
                        />
                      )}
                      {/* Stage changes segment (middle, indigo) */}
                      {item.statusChangesCount > 0 && (
                        <div 
                          className="w-full bg-indigo-500"
                          style={{ height: `${stagePct}%` }}
                          title={`${item.statusChangesCount} Stage Changes`}
                        />
                      )}
                      {/* Tasks segment (top, emerald) */}
                      {item.tasksDoneCount > 0 && (
                        <div 
                          className="w-full bg-emerald-500"
                          style={{ height: `${tasksPct}%` }}
                          title={`${item.tasksDoneCount} Tasks Done`}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-1 bg-slate-200/60 rounded-t-md" />
                  )}
                </div>

                {/* Period label */}
                <div className="text-center mt-1.5 min-w-0 w-full">
                  <span className={`block text-[10px] font-semibold transition-colors ${
                    isHovered ? 'text-blue-600' : 'text-slate-500'
                  }`}>
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
