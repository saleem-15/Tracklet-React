#!/usr/bin/env node
/**
 * Cross-platform script to package Tracklet Chrome Extension into public/tracklet-extension.zip
 * Supports Windows (PowerShell Compress-Archive), macOS, and Linux (zip).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const publicDir = path.join(rootDir, 'public');
const outputZip = path.join(publicDir, 'tracklet-extension.zip');

if (!fs.existsSync(extensionDir)) {
  console.error(`[package-extension] Error: extension directory not found at ${extensionDir}`);
  process.exit(1);
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Remove old zip if present
if (fs.existsSync(outputZip)) {
  try {
    fs.unlinkSync(outputZip);
  } catch {
    // ignore
  }
}

// Read manifest version
const manifestPath = path.join(extensionDir, 'manifest.json');
let manifestVersion = 'unknown';
try {
  const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
  const parsed = JSON.parse(manifestRaw);
  if (parsed.version) {
    manifestVersion = parsed.version;
  }
} catch {
  // ignore
}

// Generate public/version.json for live side-panel updates
try {
  fs.writeFileSync(
    path.join(publicDir, 'version.json'),
    JSON.stringify({ version: manifestVersion, updatedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
} catch {
  // ignore
}

console.log(`[package-extension] Packaging extension v${manifestVersion} into public/tracklet-extension.zip...`);

const isWindows = process.platform === 'win32';

try {
  if (isWindows) {
    // Run inside extensionDir via cwd so wildcard path is simple and literal, avoiding path interpolation issues
    const psArgs = [
      '-NoProfile',
      '-Command',
      '& { param($dest) Compress-Archive -Path * -DestinationPath $dest -Force }',
      outputZip
    ];
    const res = spawnSync('powershell.exe', psArgs, { stdio: 'inherit', cwd: extensionDir });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(`PowerShell Compress-Archive exited with status ${res.status}`);
  } else {
    // Unix zip command with argument array and cwd at extensionDir
    const res = spawnSync('zip', ['-r', outputZip, '.', '-x', 'README.md', '-x', '*.DS_Store'], {
      stdio: 'inherit',
      cwd: extensionDir
    });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(`zip command exited with status ${res.status}`);
  }

  if (fs.existsSync(outputZip)) {
    const stats = fs.statSync(outputZip);
    const sizeKb = (stats.size / 1024).toFixed(1);
    console.log(`[package-extension] Success! Created ${outputZip} (${sizeKb} KB)`);
  } else {
    throw new Error('Output zip file was not created');
  }
} catch (error) {
  console.error('[package-extension] Packaging failed:', error);
  process.exit(1);
}
