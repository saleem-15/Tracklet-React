/**
 * Migration Script: Backfill `order` for Kanban Card Priority on Tracklet
 * 
 * Inspects all users and their applications in Firestore (tracklet-e3409).
 * Groups applications per user by status column, preserves the exact current visual
 * sort order (days in stage / stageUpdatedAt), and assigns sequential ranks (10000, 20000, 30000...).
 *
 * Usage:
 *   node scripts/migrate-add-card-orders.mjs            # Dry-run mode (safe preview)
 *   node scripts/migrate-add-card-orders.mjs --commit  # Live commit to Firestore
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT_ID = 'tracklet-e3409';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function getAccessToken() {
  const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Firebase CLI credentials not found at ${configPath}. Please run 'firebase login'.`);
  }
  const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const tokens = conf.tokens;
  if (!tokens) throw new Error('No tokens found in firebase-tools.json.');

  // If token is expired or close to expiry, refresh it
  if (tokens.refresh_token && (!tokens.expires_at || Date.now() > tokens.expires_at - 60000)) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: tokens.client_id || '563584335869-fgrhgmd47bqnekij5i8b5pr03ho859e1.apps.googleusercontent.com',
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.access_token;
    }
  }

  return tokens.access_token;
}

function calculateDaysInStage(stageUpdatedAt) {
  if (!stageUpdatedAt) return 0;
  try {
    const updated = new Date(stageUpdatedAt);
    const now = new Date();
    if (isNaN(updated.getTime())) return 0;
    const diffMs = now.getTime() - updated.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

async function fetchJson(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status} from ${url}: ${errText}`);
  }
  return res.json();
}

async function listAllUsers(token) {
  const url = `${FIRESTORE_BASE}/users?pageSize=100`;
  const data = await fetchJson(url, token);
  return data.documents || [];
}

async function listUserApplications(userId, token) {
  const url = `${FIRESTORE_BASE}/users/${userId}/applications?pageSize=300`;
  const data = await fetchJson(url, token);
  return data.documents || [];
}

async function run() {
  const isCommit = process.argv.includes('--commit');
  console.log(`\n======================================================`);
  console.log(`Tracklet Kanban Card Order Backfill Migration`);
  console.log(`Mode: ${isCommit ? '>>> LIVE COMMIT <<<' : 'DRY-RUN (Pass --commit to execute)'}`);
  console.log(`======================================================\n`);

  const token = await getAccessToken();
  console.log('✓ Acquired Google OAuth2 administrative token');

  const users = await listAllUsers(token);
  console.log(`✓ Discovered ${users.length} users in Firestore`);

  const allApps = [];
  const plannedUpdates = [];

  for (const userDoc of users) {
    const userPath = userDoc.name;
    const userId = userPath.split('/').pop();
    const userEmail = userDoc.fields?.email?.stringValue || userId;
    const apps = await listUserApplications(userId, token);

    if (apps.length === 0) continue;

    console.log(`\nUser: ${userEmail} (${userId}) - ${apps.length} applications`);

    // Group apps by status
    const grouped = new Map();
    for (const app of apps) {
      allApps.push(app);
      const status = app.fields?.status?.stringValue || 'Saved';
      if (!grouped.has(status)) grouped.set(status, []);
      grouped.get(status).push(app);
    }

    // Sort within each status group according to Tracklet's current UI logic:
    // .sort((a, b) => calculateDaysInStage(b.stageUpdatedAt) - calculateDaysInStage(a.stageUpdatedAt))
    for (const [status, group] of grouped.entries()) {
      group.sort((a, b) => {
        const stageA = a.fields?.stageUpdatedAt?.stringValue || a.fields?.createdAt?.stringValue || '';
        const stageB = b.fields?.stageUpdatedAt?.stringValue || b.fields?.createdAt?.stringValue || '';
        return calculateDaysInStage(stageB) - calculateDaysInStage(stageA);
      });

      console.log(`  Stage: [${status}] (${group.length} cards)`);
      group.forEach((app, idx) => {
        const appId = app.name.split('/').pop();
        const company = app.fields?.company?.stringValue || 'Unknown';
        const role = app.fields?.role?.stringValue || 'Unknown';
        const existingOrder = app.fields?.order?.integerValue ?? app.fields?.order?.doubleValue;
        const newOrder = (idx + 1) * 10000;

        console.log(`    ${idx + 1}. [${company} - ${role}] id: ${appId} | current: ${existingOrder ?? 'none'} -> new order: ${newOrder}`);

        plannedUpdates.push({
          name: app.name,
          appId,
          userId,
          company,
          status,
          order: newOrder,
        });
      });
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`Total applications to update: ${plannedUpdates.length}`);

  // Create a local backup before committing
  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `applications-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(allApps, null, 2), 'utf8');
  console.log(`✓ Complete snapshot backup written to: ${backupPath}`);

  if (!isCommit) {
    console.log(`\n[DRY RUN COMPLETE] Zero database writes performed.`);
    console.log(`To write these updates to Firestore, re-run with:`);
    console.log(`  node scripts/migrate-add-card-orders.mjs --commit\n`);
    return;
  }

  // Execute updates in batches of 50 via Firestore writeBatch commit endpoint
  console.log(`\nExecuting batch commits to Firestore...`);
  const CHUNK_SIZE = 50;
  for (let i = 0; i < plannedUpdates.length; i += CHUNK_SIZE) {
    const chunk = plannedUpdates.slice(i, i + CHUNK_SIZE);
    const writes = chunk.map((item) => ({
      update: {
        name: item.name,
        fields: {
          order: { integerValue: String(item.order) },
        },
      },
      updateMask: {
        fieldPaths: ['order'],
      },
    }));

    const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;
    await fetchJson(commitUrl, token, {
      method: 'POST',
      body: JSON.stringify({ writes }),
    });
    console.log(`✓ Committed batch ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} documents)`);
  }

  console.log(`\n✓ SUCCESS! All ${plannedUpdates.length} applications now have order populated.`);
}

run().catch((err) => {
  console.error('\n[Migration Error]:', err.message);
  process.exit(1);
});
