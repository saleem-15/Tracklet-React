import { Application, ApplicationStatus, JobPlatform } from '../types';
import { calculateDaysInStage } from './dateUtils';

export type AnalyticsTimeframe = 'all' | '7d' | '30d' | '90d' | 'this_month' | 'this_year';

export interface AnalyticsFilter {
  timeframe: AnalyticsTimeframe;
  platform: JobPlatform | 'All';
  statusCategory: 'All' | 'Active' | 'Terminal';
}

export interface FunnelStageMetric {
  status: ApplicationStatus;
  label: string;
  count: number;
  percentageOfTotal: number;
  conversionFromPrev: number; // percentage (0-100)
  dropoffCount: number;
  dropoffRate: number; // percentage (0-100)
  color: string;
  bgLight: string;
  borderColor: string;
}

export interface PlatformRoiMetric {
  platform: JobPlatform;
  totalApps: number;
  screeningCount: number;
  interviewCount: number;
  offerCount: number;
  rejectedCount: number;
  interviewRatePct: number;
  offerRatePct: number;
  roiScore: number; // 0 - 100 weighted index
  sharePct: number;
}

export interface StaleAppItem {
  id: string;
  company: string;
  role: string;
  platform: JobPlatform;
  status: ApplicationStatus;
  dateApplied: string;
  daysInStage: number;
  contactEmail?: string;
  staleSeverity: 'mild' | 'moderate' | 'high'; // 14-20d, 21-30d, 31d+
}

export interface GhostingAnalysis {
  totalAnalyzed: number;
  freshCount: number; // < 7 days
  awaitingCount: number; // 7 - 14 days
  staleCount: number; // 14 - 21 days (excluding Offer)
  ghostedCount: number; // > 21 days in Applied/Screening/Interview (excluding Offer)
  decisionPendingCount: number; // > 14 days in Offer stage awaiting candidate decision
  staleRatePct: number; // percentage of active apps in stale window (14-21d)
  ghostRatePct: number; // percentage of active apps ghosted (>21d)
  ghostingRatePct: number; // combined staleness rate
  avgDaysInStage: number;
  staleApplications: StaleAppItem[];
}

export interface VelocityTrendPoint {
  periodLabel: string;
  fullDate: string;
  appsCount: number;
  statusChangesCount: number;
  tasksDoneCount: number;
  totalActivity: number;
}

export interface MomentumAnalysis {
  timeframeLabel: string;
  totalActions: number;
  totalApps: number;
  totalStageMoves: number;
  totalTasks: number;
  currentPeriodApps: number;
  prevPeriodApps: number;
  paceChangePct: number;
  streakWeeks: number;
  weeklyTrend: VelocityTrendPoint[];
}

export interface ExecutiveKpis {
  totalApplications: number;
  activePipelineCount: number;
  activePipelinePct: number;
  appliedReachedCount: number; // Applications reaching Applied or beyond
  interviewProgressionCount: number; // Screening reached count
  interviewProgressionPct: number; // Yield from total applied
  offerCount: number; // Active offers in pipeline
  offerReachedCount: number; // Total applications that reached Offer stage
  interviewReachedCount: number; // Total applications that reached Interview stage
  offerRatePct: number; // Historical loop win rate (offers reached / interview loops reached)
  interviewCount: number; // Active interviews in pipeline
  avgDaysPerStage: number;
  ghostedCount: number;
  ghostingRatePct: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRatePct: number;
  totalContacts: number;
}

const STAGE_RANK: Record<ApplicationStatus, number> = {
  Saved: 1,
  Applied: 2,
  Screening: 3,
  Interview: 4,
  Offer: 5,
  Rejected: 0,
  Archived: 0,
};

/**
 * Determines whether an application reached a given stage during its lifecycle.
 * Uses a monotonic pipeline rank based on current status and historical progression transitions.
 */
