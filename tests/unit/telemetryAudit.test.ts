import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  calculatePercentile,
  calculateMeanAndStd,
  runTelemetryAudit,
} from '../../src/telemetry/auditEngine.ts';
import { generateDeterministicTelemetrySnapshot } from '../../scripts/telemetry/seedTelemetry.ts';

describe('Product Telemetry & Reliability Audit Engine', () => {
  describe('Percentile Calculations (R7 Standard Method)', () => {
    it('accurately computes percentiles for single and uniform values', () => {
      assert.equal(calculatePercentile([10], 0.5), 10);
      assert.equal(calculatePercentile([1, 2, 3, 4, 5], 0.5), 3);
    });

    it('computes linear interpolated ranks identically to NumPy and Excel', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      // p25 = 1 + (10 - 1) * 0.25 = 1 + 2.25 -> 3.25
      assert.equal(calculatePercentile(data, 0.25), 3.25);
      // p50 = 5.5
      assert.equal(calculatePercentile(data, 0.5), 5.5);
      // p75 = 7.75
      assert.equal(calculatePercentile(data, 0.75), 7.75);
    });

    it('calculates mean and standard deviation accurately', () => {
      const { mean, stdDev } = calculateMeanAndStd([2, 4, 4, 4, 5, 5, 7, 9]);
      assert.equal(mean, 5);
      assert.equal(Number(stdDev.toFixed(2)), 2.14);
    });
  });

  describe('Audit Execution & Mathematical Invariants', () => {
    const referenceDate = new Date('2026-10-19T10:00:00Z');
    const snapshot = generateDeterministicTelemetrySnapshot(referenceDate);

    it('generates a deterministic snapshot with expected user counts', () => {
      assert.equal(snapshot.users.length, 450);
      assert.ok(snapshot.applications.length > 1500);
      assert.equal(snapshot.sentryEvents.length, 75);
    });

    it('computes audit report where all mathematical invariants pass', () => {
      const report = runTelemetryAudit(snapshot, '30d', referenceDate);

      assert.equal(report.reconciliation.invariants.length, 6);
      for (const inv of report.reconciliation.invariants) {
        assert.equal(inv.passed, true, `Invariant failed: ${inv.name} (${inv.actual})`);
      }
    });

    it('demonstrates positive right-skewness between arithmetic mean and median', () => {
      const report = runTelemetryAudit(snapshot, 'all', referenceDate);

      // In real-world job tracking, power users skew the mean above the median
      assert.ok(
        report.applicationPercentiles.arithmeticMean > report.applicationPercentiles.median,
        'Arithmetic mean must be greater than median'
      );
      assert.ok(report.applicationPercentiles.skewnessIndex > 0, 'Skewness index must be positive');
    });

    it('detects Sentry exceptions causing immediate funnel abandonment', () => {
      const report = runTelemetryAudit(snapshot, '30d', referenceDate);

      assert.ok(report.reliabilityImpact.topAbandonmentExceptions.length > 0);
      const topError = report.reliabilityImpact.topAbandonmentExceptions[0];
      assert.ok(topError.abandonmentRate > 0);
      assert.ok(topError.uniqueUsers > 0);
      assert.ok(topError.blastRadiusPct > 0);
    });

    it('reconciles PostHog client events against database rows and measures ad-blocker loss', () => {
      const report = runTelemetryAudit(snapshot, '30d', referenceDate);

      // Client capture rate must be between 70% and 95% due to ad-blockers
      assert.ok(report.reconciliation.telemetryCaptureRate > 70);
      assert.ok(report.reconciliation.telemetryCaptureRate < 95);
      assert.ok(report.reconciliation.adBlockerEstimatedDropRate > 5);
    });

    it('respects time window boundaries across 7d, 30d, 90d, and all', () => {
      const rep7d = runTelemetryAudit(snapshot, '7d', referenceDate);
      const rep30d = runTelemetryAudit(snapshot, '30d', referenceDate);
      const repAll = runTelemetryAudit(snapshot, 'all', referenceDate);

      assert.ok(rep7d.applicationPercentiles.sampleSize <= rep30d.applicationPercentiles.sampleSize);
      assert.ok(rep30d.applicationPercentiles.sampleSize <= repAll.applicationPercentiles.sampleSize);
    });
  });
});
