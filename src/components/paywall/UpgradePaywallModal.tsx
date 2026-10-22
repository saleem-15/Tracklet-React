import React from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  Zap, 
  Briefcase, 
  ArrowRight,
  ShieldCheck,
  Bot
} from 'lucide-react';
import { PaywallModalProps, PaywallTriggerContext } from '../../types';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { SAAS_LIMITS } from '../../lib/constants';

const CONTEXT_TITLES: Record<PaywallTriggerContext, { title: string; subtitle: string }> = {
  pipeline_cap: {
    title: 'Active Pipeline Limit Reached',
    subtitle: `Tracklet Free includes up to ${SAAS_LIMITS.FREE_MAX_ACTIVE_APPS} active pipeline applications. Upgrade to Pro for unlimited active roles.`,
  },
  scrape_limit: {
    title: 'Monthly AI Scrape Limit Reached',
    subtitle: `You have consumed all ${SAAS_LIMITS.FREE_MONTHLY_SCRAPES} free AI fallback scrapes this month. Upgrade to Pro for 500 monthly scrapes.`,
  },
  autofill_limit: {
    title: 'Automated Job Application Companion',
    subtitle: 'Tracklet Pro unlocks unlimited smart web form auto-fills and priority ATS parsing.',
  },
  feature_gate: {
    title: 'Unlock Tracklet Pro',
    subtitle: 'Take full control of your high-velocity job search with unlimited capacity and priority AI tools.',
  },
};

const PRO_FEATURES = [
  { icon: Briefcase, text: 'Unlimited active pipeline applications' },
  { icon: Bot, text: '500 AI hybrid job posting scrapes / month' },
  { icon: Zap, text: 'Unlimited Chrome Extension ATS autofills' },
  { icon: Sparkles, text: 'Tailored CV & resume cloud sync' },
  { icon: ShieldCheck, text: 'Priority email & community support' },
];

export const UpgradePaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  triggerContext,
  currentUsage,
  maxQuota,
  onUpgradeClick,
}) => {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const { title, subtitle } = CONTEXT_TITLES[triggerContext] || CONTEXT_TITLES.pipeline_cap;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to Tracklet Pro"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 motion-reduce:animate-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with deep brand gradient */}
        <div className="bg-gradient-to-br from-blue-700 via-indigo-600 to-indigo-800 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 border border-white/20 shadow-inner mb-3">
            <Sparkles className="w-6 h-6 text-amber-300 animate-pulse motion-reduce:animate-none" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white">
            {title}
          </h2>
          <p className="text-blue-100 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
            {subtitle}
          </p>

          {currentUsage !== undefined && maxQuota !== undefined && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold">
              <span>Current Usage:</span>
              <span className="font-mono">{currentUsage} / {maxQuota}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Plan Comparison Summary */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="flex items-baseline justify-between mb-3 border-b border-blue-100/80 pb-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Tracklet Pro</span>
                <p className="text-[11px] text-slate-600">Built for high-volume, organized job searches</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-slate-900">$5</span>
                <span className="text-xs text-slate-500"> / month</span>
              </div>
            </div>

            <ul className="space-y-2">
              {PRO_FEATURES.map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span>{feat.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={onUpgradeClick}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Join Pro Early Access &amp; Upgrade</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-center"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