export function hasReachedStage(app: Application, stage: ApplicationStatus): boolean {
  // Saved is the baseline entry point for all tracked opportunities
  if (stage === 'Saved') return true;
  if (stage === 'Rejected') return app.status === 'Rejected';
  if (stage === 'Archived') return app.status === 'Archived';

  const targetRank = STAGE_RANK[stage];
  if (!targetRank) return false;

  let maxRank = STAGE_RANK[app.status] || 0;

  // Distinguish recorded transitions from synthesized single initial snapshots or same-status updates.
  // A recorded transition has an entry satisfying both fromStatus and a status difference (fromStatus !== toStatus).
  const hasHistory = Array.isArray(app.history) && app.history.length > 0;
  const hasRecordedTransitions =
    hasHistory &&
    app.history!.some(
      (h) => Boolean(h.fromStatus) && Boolean(h.toStatus) && h.fromStatus !== h.toStatus
    );

  if (hasRecordedTransitions) {
    for (const h of app.history!) {
      const toRank = STAGE_RANK[h.toStatus] || 0;
      const fromRank = STAGE_RANK[h.fromStatus] || 0;
      if (toRank > maxRank) maxRank = toRank;
      if (fromRank > maxRank) maxRank = fromRank;
    }
    return maxRank >= targetRank;
  }

  // Fallback for legacy records, records without history, or single synthesized initial snapshot
  if (app.status === 'Rejected') {
    // Rejections happen after an application was submitted
    maxRank = Math.max(maxRank, STAGE_RANK['Applied']);
  } else if (app.status === 'Archived' && Boolean(app.dateApplied)) {
    maxRank = Math.max(maxRank, STAGE_RANK['Applied']);
  }

  return maxRank >= targetRank;
}

/**
 * Filter applications by timeframe and optional platform/status constraints
 */
export function filterApplicationsForAnalytics(
  applications: Application[],
  filter: AnalyticsFilter
): Application[] {
  const now = new Date();

  return applications.filter((app) => {
    // 1. Platform filter
    if (filter.platform !== 'All' && app.platform !== filter.platform) {
      return false;
    }

    // 2. Status category filter
    if (filter.statusCategory === 'Active') {
      if (app.status === 'Rejected' || app.status === 'Archived') return false;
    } else if (filter.statusCategory === 'Terminal') {
      if (app.status !== 'Rejected' && app.status !== 'Archived') return false;
    }

    // 3. Timeframe filter
    if (filter.timeframe === 'all') return true;

    const appDateStr = app.dateApplied || app.createdAt;
    if (!appDateStr) return true;

    const appDate = new Date(appDateStr);
    if (isNaN(appDate.getTime())) return true;

    const diffDays = (now.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24);

    if (filter.timeframe === '7d') {
      return diffDays <= 7;
    }
    if (filter.timeframe === '30d') {
      return diffDays <= 30;
    }
    if (filter.timeframe === '90d') {
      return diffDays <= 90;
    }
    if (filter.timeframe === 'this_month') {
      return (
        appDate.getFullYear() === now.getFullYear() &&
        appDate.getMonth() === now.getMonth()
      );
    }
    if (filter.timeframe === 'this_year') {
      return appDate.getFullYear() === now.getFullYear();
    }

    return true;
  });
}

/**
 * Filter applications for activity momentum calculation by platform and status category,
 * deliberately omitting application creation date filtering so that recent stage transitions
 * and task completions on older applications are included in activity calculations.
 */
export function filterApplicationsForActivity(
  applications: Application[],
  filter: Pick<AnalyticsFilter, 'platform' | 'statusCategory'>
): Application[] {
  return applications.filter((app) => {
    // 1. Platform filter
    if (filter.platform !== 'All' && app.platform !== filter.platform) {
      return false;
    }

    // 2. Status category filter
    if (filter.statusCategory === 'Active') {
      if (app.status === 'Rejected' || app.status === 'Archived') return false;
    } else if (filter.statusCategory === 'Terminal') {
      if (app.status !== 'Rejected' && app.status !== 'Archived') return false;
    }

    return true;
  });
}

/**
 * Computes high-level Executive Key Performance Indicators
 */
