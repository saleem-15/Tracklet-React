import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  PlusCircle, 
  CheckCircle2, 
  ArrowRightLeft, 
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Layers,
  BarChart2
} from 'lucide-react';
import { Application } from '../types';
import { CustomSelectDropdown, SelectOption } from './CustomSelectDropdown';

interface WeeklyActivityWidgetProps {
  applications: Application[];
  className?: string;
}

export type PeriodType = 'week' | 'month';

// Helper: Format date as "MMM D, YYYY"
function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper: Get start/end and days for a given week offset (0 = current week, -1 = last week, etc.)
function getWeekRange(weekOffset: number) {
  const now = new Date();
  const currentDay = now.getDay();
  // Monday as start of week (1), Sunday as end (0 -> 7)
  const diffToMon = currentDay === 0 ? -6 : 1 - currentDay;

  const startMon = new Date(now);
  startMon.setDate(now.getDate() + diffToMon + weekOffset * 7);
  startMon.setHours(0, 0, 0, 0);

  const endSun = new Date(startMon);
  endSun.setDate(startMon.getDate() + 6);
  endSun.setHours(23, 59, 59, 999);

  // Individual 7 days
  const days = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(startMon);
    dayStart.setDate(startMon.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    days.push({
      name: dayNames[i],
      shortDate: formatDateShort(dayStart),
      start: dayStart,
      end: dayEnd,
      isToday: dayStart.toDateString() === now.toDateString(),
    });
  }

  return {
    start: startMon,
    end: endSun,
    label: `${formatDateShort(startMon)} – ${formatDateShort(endSun)}, ${startMon.getFullYear()}`,
    days,
  };
}

// Helper: Get start/end and weeks for a given month offset (0 = current month, -1 = last month, etc.)
function getMonthRange(monthOffset: number) {
  const now = new Date();
  const targetYear = now.getFullYear();
  const targetMonth = now.getMonth() + monthOffset;

  const startOfMonth = new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

  const monthName = startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Generate 4-5 weekly slices for the month
  const weeks = [];
  let currentStart = new Date(startOfMonth);
  let weekNum = 1;

  while (currentStart <= endOfMonth) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentStart.getDate() + 6);
    currentEnd.setHours(23, 59, 59, 999);

    const actualEnd = currentEnd > endOfMonth ? endOfMonth : currentEnd;

    weeks.push({
      name: `W${weekNum}`,
      label: `${formatDateShort(currentStart)} - ${formatDateShort(actualEnd)}`,
      start: new Date(currentStart),
      end: new Date(actualEnd),
    });

    currentStart = new Date(actualEnd);
    currentStart.setDate(currentStart.getDate() + 1);
    currentStart.setHours(0, 0, 0, 0);
    weekNum++;
  }

  return {
    start: startOfMonth,
    end: endOfMonth,
    label: monthName,
    weeks,
  };
}

