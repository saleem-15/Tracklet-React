/**
 * Live extraction connectors for PostHog HogQL API, Sentry Events API,
 * and Firestore REST/Admin SDK.
 */

import type { RawTelemetrySnapshot, DbUserRecord, DbApplicationRecord, PostHogEventRecord, SentryEventRecord } from './types.ts';

export interface LiveExtractionConfig {
  posthogApiKey?: string;
  posthogProjectId?: string;
  posthogHost?: string;
  sentryAuthToken?: string;
  sentryOrg?: string;
  sentryProject?: string;
  firebaseProjectId?: string;
  firebaseApiKey?: string;
}

export interface LiveExtractionResult {
  success: boolean;
  snapshot?: RawTelemetrySnapshot;
  error?: string;
}

/**
 * Extracts live event streams via PostHog HogQL API.
 */
export async function fetchPostHogEvents(config: LiveExtractionConfig): Promise<PostHogEventRecord[]> {
  if (!config.posthogApiKey || !config.posthogProjectId) {
    throw new Error('PostHog credentials missing (POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID)');
  }

  const host = config.posthogHost || 'https://eu.i.posthog.com';
  const url = `${host}/api/projects/${config.posthogProjectId}/query/`;

  const hogqlQuery = {
    query: {
      kind: 'HogQLQuery',
      query: `
        SELECT 
          uuid,
          event,
          distinct_id,
          timestamp,
          properties
        FROM events 
        WHERE timestamp >= now() - interval 90 day
        ORDER BY timestamp DESC 
        LIMIT 10000
      `,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.posthogApiKey}`,
    },
    body: JSON.stringify(hogqlQuery),
  });

  if (!res.ok) {
    throw new Error(`PostHog HogQL query failed with status ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((row: [string, string, string, string, any]) => {
    let props: Record<string, unknown> = {};
    if (typeof row[4] === 'string') {
      try {
        props = JSON.parse(row[4]);
      } catch {
        props = {};
      }
    } else if (typeof row[4] === 'object' && row[4] !== null) {
      props = row[4];
    }

    return {
      id: row[0],
      event: row[1],
      distinct_id: row[2],
      session_id: (props.$session_id as string) || (props.session_id as string) || '',
      timestamp: row[3],
      properties: props,
    };
  });
}

/**
 * Extracts live error events from Sentry Discover/Events API.
 */
export async function fetchSentryEvents(config: LiveExtractionConfig): Promise<SentryEventRecord[]> {
  if (!config.sentryAuthToken || !config.sentryOrg || !config.sentryProject) {
    throw new Error('Sentry credentials missing (SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT)');
  }

  const url = `https://sentry.io/api/0/projects/${config.sentryOrg}/${config.sentryProject}/events/`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.sentryAuthToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Sentry events fetch failed with status ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const events = Array.isArray(data) ? data : (data.data || []);

  return (events || []).map((e: any) => ({
    event_id: e.id || e.eventID,
    timestamp: e.dateCreated || e.timestamp,
    exception_type: e.metadata?.type || e.title?.split(':')[0] || 'Error',
    value: e.metadata?.value || e.message || 'Unknown error',
    level: (e.level || 'error') as 'error' | 'fatal' | 'warning',
    user_id: e.user?.id || e.tags?.find((t: any) => t.key === 'user_id')?.value,
    session_id: e.tags?.find((t: any) => t.key === 'posthog_session_id')?.value,
    route: e.tags?.find((t: any) => t.key === 'route')?.value || '/applications',
    release: e.release?.version,
    environment: e.environment,
    stacktrace: e.entries?.find((entry: any) => entry.type === 'exception')?.data?.values?.[0]?.stacktrace?.frames?.map(
      (f: any) => `at ${f.function || '?'} (${f.filename}:${f.lineNo})`
    ),
  }));
}

/**
 * Fetches Firestore documents via Firestore REST API for users and applications.
 */
export async function fetchFirestoreCollections(config: LiveExtractionConfig): Promise<{
  users: DbUserRecord[];
  applications: DbApplicationRecord[];
}> {
  if (!config.firebaseProjectId || !config.firebaseApiKey) {
    throw new Error('Firebase credentials missing (VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_API_KEY)');
  }

  const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.firebaseProjectId}/databases/(default)/documents`;

  // Fetch applications
  const appsRes = await fetch(`${baseUrl}/applications?pageSize=1000&key=${config.firebaseApiKey}`);
  let applications: DbApplicationRecord[] = [];
  if (appsRes.ok) {
    const appsData = await appsRes.json();
    applications = (appsData.documents || []).map((doc: any) => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop();
      return {
        id,
        userId: fields.userId?.stringValue || '',
        company: fields.company?.stringValue || 'Unknown',
        position: fields.position?.stringValue || 'Unknown',
        status: fields.status?.stringValue || 'Applied',
        platform: fields.platform?.stringValue,
        createdAt: fields.createdAt?.stringValue || fields.createdAt?.timestampValue || new Date().toISOString(),
        updatedAt: fields.updatedAt?.stringValue || fields.updatedAt?.timestampValue || new Date().toISOString(),
      };
    });
  }

  // Fetch users
  const usersRes = await fetch(`${baseUrl}/users?pageSize=1000&key=${config.firebaseApiKey}`);
  let users: DbUserRecord[] = [];
  if (usersRes.ok) {
    const usersData = await usersRes.json();
    users = (usersData.documents || []).map((doc: any) => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop();
      return {
        id,
        email: fields.email?.stringValue || 'user@example.com',
        createdAt: fields.createdAt?.stringValue || fields.createdAt?.timestampValue || new Date().toISOString(),
        lastLoginAt: fields.lastLoginAt?.stringValue || fields.lastLoginAt?.timestampValue,
        authProvider: fields.authProvider?.stringValue || 'password',
      };
    });
  }

  return { users, applications };
}
