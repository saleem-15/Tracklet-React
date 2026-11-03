import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import React, { act } from 'react';
import { LegacyMigrationScreen } from '../../src/components/LegacyMigrationScreen';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: React.ReactElement) {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(ui);
  });
}

describe('LegacyMigrationScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
  });

  it('renders migration notice with prominent data safety reassurance and new official url', () => {
    mount(<LegacyMigrationScreen />);

    expect(host?.textContent).toContain('Tracklet Has Moved Permanently');
    expect(host?.textContent).toContain('Tracklet has permanently moved to our new official URL: tracklet.pages.dev');
    expect(host?.textContent).toContain('Your Data Is 100% Safe');
    expect(host?.textContent).toContain(
      'All your job applications, notes, interview records, and account credentials remain completely intact and secure in the cloud.'
    );
    // Confirm that no automatic redirect text exists
    expect(host?.textContent).not.toContain('You will not be redirected automatically');

    // Confirm that no mentions of Netlify or Cloudflare exist in the copy
    expect(host?.textContent).not.toContain('Netlify');
    expect(host?.textContent).not.toContain('Cloudflare');

    const goButton = host?.querySelector('button');
    expect(goButton?.textContent).toContain('Go to tracklet.pages.dev');
  });

  it('navigates strictly to official destination on button click, stripping demo param and preserving path/hash', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hostname: 'localhost',
      pathname: '/pipeline',
      search: '?demo=netlify&tab=interview',
      hash: '#details',
      href: 'http://localhost:3000/pipeline?demo=netlify&tab=interview#details',
    } as any;

    try {
      mount(<LegacyMigrationScreen destinationUrl="https://tracklet.pages.dev" />);

      const goBtn = Array.from(host?.querySelectorAll('button') || []).find((b) =>
        b.textContent?.includes('Go to tracklet.pages.dev')
      );
      expect(goBtn).toBeDefined();

      act(() => {
        goBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(window.location.href).toBe('https://tracklet.pages.dev/pipeline?tab=interview#details');
    } finally {
      (window as any).location = originalLocation;
    }
  });
});
