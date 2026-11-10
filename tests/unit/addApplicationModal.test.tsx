import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AddApplicationModal } from '../../src/components/AddApplicationModal';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function changeInput(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  nativeSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

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

  it('resets form state after submission and exit animation completion', async () => {
    const onClose = vi.fn();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    await renderModal({ isOpen: true, onClose, onAdd });

    const companyInput = host!.querySelector('input[placeholder="Linear, Stripe"]') as HTMLInputElement;
    const roleInput = host!.querySelector('input[placeholder="Software Engineer"]') as HTMLInputElement;

    await act(async () => {
      changeInput(companyInput, 'Acme Corp');
      changeInput(roleInput, 'Senior Frontend Engineer');
    });

    expect(companyInput.value).toBe('Acme Corp');
    expect(roleInput.value).toBe('Senior Frontend Engineer');

    // Submit form
    const submitBtn = host!.querySelector('button[type="submit"]') as HTMLButtonElement;
    await act(async () => {
      submitBtn.click();
    });

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'Acme Corp',
        role: 'Senior Frontend Engineer',
      })
    );
    expect(onClose).toHaveBeenCalled();

    // Re-render as closed (triggering exit motion and onExitComplete)
    await act(async () => {
      root!.render(<AddApplicationModal isOpen={false} onClose={onClose} onAdd={onAdd} />);
    });

    // Re-open modal
    await act(async () => {
      root!.render(<AddApplicationModal isOpen={true} onClose={onClose} onAdd={onAdd} />);
    });

    const newCompanyInput = host!.querySelector('input[placeholder="Linear, Stripe"]') as HTMLInputElement;
    const newRoleInput = host!.querySelector('input[placeholder="Software Engineer"]') as HTMLInputElement;
    expect(newCompanyInput.value).toBe('');
    expect(newRoleInput.value).toBe('');
  });

  it('resets form state after clicking Discard & Exit in unsaved changes prompt', async () => {
    const onClose = vi.fn();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    await renderModal({ isOpen: true, onClose, onAdd });

    const companyInput = host!.querySelector('input[placeholder="Linear, Stripe"]') as HTMLInputElement;
    await act(async () => {
      changeInput(companyInput, 'Stripe');
    });

    // Request close while dirty
    const closeBtn = host!.querySelector('button[title="Close modal (Esc)"]') as HTMLButtonElement;
    await act(async () => {
      closeBtn.click();
    });

    // Unsaved changes prompt should appear
    expect(host!.textContent).toContain('Discard unsaved changes?');
    const discardBtn = Array.from(host!.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Discard & Exit')
    );
    expect(discardBtn).toBeDefined();

    await act(async () => {
      discardBtn!.click();
    });

    expect(onClose).toHaveBeenCalled();

    // Re-render as closed then open again
    await act(async () => {
      root!.render(<AddApplicationModal isOpen={false} onClose={onClose} onAdd={onAdd} />);
    });
    await act(async () => {
      root!.render(<AddApplicationModal isOpen={true} onClose={onClose} onAdd={onAdd} />);
    });

    const newCompanyInput = host!.querySelector('input[placeholder="Linear, Stripe"]') as HTMLInputElement;
    expect(newCompanyInput.value).toBe('');
  });

  it('dismisses unsaved changes prompt and keeps modal open when Escape is pressed while prompt is visible', async () => {
    const onClose = vi.fn();
    await renderModal({ isOpen: true, onClose });

    const companyInput = host!.querySelector('input[placeholder="Linear, Stripe"]') as HTMLInputElement;
    await act(async () => {
      changeInput(companyInput, 'Vercel');
    });

    // Trigger unsaved prompt via close button
    const closeBtn = host!.querySelector('button[title="Close modal (Esc)"]') as HTMLButtonElement;
    await act(async () => {
      closeBtn.click();
    });

    expect(host!.textContent).toContain('Discard unsaved changes?');

    // Press Escape while prompt is shown
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    // Prompt is dismissed, but modal is still open and onClose was NOT called
    expect(host!.textContent).not.toContain('Discard unsaved changes?');
    expect(host!.querySelector('[role="dialog"]')).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect((host!.querySelector('input[placeholder="Linear, Stripe"]') as HTMLInputElement).value).toBe('Vercel');
  });
});
