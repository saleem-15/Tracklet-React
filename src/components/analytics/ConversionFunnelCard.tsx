import React from 'react';
import { calculateConversionFunnel } from '../../lib/analyticsUtils';
import { Application } from '../../types';
import { 
  Filter, 
  ArrowRight, 
  TrendingDown, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface ConversionFunnelCardProps {
  applications: Application[];
  className?: string;
}

export const ConversionFunnelCard: React.FC<ConversionFunnelCardProps> = ({
  applications,
  className = '',
}) => {
  const funnel = calculateConversionFunnel(applications);
  const { stages, overallYieldPct, funnelHealth, bottleneckAdvice } = funnel;

  const maxStageCount = Math.max(1, ...stages.map((s) => s.count));

  const healthBadgeStyle = {
    optimal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    moderate: 'bg-blue-50 text-blue-700 border-blue-200',
    needs_attention: 'bg-amber-50 text-amber-700 border-amber-200',
  }[funnelHealth];

  const healthLabel = {
    optimal: 'High Conversion Yield',
    moderate: 'Healthy Pipeline Balance',
    needs_attention: 'Pipeline Bottleneck Detected',
  }[funnelHealth];

  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Header: Title, Health Indicator & Overall Conversion */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              End-to-End Conversion Funnel
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">
              Stage-by-stage progression yield from Saved to Offer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border ${healthBadgeStyle}`}>
            {healthLabel}
          </span>
          <div className="bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-700">
            Yield: <strong className="text-slate-900 font-bold">{overallYieldPct}%</strong>
          </div>
        </div>
      </div>

      {/* Funnel Stages List with Stepped Progression */}
      <div className="space-y-3 pt-1">
        {stages.map((stage, idx) => {
          const widthPct = Math.max(8, Math.round((stage.count / maxStageCount) * 100));
          const isLast = idx === stages.length - 1;

          return (
            <div key={stage.status} className="space-y-1.5 group">
              {/* Top Row: Label, Volume & Conversion vs Prev */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{stage.label}</span>
                </div>

                <div className="flex items-center gap-3">
                  {idx > 0 && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Pass rate:{' '}
                      <strong className={`font-bold ${stage.conversionFromPrev >= 50 ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {stage.conversionFromPrev}%
                      </strong>
                    </span>
                  )}
                  <span className="font-bold text-slate-900 text-xs">
                    {stage.count} <span className="font-normal text-slate-500 text-[11px]">({stage.percentageOfTotal}%)</span>
                  </span>
                </div>
              </div>

              {/* Progress Bar with Custom Color Tint */}
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
                <div
                  className={`h-full ${stage.bgLight} rounded-full transition-all duration-500 group-hover:brightness-105`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>

              {/* Transition Indicator to next stage */}
              {!isLast && stage.dropoffCount > 0 && (
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 px-2 py-0.5">
                  <div className="flex items-center gap-1 text-slate-400">
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span>Drop-off to next stage</span>
                  </div>
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-rose-500" />
                    {stage.dropoffCount} ({stage.dropoffRate}%)
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Funnel Diagnostics & Actionable Recommendations */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-700">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 block font-heading text-xs">
            Funnel Optimization Intelligence
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {bottleneckAdvice}
          </p>
        </div>
      </div>
    </div>
  );
};
