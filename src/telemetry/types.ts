/**
 * Types and schema for Tracklet Product Telemetry & Reliability Audit.
 * Reconciles transactional database state against PostHog client analytics and Sentry issue logs.
 */

export type AuditTimeWindow = '7d' | '30d' | '90d' | 'all';

// ─── Raw Input Models ─────────────────────────────────────────────────────────

export interface DbUserRecord {
  id: string;
  email: string;
  createdAt: string; // ISO 8601
  lastLoginAt?: string;
  authProvider?: 'google' | 'password' | 'guest';
  isAnonymous?: boolean;
}

export interface DbApplicationRecord {
  id: string;
  userId: string;
  company: string;
  position: string;
  status: string;
  platform?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  isArchived?: boolean;
}

export interface PostHogEventRecord {
  id: string;
  event: string;
  distinct_id: string;
  session_id: string;
  timestamp: string; // ISO 8601
  properties: {
    $current_url?: string;
    $browser?: string;
    $os?: string;
    application_id?: string;
    stage?: string;
    source?: string;
    [key: string]: unknown;
  };
}

export interface SentryEventRecord {
  event_id: string;
  timestamp: string; // ISO 8601
  exception_type: string;
  value: string;
  level: 'error' | 'fatal' | 'warning';
  user_id?: string;
  session_id?: string; // Stitched via posthog_session_id tag
  route?: string;
  release?: string;
  environment?: string;
  breadcrumbs?: Array<{
    timestamp: string;
    category: string;
    message: string;
    level?: string;
    data?: Record<string, unknown>;
  }>;
  stacktrace?: string[];
}

export interface RawTelemetrySnapshot {
  users: DbUserRecord[];
  applications: DbApplicationRecord[];
  posthogEvents: PostHogEventRecord[];
  sentryEvents: SentryEventRecord[];
  snapshotMetadata: {
    capturedAt: string;
    source: 'live_apis' | 'synthetic_fixture' | 'file_export';
    totalDbUsers: number;
    totalDbApplications: number;
    totalPostHogEvents: number;
    totalSentryEvents: number;
  };
}

// ─── Metric & Analysis Models ────────────────────────────────────────────────

export interface UserDistributionMetrics {
  totalRegistered: number;
  activatedUsers: number; // Users with >= 1 application in DB
  dormantUsers: number;   // Users with 0 applications in DB
  activationRate: number; // activatedUsers / totalRegistered
  activeInWindowUsers: number; // Active in selected time window
  authenticatedUsers: number;
  guestUsers: number;
}

export interface DistributionBucket {
  label: string;
  min: number;
  max: number | null;
  count: number;
  percentage: number;
}

export interface ApplicationPercentileMetrics {
  sampleSize: number; // Total applications in sample
  userSampleCount: number; // Total users with >= 1 application
  arithmeticMean: number;
  median: number; // p50
  p25: number;
  p75: number;
  p90: number;
  p99: number;
  min: number;
  max: number;
  iqr: number; // Interquartile range: p75 - p25
  skewnessIndex: number; // Nonparametric skew: (Mean - Median) / StdDev
  skewnessCommentary: string;
  distributionBuckets: DistributionBucket[];
}

export interface FunnelStage {
  step: number;
  id: string;
  label: string;
  count: number;
  dropoffFromPrevious: number;
  conversionRate: number; // % of previous step
  overallConversionRate: number; // % of step 1
}

export interface TimeToActivationBucket {
  label: string;
  count: number;
  percentage: number;
}

export interface CohortActivationFunnel {
  stages: FunnelStage[];
  timeToFirstApplication: {
    medianMinutes: number;
    p75Minutes: number;
    buckets: TimeToActivationBucket[];
  };
}

export interface TopAbandonmentException {
  fingerprint: string;
  exceptionType: string;
  message: string;
  occurrences: number;
  uniqueUsers: number;
  blastRadiusPct: number; // (uniqueUsers / activeUsers) * 100
  abandonmentSessions: number;
  abandonmentRate: number; // (abandonmentSessions / sessionsWithThisError) * 100
  affectedRoute: string;
  sampleStack: string;
}

export interface RouteReliabilityBreakdown {
  route: string;
  errorCount: number;
  uniqueUsers: number;
  topException: string;
  healthScore: number; // 0 to 100 based on error frequency vs pageviews
}

export interface ReliabilityImpactMetrics {
  totalSessions: number;
  crashFreeSessions: number;
  crashFreeSessionRate: number; // %
  uniqueActiveUsers: number;
  errorImpactedUsers: number;
  errorImpactedUserRate: number; // %
  topAbandonmentExceptions: TopAbandonmentException[];
  routeReliability: RouteReliabilityBreakdown[];
}

export interface InvariantAssertion {
  id: string;
  name: string;
  assertionFormula: string;
  passed: boolean;
  expected: string;
  actual: string;
  description: string;
}

export interface ReconciliationAuditMetrics {
  databaseApplicationCount: number;
  posthogCreatedEventCount: number;
  telemetryCaptureRate: number; // (posthogCreated / dbApplications) * 100
  adBlockerEstimatedDropRate: number; // (dbApplications - posthogCreated) / dbApplications * 100
  orphanedClientEvents: number; // Client event fired but DB row write failed
  duplicateClientEvents: number; // Multiple client events for same app id
  invariants: InvariantAssertion[];
}

export interface DataLineageEntry {
  definition: string;
  sourceTables: string[];
  formula: string;
  caveat: string;
}

export interface TelemetryAuditReport {
  meta: {
    generatedAt: string;
    timeWindow: AuditTimeWindow;
    windowStart: string;
    windowEnd: string;
    checksum: string;
    source: string;
  };
  userDistribution: UserDistributionMetrics;
  applicationPercentiles: ApplicationPercentileMetrics;
  cohortFunnel: CohortActivationFunnel;
  reliabilityImpact: ReliabilityImpactMetrics;
  reconciliation: ReconciliationAuditMetrics;
  dataLineage: Record<string, DataLineageEntry>;
}
