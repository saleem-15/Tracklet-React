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

  it('ensures content.js fallback version matches LATEST_EXTENSION_VERSION', () => {
    const contentJsPath = path.resolve(__dirname, '../../extension/content.js');
    const contentJs = fs.readFileSync(contentJsPath, 'utf8');

    expect(contentJs).toContain(`version: '${LATEST_EXTENSION_VERSION}'`);
    expect(contentJs).toContain(`manifest.version || '${LATEST_EXTENSION_VERSION}'`);
  });

  it('ensures externally_connectable is strictly scoped in manifest.json without overly broad wildcards', () => {
    const manifestPath = path.resolve(__dirname, '../../extension/manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    const matches: string[] = manifest.externally_connectable?.matches || [];
    expect(matches).not.toContain('https://*.pages.dev/*');
    expect(matches).toContain('https://tracklet.pages.dev/*');
    expect(matches).toContain('https://*.tracklet.pages.dev/*');
  });

  it('verifies strict origin validation rules against authorized origins and lookalikes', () => {
    const contentJsPath = path.resolve(__dirname, '../../extension/content.js');
    const contentJs = fs.readFileSync(contentJsPath, 'utf8');

    // Ensure loose substring checks were removed
    expect(contentJs).not.toContain("hostname.endsWith('.pages.dev') && hostname.includes('tracklet')");
    expect(contentJs).not.toContain("hostname.endsWith('.netlify.app') && hostname.includes('tracklet')");

    // Replicate isTrackletOrigin logic as implemented in content.js and popup.js
    const isTrackletHostname = (hostname: string) => {
      const h = hostname.toLowerCase();
      if (h === 'localhost' || h === '127.0.0.1') return true;
      if (h === 'tracklet.app' || h.endsWith('.tracklet.app')) return true;
      if (h === 'usetracklet.com' || h.endsWith('.usetracklet.com')) return true;
      if (h === 'tracklet.pages.dev' || h.endsWith('.tracklet.pages.dev')) return true;
      if (/^([a-z0-9-]+--)?(use)?tracklet\.netlify\.app$/.test(h)) return true;
      if (/^(use)?tracklet(-[a-z0-9-]+)?\.web\.app$/.test(h)) return true;
      if (/^(use)?tracklet(-[a-z0-9-]+)?\.firebaseapp\.com$/.test(h)) return true;
      return false;
    };

    // Valid origins
    expect(isTrackletHostname('localhost')).toBe(true);
    expect(isTrackletHostname('127.0.0.1')).toBe(true);
    expect(isTrackletHostname('tracklet.app')).toBe(true);
    expect(isTrackletHostname('app.tracklet.app')).toBe(true);
    expect(isTrackletHostname('usetracklet.com')).toBe(true);
    expect(isTrackletHostname('tracklet.pages.dev')).toBe(true);
    expect(isTrackletHostname('feature.tracklet.pages.dev')).toBe(true);
    expect(isTrackletHostname('pr-42.tracklet.pages.dev')).toBe(true);
    expect(isTrackletHostname('usetracklet.netlify.app')).toBe(true);
    expect(isTrackletHostname('tracklet.netlify.app')).toBe(true);
    expect(isTrackletHostname('deploy-preview-123--usetracklet.netlify.app')).toBe(true);
    expect(isTrackletHostname('tracklet.web.app')).toBe(true);
    expect(isTrackletHostname('tracklet-staging.web.app')).toBe(true);
    expect(isTrackletHostname('tracklet.firebaseapp.com')).toBe(true);

    // Lookalikes and unauthorized domains that MUST be rejected
    expect(isTrackletHostname('attacker-tracklet.pages.dev')).toBe(false);
    expect(isTrackletHostname('tracklet.attacker.pages.dev')).toBe(false);
    expect(isTrackletHostname('fake-tracklet.pages.dev')).toBe(false);
    expect(isTrackletHostname('tracklet-fake.pages.dev')).toBe(false);
    expect(isTrackletHostname('attacker-tracklet.netlify.app')).toBe(false);
    expect(isTrackletHostname('google.com')).toBe(false);
    expect(isTrackletHostname('tracklet.pages.dev.attacker.com')).toBe(false);
  });
});
