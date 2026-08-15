import React from 'react';
import { calculatePlatformRoi } from '../../lib/analyticsUtils';
import { Application } from '../../types';
import { Globe, Award } from 'lucide-react';

interface PlatformRoiCardProps {
  applications: Application[];
  className?: string;
}

const PLATFORM_COLORS: Record<string, { bar: string; badge: string }> = {
  LinkedIn: { bar: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
  Indeed: { bar: 'bg-indigo-600', badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  Lever: { bar: 'bg-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  Greenhouse: { bar: 'bg-teal-600', badge: 'bg-teal-50 text-teal-700 border-teal-100' },
  Otta: { bar: 'bg-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-100' },
  'Company Site': { bar: 'bg-cyan-600', badge: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  Referral: { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  Wellfound: { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-100' },
  Other: { bar: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

export const PlatformRoiCard: React.FC<PlatformRoiCardProps> = ({
  applications,
  className = '',
}) => {
  const { metrics, topChannel } = calculatePlatformRoi(applications);

  const maxVolume = Math.max(1, ...metrics.map((m) => m.totalApps));

  return (
    <div className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Application Sources
            </h3>
          </div>
        </div>

        {topChannel && topChannel.totalApps > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg text-xs text-amber-900">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>
              Top Yield: <strong className="font-semibold">{topChannel.platform}</strong> ({topChannel.interviewRatePct}%)
            </span>
          </div>
        )}
      </div>

      {/* Sources List */}
      <div className="space-y-3.5 pt-1">
        {metrics.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No application sources recorded in current scope.
          </div>
        ) : (
          metrics.map((item) => {
            const colors = PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.Other;
            const volumeWidthPct = Math.max(12, Math.round((item.totalApps / maxVolume) * 100));

            return (
              <div key={item.platform} className="space-y-1.5 group">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${colors.badge}`}>
                      {item.platform}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {item.totalApps} {item.totalApps === 1 ? 'app' : 'apps'} ({item.sharePct}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="text-slate-500">
                      Response: <strong className={`font-semibold ${item.interviewRatePct > 0 ? 'text-blue-600' : 'text-slate-700'}`}>{item.interviewRatePct}%</strong>
                    </span>
                    {item.offerCount > 0 && (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                        {item.offerCount} {item.offerCount === 1 ? 'Offer' : 'Offers'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
    </div>
  );
};
