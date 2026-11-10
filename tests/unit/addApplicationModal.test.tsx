import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AddApplicationModal } from '../../src/components/AddApplicationModal';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('AddApplicationModal Animated Motion & Lifecycle', () => {
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

  async function renderModal(props: Partial<React.ComponentProps<typeof AddApplicationModal>> = {}) {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onAdd: vi.fn().mockResolvedValue(undefined),
      ...props,
    };

    await act(async () => {
      root!.render(<AddApplicationModal {...defaultProps} />);
    });

    return defaultProps;
  }

  it('renders nothing when isOpen is false initially', async () => {
    await renderModal({ isOpen: false });
    expect(host!.innerHTML).toBe('');
  });

  it('renders the animated modal shell and core form when isOpen is true', async () => {
    await renderModal({ isOpen: true });

    const dialog = host!.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-label')).toBe('Add Job Application');

    // Backdrop should exist with animated presence testid
    const backdrop = host!.querySelector('[data-testid="modal-backdrop"]');
    expect(backdrop).not.toBeNull();
  });

  it('invokes onClose when clicking close button without dirty fields', async () => {
    const onClose = vi.fn();
    await renderModal({ isOpen: true, onClose });

    const closeBtn = host!.querySelector('button[title="Close modal (Esc)"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    await act(async () => {
      closeBtn.click();
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('dismisses modal on Escape key press when not dirty', async () => {
    const onClose = vi.fn();
    await renderModal({ isOpen: true, onClose });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('unmounts cleanly when isOpen transitions from true to false', async () => {
    const { onClose, onAdd } = await renderModal({ isOpen: true });
    expect(host!.querySelector('[role="dialog"]')).not.toBeNull();

    // Toggle isOpen to false
    await act(async () => {
      root!.render(
        <AddApplicationModal
          isOpen={false}
          onClose={onClose}
          onAdd={onAdd}
        />
      );
    });

    expect(host!.querySelector('[role="dialog"]')).toBeNull();
  });
});