export function calculateExecutiveKpis(applications: Application[]): ExecutiveKpis {
  const total = applications.length;

  const activeApps = applications.filter(
    (a) =>
      a.status === 'Saved' ||
      a.status === 'Applied' ||
      a.status === 'Screening' ||
      a.status === 'Interview' ||
      a.status === 'Offer'
  );

  const interviewCount = applications.filter((a) => a.status === 'Interview').length;
  const offerCount = applications.filter((a) => a.status === 'Offer').length;

  // Historical stage reaches across entire lifecycle
  const appliedReachedCount = applications.filter((a) => hasReachedStage(a, 'Applied')).length;
  const screeningReachedCount = applications.filter((a) => hasReachedStage(a, 'Screening')).length;
  const interviewReachedCount = applications.filter((a) => hasReachedStage(a, 'Interview')).length;
  const offerReachedCount = applications.filter((a) => hasReachedStage(a, 'Offer')).length;

  const interviewProgressionCount = screeningReachedCount;
  const interviewProgressionPct =
    appliedReachedCount > 0
      ? Math.round((screeningReachedCount / appliedReachedCount) * 100)
      : 0;

  // Offer rate (Historical Loop Win Rate: offers reached vs interview loops reached)
  const offerRatePct =
    interviewReachedCount > 0 ? Math.round((offerReachedCount / interviewReachedCount) * 100) : 0;

  // Active pipeline percentage (relative to total applications in scope)
  const activePipelinePct =
    total > 0
      ? Math.round((activeApps.length / total) * 100)
      : 0;

  // Days velocity in active stage
  let totalDaysInStage = 0;
  activeApps.forEach((a) => {
    totalDaysInStage += calculateDaysInStage(a.stageUpdatedAt);
  });
  const avgDaysPerStage =
    activeApps.length > 0
      ? Number((totalDaysInStage / activeApps.length).toFixed(1))
      : 0;

  // Stale / ghosted applications requiring attention (>14 days in Applied, Screening, or Interview)
  // Offers are excluded from ghostedCount because offers are secured opportunities, not ghosted employers
  const ghostedApps = applications.filter(
    (a) =>
      (a.status === 'Applied' || a.status === 'Screening' || a.status === 'Interview') &&
      calculateDaysInStage(a.stageUpdatedAt) > 14
  );
  const ghostedCount = ghostedApps.length;
  const ghostingRatePct =
    appliedReachedCount > 0 ? Math.round((ghostedCount / appliedReachedCount) * 100) : 0;

  // Tasks & Contacts
  let totalTasks = 0;
  let completedTasks = 0;
  let totalContacts = 0;

  applications.forEach((app) => {
    if (app.tasks) {
      totalTasks += app.tasks.length;
      completedTasks += app.tasks.filter((t) => t.completed).length;
    }
    if (app.contacts) {
      totalContacts += app.contacts.length;
    }
  });

  const taskCompletionRatePct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalApplications: total,
    activePipelineCount: activeApps.length,
    activePipelinePct,
    appliedReachedCount,
    interviewProgressionCount,
    interviewProgressionPct,
    offerCount,
    offerReachedCount,
    interviewReachedCount,
    offerRatePct,
    interviewCount,
    avgDaysPerStage,
    ghostedCount,
    ghostingRatePct,
    totalTasks,
    completedTasks,
    taskCompletionRatePct,
    totalContacts,
  };
}

/**
 * Calculates conversion funnel metrics step-by-step
 */
