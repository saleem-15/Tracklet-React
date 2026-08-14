import React from 'react';
import { ExecutiveKpis } from '../../lib/analyticsUtils';
import { 
  Activity, 
  Percent, 
  Award, 
  Clock, 
  AlertTriangle, 
  CheckSquare, 
  Users, 
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

interface AnalyticsHeroKPIsProps {
  kpis: ExecutiveKpis;
  onViewStaleApps?: () => void;
}

export const AnalyticsHeroKPIs: React.FC<AnalyticsHeroKPIsProps> = ({ 
  kpis,
  onViewStaleApps,
}) => {
  const {
    totalApplications,
    activePipelineCount,
    activePipelinePct,
    interviewProgressionCount,
    interviewProgressionPct,
    offerCount,
    offerRatePct,
    interviewCount,
    avgDaysPerStage,
    ghostedCount,
    ghostingRatePct,
    totalTasks,
    completedTasks,
    taskCompletionRatePct,
    totalContacts,
  } = kpis;

  const pendingTasks = totalTasks - completedTasks;

  return (
    <div className="space-y-4">
      {/* 4 Primary Executive Intelligence KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Pipeline */}
        <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-2xs hover:shadow-xs hover:border-blue-200 transition-all group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500">
              Active Pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-extrabold text-slate-900 tracking-tight">
                {activePipelineCount}
              </span>
              <span className="text-xs font-mono font-medium text-slate-400">
                / {totalApplications} total
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, activePipelinePct)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
            <span>Pipeline share</span>
            <span className="font-bold text-blue-600">{activePipelinePct}% active</span>
          </div>
        </div>

        {/* Card 2: Interview Progression Yield */}
        <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-2xs hover:shadow-xs hover:border-emerald-200 transition-all group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500">
              Progression Yield
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Percent className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-extrabold text-slate-900 tracking-tight">
                {interviewProgressionPct}%
              </span>
              <span className="text-xs font-mono text-emerald-600 font-semibold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {interviewProgressionCount} calls
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, interviewProgressionPct)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
            <span>Market benchmark</span>
            <span className="font-semibold text-slate-700">10 – 20%</span>
          </div>
        </div>

        {/* Card 3: Offer Conversion & Loops */}
        <div className="bg-white border border-slate-200/90 p-4.5 rounded-2xl shadow-2xs hover:shadow-xs hover:border-indigo-200 transition-all group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500">
              Offers & Loops
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-mono font-extrabold text-slate-900 tracking-tight">
                  {offerCount}
                </span>
                <span className="text-xs font-mono text-emerald-600 font-bold uppercase">
                  {offerCount === 1 ? 'Offer' : 'Offers'}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                {interviewCount} {interviewCount === 1 ? 'Loop' : 'Loops'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, offerRatePct)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
            <span>Loop conversion</span>
            <span className="font-bold text-indigo-600">{offerRatePct}% win rate</span>
          </div>
        </div>

        {/* Card 4: Ghosting & Stale Risk */}
        <div 
          onClick={onViewStaleApps}
          className={`bg-white border p-4.5 rounded-2xl shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between select-none ${
            ghostedCount > 0 
              ? 'border-amber-200/90 hover:border-amber-400 cursor-pointer' 
              : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500">
              Ghosting & Stale Risk
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
              ghostedCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-extrabold text-slate-900 tracking-tight">
                {ghostedCount}
              </span>
              <span className="text-xs font-mono font-medium text-amber-700">
                {ghostedCount === 1 ? 'stale app' : 'stale apps'} (&gt;14d)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  ghostingRatePct > 40 ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, ghostingRatePct)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-100">
            <span>Staleness rate</span>
            <span className={`font-bold ${ghostingRatePct > 30 ? 'text-amber-700' : 'text-slate-700'}`}>
              {ghostingRatePct}% of active
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Row: Velocity, Tasks Pacing & Network Contacts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stage Velocity Metric */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                Avg Stage Velocity
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {avgDaysPerStage} <span className="text-xs font-medium text-slate-500 font-sans">days per stage</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              Pace Index
            </span>
          </div>
        </div>

        {/* Tasks & Deliverables Pacing */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckSquare className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                Take-homes & Tasks
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {pendingTasks} Pending <span className="text-xs font-normal text-slate-400 font-sans">({completedTasks} done)</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
              {totalTasks > 0 ? `${taskCompletionRatePct}% Done` : '0 Tasks'}
            </span>
          </div>
        </div>

        {/* Networking & Recruiter Contacts */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                Network & Referrals
              </span>
              <span className="text-base font-extrabold text-slate-900 font-mono">
                {totalContacts} Saved <span className="text-xs font-normal text-slate-400 font-sans">recruiter contacts</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/80">
              Rolodex
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
