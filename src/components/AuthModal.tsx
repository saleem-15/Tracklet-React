import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthViewMode } from '../types';
import { getFriendlyAuthErrorMessage } from '../lib/authErrors';

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
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

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
      setResetSent(false);
      clearError();
    }
  }, [isAuthModalOpen, authModalMode, clearError]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      onShowToast?.('success', 'Signed In', 'Welcome back to Tracklet!');
    } catch (err: unknown) {
      const msg = getFriendlyAuthErrorMessage(err);
      setLocalError(msg);
      onShowToast?.('error', 'Google Sign-In Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim()) {
      setLocalError('Please enter your email address.');
      return;
    }

    if (authModalMode === 'forgot-password') {
      if (resetCooldown > 0) return;
      setIsSubmitting(true);
      try {
        await sendPasswordReset(email.trim());
        setResetSent(true);
        setResetCooldown(60);
        onShowToast?.('info', 'Instructions Dispatched', `If an account exists for ${email.trim()}, reset instructions were sent.`);
      } catch (err: unknown) {
        const msg = getFriendlyAuthErrorMessage(err);
        setLocalError(msg);
        onShowToast?.('error', 'Reset Failed', msg);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    if (authModalMode === 'signup') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match. Please re-type your password.');
        return;
      }

      setIsSubmitting(true);
      try {
        await signUpWithEmail(email.trim(), password);
        onShowToast?.(
          'success',
          'Account Created',
          'A verification link has been sent to your email. Please verify to access your workspace.'
        );
      } catch (err: unknown) {
        const msg = getFriendlyAuthErrorMessage(err);
        setLocalError(msg);
        onShowToast?.('error', 'Registration Error', msg);
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
        const msg = getFriendlyAuthErrorMessage(err);
        setLocalError(msg);
        onShowToast?.('error', 'Sign In Failed', msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/80 shadow-2xs font-bold text-sm">
              <img src="/logo.svg" alt="Tracklet Logo" className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {authModalMode === 'signin' && 'Welcome back to Tracklet'}
                {authModalMode === 'signup' && 'Sign Up'}
                {authModalMode === 'forgot-password' && 'Reset your password'}
              </h2>
              <p className="text-[11px] text-slate-500 font-sans">
                {authModalMode === 'signin' && 'Access your persistent job search workspace'}
                {authModalMode === 'signup' && 'Organize job applications across all devices'}
                {authModalMode === 'forgot-password' && "Enter your email to receive password reset instructions"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Sign In vs Sign Up) */}
        {authModalMode !== 'forgot-password' && (
          <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 gap-1.5 mx-6 mt-4 rounded-xl">
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authModalMode === 'signin'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('signup')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authModalMode === 'signup'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up
            </button>
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
              {authModalMode === 'signin' && (
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer ml-6"
                >
                  Click here to Create a New Account
                </button>
              )}
              {authModalMode === 'signup' && (
                <button
                  type="button"
                  onClick={() => openAuthModal('signin')}
                  className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer ml-6"
                >
                  Click here to Sign In instead
                </button>
              )}
              {authModalMode === 'forgot-password' && (
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer ml-6"
                >
                  Don't have an account? Click here to Create One
                </button>
              )}
            </div>
          )}

          {/* Reset Sent Banner */}
          {resetSent && (
            <div role="status" aria-live="polite" className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200/90 text-blue-950 text-xs flex flex-col gap-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-blue-900">Check Your Inbox</span>
                  <span className="text-slate-700 leading-relaxed block text-[11px]">
                    If an account is registered with <strong>{email}</strong>, a password reset link has been sent to that inbox.
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Not receiving anything?</span>
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </div>
          )}

          {/* Credentials Form (Primary) */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="auth-modal-email" className="block text-xs font-semibold text-slate-700 cursor-pointer">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="auth-modal-email"
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans disabled:opacity-60 disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Password Field */}
            {authModalMode !== 'forgot-password' && (
              <div className="space-y-1">
                <label htmlFor="auth-modal-password" className="block text-xs font-semibold text-slate-700 cursor-pointer">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-modal-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans disabled:opacity-60 disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {/* Forgot password link directly under password field */}
                {authModalMode === 'signin' && (
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => openAuthModal('forgot-password')}
                      disabled={isSubmitting}
                      className="text-[11px] font-sans text-blue-600 hover:text-blue-800 font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password (Sign Up Only) */}
            {authModalMode === 'signup' && (
              <div className="space-y-1">
                <label htmlFor="auth-modal-confirm-password" className="block text-xs font-semibold text-slate-700 cursor-pointer">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-modal-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans disabled:opacity-60 disabled:bg-slate-50"
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-sans pt-0.5">
                  A verification link will be sent to activate your account.
                </p>
              </div>
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

          {/* Google OAuth Button (Secondary) */}
          {authModalMode !== 'forgot-password' && (
            <div className="space-y-3 pt-1">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full"></div>
                <span className="bg-white px-3 text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0 font-medium">
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
          {authModalMode === 'forgot-password' && (
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
