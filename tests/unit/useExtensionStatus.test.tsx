import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useExtensionStatus } from '../../src/hooks/useExtensionStatus';
import { ExtensionState } from '../../src/types';
import { LATEST_EXTENSION_VERSION } from '../../src/lib/constants';
import * as extensionSyncModule from '../../src/lib/extensionSync';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let currentHookState: ExtensionState | null = null;

function TestComponent() {
  const state = useExtensionStatus();
  currentHookState = state;
  return null;
}

function mountComponent() {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(<TestComponent />);
  });
}

describe('useExtensionStatus hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentHookState = null;
    document.documentElement.removeAttribute('data-tracklet-extension-installed');
    document.documentElement.removeAttribute('data-tracklet-extension-version');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-tracklet-extension-installed');
    document.documentElement.removeAttribute('data-tracklet-extension-version');
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
  });

  it('resolves to not_installed when ping times out without extension', async () => {
    vi.spyOn(extensionSyncModule, 'pingExtension').mockResolvedValue({
      installed: false,
      version: null,
    });

    await act(async () => {
      mountComponent();
    });

    expect(currentHookState?.status).toBe('not_installed');
    expect(currentHookState?.installedVersion).toBe(null);
    expect(currentHookState?.isChecking).toBe(false);
  });

  it('resolves to connected when extension reports current latest version', async () => {
    vi.spyOn(extensionSyncModule, 'pingExtension').mockResolvedValue({
      installed: true,
      version: LATEST_EXTENSION_VERSION,
    });

    await act(async () => {
      mountComponent();
    });

    expect(currentHookState?.status).toBe('connected');
    expect(currentHookState?.installedVersion).toBe(LATEST_EXTENSION_VERSION);
    expect(currentHookState?.isChecking).toBe(false);
  });

  it('resolves to update_available when extension reports an older version', async () => {
    vi.spyOn(extensionSyncModule, 'pingExtension').mockResolvedValue({
      installed: true,
      version: '0.9.0',
    });

    await act(async () => {
      mountComponent();
    });

    expect(currentHookState?.status).toBe('update_available');
    expect(currentHookState?.installedVersion).toBe('0.9.0');
    expect(currentHookState?.isChecking).toBe(false);
  });

  it('re-evaluates status when recheck is called', async () => {
    const pingSpy = vi.spyOn(extensionSyncModule, 'pingExtension');
    pingSpy.mockResolvedValueOnce({
      installed: false,
      version: null,
    });

    await act(async () => {
      mountComponent();
    });

    expect(currentHookState?.status).toBe('not_installed');

    // Simulate extension becoming active before recheck
    pingSpy.mockResolvedValueOnce({
      installed: true,
      version: LATEST_EXTENSION_VERSION,
    });

    await act(async () => {
      await currentHookState?.recheck();
    });

    expect(currentHookState?.status).toBe('connected');
    expect(currentHookState?.installedVersion).toBe(LATEST_EXTENSION_VERSION);
  });

  it('immediately resolves to connected when DOM attribute markers are present', async () => {
    document.documentElement.setAttribute('data-tracklet-extension-installed', 'true');
    document.documentElement.setAttribute('data-tracklet-extension-version', LATEST_EXTENSION_VERSION);

    await act(async () => {
      mountComponent();
    });

    expect(currentHookState?.status).toBe('connected');
    expect(currentHookState?.installedVersion).toBe(LATEST_EXTENSION_VERSION);
    expect(currentHookState?.isChecking).toBe(false);
  });

  it('updates to connected when tracklet:extension:ready custom event is dispatched', async () => {
    vi.spyOn(extensionSyncModule, 'pingExtension').mockResolvedValue({
      installed: false,
      version: null,
    });

    await act(async () => {
      mountComponent();
    });

    expect(currentHookState?.status).toBe('not_installed');

    await act(async () => {
      window.dispatchEvent(new CustomEvent('tracklet:extension:ready', {
        detail: { installed: true, version: LATEST_EXTENSION_VERSION }
      }));
    });

    expect(currentHookState?.status).toBe('connected');
    expect(currentHookState?.installedVersion).toBe(LATEST_EXTENSION_VERSION);
  });

  it('auto-rechecks and connects on window focus when previously not installed', async () => {
    const pingSpy = vi.spyOn(extensionSyncModule, 'pingExtension');
    pingSpy.mockResolvedValueOnce({
      installed: false,
      version: null,
    });

    await act(async () => {
      mountComponent();
    });

    expect(currentHookState?.status).toBe('not_installed');

    // User switches back from chrome://extensions
    pingSpy.mockResolvedValueOnce({
      installed: true,
      version: LATEST_EXTENSION_VERSION,
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(currentHookState?.status).toBe('connected');
    expect(currentHookState?.installedVersion).toBe(LATEST_EXTENSION_VERSION);
  });
});
