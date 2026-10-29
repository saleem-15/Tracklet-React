import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useExpirySettings, UseExpirySettingsReturn } from '../../src/hooks/useExpirySettings';
import { SETTINGS_STORAGE_KEY, DEFAULT_EXPIRY_SETTINGS, getScopedExpiryKey } from '../../src/lib/expiryUtils';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let mockUser: any = null;

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn(),
  }),
}));

const mockDoc = vi.fn((_db, ...pathSegments) => pathSegments.join('/'));
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    doc: (...args: any[]) => (mockDoc as any)(...args),
    getDoc: (...args: any[]) => (mockGetDoc as any)(...args),
    setDoc: (...args: any[]) => (mockSetDoc as any)(...args),
  };
});

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
    mockUser = null;
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => null,
    });
    mockSetDoc.mockResolvedValue(undefined);
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

  it('scopes local cache and syncs with Cloud Firestore when user is authenticated', async () => {
    mockUser = { uid: 'user-cloud-123' };
    const scopedKey = getScopedExpiryKey('user-cloud-123');

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        expirySettings: {
          enabled: false,
          expiryThresholdHours: 96,
        },
      }),
    });

    await act(async () => {
      mountHarness();
    });

    expect(hookResult.expirySettings).toEqual({
      enabled: false,
      expiryThresholdHours: 96,
    });
    expect(JSON.parse(localStorage.getItem(scopedKey) || '{}')).toEqual({
      enabled: false,
      expiryThresholdHours: 96,
    });

    // Verify saving updates cloud Firestore
    await act(async () => {
      hookResult.updateExpirySettings({
        enabled: true,
        expiryThresholdHours: 12,
      });
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      'users/user-cloud-123/preferences/settings',
      expect.objectContaining({
        expirySettings: {
          enabled: true,
          expiryThresholdHours: 12,
        },
      }),
      { merge: true }
    );
  });
});
