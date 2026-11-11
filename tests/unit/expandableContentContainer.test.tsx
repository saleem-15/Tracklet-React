import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  ExpandableContentContainer,
  ExpandableContentContainerProps,
} from '../../src/components/ExpandableContentContainer';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('ExpandableContentContainer Canonical Primitive', () => {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
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
    vi.restoreAllMocks();
  });

  function renderContainer(props: ExpandableContentContainerProps) {
    act(() => {
      root!.render(<ExpandableContentContainer {...props} />);
    });
  }

  describe('Drawer Mode (collapsedHeight: 0)', () => {
    it('unmounts content when collapsed and renders cleanly when expanded', () => {
      // 1. Collapsed state
      renderContainer({
        id: 'test-drawer',
        isExpanded: false,
        collapsedHeight: 0,
        children: <p>Secret Contact Details</p>,
      });

      expect(host!.querySelector('#test-drawer')).toBeNull();
      expect(host!.textContent).not.toContain('Secret Contact Details');

      // 2. Expand state
      renderContainer({
        id: 'test-drawer',
        isExpanded: true,
        collapsedHeight: 0,
        children: <p>Secret Contact Details</p>,
      });

      const drawer = host!.querySelector('#test-drawer') as HTMLElement;
      expect(drawer).toBeTruthy();
      expect(drawer.style.overflow).toBe('hidden');
      expect(host!.textContent).toContain('Secret Contact Details');
    });
  });

  describe('Snippet Mode (collapsedHeight > 0)', () => {
    it('keeps children mounted in the DOM when collapsed to prevent text dancing', () => {
      renderContainer({
        id: 'test-snippet',
        isExpanded: false,
        collapsedHeight: 46,
        fadeColor: 'white',
        children: <p>Persistent email content that never jumps</p>,
      });

      // Element remains mounted in the DOM
      const snippet = host!.querySelector('#test-snippet') as HTMLElement;
      expect(snippet).toBeTruthy();
      expect(snippet.style.overflow).toBe('hidden');
      expect(host!.textContent).toContain('Persistent email content that never jumps');

      // Bottom gradient fade overlay is rendered
      const fadeMask = host!.querySelector('.bg-gradient-to-t');
      expect(fadeMask).toBeTruthy();
    });

    it('expands cleanly and dissolves the gradient fade overlay', () => {
      renderContainer({
        id: 'test-snippet',
        isExpanded: true,
        collapsedHeight: 46,
        fadeColor: 'white',
        children: <p>Persistent email content that never jumps</p>,
      });

      const snippet = host!.querySelector('#test-snippet') as HTMLElement;
      expect(snippet).toBeTruthy();
      expect(snippet.style.overflow).toBe('hidden');

      // Gradient fade overlay is removed when expanded
      const fadeMask = host!.querySelector('.bg-gradient-to-t');
      expect(fadeMask).toBeNull();
    });
  });

  describe('isCollapsible = false', () => {
    it('renders children at unconstrained auto height without gradient mask', () => {
      renderContainer({
        id: 'test-unconstrained',
        isExpanded: false,
        collapsedHeight: 46,
        isCollapsible: false,
        children: <p>Short email text that fits in one line</p>,
      });

      const container = host!.querySelector('#test-unconstrained') as HTMLElement;
      expect(container).toBeTruthy();
      expect(host!.querySelector('.bg-gradient-to-t')).toBeNull();
    });
  });
});
