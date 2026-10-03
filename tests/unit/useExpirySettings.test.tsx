import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useExpirySettings, UseExpirySettingsReturn } from '../../src/hooks/useExpirySettings';
import { SETTINGS_STORAGE_KEY, DEFAULT_EXPIRY_SETTINGS } from '../../src/lib/expiryUtils';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let hookResult: UseExpirySettingsReturn;

function Harness() {
  hookResult = useExpirySettings();
  return null;
}

function mountHarness() {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(<Harness />);
  });
}

describe('useExpirySettings hook', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('initializes with default expiry settings when localStorage is empty', () => {
    mountHarness();

    expect(hookResult.expirySettings).toEqual(DEFAULT_EXPIRY_SETTINGS);
    expect(hookResult.expirySettings.enabled).toBe(true);
    expect(hookResult.expirySettings.expiryThresholdHours).toBe(48);
  });

  it('initializes with persisted settings from localStorage if present', () => {
    const customSettings = {
      enabled: false,
      expiryThresholdHours: 72,
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(customSettings));

    mountHarness();

    expect(hookResult.expirySettings).toEqual(customSettings);
  });

  it('updates state and persists to localStorage on updateExpirySettings call', () => {
    mountHarness();

    const updated = {
      enabled: true,
      expiryThresholdHours: 24,
    };

    act(() => {
      hookResult.updateExpirySettings(updated);
    });

    expect(hookResult.expirySettings).toEqual(updated);
    expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}')).toEqual(updated);
  });
});
