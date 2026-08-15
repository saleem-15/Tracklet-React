import React from 'react';
import { calculateConversionFunnel } from '../../lib/analyticsUtils';
import { Application } from '../../types';
import { Filter, Sparkles } from 'lucide-react';

interface ConversionFunnelCardProps {
  applications: Application[];
  className?: string;
}

export const ConversionFunnelCard: React.FC<ConversionFunnelCardProps> = ({
  applications,
  className = '',
}) => {
  const funnel = calculateConversionFunnel(applications);
  const { stages, overallYieldPct, bottleneckAdvice } = funnel;

  const maxStageCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Conversion Funnel
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
            {overallYieldPct}% Overall Yield
          </span>
        </div>
      </div>

      {/* Funnel Stages List */}
      <div className="space-y-3.5 pt-1">
        {stages.map((stage, idx) => {
          const widthPct = Math.max(10, Math.round((stage.count / maxStageCount) * 100));

          return (
            <div key={stage.status} className="space-y-1.5 group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-4.5 h-4.5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{stage.label}</span>
                </div>

                <div className="flex items-center gap-3">
                  {idx > 0 && (
                    <span className="text-xs text-slate-400">
                      Pass rate: <strong className="text-slate-700 font-semibold">{stage.conversionFromPrev}%</strong>
                    </span>
                  )}
                  <span className="font-bold text-slate-900 text-xs">
                    {stage.count} <span className="font-normal text-slate-400">({stage.percentageOfTotal}%)</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${stage.bgLight} rounded-full transition-all duration-500 group-hover:brightness-105`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Bottleneck Insight */}
      {bottleneckAdvice && applications.length >= 3 && (
        <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
          <span className="leading-snug">{bottleneckAdvice}</span>
        </div>
      )}
    </div>
  );
};
