import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useUrlNavigation, UseUrlNavigationReturn } from '../../src/hooks/useUrlNavigation';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let navResult: UseUrlNavigationReturn;

function Harness() {
  navResult = useUrlNavigation();
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

beforeEach(() => {
  window.history.pushState(null, '', '/');
});

afterEach(() => {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  window.history.pushState(null, '', '/');
});

describe('useUrlNavigation hook', () => {
  it('initializes with default tab and empty selections', () => {
    mountHarness();
    expect(navResult.activeTab).toBe('all');
    expect(navResult.selectedAppId).toBeNull();
    expect(navResult.isAddModalOpen).toBe(false);
    expect(navResult.filter.search).toBe('');
    expect(navResult.filter.status).toBe('All');
  });

  it('updates activeTab and pushes path to history', () => {
    mountHarness();
    act(() => {
      navResult.setActiveTab('pipeline');
    });

    expect(navResult.activeTab).toBe('pipeline');
    expect(window.location.pathname).toBe('/pipeline');
  });

  it('updates filter state and query params', () => {
    mountHarness();
    act(() => {
      navResult.setFilter((prev) => ({ ...prev, search: 'Google', status: 'Active' }));
    });

    expect(navResult.filter.search).toBe('Google');
    expect(navResult.filter.status).toBe('Active');
    expect(window.location.search).toContain('q=Google');
  });

  it('updates selectedAppId and url parameter', () => {
    mountHarness();
    act(() => {
      navResult.setSelectedAppId('app-linear-123');
    });

    expect(navResult.selectedAppId).toBe('app-linear-123');
    expect(window.location.search).toContain('app=app-linear-123');
  });

  it('updates isAddModalOpen state', () => {
    mountHarness();
    act(() => {
      navResult.setIsAddModalOpen(true);
    });

    expect(navResult.isAddModalOpen).toBe(true);
    expect(window.location.search).toContain('new=1');
  });

  it('synchronizes active tab and params on browser popstate navigation', () => {
    mountHarness();
    expect(navResult.activeTab).toBe('all');

    act(() => {
      window.history.pushState(null, '', '/contacts?q=Alice');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(navResult.activeTab).toBe('contacts');
    expect(navResult.filter.search).toBe('Alice');
  });
});
