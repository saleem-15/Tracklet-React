/**
 * Deterministic Telemetry Fixture & Seed Generator.
 * Creates an authentic, time-windowed raw dataset with power-law user behavior,
 * cross-stitched sessions between PostHog and Sentry, ad-blocker leakage,
 * and high-impact funnel abandonment exceptions.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawTelemetrySnapshot,
  DbUserRecord,
  DbApplicationRecord,
  PostHogEventRecord,
  SentryEventRecord,
} from '../../src/telemetry/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const dataDir = path.join(rootDir, 'telemetry-data');
const rawDir = path.join(dataDir, 'raw');

// Simple pseudo-random generator with fixed seed for byte-identical determinism
function createSeededRandom(seed = 1337) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateDeterministicTelemetrySnapshot(referenceDate: Date = new Date('2026-10-19T10:00:00Z')): RawTelemetrySnapshot {
  const rand = createSeededRandom(42);

  const COMPANIES = [
    'Google', 'Stripe', 'Linear', 'Vercel', 'Meta', 'Amazon', 'Datadog', 'Figma',
    'Airbnb', 'Notion', 'OpenAI', 'Anthropic', 'Retool', 'Shopify', 'PostHog', 'Sentry'
  ];
  const POSITIONS = [
    'Senior Frontend Engineer', 'Full Stack Developer', 'Staff Software Engineer',
    'Product Designer', 'DevOps Specialist', 'Engineering Manager', 'Backend Engineer'
  ];
  const PLATFORMS = ['LinkedIn', 'Indeed', 'Lever', 'Greenhouse', 'Wellfound', 'Company Site', 'Referral'];
  const STATUSES = ['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Archived'];

  const nowMs = referenceDate.getTime();
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  const users: DbUserRecord[] = [];
  const applications: DbApplicationRecord[] = [];
  const posthogEvents: PostHogEventRecord[] = [];
  const sentryEvents: SentryEventRecord[] = [];

  const totalUsers = 450;
  const activatedUserCount = 280; // exactly 280 activated, 170 dormant

  // 1. Generate 450 Users
  for (let i = 0; i < totalUsers; i++) {
    const userId = `usr_${String(i + 1).padStart(4, '0')}`;
    const userAgeMs = Math.floor(rand() * ninetyDaysMs);
    const createdAt = new Date(nowMs - userAgeMs).toISOString();
    const isGuest = i > 400; // last 50 users are guest mode

    users.push({
      id: userId,
      email: isGuest ? `guest_${i + 1}@tracklet.local` : `engineer_${i + 1}@example.com`,
      createdAt,
      lastLoginAt: new Date(nowMs - Math.floor(rand() * userAgeMs)).toISOString(),
      authProvider: isGuest ? 'guest' : (rand() > 0.4 ? 'google' : 'password'),
      isAnonymous: isGuest,
    });
  }

  // 2. Assign Applications with Power-Law Distribution for Activated Users
  // Bucket targets:
  // 1-2 apps: ~98 users
  // 3-5 apps: ~84 users
  // 6-10 apps: ~56 users
  // 11-25 apps: ~30 users
  // 26-50 apps: ~10 users
  // 50+ apps: 2 power users (outliers to expose arithmetic mean distortion!)

  let appCounter = 0;
  for (let i = 0; i < totalUsers; i++) {
    const user = users[i];
    const userCreatedMs = new Date(user.createdAt).getTime();

    let appCount = 0;
    if (i < 2) {
      // 2 extreme power users
      appCount = i === 0 ? 54 : 68;
    } else if (i < 12) {
      // 10 heavy job seekers: 26 to 48 apps
      appCount = Math.floor(26 + rand() * 23);
    } else if (i < 42) {
      // 30 active job seekers: 11 to 25 apps
      appCount = Math.floor(11 + rand() * 15);
    } else if (i < 98) {
      // 56 steady seekers: 6 to 10 apps
      appCount = Math.floor(6 + rand() * 5);
    } else if (i < 182) {
      // 84 moderate seekers: 3 to 5 apps
      appCount = Math.floor(3 + rand() * 3);
    } else if (i < activatedUserCount) {
      // 98 light seekers: 1 to 2 apps
      appCount = Math.floor(1 + rand() * 2);
    } else {
      // Dormant users: exactly 0 applications
      appCount = 0;
    }

    if (appCount > 0) {
      // Distribute applications between user creation date and now
      const windowRemainingMs = nowMs - userCreatedMs;
      for (let j = 0; j < appCount; j++) {
        appCounter++;
        const appId = `app_${String(appCounter).padStart(5, '0')}`;
        // Time to first application: 60% within first 2 hours, rest spaced out
        let appOffsetMs: number;
        if (j === 0 && rand() < 0.6) {
          appOffsetMs = Math.floor(rand() * (2 * 60 * 60 * 1000)); // within 2 hours
        } else {
          appOffsetMs = Math.floor(rand() * Math.max(1000, windowRemainingMs));
        }

        const appCreatedMs = Math.min(nowMs, userCreatedMs + appOffsetMs);
        const appCreatedAt = new Date(appCreatedMs).toISOString();

        applications.push({
          id: appId,
          userId: user.id,
          company: COMPANIES[Math.floor(rand() * COMPANIES.length)],
          position: POSITIONS[Math.floor(rand() * POSITIONS.length)],
          status: STATUSES[Math.floor(rand() * STATUSES.length)],
          platform: PLATFORMS[Math.floor(rand() * PLATFORMS.length)],
          createdAt: appCreatedAt,
          updatedAt: appCreatedAt,
        });

        // 3. Generate PostHog Event for Application Creation
        // Model real-world ad-blocker drop rate: 16.5% of users have client tracking blocked!
        const hasAdBlocker = (parseInt(user.id.split('_')[1], 10) % 6) === 0;

        if (!hasAdBlocker) {
          const sessionId = `ses_${user.id}_${Math.floor(appCreatedMs / (30 * 60 * 1000))}`;
          posthogEvents.push({
            id: `phe_${appId}`,
            event: 'application_created',
            distinct_id: user.id,
            session_id: sessionId,
            timestamp: appCreatedAt,
            properties: {
              application_id: appId,
              $current_url: 'https://tracklet.app/applications',
              platform: applications[applications.length - 1].platform,
              stage: applications[applications.length - 1].status,
            },
          });

          // Occasionally simulate double-click duplicate client event (2% of the time)
          if (rand() < 0.02) {
            posthogEvents.push({
              id: `phe_dup_${appId}`,
              event: 'application_created',
              distinct_id: user.id,
              session_id: sessionId,
              timestamp: new Date(appCreatedMs + 400).toISOString(),
              properties: {
                application_id: appId,
                $current_url: 'https://tracklet.app/applications',
                is_duplicate: true,
              },
            });
          }
        }
      }
    }
  }

  // 4. Generate General Browsing PostHog Events ($pageview, session_started)
  let sessionCounter = 0;
  for (const user of users) {
    const userCreatedMs = new Date(user.createdAt).getTime();
    const sessionCount = Math.max(1, Math.floor(rand() * 8));

    for (let s = 0; s < sessionCount; s++) {
      sessionCounter++;
      const sOffset = Math.floor(rand() * (nowMs - userCreatedMs));
      const sessionTimeMs = userCreatedMs + sOffset;
      const sessionId = `ses_${user.id}_${sessionCounter}`;
      const sessionIso = new Date(sessionTimeMs).toISOString();

      posthogEvents.push({
        id: `phe_pv_${sessionCounter}`,
        event: '$pageview',
        distinct_id: user.id,
        session_id: sessionId,
        timestamp: sessionIso,
        properties: {
          $current_url: s === 0 ? 'https://tracklet.app/' : 'https://tracklet.app/pipeline',
        },
      });

      if (user.authProvider === 'guest') {
        posthogEvents.push({
          id: `phe_gst_${sessionCounter}`,
          event: 'guest_session_started',
          distinct_id: user.id,
          session_id: sessionId,
          timestamp: sessionIso,
          properties: {},
        });
      }
    }
  }

  // 5. Generate Realistic Sentry Exceptions Cross-stitched with PostHog Sessions
  // 5 critical exceptions causing high funnel abandonment:
  const CRITICAL_EXCEPTIONS = [
    {
      type: 'TypeError',
      value: "Cannot read properties of undefined (reading 'status')",
      route: '/pipeline',
      stack: [
        'at useApplications.ts:284:18 (posthog.capture)',
        'at handleStageChange (ActivePipelineBoard.tsx:142:10)',
        'at onDragEnd (KanbanColumn.tsx:88:14)',
      ],
      abandonmentBias: 0.88, // 88% abandon session immediately
    },
    {
      type: 'NetworkError',
      value: 'Failed to fetch ATS schema for Greenhouse endpoint',
      route: '/applications',
      stack: [
        'at atsFormDetection.ts:145:22 (fetchJobSchema)',
        'at parseJobPosting (extensionAutoScrape.ts:89:12)',
        'at Object.scrape (scrape-job.ts:42:15)',
      ],
      abandonmentBias: 0.76,
    },
    {
      type: 'ChunkLoadError',
      value: 'Loading chunk 402 failed (net::ERR_CONNECTION_RESET)',
      route: '/settings',
      stack: [
        'at __webpack_require__.f.j (bundle.js:124:32)',
        'at import() dynamic import of SettingsView.tsx',
        'at App.tsx:112:15',
      ],
      abandonmentBias: 0.92,
    },
    {
      type: 'FirebaseError',
      value: "Quota exceeded for quota metric 'Read operations' and limit 'Read operations per day'",
      route: '/applications',
      stack: [
        'at firestore.ts:88:15 (getDocs)',
        'at loadData (useDataLoader.ts:94:12)',
        'at useEffect (App.tsx:64:10)',
      ],
      abandonmentBias: 0.84,
    },
    {
      type: 'SyntaxError',
      value: "Unexpected token '<', \"<!doctype \"... is not valid JSON",
      route: '/contacts',
      stack: [
        'at JSON.parse (<anonymous>)',
        'at parseContactClipperData (contactClipper.ts:62:24)',
        'at handleImport (ContactsHub.tsx:180:18)',
      ],
      abandonmentBias: 0.68,
    },
  ];

  // Distribute Sentry errors across active user sessions
  let errorCounter = 0;
  for (let i = 0; i < 75; i++) {
    errorCounter++;
    const exceptionConfig = CRITICAL_EXCEPTIONS[i % CRITICAL_EXCEPTIONS.length];
    // Pick an active user
    const targetUser = users[Math.floor(rand() * activatedUserCount)];
    const errorTimeMs = nowMs - Math.floor(rand() * ninetyDaysMs);
    const sessionId = `ses_${targetUser.id}_err_${i}`;
    const errorIso = new Date(errorTimeMs).toISOString();

    sentryEvents.push({
      event_id: `snt_${String(errorCounter).padStart(5, '0')}`,
      timestamp: errorIso,
      exception_type: exceptionConfig.type,
      value: exceptionConfig.value,
      level: 'error',
      user_id: targetUser.id,
      session_id: sessionId,
      route: exceptionConfig.route,
      release: '1.2.5',
      environment: 'production',
      stacktrace: exceptionConfig.stack,
      breadcrumbs: [
        {
          timestamp: new Date(errorTimeMs - 2000).toISOString(),
          category: 'navigation',
          message: `Navigated to ${exceptionConfig.route}`,
        },
        {
          timestamp: new Date(errorTimeMs - 500).toISOString(),
          category: 'ui.click',
          message: 'User clicked Save Application button',
        },
      ],
    });

    // Add matching PostHog session
    posthogEvents.push({
      id: `phe_err_ses_${errorCounter}`,
      event: '$pageview',
      distinct_id: targetUser.id,
      session_id: sessionId,
      timestamp: new Date(errorTimeMs - 5000).toISOString(),
      properties: {
        $current_url: `https://tracklet.app${exceptionConfig.route}`,
      },
    });

    // If abandoned (determined by abandonmentBias), NO subsequent positive event is added to this session
    // If NOT abandoned, add a recovery event
    if (rand() > exceptionConfig.abandonmentBias) {
      posthogEvents.push({
        id: `phe_rec_${errorCounter}`,
        event: 'application_created',
        distinct_id: targetUser.id,
        session_id: sessionId,
        timestamp: new Date(errorTimeMs + 60000).toISOString(),
        properties: {
          recovery: true,
        },
      });
    }
  }

  // Sort events by timestamp
  posthogEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  sentryEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  applications.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  users.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const snapshot: RawTelemetrySnapshot = {
    users,
    applications,
    posthogEvents,
    sentryEvents,
    snapshotMetadata: {
      capturedAt: referenceDate.toISOString(),
      source: 'synthetic_fixture',
      totalDbUsers: users.length,
      totalDbApplications: applications.length,
      totalPostHogEvents: posthogEvents.length,
      totalSentryEvents: sentryEvents.length,
    },
  };

  return snapshot;
}

/**
 * Saves generated snapshot files to disk under telemetry-data/raw/.
 */
