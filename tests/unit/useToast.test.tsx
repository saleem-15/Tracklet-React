import { describe, it, expect, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useToast, UseToastReturn } from '../../src/hooks/useToast';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let hookResult: UseToastReturn;

function Harness() {
  hookResult = useToast();
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

afterEach(() => {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
});

describe('useToast hook', () => {
  it('starts with an empty toasts array', () => {
    mountHarness();
    expect(hookResult.toasts).toEqual([]);
  });

  it('adds a toast message with generated ID', () => {
    mountHarness();
    act(() => {
      hookResult.addToast('success', 'Application Saved', 'Linear application updated');
    });

    expect(hookResult.toasts.length).toBe(1);
    expect(hookResult.toasts[0].type).toBe('success');
    expect(hookResult.toasts[0].title).toBe('Application Saved');
    expect(hookResult.toasts[0].description).toBe('Linear application updated');
    expect(hookResult.toasts[0].id).toMatch(/^toast-\d+-[a-z0-9]+$/);
  });

  it('caps toast messages queue at 5 items', () => {
    mountHarness();
    act(() => {
      for (let i = 1; i <= 6; i++) {
        hookResult.addToast('info', `Notification ${i}`);
      }
    });

    expect(hookResult.toasts.length).toBe(5);
    // Oldest toast (Notification 1) should be dropped
    expect(hookResult.toasts[0].title).toBe('Notification 2');
    expect(hookResult.toasts[4].title).toBe('Notification 6');
  });

  it('dismisses a toast by ID', () => {
    mountHarness();
    act(() => {
      hookResult.addToast('error', 'Error 1');
      hookResult.addToast('warning', 'Warning 2');
    });

    expect(hookResult.toasts.length).toBe(2);
    const idToDismiss = hookResult.toasts[0].id;

    act(() => {
      hookResult.dismissToast(idToDismiss);
    });

    expect(hookResult.toasts.length).toBe(1);
    expect(hookResult.toasts[0].title).toBe('Warning 2');
  });
});
