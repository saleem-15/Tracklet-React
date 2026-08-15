import React from 'react';
import { ExecutiveKpis } from '../../lib/analyticsUtils';
import { 
  Activity, 
  TrendingUp, 
  Award, 
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight
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
    ghostedCount,
  } = kpis;

  // Screening yield dynamic context
  const getScreeningBenchmarkText = () => {
    if (interviewProgressionCount === 0) return 'Awaiting initial screen';
    if (interviewProgressionPct >= 20) return 'Above avg (10–20%)';
    if (interviewProgressionPct >= 10) return 'On pace (10–20%)';
    return 'Below avg (<10%)';
  };

  const getScreeningBenchmarkColor = () => {
    if (interviewProgressionPct >= 20) return 'text-emerald-600 font-semibold';
    if (interviewProgressionPct >= 10) return 'text-slate-600 font-medium';
    return 'text-amber-600 font-semibold';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Active Pipeline */}
      <div 
        className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
        title="Active Pipeline: Total open applications currently in Saved, Applied, Screening, Interview, or Offer stages"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Active Pipeline
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {activePipelineCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              of {totalApplications} total
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, activePipelinePct)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
          <span>Active share</span>
          <span className="font-semibold text-blue-600">{activePipelinePct}%</span>
        </div>
      </div>

      {/* 2. Progression Yield (Screening Rate) */}
      <div 
        className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
        title="Screening Yield: Percentage of submitted applications that successfully progressed to recruiter screening calls"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Screening Yield
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {interviewProgressionPct}%
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {interviewProgressionCount} {interviewProgressionCount === 1 ? 'call' : 'calls'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, interviewProgressionPct)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
          <span>Benchmark</span>
          <span className={getScreeningBenchmarkColor()}>{getScreeningBenchmarkText()}</span>
        </div>
      </div>

      {/* 3. Offers & Loops */}
      <div 
        className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
        title="Offers & Loops: Offers received relative to completed or ongoing interview loops"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Offers & Loops
          </span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {offerCount}
              </span>
              <span className="text-xs font-semibold text-indigo-600 uppercase">
                {offerCount === 1 ? 'Offer' : 'Offers'}
              </span>
            </div>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {interviewCount} {interviewCount === 1 ? 'loop' : 'loops'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, offerRatePct)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
          <span>Loop win rate</span>
          <span className={`font-semibold ${offerCount > 0 ? 'text-indigo-600' : 'text-slate-600'}`}>
            {offerRatePct}%
          </span>
        </div>
      </div>

      {/* 4. Needs Attention / Stale Applications */}
      <div 
        onClick={ghostedCount > 0 ? onViewStaleApps : undefined}
        title="Needs Attention: Active applications without updates for >14 days (click to view)"
        className={`bg-white border p-5 rounded-2xl shadow-2xs transition-all flex flex-col justify-between group ${
          ghostedCount > 0 
            ? 'border-amber-200/80 hover:border-amber-300 hover:shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500' 
            : 'border-slate-200/80'
        }`}
        tabIndex={ghostedCount > 0 ? 0 : undefined}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && ghostedCount > 0) {
            e.preventDefault();
            onViewStaleApps?.();
          }
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Needs Attention
          </span>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            ghostedCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-600'
          }`}>
            {ghostedCount > 0 ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
        </div>

        <div className="my-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {ghostedCount}
            </span>
            <span className={`text-xs font-medium ${ghostedCount > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
              {ghostedCount === 1 ? 'stale app' : 'stale apps'} (&gt;14d)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                ghostedCount > 5 ? 'bg-rose-500' : ghostedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${ghostedCount > 0 ? Math.min(100, (ghostedCount / Math.max(1, activePipelineCount)) * 100) : 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100/80">
          <span>Action</span>
          <span className={`font-semibold flex items-center gap-0.5 ${
            ghostedCount > 0 ? 'text-amber-800 group-hover:text-amber-900' : 'text-emerald-700'
          }`}>
            {ghostedCount > 0 ? (
              <>
                <span>Review follow-ups</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </>
            ) : (
              'All up to date'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
