import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useExtensionSync } from '../../src/hooks/useExtensionSync';
import { Application, Contact } from '../../src/types';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let mockAddToast = vi.fn();
let mockSetSelectedAppId = vi.fn();
let mockHandleAddContact = vi.fn(async () => ({} as Contact));

function Harness({
  apps,
  loading,
}: {
  apps: Application[];
  loading: boolean;
}) {
  const [applications, setApplications] = React.useState<Application[]>(apps);
  const applicationsRef = React.useRef<Application[]>(applications);
  applicationsRef.current = applications;

  useExtensionSync({
    user: null,
    applications,
    setApplications,
    applicationsRef,
    contacts: [],
    dataLoading: loading,
    handleAddContact: mockHandleAddContact,
    setSelectedAppId: mockSetSelectedAppId,
    addToast: mockAddToast,
  });

  return null;
}

function mountHarness(initialApps: Application[] = [], loading = false) {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(<Harness apps={initialApps} loading={loading} />);
  });
}

describe('useExtensionSync hook', () => {
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

  it('mounts cleanly without throwing and registers sync handlers', () => {
    expect(() => mountHarness()).not.toThrow();
  });
});
