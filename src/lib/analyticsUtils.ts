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
  staleCount: number; // 14 - 21 days
  ghostedCount: number; // > 21 days in Applied
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
  interviewProgressionCount: number; // Screening + Interview + Offer
  interviewProgressionPct: number; // Yield from total
  offerCount: number;
  offerRatePct: number; // Offer / Interview loops
  interviewCount: number;
  avgDaysPerStage: number;
  ghostedCount: number;
  ghostingRatePct: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRatePct: number;
  totalContacts: number;
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
 * Computes high-level Executive Key Performance Indicators
 */
export function calculateExecutiveKpis(applications: Application[]): ExecutiveKpis {
  const nonArchived = applications.filter((a) => a.status !== 'Archived');
  const total = applications.length;
  const nonArchivedTotal = nonArchived.length;

  const activeApps = applications.filter(
    (a) =>
      a.status === 'Saved' ||
      a.status === 'Applied' ||
      a.status === 'Screening' ||
      a.status === 'Interview' ||
      a.status === 'Offer'
  );

  const interviewProgression = applications.filter(
    (a) =>
      a.status === 'Screening' ||
      a.status === 'Interview' ||
      a.status === 'Offer'
  );

  const interviewCount = applications.filter((a) => a.status === 'Interview').length;
  const offerCount = applications.filter((a) => a.status === 'Offer').length;

  // Interview progression yield rate (apps that progressed beyond applied / total applied)
  const appliedCount = applications.filter((a) => a.status !== 'Saved').length;
  const interviewProgressionPct =
    appliedCount > 0
      ? Math.round((interviewProgression.length / appliedCount) * 100)
      : 0;

  // Offer rate (Offers vs total interviews + offers)
  const totalInLoops = interviewCount + offerCount;
  const offerRatePct =
    totalInLoops > 0 ? Math.round((offerCount / totalInLoops) * 100) : 0;

  // Active pipeline percentage
  const activePipelinePct =
    nonArchivedTotal > 0
      ? Math.round((activeApps.length / nonArchivedTotal) * 100)
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

  // Ghosting / stale applications (>14 days in Applied stage)
  const ghostedApps = applications.filter(
    (a) => a.status === 'Applied' && calculateDaysInStage(a.stageUpdatedAt) > 14
  );
  const ghostedCount = ghostedApps.length;
  const ghostingRatePct =
    appliedCount > 0 ? Math.round((ghostedCount / appliedCount) * 100) : 0;

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
    interviewProgressionCount: interviewProgression.length,
    interviewProgressionPct,
    offerCount,
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
  const savedCount = applications.filter((a) => a.status === 'Saved').length;
  const appliedCount = applications.filter((a) => a.status === 'Applied').length;
  const screeningCount = applications.filter((a) => a.status === 'Screening').length;
  const interviewCount = applications.filter((a) => a.status === 'Interview').length;
  const offerCount = applications.filter((a) => a.status === 'Offer').length;

  // Cumulative volume reaching each milestone
  // Every offer went through interview & screening & applied
  const milestoneOffer = offerCount;
  const milestoneInterview = interviewCount + milestoneOffer;
  const milestoneScreening = screeningCount + milestoneInterview;
  const milestoneApplied = appliedCount + milestoneScreening;
  const milestoneSaved = savedCount + milestoneApplied;

  const totalBase = milestoneSaved > 0 ? milestoneSaved : (milestoneApplied > 0 ? milestoneApplied : 1);

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
          : 100,
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

  if (milestoneApplied >= 5) {
    if (appToScreen < 10) {
      funnelHealth = 'needs_attention';
      bottleneckAdvice =
        'Applied-to-Screening yield is low (<10%). Tailor your resume keywords and expand referral sourcing.';
    } else if (screenToInterview < 40 && milestoneScreening >= 2) {
      funnelHealth = 'needs_attention';
      bottleneckAdvice =
        'Recruiter screen pass-rate is lagging. Polish your 2-minute narrative elevator pitch and salary alignment.';
    } else if (interviewToOffer < 20 && milestoneInterview >= 3) {
      funnelHealth = 'moderate';
      bottleneckAdvice =
        'Reaching advanced rounds! Focus on system design deep-dives and structured behavioral STAR stories.';
    } else if (overallYieldPct >= 5 || offerCount >= 1) {
      funnelHealth = 'optimal';
      bottleneckAdvice =
        'Strong conversion momentum! Pipeline conversion rates are beating market benchmarks (~2-4%).';
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
 * Calculates platform/source ROI and yield efficiency
 */
export function calculatePlatformRoi(applications: Application[]): {
  metrics: PlatformRoiMetric[];
  topChannel: PlatformRoiMetric | null;
  insight: string;
} {
  const nonArchived = applications.filter((a) => a.status !== 'Archived');
  const total = nonArchived.length;

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

  nonArchived.forEach((app) => {
    const p = app.platform || 'Other';
    if (!platformMap[p]) {
      platformMap[p] = { total: 0, screening: 0, interview: 0, offer: 0, rejected: 0 };
    }
    platformMap[p].total++;
    if (app.status === 'Screening') platformMap[p].screening++;
    if (app.status === 'Interview') platformMap[p].interview++;
    if (app.status === 'Offer') platformMap[p].offer++;
    if (app.status === 'Rejected') platformMap[p].rejected++;
  });

  const metrics: PlatformRoiMetric[] = Object.entries(platformMap).map(
    ([platform, data]) => {
      const advancedCount = data.screening + data.interview + data.offer;
      const interviewRatePct =
        data.total > 0 ? Math.round((advancedCount / data.total) * 100) : 0;
      const totalLoops = data.interview + data.offer;
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
  let staleCount = 0; // 14-21d
  let ghostedCount = 0; // > 21d in applied or > 30d in screening
  let totalDaysInStage = 0;

  const staleApplications: StaleAppItem[] = [];

  activeAndApplied.forEach((app) => {
    const days = calculateDaysInStage(app.stageUpdatedAt);
    totalDaysInStage += days;

    if (days < 7) {
      freshCount++;
    } else if (days <= 14) {
      awaitingCount++;
    } else if (days <= 21) {
      staleCount++;
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
      ghostedCount++;
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
    staleRatePct,
    ghostRatePct,
    ghostingRatePct,
    avgDaysInStage,
    staleApplications,
  };
}

/**
 * Calculates activity momentum and weekly trend velocity
 */
export function calculateMomentumAnalysis(
  applications: Application[],
  timeframe: AnalyticsTimeframe
): MomentumAnalysis {
  const now = new Date();
  const numWeeks = timeframe === '7d' ? 2 : timeframe === '30d' ? 4 : timeframe === '90d' ? 12 : 8;

  // Build weekly slots
  const weeklyTrend: VelocityTrendPoint[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7 - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const periodLabel = i === 0 ? 'Now' : `W-${i}`;
    const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDate = `${startStr} – ${endStr}`;

    let appsCount = 0;
    let statusChangesCount = 0;
    let tasksDoneCount = 0;

    applications.forEach((app) => {
      const appDateStr = app.dateApplied || app.createdAt;
      if (appDateStr) {
        const d = new Date(appDateStr);
        if (d >= weekStart && d <= weekEnd) {
          appsCount++;
        }
      }

      if (app.stageUpdatedAt) {
        const d = new Date(app.stageUpdatedAt);
        if (d >= weekStart && d <= weekEnd) {
          statusChangesCount++;
        }
      }

      if (app.tasks) {
        app.tasks.forEach((t) => {
          if (t.completed && app.updatedAt) {
            const d = new Date(app.updatedAt);
            if (d >= weekStart && d <= weekEnd) {
              tasksDoneCount++;
            }
          }
        });
      }
    });

    weeklyTrend.push({
      periodLabel,
      fullDate,
      appsCount,
      statusChangesCount,
      tasksDoneCount,
      totalActivity: appsCount + statusChangesCount + tasksDoneCount,
    });
  }

  // Calculate current vs previous period pacing
  const halfLen = Math.floor(weeklyTrend.length / 2);
  const recentWeeks = weeklyTrend.slice(halfLen);
  const prevWeeks = weeklyTrend.slice(0, halfLen);

  const currentPeriodApps = recentWeeks.reduce((sum, w) => sum + w.appsCount, 0);
  const prevPeriodApps = prevWeeks.reduce((sum, w) => sum + w.appsCount, 0);

  let paceChangePct = 0;
  if (prevPeriodApps > 0) {
    paceChangePct = Math.round(((currentPeriodApps - prevPeriodApps) / prevPeriodApps) * 100);
  } else if (currentPeriodApps > 0) {
    paceChangePct = 100;
  }

  // Calculate streak in active weeks (working backwards)
  let streakWeeks = 0;
  for (let i = weeklyTrend.length - 1; i >= 0; i--) {
    if (weeklyTrend[i].totalActivity > 0) {
      streakWeeks++;
    } else {
      break;
    }
  }

  const totalActions = weeklyTrend.reduce((sum, w) => sum + w.totalActivity, 0);

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
    currentPeriodApps,
    prevPeriodApps,
    paceChangePct,
    streakWeeks,
    weeklyTrend,
  };
}
