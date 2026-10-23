import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import React, { act } from 'react';
import { DomainMigrationBanner } from '../../src/components/DomainMigrationBanner';

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

describe('DomainMigrationBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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

  it('does not render when target URL is not configured', () => {
    mount(<DomainMigrationBanner targetUrl="" />);
    expect(host?.textContent).toBe('');
  });

  it('does not render on standard localhost without netlify domain', () => {
    mount(<DomainMigrationBanner targetUrl="https://tracklet.pages.dev" />);
    expect(host?.textContent).toBe('');
  });

  it('renders on netlify domain with switch and dismiss actions', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hostname: 'tracklet.netlify.app',
      pathname: '/pipeline',
      search: '',
      hash: '',
      href: 'https://tracklet.netlify.app/pipeline',
    } as any;

    try {
      mount(<DomainMigrationBanner targetUrl="https://tracklet.pages.dev" />);
      expect(host?.textContent).toContain('Tracklet has moved to our faster home on Cloudflare!');

      const dismissBtn = host?.querySelector('button[aria-label="Dismiss migration notice"]');
      expect(dismissBtn).toBeDefined();

      act(() => {
        dismissBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(localStorage.getItem('tracklet_migration_banner_dismissed')).toBe('true');
      expect(host?.textContent).toBe('');
    } finally {
      (window as any).location = originalLocation;
    }
  });
});
