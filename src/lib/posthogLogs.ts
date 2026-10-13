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
};
