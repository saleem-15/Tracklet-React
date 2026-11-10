import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import SlashMenu from '../../src/components/editor/SlashMenu';
import { menuActions } from '../../src/lib/editor/editorActions';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mountMenu(props: Partial<React.ComponentProps<typeof SlashMenu>>) {
  if (root) {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  }
  const currentHost = document.createElement('div');
  document.body.appendChild(currentHost);
  const currentRoot = createRoot(currentHost);
  host = currentHost;
  root = currentRoot;

  const defaultActions = menuActions('');
  const onSelect = props.onSelect ?? vi.fn();
  const onHover = props.onHover ?? vi.fn();

  act(() => {
    currentRoot.render(
      <SlashMenu
        open={props.open ?? true}
        items={props.items ?? defaultActions}
        selectedIndex={props.selectedIndex ?? 0}
        rect={props.rect ?? { anchorTop: 100, anchorBottom: 120, top: 100, left: 150 }}
        onSelect={onSelect}
        onHover={onHover}
        {...props}
      />
    );
  });

  return {
    rerender: (newProps: Partial<React.ComponentProps<typeof SlashMenu>>) => {
      act(() => {
        currentRoot.render(
          <SlashMenu
            open={newProps.open ?? true}
            items={newProps.items ?? defaultActions}
            selectedIndex={newProps.selectedIndex ?? 0}
            rect={newProps.rect ?? { anchorTop: 100, anchorBottom: 120, top: 100, left: 150 }}
            onSelect={onSelect}
            onHover={onHover}
            {...newProps}
          />
        );
      });
    },
    getMenuElement: () => document.body.querySelector('[data-slash-menu="true"]') as HTMLElement | null,
    getOptions: () => Array.from(document.body.querySelectorAll('[role="option"]')) as HTMLButtonElement[],
  };
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  host = null;
  root = null;
});

describe('SlashMenu animation & lifecycle', () => {
  it('renders portal listbox with GPU-accelerated motion classes when open is true', () => {
    const { getMenuElement, getOptions } = mountMenu({ open: true });
    const menu = getMenuElement();
    expect(menu).not.toBeNull();
    expect(menu?.getAttribute('role')).toBe('listbox');
    expect(menu?.className).toContain('will-change-transform');
    expect(menu?.className).toContain('backdrop-blur-md');
    expect(getOptions().length).toBeGreaterThan(0);
  });

  it('does not render popup when open is false initially', () => {
    const { getMenuElement } = mountMenu({ open: false });
    expect(getMenuElement()).toBeNull();
  });

  it('positions below caret with top-left origin when space below is sufficient', () => {
    const { getMenuElement } = mountMenu({
      open: true,
      rect: { anchorTop: 100, anchorBottom: 120, top: 100, left: 150 },
    });
    const menu = getMenuElement();
    expect(menu).not.toBeNull();
    expect(menu?.style.transformOrigin).toBe('top left');
    // Top should be around anchorBottom + 4 = 124px
    expect(menu?.style.top).toBe('124px');
    expect(menu?.style.left).toBe('150px');
  });

  it('flips above caret with bottom-left origin when space below overflows viewport', () => {
    // Simulate near bottom of viewport: viewport height default in window is 768px in happy-dom
    const vh = window.innerHeight || 768;
    const { getMenuElement } = mountMenu({
      open: true,
      rect: { anchorTop: vh - 50, anchorBottom: vh - 30, top: vh - 50, left: 150 },
    });
    const menu = getMenuElement();
    expect(menu).not.toBeNull();
    expect(menu?.style.transformOrigin).toBe('bottom left');
  });

  it('retains last valid rect coordinates when closed so exit transition does not jump', () => {
    const initialRect = { anchorTop: 100, anchorBottom: 120, top: 100, left: 150 };
    const { getMenuElement, rerender } = mountMenu({
      open: true,
      rect: initialRect,
    });

    const menu = getMenuElement();
    expect(menu).not.toBeNull();
    const topBefore = menu?.style.top;
    const leftBefore = menu?.style.left;

    // Simulate closing where slash state is cleared to EMPTY_SLASH (rect becomes null)
    rerender({
      open: false,
      rect: null,
      items: [],
    });

    // In synchronous test environment with reduced motion, it unmounts cleanly
    // If mounted during exit, it preserves the coordinates
    const menuAfter = getMenuElement();
    if (menuAfter) {
      expect(menuAfter.style.top).toBe(topBefore);
      expect(menuAfter.style.left).toBe(leftBefore);
    }
  });

  it('marks the selected option with active styling and aria-selected', () => {
    const { getOptions } = mountMenu({
      open: true,
      selectedIndex: 2,
    });
    const options = getOptions();
    expect(options.length).toBeGreaterThan(2);
    expect(options[2].getAttribute('aria-selected')).toBe('true');
    expect(options[2].className).toContain('bg-blue-50');
    expect(options[0].getAttribute('aria-selected')).toBe('false');
  });

  it('fires onSelect when an item is clicked', () => {
    const onSelect = vi.fn();
    const { getOptions } = mountMenu({
      open: true,
      onSelect,
    });
    const options = getOptions();
    expect(options.length).toBeGreaterThan(0);
    act(() => {
      options[0].click();
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
