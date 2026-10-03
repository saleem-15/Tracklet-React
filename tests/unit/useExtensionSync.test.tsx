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
    vi.clearAllMocks();
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

  it('ingests incoming email via window message and triggers toast receipt', async () => {
    const existingApp: Application = {
      id: 'app-1',
      userId: 'guest',
      company: 'Acme Corp',
      role: 'Frontend Engineer',
      status: 'Applied',
      platform: 'LinkedIn',
      dateApplied: '2026-09-20',
      stageUpdatedAt: '2026-09-20T00:00:00.000Z',
      contactIds: [],
      emails: [],
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
    };

    mountHarness([existingApp], false);

    await act(async () => {
      const channel = new BroadcastChannel('tracklet_extension_channel');
      channel.postMessage({
        type: 'TRACKLET_EXT_ADD_EMAIL',
        payload: {
          appId: 'app-1',
          emailLog: {
            id: 'email-1',
            subject: 'Interview with Acme',
            date: '2026-09-28T08:00:00.000Z',
            sender: 'recruiter@acme.com',
          },
        },
      });
      channel.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockAddToast).toHaveBeenCalledWith(
      'success',
      'Email Logged via Extension',
      expect.stringContaining('Interview with Acme'),
      expect.any(Object)
    );
  });

  it('buffers incoming email during data loading and drains on load completion', async () => {
    const existingApp: Application = {
      id: 'app-2',
      userId: 'guest',
      company: 'Tech Corp',
      role: 'Fullstack Dev',
      status: 'Applied',
      platform: 'LinkedIn',
      dateApplied: '2026-09-21',
      stageUpdatedAt: '2026-09-21T00:00:00.000Z',
      contactIds: [],
      emails: [],
      createdAt: '2026-09-21T00:00:00.000Z',
      updatedAt: '2026-09-21T00:00:00.000Z',
    };

    // Mount initially with loading = true
    mountHarness([existingApp], true);

    await act(async () => {
      const channel = new BroadcastChannel('tracklet_extension_channel');
      channel.postMessage({
        type: 'TRACKLET_EXT_ADD_EMAIL',
        payload: {
          appId: 'app-2',
          emailLog: {
            id: 'email-2',
            subject: 'Offer Letter',
            date: '2026-09-28T09:00:00.000Z',
          },
        },
      });
      channel.close();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // While loading, email was buffered so toast should not have been called yet
    expect(mockAddToast).not.toHaveBeenCalled();

    // Re-render harness with loading = false to trigger drain
    await act(async () => {
      root!.render(<Harness apps={[existingApp]} loading={false} />);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Once loading completes, buffered email is drained and toast triggered
    expect(mockAddToast).toHaveBeenCalledWith(
      'success',
      'Email Logged via Extension',
      expect.stringContaining('Offer Letter'),
      expect.any(Object)
    );
  });
});