export function persistTelemetrySnapshot(snapshot: RawTelemetrySnapshot): void {
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  fs.writeFileSync(path.join(rawDir, 'users.json'), JSON.stringify(snapshot.users, null, 2), 'utf8');
  fs.writeFileSync(path.join(rawDir, 'applications.json'), JSON.stringify(snapshot.applications, null, 2), 'utf8');
  fs.writeFileSync(path.join(rawDir, 'posthog-events.json'), JSON.stringify(snapshot.posthogEvents, null, 2), 'utf8');
  fs.writeFileSync(path.join(rawDir, 'sentry-events.json'), JSON.stringify(snapshot.sentryEvents, null, 2), 'utf8');
  fs.writeFileSync(
    path.join(rawDir, 'metadata.json'),
    JSON.stringify(snapshot.snapshotMetadata, null, 2),
    'utf8'
  );
}

// Direct execution helper
if (process.argv[1] && process.argv[1].endsWith('seedTelemetry.ts')) {
  console.log('[SeedTelemetry] Generating deterministic raw telemetry snapshot...');
  const snapshot = generateDeterministicTelemetrySnapshot();
  persistTelemetrySnapshot(snapshot);
  console.log(`[SeedTelemetry] Persisted ${snapshot.users.length} users, ${snapshot.applications.length} applications, ${snapshot.posthogEvents.length} PostHog events, and ${snapshot.sentryEvents.length} Sentry events to telemetry-data/raw/.`);
}
