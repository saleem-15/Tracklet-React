import { describe, it, expect } from 'vitest';
import {
  calculateConversionFunnel,
  calculateExecutiveKpis,
  calculatePlatformRoi,
  calculateGhostingAndVelocity,
  filterApplicationsForAnalytics,
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
  });
});
