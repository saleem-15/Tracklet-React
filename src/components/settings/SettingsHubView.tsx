import React, { useState } from 'react';
import { SettingsPaneId } from '../../types';
import { SettingsSubNav } from './SettingsSubNav';
import { AccountProfilePane } from './panes/AccountProfilePane';
import { AutofillProfilePane } from './panes/AutofillProfilePane';
import { SubscriptionBillingPane } from './panes/SubscriptionBillingPane';
import { WorkflowAlertsPane } from './panes/WorkflowAlertsPane';

export interface SettingsHubViewProps {
  initialPane?: SettingsPaneId;
}

/**
 * SettingsHubView
 *
 * Master-Detail Settings Hub:
 * - Responsive split-pane layout: vertical rail on desktop (lg:), segmented pill tabs on mobile.
 * - Dedicated panes: Account & Security, ATS Autofill Profile, Subscription & Billing, Workflow & Alerts, Data Portability.
 * - Zero prop-drilling: sub-panes consume directly from scoped React context providers.
 * - Deep-linkable via query parameter (?tab=settings&section=<paneId>).
 */
export const SettingsHubView: React.FC<SettingsHubViewProps> = ({
  initialPane = 'account',
}) => {
  const [activePane, setActivePane] = useState<SettingsPaneId>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const section = params.get('section') as SettingsPaneId;
      if (section && ['account', 'autofill', 'billing', 'workflow'].includes(section)) {
        return section;
      }
    } catch {
      // Ignore URL parsing errors
    }
    return initialPane;
  });

  // Sync pane changes to URL query parameter without triggering full navigation reload
  const handleSelectPane = (pane: SettingsPaneId) => {
    setActivePane(pane);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'settings');
      url.searchParams.set('section', pane);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore URL update errors in test environments
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-150">
      {/* ── Page Header (Executive Command Center - Rule 5.1) ── */}
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Settings
        </h1>
      </div>

      {/* ── Responsive Master-Detail Workspace Layout ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Navigation Rail / Mobile Segmented Tabs */}
        <SettingsSubNav
          activePane={activePane}
          onSelectPane={handleSelectPane}
          className="w-full lg:w-56 shrink-0"
        />

        {/* Active Detail Pane */}
        <main className="flex-1 w-full min-w-0" aria-label="Settings panel content">
          {activePane === 'account' && <AccountProfilePane />}
          {activePane === 'autofill' && <AutofillProfilePane />}
          {activePane === 'billing' && <SubscriptionBillingPane />}
          {activePane === 'workflow' && <WorkflowAlertsPane />}
        </main>
      </div>
    </div>
  );
};
