import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Modal } from '../../src/components/Modal';
import { modalVariants, modalBackdropVariants, MOTION_TIMING } from '../../src/lib/motion';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Universal Modal Component & Motion Architecture', () => {
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
    document.body.style.overflow = '';
    vi.restoreAllMocks();
  });

  function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
    const defaultProps: React.ComponentProps<typeof Modal> = {
      isOpen: true,
      onClose: vi.fn(),
      title: 'Test Modal',
      children: (
        <div>
          <button type="button" id="first-btn">First</button>
          <input type="text" id="middle-input" defaultValue="content" />
          <button type="button" id="last-btn">Last</button>
        </div>
      ),
      ...props,
    };

    act(() => {
      root!.render(<Modal {...defaultProps} />);
    });

    return defaultProps;
  }

  describe('Motion Timing & Tokens', () => {
    it('uses snappy (160ms) duration for entrance and instant (100ms) for exit', () => {
      const openTransition = (modalVariants.open as any)?.transition;
      const closedTransition = (modalVariants.closed as any)?.transition;

      expect(openTransition.duration).toBe(MOTION_TIMING.snappy);
      expect(closedTransition.duration).toBe(MOTION_TIMING.instant);
    });

    it('backdrop mirrors modal exit timing to unmount simultaneously', () => {
      const backdropOpen = (modalBackdropVariants.open as any)?.transition;
      const backdropClosed = (modalBackdropVariants.closed as any)?.transition;

      expect(backdropOpen.duration).toBe(MOTION_TIMING.snappy);
      expect(backdropClosed.duration).toBe(MOTION_TIMING.instant);
    });
  });

  describe('DOM Rendering & Lifecycle', () => {
    it('renders nothing when isOpen is false', () => {
      renderModal({ isOpen: false });
      expect(host!.innerHTML).toBe('');
    });

    it('renders backdrop and dialog panel with WAI-ARIA semantics when open', () => {
      renderModal({ isOpen: true, title: 'Profile Settings' });

      const backdrop = host!.querySelector('[data-testid="modal-backdrop"]');
      const panel = host!.querySelector('[data-testid="modal-panel"]');

      expect(backdrop).not.toBeNull();
      expect(backdrop?.getAttribute('aria-hidden')).toBe('true');

      expect(panel).not.toBeNull();
      expect(panel?.getAttribute('role')).toBe('dialog');
      expect(panel?.getAttribute('aria-modal')).toBe('true');
      expect(panel?.getAttribute('aria-label')).toBe('Profile Settings');
      expect(host!.textContent).toContain('First');
      expect(host!.textContent).toContain('Last');
    });

    it('supports alertdialog role and aria-labelledby / aria-describedby', () => {
      renderModal({
        role: 'alertdialog',
        ariaLabelledBy: 'alert-title',
        ariaDescribedBy: 'alert-desc',
        children: (
          <div>
            <h2 id="alert-title">Delete Project?</h2>
            <p id="alert-desc">This action cannot be undone.</p>
          </div>
        ),
      });

      const panel = host!.querySelector('[data-testid="modal-panel"]');
      expect(panel?.getAttribute('role')).toBe('alertdialog');
      expect(panel?.getAttribute('aria-labelledby')).toBe('alert-title');
      expect(panel?.getAttribute('aria-describedby')).toBe('alert-desc');
    });
  });

  describe('Interactivity & Dismissal', () => {
    it('triggers onClose when clicking the backdrop overlay', () => {
      const onClose = vi.fn();
      renderModal({ isOpen: true, onClose, closeOnBackdropClick: true });

      const backdrop = host!.querySelector('[data-testid="modal-backdrop"]') as HTMLElement;
      act(() => {
        backdrop.click();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onClose when closeOnBackdropClick is false', () => {
      const onClose = vi.fn();
      renderModal({ isOpen: true, onClose, closeOnBackdropClick: false });

      const backdrop = host!.querySelector('[data-testid="modal-backdrop"]') as HTMLElement;
      act(() => {
        backdrop.click();
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not trigger onClose when clicking inside the dialog card (event isolation)', () => {
      const onClose = vi.fn();
      renderModal({ isOpen: true, onClose });

      const panel = host!.querySelector('[data-testid="modal-panel"]') as HTMLElement;
      act(() => {
        panel.click();
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('triggers onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      renderModal({ isOpen: true, onClose, closeOnEscape: true });

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility & Focus Management', () => {
    it('locks body scroll while open and restores it when unmounted', () => {
      expect(document.body.style.overflow).toBe('');

      renderModal({ isOpen: true, lockScroll: true });
      expect(document.body.style.overflow).toBe('hidden');

      act(() => {
        root!.render(<Modal isOpen={false} onClose={vi.fn()}><div>Content</div></Modal>);
      });
      expect(document.body.style.overflow).toBe('');
    });

    it('restores focus to previously focused element upon dismissal', () => {
      const externalButton = document.createElement('button');
      externalButton.id = 'external-trigger-btn';
      document.body.appendChild(externalButton);
      externalButton.focus();
      expect(document.activeElement).toBe(externalButton);

      renderModal({ isOpen: true });

      // Dismiss modal
      act(() => {
        root!.render(<Modal isOpen={false} onClose={vi.fn()}><div>Content</div></Modal>);
      });

      expect(document.activeElement).toBe(externalButton);
      externalButton.remove();
    });

    it('traps Tab navigation within dialog bounds', () => {
      renderModal({ isOpen: true });

      const firstBtn = host!.querySelector('#first-btn') as HTMLElement;
      const lastBtn = host!.querySelector('#last-btn') as HTMLElement;
      const rootDiv = host!.querySelector('[data-testid="modal-portal-root"]') as HTMLElement;

      // Focus last button and press Tab -> should wrap to first button
      lastBtn.focus();
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      act(() => {
        rootDiv.dispatchEvent(tabEvent);
      });
      expect(tabEvent.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(firstBtn);

      // Focus first button and press Shift+Tab -> should wrap to last button
      firstBtn.focus();
      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
      act(() => {
        rootDiv.dispatchEvent(shiftTabEvent);
      });
      expect(shiftTabEvent.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(lastBtn);
    });

    it('suppresses auto-focus on child components when autoFocus is false', async () => {
      vi.useFakeTimers();
      renderModal({
        isOpen: true,
        autoFocus: false,
        children: (
          <div>
            <input id="task-input" type="text" placeholder="Add a task..." />
            <button id="task-btn">Submit</button>
          </div>
        ),
      });

      act(() => {
        vi.advanceTimersByTime(60);
      });

      const taskInput = host!.querySelector('#task-input');
      const panel = host!.querySelector('[data-testid="modal-panel"]');
      expect(document.activeElement).not.toBe(taskInput);
      expect(document.activeElement).toBe(panel);
      vi.useRealTimers();
    });
  });
});