export function calculateConversionFunnel(applications: Application[]): {
  stages: FunnelStageMetric[];
  totalApplied: number;
  overallYieldPct: number;
  funnelHealth: 'optimal' | 'moderate' | 'needs_attention';
  bottleneckAdvice: string;
} {
  const milestoneOffer = applications.filter((a) => hasReachedStage(a, 'Offer')).length;
  const milestoneInterview = applications.filter((a) => hasReachedStage(a, 'Interview')).length;
  const milestoneScreening = applications.filter((a) => hasReachedStage(a, 'Screening')).length;
  const milestoneApplied = applications.filter((a) => hasReachedStage(a, 'Applied')).length;
  const milestoneSaved = applications.length;

  const totalBase = milestoneSaved > 0 ? milestoneSaved : 1;

  const stages: FunnelStageMetric[] = [
    {
      status: 'Saved',
      label: 'Opportunities Saved',
      count: milestoneSaved,
      percentageOfTotal: 100,
      conversionFromPrev: 100,
      dropoffCount: Math.max(0, milestoneSaved - milestoneApplied),
      dropoffRate:
        milestoneSaved > 0
          ? Math.round(((milestoneSaved - milestoneApplied) / milestoneSaved) * 100)
          : 0,
      color: 'text-purple-600',
      bgLight: 'bg-purple-500',
      borderColor: 'border-purple-200',
    },
    {
      status: 'Applied',
      label: 'Applications Submitted',
      count: milestoneApplied,
      percentageOfTotal: Math.round((milestoneApplied / totalBase) * 100),
      conversionFromPrev:
        milestoneSaved > 0
          ? Math.round((milestoneApplied / milestoneSaved) * 100)
          : 0,
      dropoffCount: Math.max(0, milestoneApplied - milestoneScreening),
      dropoffRate:
        milestoneApplied > 0
          ? Math.round(((milestoneApplied - milestoneScreening) / milestoneApplied) * 100)
          : 0,
      color: 'text-slate-600',
      bgLight: 'bg-slate-500',
      borderColor: 'border-slate-200',
    },
    {
      status: 'Screening',
      label: 'Screening Calls',
      count: milestoneScreening,
      percentageOfTotal: Math.round((milestoneScreening / totalBase) * 100),
      conversionFromPrev:
        milestoneApplied > 0
          ? Math.round((milestoneScreening / milestoneApplied) * 100)
          : 0,
      dropoffCount: Math.max(0, milestoneScreening - milestoneInterview),
      dropoffRate:
        milestoneScreening > 0
          ? Math.round(((milestoneScreening - milestoneInterview) / milestoneScreening) * 100)
          : 0,
      color: 'text-amber-600',
      bgLight: 'bg-amber-500',
      borderColor: 'border-amber-200',
    },
    {
      status: 'Interview',
      label: 'Interview Loops',
      count: milestoneInterview,
      percentageOfTotal: Math.round((milestoneInterview / totalBase) * 100),
      conversionFromPrev:
        milestoneScreening > 0
          ? Math.round((milestoneInterview / milestoneScreening) * 100)
          : 0,
      dropoffCount: Math.max(0, milestoneInterview - milestoneOffer),
      dropoffRate:
        milestoneInterview > 0
          ? Math.round(((milestoneInterview - milestoneOffer) / milestoneInterview) * 100)
          : 0,
      color: 'text-blue-600',
      bgLight: 'bg-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      status: 'Offer',
      label: 'Offers Received',
      count: milestoneOffer,
      percentageOfTotal: Math.round((milestoneOffer / totalBase) * 100),
      conversionFromPrev:
        milestoneInterview > 0
          ? Math.round((milestoneOffer / milestoneInterview) * 100)
          : 0,
      dropoffCount: 0,
      dropoffRate: 0,
      color: 'text-emerald-600',
      bgLight: 'bg-emerald-500',
      borderColor: 'border-emerald-200',
    },
  ];

  const overallYieldPct =
    milestoneApplied > 0
      ? Number(((milestoneOffer / milestoneApplied) * 100).toFixed(1))
      : 0;

  // Diagnostics advice
  let funnelHealth: 'optimal' | 'moderate' | 'needs_attention' = 'moderate';
  let bottleneckAdvice = 'Maintain consistent application pace to build momentum.';

  const appToScreen = stages[2].conversionFromPrev; // Applied -> Screen
  const screenToInterview = stages[3].conversionFromPrev; // Screen -> Interview
  const interviewToOffer = stages[4].conversionFromPrev; // Interview -> Offer

  // Check staleness of active applications to avoid claiming strong momentum when pipeline is stalled
  const staleAppsCount = applications.filter(
    (a) =>
      (a.status === 'Applied' || a.status === 'Screening' || a.status === 'Interview') &&
      calculateDaysInStage(a.stageUpdatedAt) > 14
  ).length;
  const activeCount = applications.filter(
    (a) => a.status !== 'Rejected' && a.status !== 'Archived'
  ).length;
  const isPipelineStalled = activeCount > 0 && staleAppsCount / activeCount >= 0.5;

  if (isPipelineStalled) {
    funnelHealth = 'needs_attention';
    bottleneckAdvice = `${staleAppsCount} applications have had no response for >14 days. Review follow-ups or submit fresh applications to restore momentum.`;
  } else if (milestoneApplied >= 5) {
    if (appToScreen < 10) {
      funnelHealth = 'needs_attention';
      bottleneckAdvice =
        'Applied-to-Screening yield is low (<10%). Tailor your resume keywords and expand referral sourcing.';
    } else if (screenToInterview < 40 && milestoneScreening >= 2) {
      funnelHealth = 'needs_attention';
      bottleneckAdvice =
        'Recruiter screen pass-rate is lagging. Polish your narrative pitch and salary alignment.';
    } else if (interviewToOffer < 20 && milestoneInterview >= 3) {
      funnelHealth = 'moderate';
      bottleneckAdvice =
        'Reaching advanced rounds! Focus on system design deep-dives and structured behavioral STAR stories.';
    } else if (milestoneOffer >= 1) {
      funnelHealth = 'optimal';
      bottleneckAdvice =
        'Active offers secured! Prioritize final negotiations and team alignment.';
    } else if (overallYieldPct >= 5) {
      funnelHealth = 'optimal';
      bottleneckAdvice =
        'Healthy conversion pace across your pipeline stages.';
    }
  }

  return {
    stages,
    totalApplied: milestoneApplied,
    overallYieldPct,
    funnelHealth,
    bottleneckAdvice,
  };
}

/**
 * Calculates platform/source ROI and yield efficiency across all applications in scope
 */