// Helper: Check if date string falls inside [start, end]
function isBetween(dateStr?: string, start?: Date, end?: Date): boolean {
  if (!dateStr || !start || !end) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

export const WeeklyActivityWidget: React.FC<WeeklyActivityWidgetProps> = ({ 
  applications,
  className = '' 
}) => {
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [monthOffset, setMonthOffset] = useState<number>(0);

  // Active range metadata
  const rangeInfo = useMemo(() => {
    if (periodType === 'week') {
      return getWeekRange(weekOffset);
    } else {
      return getMonthRange(monthOffset);
    }
  }, [periodType, weekOffset, monthOffset]);

  // Compute activity stats for the chosen range
  const activityData = useMemo(() => {
    const { start, end } = rangeInfo;
    let addedCount = 0;
    let tasksCompletedCount = 0;
    let statusChangedCount = 0;

    // Daily breakdown for week mode, or Weekly breakdown for month mode
    const breakdown = 'days' in rangeInfo 
      ? rangeInfo.days.map((day) => ({ name: day.name, label: day.shortDate, isToday: day.isToday, apps: 0, tasks: 0, status: 0, total: 0 }))
      : rangeInfo.weeks.map((week) => ({ name: week.name, label: week.label, isToday: false, apps: 0, tasks: 0, status: 0, total: 0 }));

    applications.forEach((app) => {
      // 1. App Created / Applied
      if (isBetween(app.createdAt, start, end) || isBetween(app.dateApplied, start, end)) {
        addedCount++;

        // Add to breakdown
        const dateToUse = app.createdAt || app.dateApplied;
        if ('days' in rangeInfo) {
          rangeInfo.days.forEach((day, idx) => {
            if (isBetween(dateToUse, day.start, day.end)) {
              breakdown[idx].apps++;
              breakdown[idx].total++;
            }
          });
        } else {
          rangeInfo.weeks.forEach((week, idx) => {
            if (isBetween(dateToUse, week.start, week.end)) {
              breakdown[idx].apps++;
              breakdown[idx].total++;
            }
          });
        }
      }

      // 2. Status Changed
      if (isBetween(app.stageUpdatedAt, start, end)) {
        statusChangedCount++;

        if ('days' in rangeInfo) {
          rangeInfo.days.forEach((day, idx) => {
            if (isBetween(app.stageUpdatedAt, day.start, day.end)) {
              breakdown[idx].status++;
              breakdown[idx].total++;
            }
          });
        } else {
          rangeInfo.weeks.forEach((week, idx) => {
            if (isBetween(app.stageUpdatedAt, week.start, week.end)) {
              breakdown[idx].status++;
              breakdown[idx].total++;
            }
          });
        }
      }

      // 3. Tasks completed
      if (app.tasks && app.tasks.length > 0) {
        const appIsRecent = 
          isBetween(app.updatedAt, start, end) || 
          isBetween(app.stageUpdatedAt, start, end) || 
          isBetween(app.createdAt, start, end);

        app.tasks.forEach((task) => {
          if (task.completed && appIsRecent) {
            tasksCompletedCount++;
          }
        });
      }
    });

    const maxBreakdownValue = Math.max(1, ...breakdown.map((b) => b.total));

    return {
      addedCount,
      tasksCompletedCount,
      statusChangedCount,
      totalEvents: addedCount + tasksCompletedCount + statusChangedCount,
      breakdown,
      maxBreakdownValue,
    };
  }, [applications, rangeInfo]);

  const { addedCount, tasksCompletedCount, statusChangedCount, totalEvents, breakdown, maxBreakdownValue } = activityData;

  // Offset options for quick selector dropdown
  const weekOptions = [
    { offset: 0, label: 'This Week' },
    { offset: -1, label: 'Last Week' },
    { offset: -2, label: '2 Weeks Ago' },
    { offset: -3, label: '3 Weeks Ago' },
    { offset: -4, label: '4 Weeks Ago' },
  ];

  const monthOptions = [
    { offset: 0, label: 'This Month' },
    { offset: -1, label: 'Last Month' },
    { offset: -2, label: '2 Months Ago' },
    { offset: -3, label: '3 Months Ago' },
    { offset: -4, label: '4 Months Ago' },
    { offset: -5, label: '5 Months Ago' },
  ];

  return (
    <div className={`bg-gradient-to-br from-white via-slate-50/60 to-blue-50/30 border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Top Header: Title & View Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Job Search Momentum & Activity
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">
              Track applications, status progressions, and tasks over custom time windows
            </p>
          </div>
        </div>

        {/* Controls: Mode Switcher (Week / Month) & Period Navigator */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week / Month Toggle Pills */}
          <div className="bg-slate-200/70 p-0.5 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setPeriodType('week')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                periodType === 'week'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriodType('month')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                periodType === 'month'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Quick Dropdown Select */}
          {periodType === 'week' ? (
            <CustomSelectDropdown<number>
              value={weekOffset}
              onChange={(val) => setWeekOffset(val)}
              options={weekOptions.map((opt) => ({ label: opt.label, value: opt.offset }))}
              size="sm"
            />
          ) : (
            <CustomSelectDropdown<number>
              value={monthOffset}
              onChange={(val) => setMonthOffset(val)}
              options={monthOptions.map((opt) => ({ label: opt.label, value: opt.offset }))}
              size="sm"
            />
          )}

          {/* Prev / Next Chevrons */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={() => {
                if (periodType === 'week') setWeekOffset((prev) => prev - 1);
                else setMonthOffset((prev) => prev - 1);
              }}
              className="p-1 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer border-r border-slate-100"
              title={periodType === 'week' ? 'Previous Week' : 'Previous Month'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={periodType === 'week' ? weekOffset >= 0 : monthOffset >= 0}
              onClick={() => {
                if (periodType === 'week') setWeekOffset((prev) => Math.min(0, prev + 1));
                else setMonthOffset((prev) => Math.min(0, prev + 1));
              }}
              className={`p-1 transition-colors ${
                (periodType === 'week' ? weekOffset >= 0 : monthOffset >= 0)
                  ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                  : 'hover:bg-slate-100 text-slate-600 cursor-pointer'
              }`}
              title={periodType === 'week' ? 'Next Week' : 'Next Month'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Period Indicator Tag */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
            {rangeInfo.label}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
          {periodType === 'week' ? 'Weekly breakdown' : 'Monthly breakdown'}
        </span>
      </div>

      {/* 3 Summary Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Applications Added */}
        <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl space-y-1.5 shadow-2xs hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500">
              Apps Added
            </span>
            <PlusCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-2xl font-mono font-bold text-slate-900">
              +{addedCount}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {addedCount === 1 ? '1 new app' : `${addedCount} new apps`}
            </span>
          </div>
        </div>

        {/* Metric 2: Tasks Completed */}
        <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl space-y-1.5 shadow-2xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500">
              Tasks Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {tasksCompletedCount}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {tasksCompletedCount === 1 ? '1 task done' : `${tasksCompletedCount} tasks done`}
            </span>
          </div>
        </div>

        {/* Metric 3: Statuses Changed */}
        <div className="bg-white border border-slate-200/80 p-3.5 rounded-xl space-y-1.5 shadow-2xs hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500">
              Statuses Changed
            </span>
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {statusChangedCount}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {statusChangedCount === 1 ? '1 stage move' : `${statusChangedCount} stage moves`}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Activity Chart / Timeline Histogram */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium border-b border-slate-100 pb-2">
          <span className="flex items-center gap-1.5 font-semibold text-slate-800">
            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{periodType === 'week' ? 'Daily Activity Distribution' : 'Weekly Activity Distribution'}</span>
          </span>
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Apps
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Status
            </span>
          </div>
        </div>

        {/* Bar Chart Slices */}
        <div className="grid grid-cols-7 gap-2 items-end h-24 pt-2 px-1">
          {breakdown.map((item, idx) => {
            const heightPct = Math.round((item.total / maxBreakdownValue) * 100);
            return (
              <div key={idx} className="flex flex-col items-center h-full justify-end group">
                {/* Count tooltip on hover */}
                <div className="text-[10px] font-mono font-bold text-slate-700 opacity-80 group-hover:opacity-100 transition-opacity mb-1">
                  {item.total > 0 ? item.total : ''}
                </div>

                {/* Stacked Vertical Bar */}
                <div className="w-full max-w-[28px] bg-slate-100 rounded-t-md h-16 flex flex-col justify-end overflow-hidden relative">
                  {item.total > 0 ? (
                    <div 
                      className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md transition-all duration-300"
                      style={{ height: `${Math.max(15, heightPct)}%` }}
                    />
                  ) : (
                    <div className="w-full h-1 bg-slate-200/60 rounded-t-md" />
                  )}
                </div>

                {/* Label */}
                <div className="text-center mt-1.5 min-w-0 w-full">
                  <span className={`block text-[11px] font-mono font-semibold ${item.isToday ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
                    {item.name}
                  </span>
                  <span className="block text-[9px] font-mono text-slate-400 truncate">
                    {item.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Bar & Motivation Banner */}
      <div className="bg-slate-100/70 p-2.5 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-medium text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>
            {totalEvents > 0 ? (
              <>
                <strong className="text-slate-900">{totalEvents} total actions</strong> recorded during this {periodType}. Keep pushing!
              </>
            ) : (
              `No activity recorded for this ${periodType}. Add applications or complete tasks to build momentum!`
            )}
          </span>
        </div>

        {totalEvents > 0 && (
          <div className="w-full sm:w-36 h-2 bg-slate-200 rounded-full overflow-hidden flex shrink-0 border border-slate-300/50">
            {addedCount > 0 && (
              <div 
                className="bg-blue-600 h-full" 
                style={{ width: `${(addedCount / totalEvents) * 100}%` }}
                title={`${addedCount} apps added`}
              />
            )}
            {tasksCompletedCount > 0 && (
              <div 
                className="bg-emerald-500 h-full" 
                style={{ width: `${(tasksCompletedCount / totalEvents) * 100}%` }}
                title={`${tasksCompletedCount} tasks completed`}
              />
            )}
            {statusChangedCount > 0 && (
              <div 
                className="bg-indigo-600 h-full" 
                style={{ width: `${(statusChangedCount / totalEvents) * 100}%` }}
                title={`${statusChangedCount} status changes`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
