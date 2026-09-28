import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useGuestMigration, UseGuestMigrationReturn } from '../../src/hooks/useGuestMigration';
import { Application, Contact } from '../../src/types';
import { LOCAL_STORAGE_KEYS } from '../../src/lib/constants';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let hookResult: UseGuestMigrationReturn;
let mockSetApplications = vi.fn();
let mockSetContacts = vi.fn();
let mockAddToast = vi.fn();

function Harness() {
  hookResult = useGuestMigration({
    user: null,
    setApplications: mockSetApplications,
    setContacts: mockSetContacts,
    addToast: mockAddToast,
  });
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

describe('useGuestMigration hook', () => {
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

  it('initializes with modal closed and empty migration lists', () => {
    mountHarness();

    expect(hookResult.isMigrationModalOpen).toBe(false);
    expect(hookResult.migrationApps).toEqual([]);
    expect(hookResult.migrationContacts).toEqual([]);
  });

  it('detects guest applications in localStorage and opens modal', () => {
    const guestApp: Partial<Application> = {
      id: 'g-app-1',
      company: 'TestCorp',
      role: 'Engineer',
    };
    localStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_APPS, JSON.stringify([guestApp]));

    mountHarness();

    act(() => {
      hookResult.checkAndPromptGuestMigration();
    });

    expect(hookResult.isMigrationModalOpen).toBe(true);
    expect(hookResult.migrationApps.length).toBe(1);
    expect(hookResult.migrationApps[0].company).toBe('TestCorp');
  });

  it('discards guest data and cleans localStorage', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_APPS, JSON.stringify([{ id: 'g1' }]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS, JSON.stringify([{ id: 'c1' }]));

    mountHarness();

    act(() => {
      hookResult.checkAndPromptGuestMigration();
    });
    expect(hookResult.isMigrationModalOpen).toBe(true);

    act(() => {
      hookResult.handleDiscardGuestApps();
    });

    expect(hookResult.isMigrationModalOpen).toBe(false);
    expect(hookResult.migrationApps).toEqual([]);
    expect(hookResult.migrationContacts).toEqual([]);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_APPS)).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.GUEST_CONTACTS)).toBeNull();
    expect(mockAddToast).toHaveBeenCalledWith('info', 'Guest Data Discarded', expect.any(String));
  });

  it('filters out corrupted or non-object entries before opening modal', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.GUEST_APPS,
      JSON.stringify([null, 'bad_entry', { noId: 'invalid' }, { id: 'valid-1', company: 'ValidCorp' }])
    );

    mountHarness();

    act(() => {
      hookResult.checkAndPromptGuestMigration();
    });

    expect(hookResult.isMigrationModalOpen).toBe(true);
    expect(hookResult.migrationApps.length).toBe(1);
    expect(hookResult.migrationApps[0].id).toBe('valid-1');
  });

  it('does not open modal if all stored entries are corrupted or invalid', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.GUEST_APPS,
      JSON.stringify([null, 42, { notAnId: true }])
    );

    mountHarness();

    act(() => {
      hookResult.checkAndPromptGuestMigration();
    });

    expect(hookResult.isMigrationModalOpen).toBe(false);
    expect(hookResult.migrationApps.length).toBe(0);
  });

  it('rejects applications with malformed contactIds and normalizes valid contactIds arrays', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.GUEST_APPS,
      JSON.stringify([
        { id: 'app-bad-cids', company: 'BadCorp', contactIds: 'not-an-array' },
        { id: 'app-good-cids', company: 'GoodCorp', contactIds: ['c1', ' ', 'c2'] },
        { id: 'app-no-cids', company: 'NoCidsCorp' },
      ])
    );

    mountHarness();

    act(() => {
      hookResult.checkAndPromptGuestMigration();
    });

    expect(hookResult.isMigrationModalOpen).toBe(true);
    expect(hookResult.migrationApps.length).toBe(2);
    expect(hookResult.migrationApps.find((a) => a.id === 'app-bad-cids')).toBeUndefined();
    const goodApp = hookResult.migrationApps.find((a) => a.id === 'app-good-cids');
    expect(goodApp?.contactIds).toEqual(['c1', 'c2']);
    const noCidsApp = hookResult.migrationApps.find((a) => a.id === 'app-no-cids');
    expect(noCidsApp).toBeDefined();
  });
});
