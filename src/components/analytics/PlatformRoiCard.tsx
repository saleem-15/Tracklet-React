import React from 'react';
import { calculatePlatformRoi, PlatformRoiMetric } from '../../lib/analyticsUtils';
import { Application, JobPlatform } from '../../types';
import { Globe, Award, Sparkles, TrendingUp, HelpCircle } from 'lucide-react';

interface PlatformRoiCardProps {
  applications: Application[];
  className?: string;
}

const PLATFORM_COLORS: Record<string, { bar: string; badge: string }> = {
  LinkedIn: { bar: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  Indeed: { bar: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Lever: { bar: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Greenhouse: { bar: 'bg-teal-600', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  Otta: { bar: 'bg-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  'Company Site': { bar: 'bg-cyan-600', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  Referral: { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  Wellfound: { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  Other: { bar: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const PlatformRoiCard: React.FC<PlatformRoiCardProps> = ({
  applications,
  className = '',
}) => {
  const { metrics, topChannel, insight } = calculatePlatformRoi(applications);

  const maxVolume = Math.max(1, ...metrics.map((m) => m.totalApps));

  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Top Header: Title & Channel Spotlight */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Application Source & Platform ROI
            </h3>
            <p className="text-[11px] text-slate-500 font-sans">
              Compare application volume vs response rate & offer conversion by channel
            </p>
          </div>
        </div>

        {topChannel && topChannel.totalApps > 0 && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs font-mono text-amber-900">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>
              Top ROI: <strong className="font-bold">{topChannel.platform}</strong> ({topChannel.interviewRatePct}% yield)
            </span>
          </div>
        )}
      </div>

      {/* Channel Comparison List */}
      <div className="space-y-3.5 pt-1">
        {metrics.length === 0 ? (
          <div className="text-center py-8 text-slate-400 font-mono text-xs">
            No application sources recorded in current scope.
          </div>
        ) : (
          metrics.map((item) => {
            const colors = PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.Other;
            const volumeWidthPct = Math.max(12, Math.round((item.totalApps / maxVolume) * 100));

            return (
              <div key={item.platform} className="space-y-1.5 group">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${colors.badge}`}>
                      {item.platform}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {item.totalApps} {item.totalApps === 1 ? 'app' : 'apps'} ({item.sharePct}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-slate-500">
                      Response:{' '}
                      <strong className={`font-bold ${item.interviewRatePct > 0 ? 'text-blue-600' : 'text-slate-600'}`}>
                        {item.interviewRatePct}%
                      </strong>
                    </span>
                    {item.offerCount > 0 && (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {item.offerCount} {item.offerCount === 1 ? 'Offer' : 'Offers'}
                      </span>
                    )}
                    <span 
                      title={`Yield Score: ${item.interviewRatePct}% response yield + offer conversion weight`}
                      className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] cursor-help"
                    >
                      ROI {item.roiScore}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className={`h-full ${colors.bar} rounded-full transition-all duration-300 group-hover:brightness-110`}
                    style={{ width: `${volumeWidthPct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Actionable Source Insight Spotlight */}
      <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-700">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 block font-heading text-xs">
            Source Yield Intelligence
          </span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {insight}
          </p>
        </div>
      </div>
    </div>
  );
};
