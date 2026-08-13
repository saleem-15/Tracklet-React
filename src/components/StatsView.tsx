import React from 'react';
import { Application } from '../types';
import { calculateDaysInStage } from '../lib/sampleData';
import { Activity, Percent, Clock, Award, CheckSquare, Users } from 'lucide-react';
import { WeeklyActivityWidget } from './WeeklyActivityWidget';

interface StatsViewProps {
  applications: Application[];
}

export const StatsView: React.FC<StatsViewProps> = ({ applications }) => {
  const nonArchivedApps = applications.filter((a) => a.status !== 'Archived');
  const totalNonArchived = nonArchivedApps.length;

  const activeApps = nonArchivedApps.filter(
    (a) => a.status === 'Applied' || a.status === 'Screening' || a.status === 'Interview' || a.status === 'Offer'
  );

  const responseCount = nonArchivedApps.filter(
    (a) => a.status === 'Screening' || a.status === 'Interview' || a.status === 'Offer'
  ).length;

  const responseRatePct = totalNonArchived > 0
    ? Math.round((responseCount / totalNonArchived) * 100)
    : 0;

  // Average days per stage
  const totalDaysInCurrentStage = activeApps.reduce(
    (acc, a) => acc + calculateDaysInStage(a.stageUpdatedAt),
    0
  );
  const avgDaysPerStage = activeApps.length > 0
    ? (totalDaysInCurrentStage / activeApps.length).toFixed(1)
    : '0';

  const offerCount = applications.filter((a) => a.status === 'Offer').length;
  const interviewCount = applications.filter((a) => a.status === 'Interview').length;

  // Tasks and Contacts metrics across all applications
  let totalTasks = 0;
  let completedTasks = 0;
  let totalContacts = 0;

  applications.forEach((app) => {
    if (app.tasks) {
      totalTasks += app.tasks.length;
      completedTasks += app.tasks.filter((t) => t.completed).length;
    }
    if (app.contacts) {
      totalContacts += app.contacts.length;
    }
  });

  const pendingTasks = totalTasks - completedTasks;

  // Platform breakdown
  const platformCounts: Record<string, number> = {};
  nonArchivedApps.forEach((a) => {
    platformCounts[a.platform] = (platformCounts[a.platform] || 0) + 1;
  });

  const sortedPlatforms = Object.entries(platformCounts).sort((a, b) => b[1] - a[1]);
  const maxPlatformCount = sortedPlatforms.length > 0 ? Math.max(...sortedPlatforms.map((p) => p[1])) : 1;

  // Stage breakdown
  const stageCounts = {
    Wishlist: applications.filter((a) => a.status === 'Wishlist').length,
    Applied: applications.filter((a) => a.status === 'Applied').length,
    Screening: applications.filter((a) => a.status === 'Screening').length,
    Interview: applications.filter((a) => a.status === 'Interview').length,
    Offer: applications.filter((a) => a.status === 'Offer').length,
    Rejected: applications.filter((a) => a.status === 'Rejected').length,
    Archived: applications.filter((a) => a.status === 'Archived').length,
  };

  // Funnel conversion percentages
  const wishlistToAppliedRate = stageCounts.Wishlist + stageCounts.Applied > 0
    ? Math.round((stageCounts.Applied / (stageCounts.Wishlist + stageCounts.Applied)) * 100)
    : 0;

  const appliedToScreeningRate = stageCounts.Applied > 0
    ? Math.round((stageCounts.Screening / stageCounts.Applied) * 100)
    : 0;

  return (
    <div className="flex-1 bg-slate-50/50 p-6 overflow-y-auto space-y-6 text-slate-900 select-none">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Job Search Performance & Analytics
        </h2>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Metrics calculated across <span className="font-semibold text-slate-700 font-mono">{totalNonArchived}</span> active applications
        </p>
      </div>

      {/* Weekly Activity Summary Widget */}
      <WeeklyActivityWidget applications={applications} />

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Active Applications */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Active Pipeline
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {activeApps.length}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              of <span className="font-semibold text-slate-700">{totalNonArchived}</span> total
            </span>
          </div>
        </div>

        {/* Card 2: Response Rate */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Response Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {responseRatePct}%
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              <span className="font-semibold text-slate-700">{responseCount}</span> progression calls
            </span>
          </div>
        </div>

        {/* Card 3: Avg Days Per Stage */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Avg Days in Stage
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {avgDaysPerStage}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              days velocity
            </span>
          </div>
        </div>

        {/* Card 4: Offers & Active Loops */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Offers & Loops
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-slate-900">
              {offerCount} <span className="text-xs font-normal text-slate-500">offers</span>
            </span>
            <span className="text-[11px] font-mono text-blue-600 font-semibold">
              {interviewCount} interviews
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Row: Actionable Tasks & Network Contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                Tasks & Follow-ups
              </span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {pendingTasks} Pending <span className="text-slate-400 font-normal text-xs font-sans">({completedTasks} completed)</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
              {totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}% Complete` : '0 Tasks'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                Recruiters & Contacts
              </span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {totalContacts} Saved Contact{totalContacts !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              Network Hub
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Platform breakdown & Stage distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Horizontal bar breakdown by Platform */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Applications by Job Platform
            </h3>
            <span className="font-mono text-[11px] text-slate-400">
              Volume Distribution
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {sortedPlatforms.length === 0 ? (
              <p className="text-slate-400 font-mono text-xs">No platform data available.</p>
            ) : (
              sortedPlatforms.map(([platform, count]) => {
                const percentage = Math.round((count / maxPlatformCount) * 100);
                const totalShare = Math.round((count / totalNonArchived) * 100);

                return (
                  <div key={platform} className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-slate-700 font-semibold">{platform}</span>
                      <span className="text-slate-500 font-medium">
                        {count} apps <span className="text-blue-600 font-semibold">({totalShare}%)</span>
                      </span>
                    </div>

                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Stage Funnel Distribution */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Pipeline Stage Funnel
            </h3>
            <span className="font-mono text-[11px] text-slate-400">
              Status Counts
            </span>
          </div>

          <div className="space-y-2.5 pt-1 text-xs font-mono">
            {/* Wishlist / Saved */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/70 border border-purple-200/70">
              <span className="text-purple-800 font-medium">Saved</span>
              <span className="text-purple-800 font-bold">{stageCounts.Wishlist}</span>
            </div>

            {/* Applied */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
              <span className="text-slate-700 font-medium">Applied</span>
              <span className="text-slate-900 font-bold">{stageCounts.Applied}</span>
            </div>

            {/* Screening */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/70">
              <span className="text-amber-800 font-medium">Screening</span>
              <span className="text-amber-800 font-bold">{stageCounts.Screening}</span>
            </div>

            {/* Interview */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/70">
              <span className="text-blue-800 font-medium">Interview</span>
              <span className="text-blue-800 font-bold">{stageCounts.Interview}</span>
            </div>

            {/* Offer */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
              <span className="text-emerald-800 font-medium">Offer</span>
              <span className="text-emerald-800 font-bold">{stageCounts.Offer}</span>
            </div>

            {/* Rejected & Archived */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/70 border border-rose-200/70">
                <span className="text-rose-800 text-[11px] font-medium">Rejected</span>
                <span className="text-rose-800 font-bold">{stageCounts.Rejected}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100/80 border border-slate-200/80">
                <span className="text-slate-600 text-[11px] font-medium">Archived</span>
                <span className="text-slate-700 font-bold">{stageCounts.Archived}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
