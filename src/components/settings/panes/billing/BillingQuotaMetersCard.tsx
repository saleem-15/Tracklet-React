import React from 'react';
import { Layers, Zap, Sparkles, FileText } from 'lucide-react';
import { useEntitlementContext } from '../../../../context/EntitlementContext';
import { SAAS_LIMITS } from '../../../../lib/constants';

/**
 * BillingQuotaMetersCard
 *
 * Visual 4-dimensional meter display showing SaaS resource consumption:
 * 1. Active Applications in Pipeline
 * 2. Monthly AI Web Scrapes
 * 3. 1-Click ATS Form Autofills
 * 4. Cloud Tailored Resume Versions
 */
export const BillingQuotaMetersCard: React.FC = () => {
  const entitlement = useEntitlementContext();
  const isPro = entitlement.planTier === 'pro';

  const scrapesUsed = entitlement.profile?.quotas?.scrapesUsedThisMonth ?? 0;
  const autofillsUsed = entitlement.profile?.quotas?.autofillsUsedThisMonth ?? 0;
  const maxScrapes = isPro ? SAAS_LIMITS.PRO_MONTHLY_SCRAPES : SAAS_LIMITS.FREE_MONTHLY_SCRAPES;
  const maxAutofills = isPro ? 999 : SAAS_LIMITS.FREE_MONTHLY_AUTOFILLS;
  const maxResumes = isPro ? 999 : SAAS_LIMITS.FREE_MAX_RESUMES;
  const currentResumes = 1;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
      {/* Active Applications Quota */}
      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-700 font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Active Pipeline Capacity</span>
          </span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {entitlement.activeCount} / {isPro ? '∞' : SAAS_LIMITS.FREE_MAX_ACTIVE_APPS}
          </span>
        </div>
        <div 
          role="progressbar"
          aria-label="Active pipeline application capacity"
          aria-valuenow={entitlement.activeCount}
          aria-valuemin={0}
          aria-valuemax={isPro ? 100 : SAAS_LIMITS.FREE_MAX_ACTIVE_APPS}
          className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              entitlement.activeCount >= SAAS_LIMITS.FREE_MAX_ACTIVE_APPS && !isPro
                ? 'bg-amber-500'
                : 'bg-blue-600'
            }`}
            style={{
              width: `${Math.min(100, (entitlement.activeCount / (isPro ? 100 : SAAS_LIMITS.FREE_MAX_ACTIVE_APPS)) * 100)}%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-500 font-sans leading-normal">
          Terminal roles (Rejected / Archived) do not count toward this cap.
        </p>
      </div>

      {/* AI Fallback Web Scrapes */}
      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-700 font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Monthly AI Web Scrapes</span>
          </span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {scrapesUsed} / {isPro ? '∞' : maxScrapes}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Monthly AI web scrapes used"
          aria-valuenow={scrapesUsed}
          aria-valuemin={0}
          aria-valuemax={maxScrapes}
          className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, (scrapesUsed / maxScrapes) * 100)}%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-500 font-sans leading-normal">
          Used when extracting job details from unsupported company boards.
        </p>
      </div>

      {/* 1-Click ATS Form Autofills */}
      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-700 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>1-Click ATS Autofills</span>
          </span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {autofillsUsed} / {isPro ? '∞' : maxAutofills}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="1-Click ATS form autofills used"
          aria-valuenow={autofillsUsed}
          aria-valuemin={0}
          aria-valuemax={maxAutofills}
          className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, (autofillsUsed / maxAutofills) * 100)}%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-500 font-sans leading-normal">
          Instantly fills Greenhouse, Lever, Ashby, and Workday applications.
        </p>
      </div>

      {/* Cloud Stored Resumes */}
      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-700 font-semibold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Cloud Resume Versions</span>
          </span>
          <span className="font-mono font-semibold tabular-nums text-slate-900">
            {currentResumes} / {isPro ? '∞' : maxResumes}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Cloud stored resumes count"
          aria-valuenow={currentResumes}
          aria-valuemin={0}
          aria-valuemax={maxResumes}
          className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, (currentResumes / maxResumes) * 100)}%`,
            }}
          />
        </div>
        <p className="text-xs text-slate-500 font-sans leading-normal">
          Pro includes unlimited tailored CV versions stored in encrypted cloud.
        </p>
      </div>
    </div>
  );
};
