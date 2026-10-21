import { describe, it, expect } from 'vitest';
import {
  calculateConversionFunnel,
  calculateExecutiveKpis,
  calculatePlatformRoi,
  calculateGhostingAndVelocity,
  filterApplicationsForAnalytics,
  filterApplicationsForActivity,
  calculateMomentumAnalysis,
  getApplicationSubmissionDate,
  getApplicationStageMoveDates,
  getApplicationCompletedTaskDates,
  hasReachedStage,
} from '../../src/lib/analyticsUtils';
import { calculateDaysInStage } from '../../src/lib/dateUtils';
import { calculateDwellTime } from '../../src/components/detail/timeline/timelineUtils';
import { Application } from '../../src/types';

describe('analyticsUtils - Dashboard Metrics & Bug Fixes', () => {
  const sampleApps: Application[] = [
    {
      id: 'app-1',
      userId: 'user-1',
      company: 'Linear',
      role: 'Frontend Engineer',
      status: 'Interview',
      platform: 'LinkedIn',
      dateApplied: '2026-07-15',
      stageUpdatedAt: '2026-07-20T10:00:00Z',
      createdAt: '2026-07-15T09:00:00Z',
      updatedAt: '2026-07-20T10:00:00Z',
    },
    {
      id: 'app-2',
      userId: 'user-1',
      company: 'Stripe',
      role: 'Staff Engineer',
      status: 'Offer',
      platform: 'Referral',
      dateApplied: '2026-07-10',
      stageUpdatedAt: '2026-07-24T15:30:00Z',
      createdAt: '2026-07-10T11:00:00Z',
      updatedAt: '2026-07-24T15:30:00Z',
    },
    {
      id: 'app-3',
      userId: 'user-1',
      company: 'Vercel',
      role: 'DX Engineer',
      status: 'Screening',
      platform: 'Company Site',
      dateApplied: '2026-07-18',
      stageUpdatedAt: '2026-07-22T14:00:00Z',
      createdAt: '2026-07-18T16:20:00Z',
      updatedAt: '2026-07-22T14:00:00Z',
    },
    {
      id: 'app-4',
      userId: 'user-1',
      company: 'Cloudflare',
      role: 'Systems Engineer',
      status: 'Applied',
      platform: 'LinkedIn',
      dateApplied: '2026-07-21',
      stageUpdatedAt: '2026-07-21T17:00:00Z',
      createdAt: '2026-07-21T17:00:00Z',
      updatedAt: '2026-07-21T17:00:00Z',
    },
    {
      id: 'app-5',
      userId: 'user-1',
      company: 'Docker',
      role: 'Web Engineer',
      status: 'Rejected',
      platform: 'Indeed',
      dateApplied: '2026-06-20',
      notes: 'Position closed after initial screening.',
      history: [
        { id: 'h1', toStatus: 'Applied', timestamp: '2026-06-20T15:00:00Z' },
        { id: 'h2', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-06-26T11:00:00Z' },
        { id: 'h3', fromStatus: 'Screening', toStatus: 'Rejected', timestamp: '2026-07-02T10:00:00Z' },
      ],
      stageUpdatedAt: '2026-07-02T10:00:00Z',
      createdAt: '2026-06-20T15:00:00Z',
      updatedAt: '2026-07-02T10:00:00Z',
    },
    {
      id: 'app-6',
      userId: 'user-1',
      company: 'Atlassian',
      role: 'Frontend Engineer',
      status: 'Archived',
      platform: 'Company Site',
      dateApplied: '2026-07-03',
      notes: 'Archived due to accepting another offer track.',
      stageUpdatedAt: '2026-07-15T12:00:00Z',
      createdAt: '2026-07-03T09:00:00Z',
      updatedAt: '2026-07-15T12:00:00Z',
    },
  ];

  describe('Issue #66: Past 30 Days closed application counting in Funnel vs Cadence', () => {
    it('counts closed applications submitted in timeframe towards Applications Submitted', () => {
      // Suppose we have an application submitted recently but already marked Rejected
      const recentRejectedApp: Application = {
        id: 'recent-1',
        userId: 'user-1',
        company: 'FastCorp',
        role: 'Senior Dev',
        status: 'Rejected',
        platform: 'LinkedIn',
        dateApplied: new Date().toISOString().slice(0, 10),
        stageUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const funnel = calculateConversionFunnel([recentRejectedApp]);
      const submittedStage = funnel.stages.find((s) => s.status === 'Applied');
      expect(submittedStage).toBeDefined();
      expect(submittedStage?.count).toBe(1);
      expect(funnel.totalApplied).toBe(1);
    });
  });

  describe('Issue #65: Conversion funnel includes closed applications and handles Closed scope correctly', () => {
    it('reflects all tracked opportunities in Opportunities Saved (total applications)', () => {
      const funnel = calculateConversionFunnel(sampleApps);
      const savedStage = funnel.stages.find((s) => s.status === 'Saved');
      expect(savedStage?.count).toBe(sampleApps.length);
      expect(savedStage?.percentageOfTotal).toBe(100);
    });

    it('accurately parses stages for closed applications in Closed scope without all zeros or false 100% pass rate', () => {
      const closedApps = sampleApps.filter((a) => a.status === 'Rejected' || a.status === 'Archived');
      const funnel = calculateConversionFunnel(closedApps);

      const savedStage = funnel.stages.find((s) => s.status === 'Saved');
      const appliedStage = funnel.stages.find((s) => s.status === 'Applied');
      const screeningStage = funnel.stages.find((s) => s.status === 'Screening');
      const interviewStage = funnel.stages.find((s) => s.status === 'Interview');
      const offerStage = funnel.stages.find((s) => s.status === 'Offer');

      expect(savedStage?.count).toBe(2);
      expect(appliedStage?.count).toBe(2);
      // Docker reached screening
      expect(screeningStage?.count).toBe(1);
      // Neither reached interview or offer
      expect(interviewStage?.count).toBe(0);
      expect(offerStage?.count).toBe(0);

      // Pass rate should NOT be 100% for 0 count stages
      expect(interviewStage?.conversionFromPrev).toBe(0);
      expect(offerStage?.conversionFromPrev).toBe(0);
    });
  });

  describe('Issue #64: Application Sources includes archived applications', () => {
    it('sums totalApps across platforms to the exact total count of applications in scope', () => {
      const { metrics } = calculatePlatformRoi(sampleApps);
      const sumApps = metrics.reduce((acc, m) => acc + m.totalApps, 0);
      expect(sumApps).toBe(sampleApps.length);

      // Verify Atlassian (Archived, Company Site) is included
      const companySiteMetric = metrics.find((m) => m.platform === 'Company Site');
      expect(companySiteMetric).toBeDefined();
      expect(companySiteMetric?.totalApps).toBe(2); // Vercel + Atlassian
    });
  });

  describe('Issue #63: Screening Yield matches Conversion Funnel screening pass rate', () => {
    it('yield percentage in Executive KPIs matches the funnel pass rate for screening in All scope', () => {
      const kpis = calculateExecutiveKpis(sampleApps);
      const funnel = calculateConversionFunnel(sampleApps);

      const funnelScreeningStage = funnel.stages.find((s) => s.status === 'Screening');
      expect(kpis.interviewProgressionPct).toBe(funnelScreeningStage?.conversionFromPrev);
      expect(kpis.interviewProgressionCount).toBe(funnelScreeningStage?.count);
    });

    it('yield percentage in Executive KPIs matches the funnel pass rate for screening in Active scope', () => {
      const activeApps = sampleApps.filter(
        (a) => a.status !== 'Rejected' && a.status !== 'Archived'
      );
      const kpis = calculateExecutiveKpis(activeApps);
      const funnel = calculateConversionFunnel(activeApps);

      const funnelScreeningStage = funnel.stages.find((s) => s.status === 'Screening');
      expect(kpis.interviewProgressionPct).toBe(funnelScreeningStage?.conversionFromPrev);
      expect(kpis.interviewProgressionCount).toBe(funnelScreeningStage?.count);
    });
  });

  describe('Issue #62: Days-in-stage consistency across drawer and analytics', () => {
    it('ensures dwell calculation for current stage uses stageUpdatedAt', () => {
      const stageUpdatedAt = '2026-07-16T15:00:00Z';
      const daysInStage = calculateDaysInStage(stageUpdatedAt);
      const dwell = calculateDwellTime(stageUpdatedAt);

      expect(dwell.days).toBe(daysInStage);
      expect(dwell.shortLabel).toBe(`${daysInStage}d`);
    });
  });

  describe('Issue #61: Offer-stage applications are never tagged Ghosted', () => {
    it('excludes Offer-stage applications from ghostedCount in calculateGhostingAndVelocity', () => {
      const oldOfferApp: Application = {
        id: 'offer-old',
        userId: 'user-1',
        company: 'Stripe',
        role: 'Staff Engineer',
        status: 'Offer',
        platform: 'Referral',
        dateApplied: '2026-06-01',
        stageUpdatedAt: '2026-06-15T10:00:00Z', // > 80 days ago
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-15T10:00:00Z',
      };

      const ghosting = calculateGhostingAndVelocity([oldOfferApp]);
      // Must not count as ghosted or stale; instead tracks as decisionPendingCount
      expect(ghosting.ghostedCount).toBe(0);
      expect(ghosting.ghostRatePct).toBe(0);
      expect(ghosting.staleCount).toBe(0);
      expect(ghosting.decisionPendingCount).toBe(1);
      expect(ghosting.staleRatePct).toBe(0);
      expect(ghosting.ghostingRatePct).toBe(0);

      // But should be in staleApplications for decision review
      expect(ghosting.staleApplications.length).toBe(1);
      expect(ghosting.staleApplications[0].status).toBe('Offer');
    });

    it('excludes Offer-stage applications from ghostedCount in calculateExecutiveKpis', () => {
      const oldOfferApp: Application = {
        id: 'offer-old',
        userId: 'user-1',
        company: 'Stripe',
        role: 'Staff Engineer',
        status: 'Offer',
        platform: 'Referral',
        dateApplied: '2026-06-01',
        stageUpdatedAt: '2026-06-15T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-15T10:00:00Z',
      };

      const kpis = calculateExecutiveKpis([oldOfferApp]);
      expect(kpis.ghostedCount).toBe(0);
    });
  });

  describe('Issue #60: Unsourced benchmarks removed and stalled pipeline advice provided', () => {
    it('does not contain unsourced market benchmark claims in bottleneckAdvice', () => {
      const funnel = calculateConversionFunnel(sampleApps);
      expect(funnel.bottleneckAdvice).not.toContain('market benchmarks (~2-4%)');
    });

    it('advises on stalled pipeline when most active applications have had no response', () => {
      const stalledApps: Application[] = [
        {
          id: 'app-stalled-1',
          userId: 'user-1',
          company: 'A',
          role: 'Role',
          status: 'Applied',
          platform: 'LinkedIn',
          dateApplied: '2026-06-01',
          stageUpdatedAt: '2026-06-01T10:00:00Z',
          createdAt: '2026-06-01T10:00:00Z',
          updatedAt: '2026-06-01T10:00:00Z',
        },
        {
          id: 'app-stalled-2',
          userId: 'user-1',
          company: 'B',
          role: 'Role',
          status: 'Applied',
          platform: 'LinkedIn',
          dateApplied: '2026-06-01',
          stageUpdatedAt: '2026-06-01T10:00:00Z',
          createdAt: '2026-06-01T10:00:00Z',
          updatedAt: '2026-06-01T10:00:00Z',
        },
      ];

      const funnel = calculateConversionFunnel(stalledApps);
      expect(funnel.funnelHealth).toBe('needs_attention');
      expect(funnel.bottleneckAdvice).toContain('no response for >14 days');
    });
  });

  describe('hasReachedStage helper', () => {
    it('identifies stages reached accurately based on status and history', () => {
      const docker = sampleApps.find((a) => a.company === 'Docker')!;
      expect(hasReachedStage(docker, 'Saved')).toBe(true);
      expect(hasReachedStage(docker, 'Applied')).toBe(true);
      expect(hasReachedStage(docker, 'Screening')).toBe(true);
      expect(hasReachedStage(docker, 'Interview')).toBe(false);
      expect(hasReachedStage(docker, 'Offer')).toBe(false);

      const linear = sampleApps.find((a) => a.company === 'Linear')!;
      expect(hasReachedStage(linear, 'Saved')).toBe(true);
      expect(hasReachedStage(linear, 'Applied')).toBe(true);
      expect(hasReachedStage(linear, 'Screening')).toBe(true);
      expect(hasReachedStage(linear, 'Interview')).toBe(true);
      expect(hasReachedStage(linear, 'Offer')).toBe(false);

      const stripe = sampleApps.find((a) => a.company === 'Stripe')!;
      expect(hasReachedStage(stripe, 'Saved')).toBe(true);
      expect(hasReachedStage(stripe, 'Applied')).toBe(true);
      expect(hasReachedStage(stripe, 'Screening')).toBe(true);
      expect(hasReachedStage(stripe, 'Interview')).toBe(true);
      expect(hasReachedStage(stripe, 'Offer')).toBe(true);
    });

    it('calculates conversion funnel with non-increasing counts and conversion rates <= 100 for histories that skip stages', () => {
      const stageSkippingApps: Application[] = [
        // Applied -> Interview -> Rejected (skips explicit Screening status)
        {
          id: 'skip-app-1',
          userId: 'user-1',
          company: 'Company A',
          role: 'Role A',
          status: 'Rejected',
          platform: 'LinkedIn',
          dateApplied: '2026-06-01',
          history: [
            { id: 'h1', toStatus: 'Applied', timestamp: '2026-06-01T10:00:00Z' },
            { id: 'h2', fromStatus: 'Applied', toStatus: 'Interview', timestamp: '2026-06-10T10:00:00Z' },
            { id: 'h3', fromStatus: 'Interview', toStatus: 'Rejected', timestamp: '2026-06-20T10:00:00Z' },
          ],
          stageUpdatedAt: '2026-06-20T10:00:00Z',
          createdAt: '2026-06-01T10:00:00Z',
          updatedAt: '2026-06-20T10:00:00Z',
        },
        // Applied -> Offer -> Archived (skips explicit Screening and Interview statuses)
        {
          id: 'skip-app-2',
          userId: 'user-1',
          company: 'Company B',
          role: 'Role B',
          status: 'Archived',
          platform: 'Referral',
          dateApplied: '2026-06-05',
          history: [
            { id: 'h4', toStatus: 'Applied', timestamp: '2026-06-05T10:00:00Z' },
            { id: 'h5', fromStatus: 'Applied', toStatus: 'Offer', timestamp: '2026-06-25T10:00:00Z' },
            { id: 'h6', fromStatus: 'Offer', toStatus: 'Archived', timestamp: '2026-07-01T10:00:00Z' },
          ],
          stageUpdatedAt: '2026-07-01T10:00:00Z',
          createdAt: '2026-06-05T10:00:00Z',
          updatedAt: '2026-07-01T10:00:00Z',
        },
      ];

      const funnel = calculateConversionFunnel(stageSkippingApps);

      // Verify that stage counts are non-increasing: Saved >= Applied >= Screening >= Interview >= Offer
      for (let i = 1; i < funnel.stages.length; i++) {
        expect(funnel.stages[i].count).toBeLessThanOrEqual(funnel.stages[i - 1].count);
        expect(funnel.stages[i].conversionFromPrev).toBeLessThanOrEqual(100);
        expect(funnel.stages[i].conversionFromPrev).toBeGreaterThanOrEqual(0);
      }

      // Check specific stage reach counts:
      const stageMap = Object.fromEntries(funnel.stages.map((s) => [s.status, s.count]));
      expect(stageMap['Saved']).toBe(2);
      expect(stageMap['Applied']).toBe(2);
      expect(stageMap['Screening']).toBe(2);
      expect(stageMap['Interview']).toBe(2);
      expect(stageMap['Offer']).toBe(1);
    });

    it('does not treat Archived applications with contradictory history as Applied even if dateApplied exists', () => {
      const archivedJob: Application = {
        id: 'archived-no-apply',
        userId: 'user-1',
        company: 'Legacy Co',
        role: 'Designer',
        status: 'Archived',
        platform: 'Company Site',
        dateApplied: '2026-06-01',
        history: [
          { id: 'h1', toStatus: 'Saved', timestamp: '2026-06-01T10:00:00Z' },
          { id: 'h2', fromStatus: 'Saved', toStatus: 'Archived', timestamp: '2026-06-02T10:00:00Z' },
        ],
        stageUpdatedAt: '2026-06-02T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-02T10:00:00Z',
      };

      expect(hasReachedStage(archivedJob, 'Saved')).toBe(true);
      expect(hasReachedStage(archivedJob, 'Applied')).toBe(false);
      expect(hasReachedStage(archivedJob, 'Screening')).toBe(false);
    });

    it('treats legacy Rejected applications without history as having reached at least Applied', () => {
      const legacyRejected: Application = {
        id: 'legacy-rejected',
        userId: 'user-1',
        company: 'Old Corp',
        role: 'Backend Dev',
        status: 'Rejected',
        platform: 'Indeed',
        dateApplied: '2026-06-01',
        stageUpdatedAt: '2026-06-05T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-05T10:00:00Z',
      };

      expect(hasReachedStage(legacyRejected, 'Saved')).toBe(true);
      expect(hasReachedStage(legacyRejected, 'Applied')).toBe(true);
      expect(hasReachedStage(legacyRejected, 'Screening')).toBe(false);
    });

    it('Finding 1: treats synthesized initial snapshot on imported Rejected as reaching Applied', () => {
      // batchImport creates a single-entry snapshot without fromStatus
      const importedRejected: Application = {
        id: 'imported-rej',
        userId: 'user-1',
        company: 'Synthesized Corp',
        role: 'Frontend Dev',
        status: 'Rejected',
        platform: 'Indeed',
        dateApplied: '2026-06-01',
        history: [
          { id: 'h-init', toStatus: 'Rejected', timestamp: '2026-06-05T10:00:00Z' },
        ],
        stageUpdatedAt: '2026-06-05T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-05T10:00:00Z',
      };

      expect(hasReachedStage(importedRejected, 'Saved')).toBe(true);
      expect(hasReachedStage(importedRejected, 'Applied')).toBe(true);
      expect(hasReachedStage(importedRejected, 'Screening')).toBe(false);
    });

    it('Finding 1: distinguishes synthesized initial snapshot from explicit Saved -> Archived transition', () => {
      const explicitArchived: Application = {
        id: 'explicit-archived',
        userId: 'user-1',
        company: 'Archived Corp',
        role: 'Dev',
        status: 'Archived',
        platform: 'LinkedIn',
        dateApplied: '2026-06-01',
        history: [
          { id: 'h1', toStatus: 'Saved', timestamp: '2026-06-01T10:00:00Z' },
          { id: 'h2', fromStatus: 'Saved', toStatus: 'Archived', timestamp: '2026-06-02T10:00:00Z' },
        ],
        stageUpdatedAt: '2026-06-02T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-02T10:00:00Z',
      };

      expect(hasReachedStage(explicitArchived, 'Applied')).toBe(false);
    });
  });

  describe('Finding 2: Activity scoping preserves older applications with recent activity', () => {
    it('preserves applications applied 60 days ago in filterApplicationsForActivity for recent event inspection', () => {
      const oldAppWithRecentActivity: Application = {
        id: 'old-app-1',
        userId: 'user-1',
        company: 'Older Corp',
        role: 'Staff Engineer',
        status: 'Interview',
        platform: 'LinkedIn',
        dateApplied: '2026-05-01',
        stageUpdatedAt: '2026-07-28T10:00:00Z',
        createdAt: '2026-05-01T10:00:00Z',
        updatedAt: '2026-07-28T10:00:00Z',
      };

      // Strict 30d cohort filter discards this application
      const cohortFiltered = filterApplicationsForAnalytics([oldAppWithRecentActivity], {
        timeframe: '30d',
        platform: 'All',
        statusCategory: 'All',
      });
      expect(cohortFiltered.length).toBe(0);

      // Activity scope preserves this application so its recent stageUpdatedAt / tasks are counted
      const activityFiltered = filterApplicationsForActivity([oldAppWithRecentActivity], {
        platform: 'All',
        statusCategory: 'All',
      });
      expect(activityFiltered.length).toBe(1);
    });

    it('respects platform and statusCategory filters in filterApplicationsForActivity', () => {
      const app1: Application = {
        ...sampleApps[0],
        platform: 'LinkedIn',
        status: 'Interview',
      };
      const app2: Application = {
        ...sampleApps[1],
        platform: 'Referral',
        status: 'Rejected',
      };

      const linkedInOnly = filterApplicationsForActivity([app1, app2], {
        platform: 'LinkedIn',
        statusCategory: 'All',
      });
      expect(linkedInOnly.length).toBe(1);
      expect(linkedInOnly[0].id).toBe(app1.id);

      const activeOnly = filterApplicationsForActivity([app1, app2], {
        platform: 'All',
        statusCategory: 'Active',
      });
      expect(activeOnly.length).toBe(1);
      expect(activeOnly[0].id).toBe(app1.id);
    });
  });

  describe('Finding 3: Momentum analysis boundaries and pacing separation', () => {
    const fixedNow = new Date('2026-08-01T12:00:00Z');

    it('clips 7d totals strictly to the last 7 calendar days and separates previous period data', () => {
      const appCurrentWeek: Application = {
        id: 'app-cw',
        userId: 'user-1',
        company: 'Current Week Co',
        role: 'Frontend',
        status: 'Applied',
        platform: 'LinkedIn',
        dateApplied: '2026-07-28',
        stageUpdatedAt: '2026-07-28T10:00:00Z',
        createdAt: '2026-07-28T10:00:00Z',
        updatedAt: '2026-07-28T10:00:00Z',
      };

      const appPrevWeek: Application = {
        id: 'app-pw',
        userId: 'user-1',
        company: 'Prev Week Co',
        role: 'Frontend',
        status: 'Applied',
        platform: 'LinkedIn',
        dateApplied: '2026-07-20',
        stageUpdatedAt: '2026-07-20T10:00:00Z',
        createdAt: '2026-07-20T10:00:00Z',
        updatedAt: '2026-07-20T10:00:00Z',
      };

      const momentum = calculateMomentumAnalysis(
        [appCurrentWeek, appPrevWeek],
        '7d',
        fixedNow
      );

      // totalApps and totalActions should only include the application submitted in the 7d window
      expect(momentum.totalApps).toBe(1);
      expect(momentum.totalActions).toBe(1);
      expect(momentum.currentPeriodApps).toBe(1);
      // Previous period includes appPrevWeek (submitted 12 days ago, within [now - 14d, now - 7d))
      expect(momentum.prevPeriodApps).toBe(1);
      expect(momentum.paceChangePct).toBe(0); // 1 vs 1 = 0% change

      // Buckets in weeklyTrend partition the 7-day period (7 daily buckets)
      expect(momentum.weeklyTrend.length).toBe(7);
      const sumTrendApps = momentum.weeklyTrend.reduce((sum, w) => sum + w.appsCount, 0);
      expect(sumTrendApps).toBe(1);
    });
  });

  describe('Finding 4: Stage-move counts from history transitions', () => {
    const fixedNow = new Date('2026-08-01T12:00:00Z');

    it('counts multiple stage transitions occurring within the timeframe from history', () => {
      const multiMoveApp: Application = {
        id: 'app-multi-move',
        userId: 'user-1',
        company: 'Fast Progression Corp',
        role: 'Tech Lead',
        status: 'Interview',
        platform: 'LinkedIn',
        dateApplied: '2026-07-26',
        history: [
          { id: 'h1', toStatus: 'Applied', timestamp: '2026-07-26T10:00:00Z' },
          { id: 'h2', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-07-28T14:00:00Z' },
          { id: 'h3', fromStatus: 'Screening', toStatus: 'Interview', timestamp: '2026-07-30T16:00:00Z' },
        ],
        stageUpdatedAt: '2026-07-30T16:00:00Z',
        createdAt: '2026-07-26T10:00:00Z',
        updatedAt: '2026-07-30T16:00:00Z',
      };

      const stageMoves = getApplicationStageMoveDates(multiMoveApp);
      // Initial creation snapshot (h1, no fromStatus) is not a stage move; h2 and h3 are
      expect(stageMoves.length).toBe(2);

      const momentum = calculateMomentumAnalysis([multiMoveApp], '7d', fixedNow);
      expect(momentum.totalStageMoves).toBe(2);
      expect(momentum.totalApps).toBe(1);
      expect(momentum.totalActions).toBe(3); // 1 app + 2 moves
    });

    it('does not treat initial creation snapshot as a stage move', () => {
      const brandNewApp: Application = {
        id: 'app-new',
        userId: 'user-1',
        company: 'New Corp',
        role: 'Engineer',
        status: 'Applied',
        platform: 'Indeed',
        dateApplied: '2026-07-29',
        history: [
          { id: 'h-init', toStatus: 'Applied', timestamp: '2026-07-29T10:00:00Z' },
        ],
        stageUpdatedAt: '2026-07-29T10:00:00Z',
        createdAt: '2026-07-29T10:00:00Z',
        updatedAt: '2026-07-29T10:00:00Z',
      };

      const stageMoves = getApplicationStageMoveDates(brandNewApp);
      expect(stageMoves.length).toBe(0);

      const momentum = calculateMomentumAnalysis([brandNewApp], '7d', fixedNow);
      expect(momentum.totalStageMoves).toBe(0);
      expect(momentum.totalApps).toBe(1);
    });
  });

  describe('Finding 5: Unrelated edits do not move completed tasks into new activity period', () => {
    const fixedNow = new Date('2026-08-01T12:00:00Z');

    it('uses task-level completedAt to anchor task completion date', () => {
      const appWithOldTask: Application = {
        id: 'app-old-task',
        userId: 'user-1',
        company: 'Notes Edited Corp',
        role: 'Full Stack',
        status: 'Interview',
        platform: 'LinkedIn',
        dateApplied: '2026-06-01',
        stageUpdatedAt: '2026-06-10T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-08-01T11:00:00Z', // User updated notes today!
        tasks: [
          {
            id: 'task-done-june',
            title: 'Technical take-home test',
            completed: true,
            completedAt: '2026-06-08T15:00:00Z', // Completed 50+ days ago
          },
        ],
      };

      const taskDates = getApplicationCompletedTaskDates(appWithOldTask);
      expect(taskDates.length).toBe(1);
      expect(taskDates[0].toISOString()).toBe('2026-06-08T15:00:00.000Z');

      const momentum7d = calculateMomentumAnalysis([appWithOldTask], '7d', fixedNow);
      // Task was completed in June, so 7d window should have 0 completed tasks despite updatedAt being today
      expect(momentum7d.totalTasks).toBe(0);
    });

    it('falls back to updatedAt for legacy tasks without completedAt', () => {
      const legacyApp: Application = {
        id: 'legacy-task-app',
        userId: 'user-1',
        company: 'Legacy Task Corp',
        role: 'Full Stack',
        status: 'Interview',
        platform: 'LinkedIn',
        dateApplied: '2026-07-28',
        stageUpdatedAt: '2026-07-28T10:00:00Z',
        createdAt: '2026-07-28T10:00:00Z',
        updatedAt: '2026-07-29T10:00:00Z',
        tasks: [
          {
            id: 'legacy-task-1',
            title: 'Legacy completed task',
            completed: true,
            // no completedAt property
          },
        ],
      };

      const taskDates = getApplicationCompletedTaskDates(legacyApp);
      expect(taskDates.length).toBe(1);
      expect(taskDates[0].toISOString()).toBe('2026-07-29T10:00:00.000Z');
    });
  });

  describe('Finding 6: Saved opportunities do not count as submitted applications', () => {
    const fixedNow = new Date('2026-08-01T12:00:00Z');

    it('does not increment appsCount or totalApps for Saved opportunities', () => {
      const savedJob: Application = {
        id: 'saved-app-1',
        userId: 'user-1',
        company: 'Bookmark Corp',
        role: 'Staff Engineer',
        status: 'Saved',
        platform: 'LinkedIn',
        dateApplied: '2026-07-30',
        stageUpdatedAt: '2026-07-30T10:00:00Z',
        createdAt: '2026-07-30T10:00:00Z',
        updatedAt: '2026-07-30T10:00:00Z',
      };

      const subDate = getApplicationSubmissionDate(savedJob);
      expect(subDate).toBeUndefined();

      const momentum = calculateMomentumAnalysis([savedJob], '7d', fixedNow);
      expect(momentum.totalApps).toBe(0);
      expect(momentum.currentPeriodApps).toBe(0);
    });

    it('does not increment appsCount for Saved -> Archived opportunities', () => {
      const savedArchivedJob: Application = {
        id: 'saved-archived-1',
        userId: 'user-1',
        company: 'Archived Before Applying Corp',
        role: 'Staff Engineer',
        status: 'Archived',
        platform: 'LinkedIn',
        dateApplied: '2026-07-29',
        history: [
          { id: 'h1', toStatus: 'Saved', timestamp: '2026-07-28T10:00:00Z' },
          { id: 'h2', fromStatus: 'Saved', toStatus: 'Archived', timestamp: '2026-07-29T10:00:00Z' },
        ],
        stageUpdatedAt: '2026-07-29T10:00:00Z',
        createdAt: '2026-07-28T10:00:00Z',
        updatedAt: '2026-07-29T10:00:00Z',
      };

      const subDate = getApplicationSubmissionDate(savedArchivedJob);
      expect(subDate).toBeUndefined();

      const momentum = calculateMomentumAnalysis([savedArchivedJob], '7d', fixedNow);
      expect(momentum.totalApps).toBe(0);
    });

    it('increments appsCount for opportunities that transitioned from Saved to Applied', () => {
      const appliedFromSavedJob: Application = {
        id: 'applied-from-saved',
        userId: 'user-1',
        company: 'Eventually Applied Corp',
        role: 'Staff Engineer',
        status: 'Applied',
        platform: 'LinkedIn',
        dateApplied: '2026-07-29',
        history: [
          { id: 'h1', toStatus: 'Saved', timestamp: '2026-07-15T10:00:00Z' },
          { id: 'h2', fromStatus: 'Saved', toStatus: 'Applied', timestamp: '2026-07-29T14:00:00Z' },
        ],
        stageUpdatedAt: '2026-07-29T14:00:00Z',
        createdAt: '2026-07-15T10:00:00Z',
        updatedAt: '2026-07-29T14:00:00Z',
      };

      const subDate = getApplicationSubmissionDate(appliedFromSavedJob);
      expect(subDate).toBeDefined();
      expect(subDate?.toISOString()).toBe('2026-07-29T14:00:00.000Z');

      const momentum = calculateMomentumAnalysis([appliedFromSavedJob], '7d', fixedNow);
      expect(momentum.totalApps).toBe(1);
    });
  });

  describe('Finding 7: Loop win rate evaluates historical loop conversion accurately', () => {
    it('calculates loop win rate across all evaluated loops including rejected candidates', () => {
      // 1 active offer
      const offerApp: Application = {
        id: 'offer-app-1',
        userId: 'user-1',
        company: 'Winning Corp',
        role: 'Staff Engineer',
        status: 'Offer',
        platform: 'Referral',
        dateApplied: '2026-06-01',
        history: [
          { id: 'h1', toStatus: 'Applied', timestamp: '2026-06-01T10:00:00Z' },
          { id: 'h2', fromStatus: 'Applied', toStatus: 'Interview', timestamp: '2026-06-15T10:00:00Z' },
          { id: 'h3', fromStatus: 'Interview', toStatus: 'Offer', timestamp: '2026-06-25T10:00:00Z' },
        ],
        stageUpdatedAt: '2026-06-25T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-25T10:00:00Z',
      };

      // 9 rejected apps that reached interview loop
      const rejectedLoops: Application[] = Array.from({ length: 9 }, (_, idx) => ({
        id: `rej-loop-${idx}`,
        userId: 'user-1',
        company: `Rejected Loop Corp ${idx}`,
        role: 'Senior Engineer',
        status: 'Rejected',
        platform: 'LinkedIn',
        dateApplied: '2026-06-01',
        history: [
          { id: `h-${idx}-1`, toStatus: 'Applied', timestamp: '2026-06-01T10:00:00Z' },
          { id: `h-${idx}-2`, fromStatus: 'Applied', toStatus: 'Interview', timestamp: '2026-06-12T10:00:00Z' },
          { id: `h-${idx}-3`, fromStatus: 'Interview', toStatus: 'Rejected', timestamp: '2026-06-22T10:00:00Z' },
        ],
        stageUpdatedAt: '2026-06-22T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-22T10:00:00Z',
      }));

      const kpis = calculateExecutiveKpis([offerApp, ...rejectedLoops]);

      expect(kpis.offerCount).toBe(1);
      expect(kpis.offerReachedCount).toBe(1);
      expect(kpis.interviewReachedCount).toBe(10);
      expect(kpis.interviewCount).toBe(0); // 0 active in Interview status
      // Historical loop win rate: 1 offer out of 10 loops = 10%, NOT 100%!
      expect(kpis.offerRatePct).toBe(10);
    });

    it('returns 0% offerRatePct when no applications reached Interview or Offer', () => {
      const screeningApp: Application = {
        id: 'screening-app',
        userId: 'user-1',
        company: 'Early Stage Corp',
        role: 'Developer',
        status: 'Screening',
        platform: 'Indeed',
        dateApplied: '2026-06-01',
        stageUpdatedAt: '2026-06-05T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-05T10:00:00Z',
      };

      const kpis = calculateExecutiveKpis([screeningApp]);
      expect(kpis.interviewReachedCount).toBe(0);
      expect(kpis.offerReachedCount).toBe(0);
      expect(kpis.offerRatePct).toBe(0);
    });
  });

  describe('History transition filtering & status-difference verification', () => {
    it('treats imported Rejected record with multiple same-status entries as reaching Applied', () => {
      const importedMultiRejected: Application = {
        id: 'multi-rej',
        userId: 'user-1',
        company: 'Snapshot Corp',
        role: 'Dev',
        status: 'Rejected',
        platform: 'Indeed',
        dateApplied: '2026-06-01',
        history: [
          { id: 'h1', toStatus: 'Rejected', timestamp: '2026-06-05T10:00:00Z' },
          { id: 'h2', toStatus: 'Rejected', note: 'Sent follow up', timestamp: '2026-06-06T10:00:00Z' },
        ],
        stageUpdatedAt: '2026-06-06T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-06T10:00:00Z',
      };

      // Since there is no status difference (fromStatus !== toStatus), it lacks transition evidence and falls back to Applied
      expect(hasReachedStage(importedMultiRejected, 'Applied')).toBe(true);
    });

    it('chooses earliest valid date where toStatus is Applied and fromStatus differs from Applied', () => {
      const appWithMultipleAppliedEntries: Application = {
        id: 'app-applied-entries',
        userId: 'user-1',
        company: 'Timing Corp',
        role: 'Staff Engineer',
        status: 'Applied',
        platform: 'LinkedIn',
        dateApplied: '2026-06-10',
        history: [
          // Later same-status note
          { id: 'h3', fromStatus: 'Applied', toStatus: 'Applied', timestamp: '2026-06-05T12:00:00Z' },
          // Later actual apply entry
          { id: 'h2', fromStatus: 'Saved', toStatus: 'Applied', timestamp: '2026-06-03T15:00:00Z' },
          // Earliest actual apply entry
          { id: 'h1', fromStatus: 'Saved', toStatus: 'Applied', timestamp: '2026-06-01T09:00:00Z' },
        ],
        stageUpdatedAt: '2026-06-05T12:00:00Z',
        createdAt: '2026-05-25T10:00:00Z',
        updatedAt: '2026-06-05T12:00:00Z',
      };

      const subDate = getApplicationSubmissionDate(appWithMultipleAppliedEntries);
      expect(subDate).toBeDefined();
      expect(subDate?.toISOString()).toBe('2026-06-01T09:00:00.000Z');
    });

    it('excludes same-status entries in getApplicationStageMoveDates', () => {
      const appWithSameStatusMoves: Application = {
        id: 'app-same-status',
        userId: 'user-1',
        company: 'Moves Corp',
        role: 'Engineer',
        status: 'Interview',
        platform: 'LinkedIn',
        dateApplied: '2026-06-01',
        history: [
          { id: 'h1', fromStatus: 'Applied', toStatus: 'Screening', timestamp: '2026-06-05T10:00:00Z' },
          // Same-status note update
          { id: 'h2', fromStatus: 'Screening', toStatus: 'Screening', timestamp: '2026-06-08T10:00:00Z' },
          { id: 'h3', fromStatus: 'Screening', toStatus: 'Interview', timestamp: '2026-06-12T10:00:00Z' },
          // Another same-status interview log
          { id: 'h4', fromStatus: 'Interview', toStatus: 'Interview', timestamp: '2026-06-15T10:00:00Z' },
        ],
        stageUpdatedAt: '2026-06-15T10:00:00Z',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-15T10:00:00Z',
      };

      const moveDates = getApplicationStageMoveDates(appWithSameStatusMoves);
      // Only 2 actual stage moves: Applied -> Screening (June 5) and Screening -> Interview (June 12)
      expect(moveDates.length).toBe(2);
      expect(moveDates[0].toISOString()).toBe('2026-06-05T10:00:00.000Z');
      expect(moveDates[1].toISOString()).toBe('2026-06-12T10:00:00.000Z');
    });
  });
});
