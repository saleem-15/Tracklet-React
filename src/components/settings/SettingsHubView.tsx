import React, { useState } from 'react';
import { SettingsPaneId } from '../../types';
import { SettingsSubNav } from './SettingsSubNav';
import { AccountProfilePane } from './panes/AccountProfilePane';
// AutofillProfilePane, SubscriptionBillingPane, WorkflowAlertsPane temporarily disabled

export interface SettingsHubViewProps {
  initialPane?: SettingsPaneId;
}

/**
 * SettingsHubView
 *
 * Flat Settings Hub on a continuous white canvas:
 * - Full-width horizontal text tabs (no icons, no boxes) with an active underline indicator.
 * - Dedicated panes: Account, ATS Autofill, Billing, Workflow.
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
      // Only 'account' is active; other panes are temporarily disabled
      if (section && ['account'].includes(section)) {
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-150">
      {/* ── Page Heading ── */}
      <div className="pb-1">
        <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
          Settings
        </h1>
      </div>

      {/* ── Horizontal Sub-Navigation Tab Bar ── */}
      <SettingsSubNav
        activePane={activePane}
        onSelectPane={handleSelectPane}
      />

      {/* ── Active Detail Pane on Flat White Canvas ── */}
      <main className="w-full pt-2" aria-label="Settings panel content">
        {activePane === 'account' && <AccountProfilePane />}
        {/* autofill, billing, and workflow panes are temporarily disabled */}
      </main>
    </div>
  );
};
