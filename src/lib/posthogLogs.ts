import posthog from './posthog';

type DataSource = 'firestore' | 'guest_storage';

export const posthogLogs = {
  dataHydrationCompleted(source: DataSource, applicationCount: number, contactCount: number, migratedLegacyContacts: boolean) {
    posthog.logger.info('data hydration completed', {
      event: 'data_hydration_completed',
      data_source: source,
      application_count: applicationCount,
      contact_count: contactCount,
      migrated_legacy_contacts: migratedLegacyContacts,
    });
  },

  dataHydrationFailed(source: DataSource) {
    posthog.logger.error('data hydration failed', {
      event: 'data_hydration_failed',
      data_source: source,
    });
  },

  guestSessionStarted() {
    posthog.logger.info('guest session started', {
      event: 'guest_session_started',
    });
  },

  sandboxSessionStarted() {
    posthog.capture('sandbox_session_started', {
      timestamp: new Date().toISOString(),
    });
  },

  sandboxLimitReached(currentCount: number, limit: number) {
    posthog.capture('sandbox_limit_reached', {
      current_count: currentCount,
      limit,
    });
  },

  sandboxMigrationCompleted(appCount: number, contactCount: number) {
    posthog.capture('sandbox_migration_completed', {
      migrated_apps: appCount,
      migrated_contacts: contactCount,
    });
  },

  paywallModalViewed(triggerContext: string, planTier: string) {
    posthog.capture('paywall_modal_viewed', {
      trigger_context: triggerContext,
      plan_tier: planTier,
    });
  },

  paywallUpgradeClicked(triggerContext: string, planTier: string) {
    posthog.capture('paywall_upgrade_clicked', {
      trigger_context: triggerContext,
      plan_tier: planTier,
    });
  },
};