export function calculatePlatformRoi(applications: Application[]): {
  metrics: PlatformRoiMetric[];
  topChannel: PlatformRoiMetric | null;
  insight: string;
} {
  const total = applications.length;

  const platformMap: Record<
    string,
    {
      total: number;
      screening: number;
      interview: number;
      offer: number;
      rejected: number;
    }
  > = {};

  applications.forEach((app) => {
    const p = app.platform || 'Other';
    if (!platformMap[p]) {
      platformMap[p] = { total: 0, screening: 0, interview: 0, offer: 0, rejected: 0 };
    }
    platformMap[p].total++;
    if (hasReachedStage(app, 'Screening')) platformMap[p].screening++;
    if (hasReachedStage(app, 'Interview')) platformMap[p].interview++;
    if (hasReachedStage(app, 'Offer')) platformMap[p].offer++;
    if (app.status === 'Rejected') platformMap[p].rejected++;
  });

  const metrics: PlatformRoiMetric[] = Object.entries(platformMap).map(
    ([platform, data]) => {
      const advancedCount = data.screening;
      const interviewRatePct =
        data.total > 0 ? Math.round((advancedCount / data.total) * 100) : 0;
      const totalLoops = data.interview;
      const offerRatePct =
        totalLoops > 0 ? Math.round((data.offer / totalLoops) * 100) : 0;

      // Weighted ROI Score: (Interview Yield * 0.5) + (Offer Bonus) + (Volume Weight * 0.2)
      const volumeWeight = Math.min(100, (data.total / Math.max(1, total)) * 100);
      const roiScore = Math.min(
        100,
        Math.round(interviewRatePct * 0.5 + (data.offer > 0 ? 30 : 0) + volumeWeight * 0.2)
      );

      const sharePct = total > 0 ? Math.round((data.total / total) * 100) : 0;

      return {
        platform: platform as JobPlatform,
        totalApps: data.total,
        screeningCount: data.screening,
        interviewCount: data.interview,
        offerCount: data.offer,
        rejectedCount: data.rejected,
        interviewRatePct,
        offerRatePct,
        roiScore,
        sharePct,
      };
    }
  );

  // Sort descending by ROI score and total volume
  metrics.sort((a, b) => {
    if (b.roiScore !== a.roiScore) return b.roiScore - a.roiScore;
    return b.totalApps - a.totalApps;
  });

  const topChannel = metrics.length > 0 ? metrics[0] : null;

  let insight = 'No channel data recorded yet.';
  if (topChannel && topChannel.totalApps > 0) {
    if (topChannel.platform === 'Referral') {
      insight = `Referrals generate your highest conversion yield (${topChannel.interviewRatePct}% response rate). Continue networking!`;
    } else {
      insight = `${topChannel.platform} is currently your most productive channel with ${topChannel.interviewRatePct}% progression yield.`;
    }
  }

  return {
    metrics,
    topChannel,
    insight,
  };
}

/**
 * Calculates response velocity and ghosting indicators
 */
export function calculateGhostingAndVelocity(applications: Application[]): GhostingAnalysis {
  const activeAndApplied = applications.filter(
    (a) =>
      a.status === 'Applied' ||
      a.status === 'Screening' ||
      a.status === 'Interview' ||
      a.status === 'Offer'
  );

  let freshCount = 0; // < 7d
  let awaitingCount = 0; // 7-14d
  let staleCount = 0; // 14-21d (excluding Offer)
  let ghostedCount = 0; // > 21d in applied/screening/interview (excluding Offer)
  let decisionPendingCount = 0; // > 14d in offer stage awaiting candidate decision
  let totalDaysInStage = 0;

  const staleApplications: StaleAppItem[] = [];

  activeAndApplied.forEach((app) => {
    const days = calculateDaysInStage(app.stageUpdatedAt);
    totalDaysInStage += days;
    const isOffer = app.status === 'Offer';

    if (days < 7) {
      freshCount++;
    } else if (days <= 14) {
      awaitingCount++;
    } else if (days <= 21) {
      if (isOffer) {
        decisionPendingCount++;
      } else {
        staleCount++;
      }
      staleApplications.push({
        id: app.id,
        company: app.company,
        role: app.role,
        platform: app.platform,
        status: app.status,
        dateApplied: app.dateApplied,
        daysInStage: days,
        contactEmail: app.contactEmail,
        staleSeverity: 'mild',
      });
    } else {
      // Days > 21: Offers are not ghosted (offer extended, pending candidate decision/negotiation)
      if (isOffer) {
        decisionPendingCount++;
      } else {
        ghostedCount++;
      }
      staleApplications.push({
        id: app.id,
        company: app.company,
        role: app.role,
        platform: app.platform,
        status: app.status,
        dateApplied: app.dateApplied,
        daysInStage: days,
        contactEmail: app.contactEmail,
        staleSeverity: days > 30 ? 'high' : 'moderate',
      });
    }
  });

  // Sort stale applications by days in stage descending
  staleApplications.sort((a, b) => b.daysInStage - a.daysInStage);

  const totalAnalyzed = activeAndApplied.length;
  const staleRatePct =
    totalAnalyzed > 0 ? Math.round((staleCount / totalAnalyzed) * 100) : 0;
  const ghostRatePct =
    totalAnalyzed > 0 ? Math.round((ghostedCount / totalAnalyzed) * 100) : 0;
  const ghostingRatePct =
    totalAnalyzed > 0 ? Math.round(((staleCount + ghostedCount) / totalAnalyzed) * 100) : 0;
  const avgDaysInStage =
    totalAnalyzed > 0 ? Number((totalDaysInStage / totalAnalyzed).toFixed(1)) : 0;

  return {
    totalAnalyzed,
    freshCount,
    awaitingCount,
    staleCount,
    ghostedCount,
    decisionPendingCount,
    staleRatePct,
    ghostRatePct,
    ghostingRatePct,
    avgDaysInStage,
    staleApplications,
  };
}

