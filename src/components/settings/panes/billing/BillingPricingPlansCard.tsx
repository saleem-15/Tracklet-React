import React from 'react';
import { Check } from 'lucide-react';
import { useEntitlementContext } from '../../../../context/EntitlementContext';
import { SAAS_PRICING } from '../../../../lib/constants';

/**
 * BillingPricingPlansCard
 *
 * Side-by-side commercial pricing options for Free tier users:
 * 1. Pro "Job Hunt Pass" ($29 prepaid for 3 months)
 * 2. Pro Monthly ($12/month flexible)
 */
export const BillingPricingPlansCard: React.FC = () => {
  const entitlement = useEntitlementContext();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 sm:py-8 border-b border-slate-200/70">
      {/* Job Hunt Pass (Recommended Best Value) */}
      <div className="rounded-2xl border-2 border-blue-600 bg-white p-5 space-y-3.5 shadow-xs relative">
        <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-sans text-xs font-bold uppercase tracking-wider shadow-2xs">
          Best Value (Recommended)
        </span>
        <div className="space-y-1">
          <h4 className="font-heading font-bold text-base text-slate-900">
            Pro "Job Hunt Pass"
          </h4>
          <p className="text-xs text-slate-500 font-sans">
            Full access for the average duration of a tech job search.
          </p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-heading font-bold text-2xl text-slate-900">
            ${SAAS_PRICING.PRO_JOB_HUNT_PASS_USD}
          </span>
          <span className="text-xs text-slate-500 font-medium">/ 3 months prepaid (~20% off)</span>
        </div>
        <ul className="space-y-2 text-xs text-slate-700">
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Unlimited active applications tracking</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Unlimited 1-click ATS form autofills</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Unlimited cloud tailored resumes</span>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => entitlement.openPaywall('feature_gate')}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
        >
          Get Job Hunt Pass →
        </button>
      </div>

      {/* Pro Monthly */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3.5 shadow-2xs">
        <div className="space-y-1">
          <h4 className="font-heading font-bold text-base text-slate-900">
            Pro Monthly
          </h4>
          <p className="text-xs text-slate-500 font-sans">
            Month-to-month flexibility with zero long-term commitment.
          </p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-heading font-bold text-2xl text-slate-900">
            ${SAAS_PRICING.PRO_MONTHLY_USD}
          </span>
          <span className="text-xs text-slate-500 font-medium">/ month (Cancel anytime)</span>
        </div>
        <ul className="space-y-2 text-xs text-slate-700">
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Full unlimited pipeline command center</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Full pipeline conversion funnel analytics</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Priority email logging & ATS sync</span>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => entitlement.openPaywall('feature_gate')}
          className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
        >
          Select Monthly Plan
        </button>
      </div>
    </div>
  );
};
