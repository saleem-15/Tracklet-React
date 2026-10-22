import React from 'react';
import { Sparkles } from 'lucide-react';

export interface PlanUsageSectionProps {
  isPro: boolean;
  activeCount: number;
  maxActiveQuota: number;
  isGrandfathered: boolean;
  scrapesUsed: number;
  maxScrapes: number;
  onUpgradeClick: () => void;
}

export const PlanUsageSection: React.FC<PlanUsageSectionProps> = ({
  isPro,
  activeCount,
  maxActiveQuota,
  isGrandfathered,
  scrapesUsed,
  maxScrapes,
  onUpgradeClick,
}) => {
  return (
    <div className="p-4.5 rounded-xl bg-slate-50/80 border border-slate-200/90 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-700">Subscription Tier:</span>
          {isPro ? (
            <span className="inline-flex items-center gap-1 font-mono text-xs bg-purple-50 text-purple-700 border border-purple-200/80 px-2.5 py-0.5 rounded-full font-bold">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>Pro Plan (Active)</span>
            </span>
          ) : (
            <span className="font-mono text-xs bg-slate-200/80 text-slate-700 border border-slate-300/80 px-2.5 py-0.5 rounded-full font-bold">
              Free Plan
            </span>
          )}
        </div>

        {!isPro && (
          <button
            type="button"
            onClick={onUpgradeClick}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Upgrade to Pro →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Active Applications Capacity */}
        <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Active Applications</span>
            <span className="font-mono font-bold text-slate-900">
              {activeCount} / {maxActiveQuota === Infinity ? '∞' : maxActiveQuota}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                activeCount >= maxActiveQuota ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{
                width: `${Math.min(100, (activeCount / (maxActiveQuota === Infinity ? 100 : maxActiveQuota)) * 100)}%`,
              }}
            />
          </div>
          {isGrandfathered && (
            <p className="text-[10px] text-emerald-700 font-medium">
              Grandfathered: You can manage all imported applications.
            </p>
          )}
        </div>

        {/* Monthly Scrape Quota */}
        <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">AI Fallback Scrapes</span>
            <span className="font-mono font-bold text-slate-900">
              {scrapesUsed} / {maxScrapes}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (scrapesUsed / maxScrapes) * 100)}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-sans">
            Resets monthly for web scraping fallback on unsupported job boards.
          </p>
        </div>
      </div>
    </div>
  );
};