/**
 * Retrieves the submission timestamp for an application that reached 'Applied'.
 * Returns undefined if the application never reached Applied (e.g. Saved only, or Saved -> Archived).
 */
export function getApplicationSubmissionDate(app: Application): Date | undefined {
  if (!hasReachedStage(app, 'Applied')) return undefined;

  // Check for explicit transitions to 'Applied' in history (where fromStatus differs from 'Applied')
  if (Array.isArray(app.history) && app.history.length > 0) {
    const validDates: Date[] = [];
    for (const h of app.history) {
      if (h.toStatus === 'Applied' && h.fromStatus !== 'Applied' && h.timestamp) {
        const d = new Date(h.timestamp);
        if (!isNaN(d.getTime())) {
          validDates.push(d);
        }
      }
    }
    if (validDates.length > 0) {
      validDates.sort((a, b) => a.getTime() - b.getTime());
      return validDates[0];
    }
  }

  // Fallback to dateApplied or createdAt
  const dateStr = app.dateApplied || app.createdAt;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }

  return undefined;
}

/**
 * Collects all timestamps when an application made a stage move / status transition.
 * Avoids treating initial creation snapshots as stage moves.
 */
export function getApplicationStageMoveDates(app: Application): Date[] {
  const dates: Date[] = [];

  const hasHistory = Array.isArray(app.history) && app.history.length > 0;
  const hasRecordedTransitions =
    hasHistory &&
    app.history!.some(
      (h) => Boolean(h.fromStatus) && Boolean(h.toStatus) && h.fromStatus !== h.toStatus
    );

  if (hasRecordedTransitions) {
    for (const h of app.history!) {
      // Only count transitions where fromStatus differs from toStatus
      if (
        h.fromStatus &&
        h.toStatus &&
        h.fromStatus !== h.toStatus &&
        h.timestamp
      ) {
        const d = new Date(h.timestamp);
        if (!isNaN(d.getTime())) {
          dates.push(d);
        }
      }
    }
    return dates;
  }

  // Legacy fallback: if stageUpdatedAt exists and differs from createdAt
  if (app.stageUpdatedAt) {
    if (!app.createdAt || app.stageUpdatedAt !== app.createdAt) {
      const d = new Date(app.stageUpdatedAt);
      if (!isNaN(d.getTime())) {
        dates.push(d);
      }
    }
  }

  return dates;
}

/**
 * Collects all completion timestamps for tasks on an application.
 * Prefers task.completedAt if present, falling back to app.updatedAt for legacy data.
 */
export function getApplicationCompletedTaskDates(app: Application): Date[] {
  const dates: Date[] = [];
  if (!app.tasks) return dates;

  for (const t of app.tasks) {
    if (t.completed) {
      const dateStr = t.completedAt || app.updatedAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          dates.push(d);
        }
      }
    }
  }

  return dates;
}

/**
 * Calculates activity momentum and weekly trend velocity.
 * Accepts an optional referenceDate for deterministic testing with fixed clocks.
 */
