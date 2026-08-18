import React, { useState } from 'react';
import { calculateMomentumAnalysis, AnalyticsTimeframe } from '../../lib/analyticsUtils';
import { Application } from '../../types';
import { TrendingUp, Flame, Send, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

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
              Activity & Consistency Cadence
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
            {totalActions} total actions
          </span>
        </div>
      </div>

      {/* 3 Clear, High-Clarity Activity Metric Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Applications Submitted */}
        <div className="bg-slate-50/70 border border-slate-200/70 p-3 rounded-xl hover:border-blue-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 truncate">Applications</span>
            <Send className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              +{totalApps}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">submitted</span>
          </div>
        </div>

        {/* Stage Progressions */}
        <div className="bg-slate-50/70 border border-slate-200/70 p-3 rounded-xl hover:border-indigo-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 truncate">Stage Moves</span>
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {totalStageMoves}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">progressed</span>
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="bg-slate-50/70 border border-slate-200/70 p-3 rounded-xl hover:border-emerald-200 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 truncate">Tasks Done</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {totalTasks}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">completed</span>
          </div>
        </div>
      </div>

      {/* Stacked Histogram Chart Area with Floating Tooltip */}
      <div className="space-y-2 pt-1 relative">
        {/* Legend */}
        <div className="flex items-center justify-end gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Applications
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Stage moves
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Tasks
          </span>
        </div>

        {/* Stacked Vertical Bars Grid (always clean single row 8-column layout) */}
        <div className="grid grid-cols-8 gap-1 sm:gap-2 items-end h-32 pt-2 px-1 relative overflow-visible">
          {weeklyTrend.map((item, idx) => {
            const isHovered = hoveredIndex === idx;
            const totalH = Math.round((item.totalActivity / maxActivity) * 100);

            // Stacked segment percentages
            const appsPct = item.totalActivity > 0 ? (item.appsCount / item.totalActivity) * 100 : 0;
            const stagePct = item.totalActivity > 0 ? (item.statusChangesCount / item.totalActivity) * 100 : 0;
            const tasksPct = item.totalActivity > 0 ? (item.tasksDoneCount / item.totalActivity) * 100 : 0;

            return (
              <div 
                key={idx} 
                className="flex flex-col items-center h-full justify-end group cursor-pointer relative min-w-0"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Clean Floating Mini Popover Tooltip Anchored to Bar */}
                {isHovered && item.totalActivity > 0 && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-800 text-[11px] pointer-events-none z-30 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                    <div className="font-semibold text-slate-200 text-center">
                      {item.periodLabel} ({item.fullDate})
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      {item.appsCount > 0 && (
                        <span className="text-blue-400">+{item.appsCount} apps</span>
                      )}
                      {item.statusChangesCount > 0 && (
                        <span className="text-indigo-300">{item.statusChangesCount} moves</span>
                      )}
                      {item.tasksDoneCount > 0 && (
                        <span className="text-emerald-400">{item.tasksDoneCount} tasks</span>
                      )}
                      <span className="font-bold text-white border-l border-slate-700 pl-1.5">
                        {item.totalActivity} total
                      </span>
                    </div>
                    {/* Tooltip Arrow */}
                    <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-r border-b border-slate-800" />
                  </div>
                )}

                {/* Total count badge above bar */}
                <div className={`text-[11px] font-bold font-mono transition-opacity mb-1 ${
                  item.totalActivity > 0 ? 'text-slate-700 opacity-80 group-hover:opacity-100' : 'opacity-0'
                }`}>
                  {item.totalActivity > 0 ? item.totalActivity : ''}
                </div>

                {/* Stacked Vertical Bar */}
                <div className={`w-full max-w-[28px] bg-slate-100 rounded-t-md h-20 flex flex-col justify-end overflow-hidden border transition-all duration-200 ${
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
                        />
                      )}
                      {/* Stage changes segment (middle, indigo) */}
                      {item.statusChangesCount > 0 && (
                        <div 
                          className="w-full bg-indigo-500"
                          style={{ height: `${stagePct}%` }}
                        />
                      )}
                      {/* Tasks segment (top, emerald) */}
                      {item.tasksDoneCount > 0 && (
                        <div 
                          className="w-full bg-emerald-500"
                          style={{ height: `${tasksPct}%` }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-1 bg-slate-200/60 rounded-t-md" />
                  )}
                </div>

                {/* Period label */}
                <div className="text-center mt-1.5 min-w-0 w-full truncate">
                  <span className={`block text-[11px] font-semibold transition-colors truncate ${
                    isHovered ? 'text-blue-600 font-bold' : 'text-slate-500'
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
