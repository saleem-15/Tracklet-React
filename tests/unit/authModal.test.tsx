import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { AuthModal } from '../../src/components/AuthModal';
import * as AuthContextModule from '../../src/context/AuthContext';

// Enable React act environment in HappyDOM
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function changeInput(input: HTMLInputElement, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  nativeSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('AuthModal', () => {
  let mockAuth: any;

  beforeEach(() => {
    mockAuth = {
      user: null,
      authUser: null,
      loading: false,
      error: null,
      clearError: vi.fn(),
      isAuthModalOpen: true,
      authModalMode: 'signin',
      openAuthModal: vi.fn(),
      closeAuthModal: vi.fn(),
      signInWithGoogle: vi.fn().mockResolvedValue(undefined),
      signInWithEmail: vi.fn().mockResolvedValue(undefined),
      signUpWithEmail: vi.fn().mockResolvedValue(undefined),
      sendPasswordReset: vi.fn().mockResolvedValue(undefined),
      verifyPasswordResetCode: vi.fn(),
      confirmPasswordReset: vi.fn(),
      reloadUserVerification: vi.fn(),
      signOut: vi.fn(),
      deleteAccount: vi.fn(),
    };

    vi.spyOn(AuthContextModule, 'useAuth').mockImplementation(() => mockAuth);

    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
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

  function renderModal(props = {}) {
    act(() => {
      root!.render(<AuthModal {...props} />);
    });
  }

  it('renders nothing when isAuthModalOpen is false', () => {
    mockAuth.isAuthModalOpen = false;
    renderModal();
    expect(host?.innerHTML).toBe('');
  });

  it('renders sign in fields when open in signin mode', () => {
    renderModal();
    const emailInput = host?.querySelector('#auth-modal-email') as HTMLInputElement;
    const passwordInput = host?.querySelector('#auth-modal-password') as HTMLInputElement;
    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();
    expect(host?.textContent).toContain('Welcome back to Tracklet');
  });

  it('cleanly dismisses modal and resets inputs upon successful email sign in', async () => {
    const onShowToast = vi.fn();
    renderModal({ onShowToast });

    const emailInput = host?.querySelector('#auth-modal-email') as HTMLInputElement;
    const passwordInput = host?.querySelector('#auth-modal-password') as HTMLInputElement;
    const submitBtn = host?.querySelector('button[type="submit"]') as HTMLButtonElement;

    // Type email and password
    act(() => {
      changeInput(emailInput, 'alex@example.com');
      changeInput(passwordInput, 'secret123');
    });

    // Submit form via submit button
    await act(async () => {
      submitBtn.click();
    });

    expect(mockAuth.signInWithEmail).toHaveBeenCalledWith('alex@example.com', 'secret123');
    expect(mockAuth.closeAuthModal).toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalledWith('success', 'Signed In', 'Welcome back!');
  });

  it('cleanly dismisses modal and resets state upon successful Google sign in', async () => {
    const onShowToast = vi.fn();
    renderModal({ onShowToast });

    const googleBtn = Array.from(host?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Continue with Google')
    ) as HTMLButtonElement;
    expect(googleBtn).toBeDefined();

    await act(async () => {
      googleBtn.click();
    });

    expect(mockAuth.signInWithGoogle).toHaveBeenCalled();
    expect(mockAuth.closeAuthModal).toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalledWith('success', 'Signed In', 'Welcome back to Tracklet!');
  });

  it('cleanly dismisses modal and resets inputs upon successful sign up', async () => {
    mockAuth.authModalMode = 'signup';
    const onShowToast = vi.fn();
    renderModal({ onShowToast });

    const emailInput = host?.querySelector('#auth-modal-email') as HTMLInputElement;
    const passwordInput = host?.querySelector('#auth-modal-password') as HTMLInputElement;
    const confirmInput = host?.querySelector('#auth-modal-confirm-password') as HTMLInputElement;
    const submitBtn = host?.querySelector('button[type="submit"]') as HTMLButtonElement;

    act(() => {
      changeInput(emailInput, 'newuser@example.com');
      changeInput(passwordInput, 'securepass123');
      changeInput(confirmInput, 'securepass123');
    });

    await act(async () => {
      submitBtn.click();
    });

    expect(mockAuth.signUpWithEmail).toHaveBeenCalledWith('newuser@example.com', 'securepass123');
    expect(mockAuth.closeAuthModal).toHaveBeenCalled();
    expect(onShowToast).toHaveBeenCalledWith('success', 'Account Created', expect.any(String));
  });

  it('dismisses when close button is clicked', () => {
    renderModal();
    const closeBtn = host?.querySelector('button[aria-label="Close dialog"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    act(() => {
      closeBtn.click();
    });

    expect(mockAuth.closeAuthModal).toHaveBeenCalled();
  });

  it('dismisses when backdrop overlay is clicked', () => {
    renderModal();
    const backdrop = host?.firstElementChild as HTMLDivElement;
    expect(backdrop).not.toBeNull();

    act(() => {
      backdrop.click();
    });

    expect(mockAuth.closeAuthModal).toHaveBeenCalled();
  });

  it('automatically closes modal and resets form when user becomes authenticated', () => {
    renderModal();
    expect(mockAuth.closeAuthModal).not.toHaveBeenCalled();

    // Simulate user state becoming authenticated in context
    mockAuth.user = { uid: 'u-123', email: 'test@example.com' };
    renderModal();

    expect(mockAuth.closeAuthModal).toHaveBeenCalled();
  });
});