export function calculateMomentumAnalysis(
  applications: Application[],
  timeframe: AnalyticsTimeframe,
  referenceDate?: Date
): MomentumAnalysis {
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const end = new Date(now);

  let start: Date;
  let comparisonStart: Date;
  let comparisonEnd: Date;

  if (timeframe === '7d') {
    start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    comparisonEnd = new Date(start);
    comparisonStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === '30d') {
    start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    comparisonEnd = new Date(start);
    comparisonStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (timeframe === '90d') {
    start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    comparisonEnd = new Date(start);
    comparisonStart = new Date(start.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (timeframe === 'this_month') {
    start = new Date(end.getFullYear(), end.getMonth(), 1, 0, 0, 0, 0);
    const durationMs = Math.max(1, end.getTime() - start.getTime());
    comparisonEnd = new Date(start);
    comparisonStart = new Date(start.getTime() - durationMs);
  } else if (timeframe === 'this_year') {
    start = new Date(end.getFullYear(), 0, 1, 0, 0, 0, 0);
    const durationMs = Math.max(1, end.getTime() - start.getTime());
    comparisonEnd = new Date(start);
    comparisonStart = new Date(start.getTime() - durationMs);
  } else {
    // 'all'
    start = new Date(0);
    comparisonEnd = new Date(0);
    comparisonStart = new Date(0);
  }

  // Pre-extract event timestamps across applications
  const appEvents: {
    submissionDates: Date[];
    stageMoveDates: Date[];
    taskCompletedDates: Date[];
  } = {
    submissionDates: [],
    stageMoveDates: [],
    taskCompletedDates: [],
  };

  applications.forEach((app) => {
    const subDate = getApplicationSubmissionDate(app);
    if (subDate) {
      appEvents.submissionDates.push(subDate);
    }
    const moveDates = getApplicationStageMoveDates(app);
    appEvents.stageMoveDates.push(...moveDates);

    const taskDates = getApplicationCompletedTaskDates(app);
    appEvents.taskCompletedDates.push(...taskDates);
  });

  // Calculate explicit timeframe totals strictly within [start, end]
  let totalApps = 0;
  let totalStageMoves = 0;
  let totalTasks = 0;
  let prevPeriodApps = 0;

  for (const d of appEvents.submissionDates) {
    if (d >= start && d <= end) totalApps++;
    if (timeframe !== 'all' && d >= comparisonStart && d < comparisonEnd) prevPeriodApps++;
  }

  for (const d of appEvents.stageMoveDates) {
    if (d >= start && d <= end) totalStageMoves++;
  }

  for (const d of appEvents.taskCompletedDates) {
    if (d >= start && d <= end) totalTasks++;
  }

  const totalActions = totalApps + totalStageMoves + totalTasks;
  const currentPeriodApps = totalApps;

  let paceChangePct = 0;
  if (prevPeriodApps > 0) {
    paceChangePct = Math.round(((currentPeriodApps - prevPeriodApps) / prevPeriodApps) * 100);
  } else if (currentPeriodApps > 0) {
    paceChangePct = 100;
  }

  // Build trend buckets partitioning the timeframe window
  const weeklyTrend: VelocityTrendPoint[] = [];

  interface TrendBucketDef {
    periodLabel: string;
    fullDate: string;
    bStart: Date;
    bEnd: Date;
  }

  const bucketDefs: TrendBucketDef[] = [];

  if (timeframe === '7d') {
    // 7 daily buckets: D-6 to Today
    for (let i = 6; i >= 0; i--) {
      const bStart = new Date(end.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
      const bEnd = i === 0 ? end : new Date(end.getTime() - i * 24 * 60 * 60 * 1000);
      const periodLabel = i === 0 ? 'Today' : bStart.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDate = bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bucketDefs.push({ periodLabel, fullDate, bStart, bEnd });
    }
  } else if (timeframe === '30d') {
    // 4 buckets of ~7.5 days partitioning the 30 days
    const bucketMs = (30 * 24 * 60 * 60 * 1000) / 4;
    for (let i = 3; i >= 0; i--) {
      const bStart = new Date(end.getTime() - (i + 1) * bucketMs);
      const bEnd = i === 0 ? end : new Date(end.getTime() - i * bucketMs);
      const periodLabel = i === 0 ? 'Now' : `W-${i}`;
      const startStr = bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = bEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bucketDefs.push({ periodLabel, fullDate: `${startStr} – ${endStr}`, bStart, bEnd });
    }
  } else if (timeframe === '90d') {
    // 12 weekly buckets
    const bucketMs = (90 * 24 * 60 * 60 * 1000) / 12;
    for (let i = 11; i >= 0; i--) {
      const bStart = new Date(end.getTime() - (i + 1) * bucketMs);
      const bEnd = i === 0 ? end : new Date(end.getTime() - i * bucketMs);
      const periodLabel = i === 0 ? 'Now' : `W-${i}`;
      const startStr = bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = bEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bucketDefs.push({ periodLabel, fullDate: `${startStr} – ${endStr}`, bStart, bEnd });
    }
  } else if (timeframe === 'this_month') {
    // 4 buckets partitioning [start, end]
    const totalMs = Math.max(1, end.getTime() - start.getTime());
    const bucketMs = totalMs / 4;
    for (let i = 3; i >= 0; i--) {
      const bStart = new Date(end.getTime() - (i + 1) * bucketMs);
      const bEnd = i === 0 ? end : new Date(end.getTime() - i * bucketMs);
      const periodLabel = `W${4 - i}`;
      const startStr = bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = bEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bucketDefs.push({ periodLabel, fullDate: `${startStr} – ${endStr}`, bStart, bEnd });
    }
  } else if (timeframe === 'this_year') {
    // Up to 12 monthly buckets for elapsed months of the year
    const currentMonth = end.getMonth();
    for (let m = 0; m <= currentMonth; m++) {
      const bStart = new Date(end.getFullYear(), m, 1, 0, 0, 0, 0);
      const nextMonthStart = new Date(end.getFullYear(), m + 1, 1, 0, 0, 0, 0);
      const bEnd = m === currentMonth ? end : nextMonthStart;
      const periodLabel = bStart.toLocaleDateString('en-US', { month: 'short' });
      const fullDate = bStart.toLocaleDateString('en-US', { month: 'long' });
      bucketDefs.push({ periodLabel, fullDate, bStart, bEnd });
    }
  } else {
    // 'all' time: 8 weekly buckets leading up to now
    for (let i = 7; i >= 0; i--) {
      const bStart = new Date(end.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const bEnd = i === 0 ? end : new Date(end.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const periodLabel = i === 0 ? 'Now' : `W-${i}`;
      const startStr = bStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = bEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bucketDefs.push({ periodLabel, fullDate: `${startStr} – ${endStr}`, bStart, bEnd });
    }
  }

  bucketDefs.forEach(({ periodLabel, fullDate, bStart, bEnd }) => {
    let appsCount = 0;
    let statusChangesCount = 0;
    let tasksDoneCount = 0;

    for (const d of appEvents.submissionDates) {
      if (d >= bStart && d <= bEnd) appsCount++;
    }
    for (const d of appEvents.stageMoveDates) {
      if (d >= bStart && d <= bEnd) statusChangesCount++;
    }
    for (const d of appEvents.taskCompletedDates) {
      if (d >= bStart && d <= bEnd) tasksDoneCount++;
    }

    weeklyTrend.push({
      periodLabel,
      fullDate,
      appsCount,
      statusChangesCount,
      tasksDoneCount,
      totalActivity: appsCount + statusChangesCount + tasksDoneCount,
    });
  });

  // Calculate streak in active weeks (walking back 7-day blocks from end)
  let streakWeeks = 0;
  for (let w = 0; w < 52; w++) {
    const wEnd = new Date(end.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const wStart = new Date(end.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);

    let weekActivity = 0;
    for (const d of appEvents.submissionDates) {
      if (d >= wStart && d <= wEnd) {
        weekActivity++;
        break;
      }
    }
    if (weekActivity === 0) {
      for (const d of appEvents.stageMoveDates) {
        if (d >= wStart && d <= wEnd) {
          weekActivity++;
          break;
        }
      }
    }
    if (weekActivity === 0) {
      for (const d of appEvents.taskCompletedDates) {
        if (d >= wStart && d <= wEnd) {
          weekActivity++;
          break;
        }
      }
    }

    if (weekActivity > 0) {
      streakWeeks++;
    } else {
      break;
    }
  }

  const timeframeLabelMap: Record<AnalyticsTimeframe, string> = {
    all: 'All Time Activity',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    this_month: 'This Month',
    this_year: 'This Year',
  };

  return {
    timeframeLabel: timeframeLabelMap[timeframe] || 'Activity Momentum',
    totalActions,
    totalApps,
    totalStageMoves,
    totalTasks,
    currentPeriodApps,
    prevPeriodApps,
    paceChangePct,
    streakWeeks,
    weeklyTrend,
  };
}
