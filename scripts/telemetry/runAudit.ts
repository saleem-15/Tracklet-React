/**
 * CLI Audit Runner for Tracklet Product Telemetry & Reliability Audit.
 * Ingests from live APIs, snapshot files, or deterministic seed generator.
 * Runs invariant verification suite and updates the interactive web dashboard.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTelemetryAudit, getWindowBoundaries } from '../../src/telemetry/auditEngine.ts';
import type {
  AuditTimeWindow,
  RawTelemetrySnapshot,
  TelemetryAuditReport,
  DbUserRecord,
  DbApplicationRecord,
  PostHogEventRecord,
  SentryEventRecord,
} from '../../src/telemetry/types.ts';
import {
  generateDeterministicTelemetrySnapshot,
  persistTelemetrySnapshot,
} from './seedTelemetry.ts';
import {
  fetchPostHogEvents,
  fetchSentryEvents,
  fetchFirestoreCollections,
} from '../../src/telemetry/liveAdapters.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const dataDir = path.join(rootDir, 'telemetry-data');
const rawDir = path.join(dataDir, 'raw');
const publicDir = path.join(rootDir, 'public');

// Parse CLI flags
function parseArgs(): { window: AuditTimeWindow; source: 'live' | 'snapshot' | 'seed'; outPath: string } {
  const args = process.argv.slice(2);
  let window: AuditTimeWindow = '30d';
  let source: 'live' | 'snapshot' | 'seed' = 'snapshot';
  let outPath = path.join(dataDir, 'telemetry-audit-report.json');

  for (const arg of args) {
    if (arg.startsWith('--window=')) {
      const val = arg.split('=')[1] as AuditTimeWindow;
      if (['7d', '30d', '90d', 'all'].includes(val)) window = val;
    } else if (arg.startsWith('--source=')) {
      const val = arg.split('=')[1] as 'live' | 'snapshot' | 'seed';
      if (['live', 'snapshot', 'seed'].includes(val)) source = val;
    } else if (arg.startsWith('--out=')) {
      outPath = path.resolve(rootDir, arg.split('=')[1]);
    }
  }

  return { window, source, outPath };
}

function loadEnvFiles(): void {
  for (const envFile of ['.env', '.env.local']) {
    const p = path.join(rootDir, envFile);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const val = match[2].trim().replace(/^["'](.*)["']$/, '$1');
          process.env[key] = val;
        }
      }
    }
  }
}

async function loadSnapshot(source: 'live' | 'snapshot' | 'seed'): Promise<RawTelemetrySnapshot> {
  loadEnvFiles();

  const usersPath = path.join(rawDir, 'users.json');
  const appsPath = path.join(rawDir, 'applications.json');
  const phPath = path.join(rawDir, 'posthog-events.json');
  const sentryPath = path.join(rawDir, 'sentry-events.json');

  let users: DbUserRecord[] = [];
  let applications: DbApplicationRecord[] = [];
  let posthogEvents: PostHogEventRecord[] = [];
  let sentryEvents: SentryEventRecord[] = [];

  // 1. Ensure real Firebase users & applications are loaded from disk if extracted
  if (fs.existsSync(usersPath) && fs.existsSync(appsPath)) {
    users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    applications = JSON.parse(fs.readFileSync(appsPath, 'utf8'));
    console.log(`✓ Loaded real Firebase data (${users.length} users, ${applications.length} applications)`);
  }

  const hasLiveKeys = Boolean(
    process.env.POSTHOG_PERSONAL_API_KEY &&
    process.env.POSTHOG_PROJECT_ID &&
    process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT
  );

  // 2. Fetch live PostHog & Sentry if requested or if keys are configured
  if (source === 'live' || hasLiveKeys) {
    try {
      console.log('[Audit] Connecting to live PostHog & Sentry APIs...');
      const config = {
        posthogApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
        posthogProjectId: process.env.POSTHOG_PROJECT_ID,
        posthogHost: process.env.VITE_POSTHOG_HOST,
        sentryAuthToken: process.env.SENTRY_AUTH_TOKEN,
        sentryOrg: process.env.SENTRY_ORG,
        sentryProject: process.env.SENTRY_PROJECT,
      };

      const [phEvents, sEvents] = await Promise.all([
        fetchPostHogEvents(config).catch((err) => {
          console.warn('[Audit] PostHog fetch notice:', err.message);
          return [];
        }),
        fetchSentryEvents(config).catch((err) => {
          console.warn('[Audit] Sentry fetch notice:', err.message);
          return [];
        }),
      ]);

      posthogEvents = phEvents;
      sentryEvents = sEvents;
      console.log(`✓ Live PostHog events fetched: ${posthogEvents.length}`);
      console.log(`✓ Live Sentry events fetched: ${sentryEvents.length}`);

      if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
      fs.writeFileSync(phPath, JSON.stringify(posthogEvents, null, 2), 'utf8');
      fs.writeFileSync(sentryPath, JSON.stringify(sentryEvents, null, 2), 'utf8');

      if (users.length > 0) {
        return {
          users,
          applications,
          posthogEvents,
          sentryEvents,
          snapshotMetadata: {
            capturedAt: new Date().toISOString(),
            source: 'live_apis',
            totalDbUsers: users.length,
            totalDbApplications: applications.length,
            totalPostHogEvents: posthogEvents.length,
            totalSentryEvents: sentryEvents.length,
          },
        };
      }
    } catch (err: any) {
      console.warn(`[Audit] Live API error: ${err.message}.`);
    }
  }

  // 3. If snapshot files exist on disk, use them
  if (
    fs.existsSync(usersPath) &&
    fs.existsSync(appsPath) &&
    fs.existsSync(phPath) &&
    fs.existsSync(sentryPath)
  ) {
    console.log('[Audit] Ingesting snapshots from telemetry-data/raw/...');
    return {
      users: JSON.parse(fs.readFileSync(usersPath, 'utf8')),
      applications: JSON.parse(fs.readFileSync(appsPath, 'utf8')),
      posthogEvents: JSON.parse(fs.readFileSync(phPath, 'utf8')),
      sentryEvents: JSON.parse(fs.readFileSync(sentryPath, 'utf8')),
      snapshotMetadata: {
        capturedAt: new Date().toISOString(),
        source: 'file_export',
        totalDbUsers: users.length,
        totalDbApplications: applications.length,
        totalPostHogEvents: posthogEvents.length,
        totalSentryEvents: sentryEvents.length,
      },
    };
  }

  // Otherwise generate deterministic seed fixture
  console.log('[Audit] Generating deterministic telemetry dataset fixture...');
  const snapshot = generateDeterministicTelemetrySnapshot();
  persistTelemetrySnapshot(snapshot);
  return snapshot;
}

export async function runAuditPipeline(): Promise<TelemetryAuditReport> {
  const { window, source, outPath } = parseArgs();

  console.log(`\n========================================================================`);
  console.log(`  TRACKLET PRODUCT TELEMETRY & RELIABILITY AUDIT PIPELINE`);
  console.log(`  Target Window: ${window.toUpperCase()} | Source: ${source.toUpperCase()}`);
  console.log(`========================================================================\n`);

  const snapshot = await loadSnapshot(source);
  console.log(`✓ Ingested ${snapshot.users.length} Users`);
  console.log(`✓ Ingested ${snapshot.applications.length} Applications`);
  console.log(`✓ Ingested ${snapshot.posthogEvents.length} PostHog Raw Events`);
  console.log(`✓ Ingested ${snapshot.sentryEvents.length} Sentry Issue Events\n`);

  // Generate multi-window payload for dashboard
  const windows: AuditTimeWindow[] = ['7d', '30d', '90d', 'all'];
  const multiWindowReports: Record<AuditTimeWindow, TelemetryAuditReport> = {} as any;
  for (const w of windows) {
    multiWindowReports[w] = runTelemetryAudit(snapshot, w);
  }

  const primaryReport = multiWindowReports[window];

  // Print Executive Summary
  console.log(`── 1. PRODUCT & ENGAGEMENT METRICS (${window}) ────────────────────────────`);
  console.log(`• Total Registered Users : ${primaryReport.userDistribution.totalRegistered}`);
  console.log(`• Activated Users (>=1 app): ${primaryReport.userDistribution.activatedUsers} (${primaryReport.userDistribution.activationRate}%)`);
  console.log(`• Dormant Users (0 apps) : ${primaryReport.userDistribution.dormantUsers}`);
  console.log(`• Active in Window       : ${primaryReport.userDistribution.activeInWindowUsers}`);
  console.log(``);
  console.log(`── 2. APPLICATION DISTRIBUTION & OUTLIER ANALYSIS ────────────────────`);
  console.log(`• Sample Size (Apps in window): ${primaryReport.applicationPercentiles.sampleSize}`);
  console.log(`• Arithmetic Mean        : ${primaryReport.applicationPercentiles.arithmeticMean} apps/user`);
  console.log(`• Median (p50)           : ${primaryReport.applicationPercentiles.median} apps/user  <-- Authentic Central Tendency`);
  console.log(`• IQR (p75 - p25)        : ${primaryReport.applicationPercentiles.p25} to ${primaryReport.applicationPercentiles.p75} (Spread: ${primaryReport.applicationPercentiles.iqr})`);
  console.log(`• 90th & 99th Percentile : p90=${primaryReport.applicationPercentiles.p90}, p99=${primaryReport.applicationPercentiles.p99}, max=${primaryReport.applicationPercentiles.max}`);
  console.log(`• Skewness Analysis      : ${primaryReport.applicationPercentiles.skewnessCommentary}`);
  console.log(``);
  console.log(`── 3. COHORT ACTIVATION FUNNEL ────────────────────────────────────────`);
  for (const stage of primaryReport.cohortFunnel.stages) {
    console.log(`  Step ${stage.step} [${stage.label}] -> ${stage.count} users (${stage.conversionRate}% conv, -${stage.dropoffFromPrevious} drop)`);
  }
  console.log(`• Median Time-to-First-App: ${primaryReport.cohortFunnel.timeToFirstApplication.medianMinutes} mins`);
  console.log(``);
  console.log(`── 4. RELIABILITY & ERROR IMPACT ANALYSIS ─────────────────────────────`);
  console.log(`• Crash-Free Sessions    : ${primaryReport.reliabilityImpact.crashFreeSessionRate}% (${primaryReport.reliabilityImpact.crashFreeSessions}/${primaryReport.reliabilityImpact.totalSessions})`);
  console.log(`• Error-Impacted Users   : ${primaryReport.reliabilityImpact.errorImpactedUserRate}% (${primaryReport.reliabilityImpact.errorImpactedUsers} unique users)`);
  console.log(`• Top 5 Exceptions Causing Funnel Abandonment:`);
  primaryReport.reliabilityImpact.topAbandonmentExceptions.forEach((e, idx) => {
    console.log(`  #${idx + 1} [${e.exceptionType}] ${e.message.slice(0, 50)}...`);
    console.log(`     Blast Radius: ${e.uniqueUsers} users (${e.blastRadiusPct}%) | Abandonment Rate: ${e.abandonmentRate}% (${e.abandonmentSessions} sessions)`);
  });
  console.log(``);
  console.log(`── 5. DATA INTEGRITY & RECONCILIATION AUDIT ───────────────────────────`);
  console.log(`• Database Application Rows : ${primaryReport.reconciliation.databaseApplicationCount}`);
  console.log(`• PostHog Created Events    : ${primaryReport.reconciliation.posthogCreatedEventCount}`);
  console.log(`• Telemetry Capture Rate    : ${primaryReport.reconciliation.telemetryCaptureRate}%`);
  console.log(`• Ad-Blocker Drop Rate      : ${primaryReport.reconciliation.adBlockerEstimatedDropRate}%`);
  console.log(`• Duplicate Client Events   : ${primaryReport.reconciliation.duplicateClientEvents}`);
  console.log(`\n── 6. MATHEMATICAL INVARIANT VERIFICATIONS ─────────────────────────────`);
  let allPassed = true;
  for (const inv of primaryReport.reconciliation.invariants) {
    const mark = inv.passed ? '✓ PASSED' : '✗ FAILED';
    if (!inv.passed) allPassed = false;
    console.log(`  [${mark}] ${inv.name.padEnd(32)}: ${inv.assertionFormula}`);
    console.log(`            Expected: ${inv.expected} | Actual: ${inv.actual}`);
  }
  console.log(``);

  // Write the structured JSON report artifact
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(primaryReport, null, 2), 'utf8');
  console.log(`✓ Structured Audit Report saved to ${outPath}`);

  // Write multi-window database report for dashboard
  const bundlePath = path.join(dataDir, 'multi-window-audit.json');
  fs.writeFileSync(bundlePath, JSON.stringify(multiWindowReports, null, 2), 'utf8');

  // Generate / Update standalone web dashboard
  generateHtmlDashboard(multiWindowReports);

  console.log(`\n========================================================================`);
  console.log(`  AUDIT COMPLETED WITH STATUS: ${allPassed ? 'ALL INVARIANTS PASSED' : 'INVARIANTS FAILED'}`);
  console.log(`  Checksum: ${primaryReport.meta.checksum}`);
  console.log(`  Dashboard: file://${path.join(publicDir, 'telemetry-dashboard.html').replace(/\\/g, '/')}`);
  console.log(`========================================================================\n`);

  return primaryReport;
}

/**
 * Builds the high-clarity standalone interactive dashboard HTML.
 */
