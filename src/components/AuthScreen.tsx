import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Kanban, 
  Clock, 
  ShieldCheck,
  Building2,
  Check,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFriendlyAuthErrorMessage } from '../lib/authErrors';
import { getAuthModeFromPath, getPathForAuthMode, AuthRouteMode } from '../lib/routeUtils';

interface AuthScreenProps {
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onShowToast }) => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
  } = useAuth();

  const [mode, setMode] = useState<AuthRouteMode>(() => getAuthModeFromPath(window.location.pathname));
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

  // Sync initial URL on mount if at root or non-standard path
  useEffect(() => {
    const targetPath = getPathForAuthMode(mode);
    if (window.location.pathname !== targetPath && (window.location.pathname === '/' || window.location.pathname === '/signin' || window.location.pathname === '/register')) {
      window.history.replaceState(null, '', targetPath);
    }
  }, [mode]);

  // Listen to popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const pathMode = getAuthModeFromPath(window.location.pathname);
      setMode(pathMode);
      setLocalError(null);
      setResetSent(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleModeChange = (newMode: AuthRouteMode) => {
    setMode(newMode);
    setLocalError(null);
    setResetSent(false);
    const targetPath = getPathForAuthMode(newMode);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      onShowToast?.('success', 'Signed In', 'Welcome to Tracklet!');
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

    if (mode === 'forgot-password') {
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

    if (mode === 'signup') {
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
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col lg:flex-row items-stretch select-none overflow-y-auto">
      {/* Left Brand Showcase Section */}
      <div className="lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Background glow accents */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Top Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30">
              T
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Tracklet</span>
                <span className="text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  v1.0
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-sans">High-Clarity Job Application Tracker</p>
            </div>
          </div>
        </div>

        {/* Hero Value Props */}
        <div className="relative z-10 my-10 lg:my-0 space-y-6 max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Take Control of Your Career Search</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Master every interview, contact, and deadline.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tracklet gives job seekers a clean, high-clarity pipeline. Never miss a recruiter follow-up or expiring assessment again.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                <Kanban className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-slate-100">Interactive Kanban Pipeline</h3>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Drag and drop applications across Saved, Applied, Screening, Interview, and Offer stages.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-slate-100">Task & Follow-up Expiry Alerts</h3>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Proactive notifications alert you before deadlines pass or interviews stall.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-slate-100">Encrypted Cloud Sync & Verification</h3>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Your data stays strictly synchronized and protected under your verified account.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security Footer */}
        <div className="relative z-10 flex items-center gap-2 text-xs font-mono text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Strict Email Verification • End-to-End Privacy</span>
        </div>
      </div>

      {/* Right Form Card Section */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-slate-950">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          {/* Card Header & Mode Switcher */}
          <div className="p-6 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">
                {mode === 'signin' && 'Welcome back'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'forgot-password' && 'Reset your password'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'signin' && 'Enter your email and password to access your job workspace'}
                {mode === 'signup' && 'Get started with your free persistent tracking workspace'}
                {mode === 'forgot-password' && "Enter your email to receive password reset instructions"}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            {mode !== 'forgot-password' && (
              <div className="flex bg-slate-100 p-1 gap-1 rounded-xl mt-4">
                <button
                  type="button"
                  onClick={() => handleModeChange('signin')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('signup')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-4">
            {/* Error Banner */}
            {localError && (
              <div role="alert" aria-live="polite" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{localError}</span>
                </div>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('signup')}
                    className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer ml-6"
                  >
                    Click here to Create a New Account
                  </button>
                )}
                {mode === 'signup' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('signin')}
                    className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer ml-6"
                  >
                    Click here to Sign In instead
                  </button>
                )}
                {mode === 'forgot-password' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('signup')}
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
                    onClick={() => handleModeChange('signup')}
                    className="font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            )}

            {/* Google OAuth Button */}
            {mode !== 'forgot-password' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-semibold text-xs border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] font-mono text-slate-500 uppercase tracking-wider relative shrink-0">
                    or with email
                  </span>
                </div>
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Email field */}
              <div className="space-y-1">
                <label htmlFor="auth-screen-email" className="block text-xs font-semibold text-slate-700 cursor-pointer">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-screen-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans disabled:opacity-60 disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Password field */}
              {mode !== 'forgot-password' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auth-screen-password" className="block text-xs font-semibold text-slate-700 cursor-pointer">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => handleModeChange('forgot-password')}
                        disabled={isSubmitting}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-screen-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                      required
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-10 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans disabled:opacity-60 disabled:bg-slate-50"
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
                </div>
              )}

              {/* Confirm Password field (Sign Up only) */}
              {mode === 'signup' && (
                <div className="space-y-1">
                  <label htmlFor="auth-screen-confirm-password" className="block text-xs font-semibold text-slate-700 cursor-pointer">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="auth-screen-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type your password"
                      required
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans disabled:opacity-60 disabled:bg-slate-50"
                    />
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || (mode === 'forgot-password' && resetCooldown > 0)}
                aria-busy={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>
                      {mode === 'signin'
                        ? 'Signing in...'
                        : mode === 'signup'
                        ? 'Creating account...'
                        : 'Sending reset link...'}
                    </span>
                  </>
                ) : mode === 'forgot-password' && resetCooldown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
                    <span>Resend reset link in {resetCooldown}s</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'signin'
                        ? 'Sign In to Workspace'
                        : mode === 'signup'
                        ? 'Create Verified Account'
                        : 'Send Password Reset Link'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Back to sign in link for forgot-password */}
            {mode === 'forgot-password' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleModeChange('signin')}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
