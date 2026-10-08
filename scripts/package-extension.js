#!/usr/bin/env node
/**
 * Cross-platform script to package Tracklet Chrome Extension into public/tracklet-extension.zip
 * Supports Windows (PowerShell Compress-Archive), macOS, and Linux (zip).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
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

console.log('[package-extension] Packaging extension directory into public/tracklet-extension.zip...');

const isWindows = process.platform === 'win32';

try {
  if (isWindows) {
    // PowerShell Compress-Archive
    const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${extensionDir}\\*' -DestinationPath '${outputZip}' -Force"`;
    execSync(psCommand, { stdio: 'inherit', cwd: rootDir });
  } else {
    // Unix zip command
    const unixCommand = `cd "${extensionDir}" && zip -r "${outputZip}" . -x "README.md" -x "*.DS_Store"`;
    execSync(unixCommand, { stdio: 'inherit', cwd: rootDir });
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
