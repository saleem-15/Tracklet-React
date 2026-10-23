#!/usr/bin/env node
/**
 * Pure Node.js script to package Tracklet Chrome Extension into public/tracklet-extension.zip.
 * Zero external OS binary dependencies (no powershell, no zip command).
 * Works identically across Linux (Cloudflare Pages, Netlify, Docker), macOS, and Windows.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
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

function toDosDateTime(date) {
  const d = date || new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const dateVal = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date: dateVal };
}

function collectExtensionFiles(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      results.push(...collectExtensionFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      // Exclude documentation or OS-specific artifacts
      if (entry.name === 'README.md' || entry.name === '.DS_Store' || entry.name.startsWith('.')) {
        continue;
      }
      const stat = fs.statSync(fullPath);
      results.push({
        name: relPath,
        data: fs.readFileSync(fullPath),
        mtime: stat.mtime,
      });
    }
  }

  // Sort files for deterministic ZIP byte output
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

function createZipArchive(files, outputPath) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const f of files) {
    const fileNameBuf = Buffer.from(f.name, 'utf8');
    const uncompressedData = f.data;
    const crc = zlib.crc32(uncompressedData) >>> 0;
    const compressedData = zlib.deflateRawSync(uncompressedData);
    const { time, date } = toDosDateTime(f.mtime);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + fileNameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // General purpose bit flag (UTF-8 filename)
    localHeader.writeUInt16LE(8, 8); // Compression method (8 = DEFLATE)
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedData.length, 18);
    localHeader.writeUInt32LE(uncompressedData.length, 22);
    localHeader.writeUInt16LE(fileNameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // Extra field length
    fileNameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + fileNameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed to extract
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 filename flag
    centralHeader.writeUInt16LE(8, 10); // Compression method (DEFLATE)
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedData.length, 20);
    centralHeader.writeUInt32LE(uncompressedData.length, 24);
    centralHeader.writeUInt16LE(fileNameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38); // External file attributes (regular file -rw-r--r--)
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    fileNameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + compressedData.length;
  }

  const centralDirStart = offset;
  const centralDirBuf = Buffer.concat(centralHeaders);
  const centralDirSize = centralDirBuf.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // Signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(files.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(files.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(centralDirSize, 12); // Size of central directory
  eocd.writeUInt32LE(centralDirStart, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // Comment length

  const finalZip = Buffer.concat([...localHeaders, centralDirBuf, eocd]);
  fs.writeFileSync(outputPath, finalZip);
}

try {
  const files = collectExtensionFiles(extensionDir);
  createZipArchive(files, outputZip);

  if (fs.existsSync(outputZip)) {
    const stats = fs.statSync(outputZip);
    const sizeKb = (stats.size / 1024).toFixed(1);
    console.log(`[package-extension] Success! Created ${outputZip} (${sizeKb} KB) with ${files.length} packaged files.`);
  } else {
    throw new Error('Output zip file was not created');
  }
} catch (error) {
  console.error('[package-extension] Packaging failed:', error);
  process.exit(1);
}
