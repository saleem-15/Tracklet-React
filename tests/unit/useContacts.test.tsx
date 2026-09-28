import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useContacts, UseContactsReturn } from '../../src/hooks/useContacts';
import { Application, Contact } from '../../src/types';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let hookResult: UseContactsReturn;
let testApplications: Application[] = [];
let mockAddToast = vi.fn();
let mockSetSelectedAppId = vi.fn();

function Harness() {
  const [apps, setApps] = React.useState<Application[]>(testApplications);
  hookResult = useContacts({
    user: null,
    applications: apps,
    setApplications: setApps,
    addToast: mockAddToast,
    setSelectedAppId: mockSetSelectedAppId,
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

describe('useContacts hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    testApplications = [
      {
        id: 'app-1',
        userId: 'guest',
        company: 'Stripe',
        role: 'Frontend Engineer',
        status: 'Applied',
        platform: 'LinkedIn',
        dateApplied: '2026-09-01',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        stageUpdatedAt: '2026-09-01T00:00:00Z',
        contactIds: [],
      },
    ];
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

  it('initializes with empty contacts and null selection', () => {
    mountHarness();

    expect(hookResult.contacts).toEqual([]);
    expect(hookResult.selectedContactId).toBeNull();
    expect(hookResult.selectedContact).toBeNull();
  });

  it('adds an optimistic contact and links to targeted application', async () => {
    mountHarness();

    let created: Contact | undefined;
    await act(async () => {
      created = await hookResult.handleAddContact({
        name: 'Sarah Connor',
        role: 'Recruiter',
        email: 'sarah@stripe.com',
        applicationIds: ['app-1'],
      });
    });

    expect(created).toBeDefined();
    expect(created!.name).toBe('Sarah Connor');
    expect(hookResult.contacts.length).toBe(1);
    expect(hookResult.contacts[0].name).toBe('Sarah Connor');
    expect(mockAddToast).toHaveBeenCalledWith('success', 'Contact Added', 'Sarah Connor');
  });

  it('updates an existing contact correctly', async () => {
    mountHarness();

    let created: Contact | undefined;
    await act(async () => {
      created = await hookResult.handleAddContact({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });

    await act(async () => {
      await hookResult.handleUpdateContact(created!.id, {
        name: 'John Smith',
      });
    });

    expect(hookResult.contacts[0].name).toBe('John Smith');
  });

  it('deletes a contact and clears selection if selected', async () => {
    mountHarness();

    let created: Contact | undefined;
    await act(async () => {
      created = await hookResult.handleAddContact({
        name: 'Alice',
        email: 'alice@example.com',
      });
    });

    act(() => {
      hookResult.setSelectedContactId(created!.id);
    });
    expect(hookResult.selectedContactId).toBe(created!.id);

    await act(async () => {
      await hookResult.handleDeleteContact(created!.id);
    });

    expect(hookResult.contacts.length).toBe(0);
    expect(hookResult.selectedContactId).toBeNull();
    expect(mockAddToast).toHaveBeenCalledWith('info', 'Deleted Alice', undefined, expect.any(Object));
  });
});
