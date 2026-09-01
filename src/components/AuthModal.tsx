import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, MailCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthViewMode } from '../types';
import { getFriendlyAuthErrorMessage } from '../lib/authErrors';
import { SegmentedTabs } from './SegmentedTabs';
import { AuthTextField } from './auth/AuthTextField';
import { useEscapeKey } from '../lib/useEscapeKey';

interface AuthModalProps {
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onShowToast }) => {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    error,
    clearError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});
  const [resetSent, setResetSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  // Dismiss on Escape key
  useEscapeKey(closeAuthModal, isAuthModalOpen);

  // Cooldown countdown for password reset
  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  // Reset form state on open / mode change
  useEffect(() => {
    if (isAuthModalOpen) {
      setLocalError(null);
      setFieldErrors({});
      setResetSent(false);
      clearError();
    }
  }, [isAuthModalOpen, authModalMode, clearError]);

  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Handle focus trap with focus save/restore
  useEffect(() => {
    if (!isAuthModalOpen) return;

    // Save previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Move focus to first focusable element in the modal
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && isAuthModalOpen && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus when modal closes
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const validate = () => {
    const nextErrors: { email?: string; password?: string; confirmPassword?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (authModalMode !== 'forgot-password') {
      if (!password) {
        nextErrors.password = 'Password is required.';
      } else if (password.length < 6) {
        nextErrors.password = 'Password must be at least 6 characters.';
      }

      if (authModalMode === 'signup') {
        if (!confirmPassword) {
          nextErrors.confirmPassword = 'Please confirm your password.';
        } else if (password !== confirmPassword) {
          nextErrors.confirmPassword = 'Passwords do not match.';
        }
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      onShowToast?.('success', 'Signed In', 'Welcome back to Tracklet!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : getFriendlyAuthErrorMessage(err);
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!validate()) return;

    if (authModalMode === 'forgot-password') {
      if (resetCooldown > 0) return;
      setIsSubmitting(true);
      try {
        await sendPasswordReset(email.trim());
        setResetSent(true);
        setResetCooldown(60);
        onShowToast?.('info', 'Instructions Dispatched', `If an account exists for ${email.trim()}, reset instructions were sent.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : getFriendlyAuthErrorMessage(err);
        setLocalError(msg);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (authModalMode === 'signup') {
      setIsSubmitting(true);
      try {
        await signUpWithEmail(email.trim(), password);
        onShowToast?.(
          'success',
          'Account Created',
          'A verification link has been sent to your email. Please verify to access your workspace.'
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : getFriendlyAuthErrorMessage(err);
        setLocalError(msg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Sign In
      setIsSubmitting(true);
      try {
        await signInWithEmail(email.trim(), password);
        onShowToast?.('success', 'Signed In', 'Welcome back!');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : getFriendlyAuthErrorMessage(err);
        setLocalError(msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={authModalMode === 'signin' ? 'Sign In' : authModalMode === 'signup' ? 'Sign Up' : 'Reset Password'}
        className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Tracklet Logo" className="w-7 h-7 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {authModalMode === 'signin' && 'Welcome back to Tracklet'}
                {authModalMode === 'signup' && 'Sign Up'}
                {authModalMode === 'forgot-password' && 'Reset your password'}
              </h2>
              <p className="text-[11px] text-slate-500 font-sans">
                {authModalMode === 'signin' && 'Access your persistent job search workspace'}
                {authModalMode === 'signup' && 'Organize job applications across all devices'}
                {authModalMode === 'forgot-password' && 'Enter your email to receive password reset instructions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher with smooth slide animation (Sign In vs Sign Up) */}
        {authModalMode !== 'forgot-password' && (
          <div className="px-6 pt-4">
            <SegmentedTabs<'signin' | 'signup'>
              tabs={[
                { id: 'signin', label: 'Sign In' },
                { id: 'signup', label: 'Sign Up' },
              ]}
              activeTab={authModalMode as 'signin' | 'signup'}
              onChange={(newMode) => openAuthModal(newMode)}
            />
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Error Banner */}
          {(localError || error) && (
            <div role="alert" aria-live="polite" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{localError || error}</span>
              </div>
            </div>
          )}

          {/* Reset Sent Confirmation View */}
          {resetSent && authModalMode === 'forgot-password' ? (
            <div className="space-y-5 text-center py-2 animate-in fade-in zoom-in-95">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
                <MailCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Check your inbox</h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Instructions to reset your password have been sent to <strong>{email}</strong>.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="text-[11px] font-sans text-slate-500 hover:text-slate-800 underline cursor-pointer transition-colors block mx-auto"
                >
                  Create a new account instead
                </button>
              </div>
            </div>
          ) : (
            /* Credentials Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              <AuthTextField
                id="auth-modal-email"
                label="Email Address"
                type="email"
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={fieldErrors.email}
                icon={Mail}
                disabled={isSubmitting}
              />

              {authModalMode !== 'forgot-password' && (
                <AuthTextField
                  id="auth-modal-password"
                  label="Password"
                  isPassword
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  error={fieldErrors.password}
                  icon={Lock}
                  disabled={isSubmitting}
                  rightAction={
                    authModalMode === 'signin' ? (
                      <button
                        type="button"
                        onClick={() => openAuthModal('forgot-password')}
                        disabled={isSubmitting}
                        className="text-[11px] font-sans text-blue-600 hover:text-blue-800 font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Forgot password?
                      </button>
                    ) : undefined
                  }
                />
              )}

              {authModalMode === 'signup' && (
                <AuthTextField
                  id="auth-modal-confirm-password"
                  label="Confirm Password"
                  isPassword
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  error={fieldErrors.confirmPassword}
                  icon={Lock}
                  disabled={isSubmitting}
                />
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || (authModalMode === 'forgot-password' && resetCooldown > 0)}
                aria-busy={isSubmitting}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {isSubmitting ? (
                  <span>
                    {authModalMode === 'signin'
                      ? 'Signing in...'
                      : authModalMode === 'signup'
                      ? 'Signing up...'
                      : 'Sending reset link...'}
                  </span>
                ) : authModalMode === 'forgot-password' && resetCooldown > 0 ? (
                  <span>Resend reset link in {resetCooldown}s</span>
                ) : (
                  <span>
                    {authModalMode === 'signin'
                      ? 'Sign In'
                      : authModalMode === 'signup'
                      ? 'Sign Up'
                      : 'Send Reset Link'}
                  </span>
                )}
              </button>
            </form>
          )}

          {/* Google OAuth Button (Secondary) */}
          {authModalMode !== 'forgot-password' && (
            <div className="space-y-3 pt-1">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[11px] font-mono text-slate-500 uppercase tracking-wider shrink-0 font-medium">
                  OR
                </span>
                <div className="border-t border-slate-200 w-full"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-semibold text-xs border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* Footer Back link for Forgot Password */}
          {authModalMode === 'forgot-password' && !resetSent && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
