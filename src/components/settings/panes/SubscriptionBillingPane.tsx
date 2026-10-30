import React from 'react';
import { 
  Sparkles, 
  CreditCard, 
  ExternalLink, 
  PauseCircle,
  FlaskConical
} from 'lucide-react';
import { useEntitlementContext } from '../../../context/EntitlementContext';
import { useToastContext } from '../../../context/ToastContext';
import { SettingsCard } from '../SettingsCard';
import { SUBSCRIPTIONS_ENABLED } from '../../../lib/constants';
import { BillingQuotaMetersCard } from './billing/BillingQuotaMetersCard';
import { BillingPricingPlansCard } from './billing/BillingPricingPlansCard';

/**
 * SubscriptionBillingPane
 *
 * Pane 3 of the Settings Hub:
 * - SaaS Plan Tier Status (Free vs Pro)
 * - Modular 4-Dimensional Entitlement Quota Meters
 * - Commercial Packaging Cards ($12/mo vs $29/3mo Pass)
 * - Self-Service Stripe Customer Portal Trigger
 * - Job Hunt Sabbatical / Data Preservation
 * - Enforces Title-Only Card Header paradigm and sub-300 lines limit
 */
export const SubscriptionBillingPane: React.FC = () => {
  const entitlement = useEntitlementContext();
  const { addToast } = useToastContext();

  const isPro = entitlement.planTier === 'pro';

  const handleManageStripePortal = () => {
    addToast(
      'info',
      'Stripe Customer Portal',
      'In production, this securely redirects to your Stripe billing customer portal.'
    );
  };

  const handlePauseSabbatical = () => {
    addToast(
      'success',
      'Job Hunt Sabbatical',
      'Your tailored resumes, applications, and recruiter contacts remain preserved indefinitely for free.'
    );
  };

  return (
    <div className="space-y-0">
      {/* ── 1. Plan Overview & Quota Meters ── */}
      <SettingsCard
        title={isPro ? 'Tracklet Pro Subscription' : 'Tracklet Free Workspace'}
        icon={<CreditCard className="w-5 h-5 text-blue-600" />}
        badge={
          isPro ? (
            <span className="inline-flex items-center gap-1 font-sans text-xs bg-purple-50 text-purple-700 border border-purple-200/80 px-2.5 py-0.5 rounded-full font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Pro Plan Active</span>
            </span>
          ) : (
            <span className="font-sans text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-semibold">
              Free Plan
            </span>
          )
        }
        headerAction={
          isPro ? (
            <button
              type="button"
              onClick={handleManageStripePortal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Manage Billing in Stripe</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => entitlement.openPaywall('feature_gate')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <span>Upgrade to Pro</span>
            </button>
          )
        }
      >
        {!SUBSCRIPTIONS_ENABLED && (
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-center gap-2.5 text-xs text-indigo-900 font-medium">
            <FlaskConical className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Experimental Preview Mode: Unlimited access to all pipeline features is unlocked.</span>
          </div>
        )}

        {/* 4-Dimensional Entitlement Quota Meters */}
        <BillingQuotaMetersCard />
      </SettingsCard>

      {/* ── 2. Commercial Pricing Comparison Cards (Free Tier Only) ── */}
      {!isPro && <BillingPricingPlansCard />}

      {/* ── 3. Job Hunt Sabbatical & Lifecycle ── */}
      <SettingsCard
        title="Job Hunt Sabbatical & Data Retention"
        icon={<PauseCircle className="w-5 h-5 text-slate-600" />}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <p className="text-slate-600 font-sans max-w-xl leading-relaxed">
            When your job search concludes, your tailored resumes, contact histories, and interview notes remain securely saved in your personal encrypted cloud vault for free until your next career move.
          </p>
          <button
            type="button"
            onClick={handlePauseSabbatical}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            Pause My Job Hunt
          </button>
        </div>
      </SettingsCard>
    </div>
  );
};
