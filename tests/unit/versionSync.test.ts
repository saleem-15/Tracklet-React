import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LATEST_EXTENSION_VERSION } from '../../src/lib/constants';

describe('Extension Version Synchronization', () => {
  it('ensures extension/manifest.json version matches LATEST_EXTENSION_VERSION in constants.ts', () => {
    const manifestPath = path.resolve(__dirname, '../../extension/manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    expect(manifest.version).toBeDefined();
    expect(manifest.version).toBe(LATEST_EXTENSION_VERSION);
  });
});