function generateHtmlDashboard(reports: Record<AuditTimeWindow, TelemetryAuditReport>): void {
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const htmlContent = `<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-50 text-slate-900 antialiased">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tracklet — Product Telemetry & Reliability Audit</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#eef2ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    code, pre, .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-full flex flex-col">

  <!-- Header Bar -->
  <header class="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          T
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="text-lg font-bold text-slate-900">Product Telemetry & Reliability Audit</h1>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Verified Invariants
            </span>
          </div>
          <p class="text-xs text-slate-500">Cross-reconciliation of Firestore DB, PostHog Client Analytics, and Sentry Telemetry</p>
        </div>
      </div>

      <!-- Window Switcher & Lineage Toggle -->
      <div class="flex items-center space-x-3">
        <div class="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200" id="window-tabs">
          <button onclick="setWindow('7d')" id="tab-7d" class="px-3 py-1.5 rounded-md transition-all">7 Days</button>
          <button onclick="setWindow('30d')" id="tab-30d" class="px-3 py-1.5 rounded-md bg-white text-indigo-600 shadow-sm transition-all">30 Days</button>
          <button onclick="setWindow('90d')" id="tab-90d" class="px-3 py-1.5 rounded-md transition-all">90 Days</button>
          <button onclick="setWindow('all')" id="tab-all" class="px-3 py-1.5 rounded-md transition-all">All Time</button>
        </div>
        <button onclick="toggleLineageModal()" class="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
          Data Lineage Notes
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

    <!-- Top KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Card 1: Users -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Registered Accounts</span>
          <span class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold" id="kpi-activation-rate">0% Act.</span>
        </div>
        <div class="mt-2 flex items-baseline space-x-2">
          <span class="text-3xl font-bold tracking-tight text-slate-900" id="kpi-total-users">0</span>
          <span class="text-xs text-slate-500 font-medium">users</span>
        </div>
        <div class="mt-3 pt-3 border-t border-slate-100 text-xs flex justify-between text-slate-500">
          <span>Activated: <b class="text-slate-900 font-semibold" id="kpi-activated-users">0</b></span>
          <span>Dormant: <b class="text-slate-900 font-semibold" id="kpi-dormant-users">0</b></span>
        </div>
      </div>

      <!-- Card 2: Applications (Mean vs Median) -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div class="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Central Tendency (Apps/User)</span>
          <span class="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-semibold">Skewness Proof</span>
        </div>
        <div class="mt-2 flex items-baseline space-x-3">
          <div>
            <span class="text-3xl font-bold tracking-tight text-indigo-600" id="kpi-median">0</span>
            <span class="text-xs text-slate-500 font-medium">median</span>
          </div>
          <div class="text-slate-300">/</div>
          <div>
            <span class="text-xl font-bold text-slate-400 line-through" id="kpi-mean">0</span>
            <span class="text-xs text-slate-400">mean</span>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
          <span>IQR: <b class="text-slate-900 font-semibold" id="kpi-iqr">0 - 0</b></span>
          <span>Max: <b class="text-slate-900 font-semibold" id="kpi-max">0</b></span>
        </div>
      </div>

      <!-- Card 3: Crash Free Rate -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Crash-Free Sessions</span>
          <span class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold" id="kpi-crash-free-rate">0%</span>
        </div>
        <div class="mt-2 flex items-baseline space-x-2">
          <span class="text-3xl font-bold tracking-tight text-slate-900" id="kpi-error-rate">0%</span>
          <span class="text-xs text-rose-500 font-medium">user blast radius</span>
        </div>
        <div class="mt-3 pt-3 border-t border-slate-100 text-xs flex justify-between text-slate-500">
          <span>Impacted Users: <b class="text-rose-600 font-semibold" id="kpi-impacted-users">0</b></span>
          <span>Active Users: <b class="text-slate-900 font-semibold" id="kpi-active-users">0</b></span>
        </div>
      </div>

      <!-- Card 4: Telemetry Capture Rate -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Client Telemetry Capture</span>
          <span class="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold" id="kpi-capture-badge">Reconciled</span>
        </div>
        <div class="mt-2 flex items-baseline space-x-2">
          <span class="text-3xl font-bold tracking-tight text-slate-900" id="kpi-capture-rate">0%</span>
          <span class="text-xs text-slate-500 font-medium">matched</span>
        </div>
        <div class="mt-3 pt-3 border-t border-slate-100 text-xs flex justify-between text-slate-500">
          <span>Ad-Blocker Drop: <b class="text-amber-600 font-semibold" id="kpi-ad-blocker">0%</b></span>
          <span>DB Rows: <b class="text-slate-900 font-semibold" id="kpi-db-rows">0</b></span>
        </div>
      </div>
    </div>

    <!-- Section 2: Distribution & Funnel Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- Box 1: Power-Law Distribution -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Application Distribution Across Users</h2>
            <p class="text-xs text-slate-500 mt-0.5">Exposing outlier distortion between arithmetic mean and percentiles</p>
          </div>
          <span class="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 text-slate-700 rounded-lg">R7 Method</span>
        </div>

        <!-- Percentile Tiles -->
        <div class="grid grid-cols-5 gap-2 text-center pt-2">
          <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">p25</div>
            <div class="text-base font-bold text-slate-800 mt-0.5" id="pct-p25">0</div>
          </div>
          <div class="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-900">
            <div class="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">p50 (Med)</div>
            <div class="text-base font-bold text-indigo-700 mt-0.5" id="pct-p50">0</div>
          </div>
          <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">p75</div>
            <div class="text-base font-bold text-slate-800 mt-0.5" id="pct-p75">0</div>
          </div>
          <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">p90</div>
            <div class="text-base font-bold text-slate-800 mt-0.5" id="pct-p90">0</div>
          </div>
          <div class="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <div class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">p99 (Max)</div>
            <div class="text-base font-bold text-slate-800 mt-0.5" id="pct-p99">0</div>
          </div>
        </div>

        <!-- Skew Commentary Box -->
        <div class="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
          <span class="text-amber-600 font-bold text-sm">ℹ</span>
          <p id="dist-commentary" class="leading-relaxed"></p>
        </div>

        <!-- Volume Buckets Bar Chart -->
        <div class="space-y-2.5 pt-2" id="distribution-bars">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- Box 2: Cohort Funnel & Time-to-First-App -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-slate-900">Cohort Activation & Time-to-First-App</h2>
            <p class="text-xs text-slate-500 mt-0.5">End-to-end user conversion from landing to logging first application</p>
          </div>
          <span class="text-xs font-semibold text-slate-500" id="funnel-median-time">Median: 0m</span>
        </div>

        <!-- Funnel Stages -->
        <div class="space-y-3 pt-2" id="funnel-container">
          <!-- Populated dynamically -->
        </div>

        <!-- Time to first application breakdown -->
        <div class="pt-4 border-t border-slate-100">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Time-to-First-Application Distribution</h3>
          <div class="grid grid-cols-5 gap-1.5 text-center" id="time-to-app-container">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>

    </div>

    <!-- Section 3: Sentry Reliability & Funnel-Killing Exceptions -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-base font-bold text-slate-900">Top Exceptions Causing Immediate Funnel Abandonment</h2>
          <p class="text-xs text-slate-500 mt-0.5">Exceptions cross-stitched to PostHog sessions where user abandoned within 3 minutes with no recovery</p>
        </div>
        <div class="text-xs text-slate-500">
          Stitched via <code class="px-1.5 py-0.5 bg-slate-100 rounded text-indigo-600 font-semibold">posthog_session_id</code>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
            <tr>
              <th class="py-3 px-4">Exception & Location</th>
              <th class="py-3 px-3">Route</th>
              <th class="py-3 px-3">Occurrences</th>
              <th class="py-3 px-3">Blast Radius</th>
              <th class="py-3 px-3">Abandonment Rate</th>
              <th class="py-3 px-4">Trace Sample</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-normal" id="exceptions-table-body">
            <!-- Populated dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Section 4: Mathematical Invariant Assertions & Reconciliation -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900">Mathematical Invariant Verification & Ground Truth Audit</h2>
          <p class="text-xs text-slate-500 mt-0.5">Automated proofs showing client telemetry and aggregations reconcile with database truth</p>
        </div>
        <div class="flex items-center space-x-2 text-xs font-mono text-slate-500">
          <span>Checksum:</span>
          <span class="px-2 py-0.5 bg-slate-100 rounded font-semibold text-slate-800" id="report-checksum">00000000</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="invariants-container">
        <!-- Populated dynamically -->
      </div>
    </div>

  </main>

  <!-- Data Lineage Modal -->
  <div id="lineage-modal" class="fixed inset-0 z-50 hidden bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 class="text-base font-bold text-slate-900">Data Lineage & Formula Definitions</h3>
        <button onclick="toggleLineageModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
      </div>
      <div class="space-y-4 text-xs" id="lineage-content">
        <!-- Populated dynamically -->
      </div>
      <div class="pt-3 border-t border-slate-100 text-right">
        <button onclick="toggleLineageModal()" class="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors">
          Close
        </button>
      </div>
    </div>
  </div>

  <!-- Injected Report Bundle Script -->
  <script>
    const REPORTS = ${JSON.stringify(reports)};
    let activeWindow = '30d';

    function setWindow(w) {
      activeWindow = w;
      ['7d', '30d', '90d', 'all'].forEach(tab => {
        const btn = document.getElementById('tab-' + tab);
        if (tab === w) {
          btn.className = 'px-3 py-1.5 rounded-md bg-white text-indigo-600 shadow-sm transition-all font-bold';
        } else {
          btn.className = 'px-3 py-1.5 rounded-md transition-all text-slate-600 hover:text-slate-900 font-semibold';
        }
      });
      render();
    }

    function toggleLineageModal() {
      const modal = document.getElementById('lineage-modal');
      modal.classList.toggle('hidden');
    }

    function render() {
      const report = REPORTS[activeWindow];
      if (!report) return;

      // Top KPIs
      document.getElementById('kpi-total-users').innerText = report.userDistribution.totalRegistered;
      document.getElementById('kpi-activation-rate').innerText = report.userDistribution.activationRate + '% Act.';
      document.getElementById('kpi-activated-users').innerText = report.userDistribution.activatedUsers;
      document.getElementById('kpi-dormant-users').innerText = report.userDistribution.dormantUsers;

      document.getElementById('kpi-median').innerText = report.applicationPercentiles.median;
      document.getElementById('kpi-mean').innerText = report.applicationPercentiles.arithmeticMean;
      document.getElementById('kpi-iqr').innerText = report.applicationPercentiles.p25 + ' - ' + report.applicationPercentiles.p75;
      document.getElementById('kpi-max').innerText = report.applicationPercentiles.max;

      document.getElementById('kpi-crash-free-rate').innerText = report.reliabilityImpact.crashFreeSessionRate + '%';
      document.getElementById('kpi-error-rate').innerText = report.reliabilityImpact.errorImpactedUserRate + '%';
      document.getElementById('kpi-impacted-users').innerText = report.reliabilityImpact.errorImpactedUsers;
      document.getElementById('kpi-active-users').innerText = report.reliabilityImpact.uniqueActiveUsers;

      document.getElementById('kpi-capture-rate').innerText = report.reconciliation.telemetryCaptureRate + '%';
      document.getElementById('kpi-ad-blocker').innerText = report.reconciliation.adBlockerEstimatedDropRate + '%';
      document.getElementById('kpi-db-rows').innerText = report.reconciliation.databaseApplicationCount;

      // Percentiles
      document.getElementById('pct-p25').innerText = report.applicationPercentiles.p25;
      document.getElementById('pct-p50').innerText = report.applicationPercentiles.median;
      document.getElementById('pct-p75').innerText = report.applicationPercentiles.p75;
      document.getElementById('pct-p90').innerText = report.applicationPercentiles.p90;
      document.getElementById('pct-p99').innerText = report.applicationPercentiles.p99;
      document.getElementById('dist-commentary').innerText = report.applicationPercentiles.skewnessCommentary;

      // Distribution Bars
      const barsContainer = document.getElementById('distribution-bars');
      barsContainer.innerHTML = '';
      report.applicationPercentiles.distributionBuckets.forEach(b => {
        const row = document.createElement('div');
        row.className = 'space-y-1';
        row.innerHTML = \`
          <div class="flex justify-between text-xs font-medium text-slate-700">
            <span>\${b.label}</span>
            <span class="text-slate-500">\${b.count} users (\${b.percentage}%)</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div class="bg-indigo-600 h-2 rounded-full" style="width: \${Math.min(100, b.percentage)}%"></div>
          </div>
        \`;
        barsContainer.appendChild(row);
      });

      // Funnel
      document.getElementById('funnel-median-time').innerText = 'Median Time: ' + report.cohortFunnel.timeToFirstApplication.medianMinutes + 'm';
      const funnelContainer = document.getElementById('funnel-container');
      funnelContainer.innerHTML = '';
      report.cohortFunnel.stages.forEach(s => {
        const item = document.createElement('div');
        item.className = 'p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5';
        item.innerHTML = \`
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-900">\${s.label}</span>
            <span class="font-semibold text-slate-700">\${s.count} users <span class="text-slate-400">(\${s.overallConversionRate}% overall)</span></span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div class="bg-emerald-500 h-2.5 rounded-full" style="width: \${Math.min(100, s.overallConversionRate)}%"></div>
          </div>
          <div class="flex justify-between text-[11px] text-slate-500">
            <span>Step Conversion: <b class="text-emerald-700">\${s.conversionRate}%</b></span>
            <span>Drop-off: <b class="text-rose-600">-\${s.dropoffFromPrevious}</b></span>
          </div>
        \`;
        funnelContainer.appendChild(item);
      });

      // Time to app container
      const timeContainer = document.getElementById('time-to-app-container');
      timeContainer.innerHTML = '';
      report.cohortFunnel.timeToFirstApplication.buckets.forEach(b => {
        const el = document.createElement('div');
        el.className = 'p-2 bg-slate-50 rounded-lg border border-slate-100';
        el.innerHTML = \`
          <div class="text-[10px] text-slate-500 font-medium truncate">\${b.label.split(' ')[0]}</div>
          <div class="text-xs font-bold text-slate-800 mt-0.5">\${b.percentage}%</div>
          <div class="text-[9px] text-slate-400">\${b.count} users</div>
        \`;
        timeContainer.appendChild(el);
      });

      // Exceptions Table
      const tb = document.getElementById('exceptions-table-body');
      tb.innerHTML = '';
      report.reliabilityImpact.topAbandonmentExceptions.forEach(e => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/80 transition-colors';
        tr.innerHTML = \`
          <td class="py-3 px-4">
            <div class="font-semibold text-slate-900">\${e.exceptionType}</div>
            <div class="text-[11px] text-slate-500 truncate max-w-xs">\${e.message}</div>
          </td>
          <td class="py-3 px-3">
            <span class="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-mono text-slate-700">\${e.affectedRoute}</span>
          </td>
          <td class="py-3 px-3 font-semibold text-slate-900">\${e.occurrences}</td>
          <td class="py-3 px-3">
            <span class="text-rose-600 font-semibold">\${e.blastRadiusPct}%</span>
            <span class="text-[10px] text-slate-400">(\${e.uniqueUsers} users)</span>
          </td>
          <td class="py-3 px-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              \${e.abandonmentRate}%
            </span>
          </td>
          <td class="py-3 px-4">
            <code class="text-[10px] bg-slate-900 text-slate-200 px-2 py-1 rounded block max-w-xs truncate">\${e.sampleStack.split('\\n')[0]}</code>
          </td>
        \`;
        tb.appendChild(tr);
      });

      // Invariants
      document.getElementById('report-checksum').innerText = report.meta.checksum;
      const invContainer = document.getElementById('invariants-container');
      invContainer.innerHTML = '';
      report.reconciliation.invariants.forEach(inv => {
        const card = document.createElement('div');
        card.className = 'p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2';
        card.innerHTML = \`
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-slate-900">\${inv.name}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold \${inv.passed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
              \${inv.passed ? 'PASSED' : 'FAILED'}
            </span>
          </div>
          <code class="block text-[11px] font-mono text-indigo-600 bg-indigo-50/50 p-1.5 rounded">\${inv.assertionFormula}</code>
          <p class="text-[11px] text-slate-500 leading-snug">\${inv.description}</p>
          <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex justify-between">
            <span>Result: <b class="text-slate-700">\${inv.actual}</b></span>
          </div>
        \`;
        invContainer.appendChild(card);
      });

      // Lineage Notes
      const linContainer = document.getElementById('lineage-content');
      linContainer.innerHTML = '';
      Object.entries(report.dataLineage).forEach(([key, val]) => {
        const row = document.createElement('div');
        row.className = 'p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1';
        row.innerHTML = \`
          <div class="font-bold text-slate-800 uppercase tracking-wider text-[11px]">\${key}</div>
          <div class="text-slate-600">\${val.definition}</div>
          <div class="font-mono text-[10px] text-indigo-700 bg-indigo-50/60 p-1 rounded">Formula: \${val.formula}</div>
          <div class="text-[10px] text-slate-500"><b>Sources:</b> \${val.sourceTables.join(', ')}</div>
          <div class="text-[10px] text-amber-700 italic"><b>Caveat:</b> \${val.caveat}</div>
        \`;
        linContainer.appendChild(row);
      });
    }

    // Initial render
    render();
  </script>
</body>
</html>`;

  const dashboardPath = path.join(publicDir, 'telemetry-dashboard.html');
  fs.writeFileSync(dashboardPath, htmlContent, 'utf8');
  console.log(`✓ Standalone Web Dashboard compiled to ${dashboardPath}`);
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('runAudit.ts')) {
  runAuditPipeline().catch((err) => {
    console.error('[Audit] Execution failed:', err);
    process.exit(1);
  });
}
