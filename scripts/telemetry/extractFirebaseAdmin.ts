/**
 * Native Node.js Firebase Admin Extractor using Service Account JWT.
 * Requires zero additional dependencies (uses built-in crypto and fetch).
 * Ingests real Firebase Auth users and Firestore application documents directly
 * into telemetry-data/raw/users.json and telemetry-data/raw/applications.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const rawDir = path.join(rootDir, 'telemetry-data', 'raw');

interface ServiceAccountKey {
  project_id: string;
  private_key: string;
  client_email: string;
}

/**
 * Base64URL encoding helper.
 */
function base64UrlEncode(data: string | Buffer): string {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Exchanges service account private key for a Google OAuth2 access token.
 */
async function getGoogleAccessToken(sa: ServiceAccountKey, scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(sa.private_key);
  const encodedSignature = base64UrlEncode(signature);

  const jwt = `${signatureInput}.${encodedSignature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth2 token exchange failed (${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/**
 * Lists all Firebase Auth users using Identity Toolkit API accounts:query.
 */
async function fetchAllAuthUsers(projectId: string, token: string): Promise<any[]> {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ maxResults: 100 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list Firebase Auth users (${res.status}): ${err}`);
  }

  const data = await res.json();
  const rawUsers = data.userInfo || [];

  return rawUsers.map((u: any) => ({
    id: u.localId,
    email: u.email || `${u.localId}@guest.local`,
    createdAt: u.createdAt ? new Date(parseInt(u.createdAt, 10)).toISOString() : new Date().toISOString(),
    lastLoginAt: u.lastLoginAt ? new Date(parseInt(u.lastLoginAt, 10)).toISOString() : undefined,
    authProvider: u.providerUserInfo?.[0]?.providerId?.replace('.com', '') || 'password',
    isAnonymous: Boolean(u.isAnonymous || !u.email),
  }));
}

/**
 * Recursively queries Firestore documents across users/{userId}/applications and root applications with pagination.
 */
async function fetchAllApplications(projectId: string, token: string, userIds: string[]): Promise<any[]> {
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const applications: any[] = [];

  // 1. Check root applications collection
  try {
    let pageToken: string | undefined;
    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
      const res = await fetch(`${baseUrl}/applications?pageSize=300${pageParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        for (const doc of data.documents || []) {
          const f = doc.fields || {};
          applications.push(parseFirestoreAppDoc(doc.name, f));
        }
        pageToken = data.nextPageToken;
      } else {
        pageToken = undefined;
      }
    } while (pageToken);
  } catch (e) {
    // Ignore root collection absence
  }

  // 2. Check user subcollections (users/{uid}/applications)
  for (const uid of userIds) {
    try {
      let pageToken: string | undefined;
      do {
        const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
        const subUrl = `${baseUrl}/users/${uid}/applications?pageSize=300${pageParam}`;
        const res = await fetch(subUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          for (const doc of data.documents || []) {
            const f = doc.fields || {};
            applications.push(parseFirestoreAppDoc(doc.name, f, uid));
          }
          pageToken = data.nextPageToken;
        } else {
          pageToken = undefined;
        }
      } while (pageToken);
    } catch (e) {
      // Ignore user subcollection error
    }
  }

  return applications;
}

function parseFirestoreAppDoc(docPath: string, fields: any, defaultUserId?: string): any {
  const id = docPath.split('/').pop() || '';
  return {
    id,
    userId: fields.userId?.stringValue || defaultUserId || '',
    company: fields.company?.stringValue || 'Unknown Company',
    position: fields.role?.stringValue || fields.position?.stringValue || 'Software Engineer',
    status: fields.status?.stringValue || 'Applied',
    platform: fields.platform?.stringValue || 'Other',
    createdAt: fields.createdAt?.stringValue || fields.dateApplied?.stringValue || new Date().toISOString(),
    updatedAt: fields.updatedAt?.stringValue || new Date().toISOString(),
  };
}

export async function extractRealFirebaseData(): Promise<void> {
  const adminKeyPath = path.join(rootDir, 'firebase-admin.json');

  if (!fs.existsSync(adminKeyPath)) {
    console.error(`\n[Firebase Admin Extractor] Error: firebase-admin.json was not found at:`);
    console.error(`  ${adminKeyPath}`);
    console.error(`Please move or copy your downloaded service account JSON file to the project root as 'firebase-admin.json'.\n`);
    process.exit(1);
  }

  console.log('[Firebase Admin Extractor] Reading firebase-admin.json...');
  const keyContent = JSON.parse(fs.readFileSync(adminKeyPath, 'utf8'));

  if (!keyContent.project_id || !keyContent.private_key || !keyContent.client_email) {
    console.error('[Firebase Admin Extractor] Invalid firebase-admin.json format. Missing project_id, private_key, or client_email.');
    process.exit(1);
  }

  console.log(`[Firebase Admin Extractor] Authenticating for project: ${keyContent.project_id}...`);
  const token = await getGoogleAccessToken(keyContent, [
    'https://www.googleapis.com/auth/identitytoolkit',
    'https://www.googleapis.com/auth/datastore',
  ]);
  console.log('✓ Successfully acquired Google OAuth2 administrative token');

  // Fetch real users
  console.log('[Firebase Admin Extractor] Fetching real Firebase Auth users...');
  const users = await fetchAllAuthUsers(keyContent.project_id, token);
  console.log(`✓ Retrieved ${users.length} real Firebase Auth users`);

  // Fetch real applications
  const userIds = users.map((u) => u.id);
  console.log('[Firebase Admin Extractor] Fetching real Firestore application records...');
  const applications = await fetchAllApplications(keyContent.project_id, token, userIds);
  console.log(`✓ Retrieved ${applications.length} real Firestore application records`);

  // Persist to telemetry-data/raw/
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(path.join(rawDir, 'users.json'), JSON.stringify(users, null, 2), 'utf8');
  fs.writeFileSync(path.join(rawDir, 'applications.json'), JSON.stringify(applications, null, 2), 'utf8');

  console.log(`\n✓ Saved real users to: ${path.join(rawDir, 'users.json')}`);
  console.log(`✓ Saved real applications to: ${path.join(rawDir, 'applications.json')}`);
  console.log(`\nYou can now run:\n  npm run audit\n`);
}

if (process.argv[1] && process.argv[1].endsWith('extractFirebaseAdmin.ts')) {
  extractRealFirebaseData().catch((err) => {
    console.error('[Firebase Admin Extractor] Error:', err.message);
    process.exit(1);
  });
}
