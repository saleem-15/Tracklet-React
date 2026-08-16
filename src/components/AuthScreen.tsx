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
import { SegmentedTabs } from './SegmentedTabs';

interface AuthScreenProps {
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  onContinueAsGuest?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ 
  onShowToast,
  onContinueAsGuest,
}) => {
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
    if (window.location.pathname !== targetPath && (window.location.pathname === '/login' || window.location.pathname === '/signin' || window.location.pathname === '/signup' || window.location.pathname === '/register' || window.location.pathname === '/forgot-password')) {
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
    <div className="min-h-screen w-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8 select-none overflow-y-auto">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200 my-auto">
        
        {/* Left Brand Showcase Section */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 text-white">
          {/* Subtle ambient light accents */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Brand Top Header */}
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="Tracklet Logo" className="w-8 h-8 shrink-0" />
              <div>
                <h1 className="text-lg font-bold font-heading text-white tracking-tight flex items-center gap-2">
                  <span>Tracklet</span>
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    v1.0
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 font-sans">Executive Career Command Center</p>
              </div>
            </div>
          </div>

          {/* Hero Value Props */}
          <div className="relative z-10 my-8 space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-semibold">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Zero Friction Job Search</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-white tracking-tight leading-tight">
                Master every interview, contact, and deadline.
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Tracklet gives job seekers a high-clarity pipeline. Never miss recruiter follow-ups or expiring tasks again.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 backdrop-blur-xs">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <Kanban className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-100">Interactive Kanban Pipeline</h3>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Track applications from Applied to Screening, Interview, and Offer.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 backdrop-blur-xs">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-100">Task & Stage Expiry Alerts</h3>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Get alerted before deadlines pass or applications stall.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 backdrop-blur-xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-slate-100">User-Owned & Cloud Sync</h3>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Start locally offline or sync across all devices via encrypted cloud.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="relative z-10 flex items-center gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Strict Privacy • Zero Unauthorized Access</span>
          </div>
        </div>

        {/* Right Form Card Section */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-white space-y-5">
          <div>
            {/* Card Header & Mode Switcher */}
            <div className="space-y-1 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold font-heading text-slate-900 tracking-tight">
                {mode === 'signin' && 'Welcome back to Tracklet'}
                {mode === 'signup' && 'Sign Up'}
                {mode === 'forgot-password' && 'Reset your password'}
              </h2>
              <p className="text-xs text-slate-500 font-sans">
                {mode === 'signin' && 'Enter your credentials to access your synchronized job workspace.'}
                {mode === 'signup' && 'Get started with persistent cloud synchronization and browser clipping.'}
                {mode === 'forgot-password' && 'Enter your email to receive password reset instructions.'}
              </p>

              {/* Mode Switcher Tabs with smooth slide animation */}
              {mode !== 'forgot-password' && (
                <div className="mt-3">
                  <SegmentedTabs<'signin' | 'signup'>
                    tabs={[
                      { id: 'signin', label: 'Sign In' },
                      { id: 'signup', label: 'Sign Up' },
                    ]}
                    activeTab={mode as 'signin' | 'signup'}
                    onChange={(newMode) => handleModeChange(newMode)}
                  />
                </div>
              )}
            </div>

            {/* Form Content */}
            <div className="space-y-4 pt-4">
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
                      New to Tracklet? Create an account
                    </button>
                  )}
                  {mode === 'signup' && (
                    <button
                      type="button"
                      onClick={() => handleModeChange('signin')}
                      className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer ml-6"
                    >
                      Already registered? Sign in here
                    </button>
                  )}
                  {mode === 'forgot-password' && (
                    <button
                      type="button"
                      onClick={() => handleModeChange('signup')}
                      className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer ml-6"
                    >
                      Don't have an account? Create one
                    </button>
                  )}
                </div>
              )}

              {/* Reset Sent Banner */}
              {resetSent && (
                <div role="status" aria-live="polite" className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex flex-col gap-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold block text-blue-900">Check Your Inbox</span>
                      <span className="text-slate-700 leading-relaxed block text-[11px]">
                        If an account is registered with <strong>{email}</strong>, a password reset link has been dispatched.
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

              {/* Email / Password Form (Primary) */}
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
                      placeholder="you@example.com"
                      required
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 h-[36px] border border-slate-200 bg-slate-50/50 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-sans disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Password field */}
                {mode !== 'forgot-password' && (
                  <div className="space-y-1">
                    <label htmlFor="auth-screen-password" className="block text-xs font-semibold text-slate-700 cursor-pointer">
                      Password
                    </label>
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
                        className="w-full pl-9 pr-10 h-[36px] border border-slate-200 bg-slate-50/50 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-sans disabled:opacity-60"
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
                    {mode === 'signin' && (
                      <div className="flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleModeChange('forgot-password')}
                          disabled={isSubmitting}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer disabled:opacity-50"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
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
                        className="w-full pl-9 pr-3 h-[36px] border border-slate-200 bg-slate-50/50 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all font-sans disabled:opacity-60"
                      />
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || (mode === 'forgot-password' && resetCooldown > 0)}
                  aria-busy={isSubmitting}
                  className="w-full h-[38px] flex items-center justify-center px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                >
                  {isSubmitting ? (
                    <span>
                      {mode === 'signin'
                        ? 'Signing in...'
                        : mode === 'signup'
                        ? 'Signing up...'
                        : 'Sending reset link...'}
                    </span>
                  ) : mode === 'forgot-password' && resetCooldown > 0 ? (
                    <span>Resend reset link in {resetCooldown}s</span>
                  ) : (
                    <span>
                      {mode === 'signin'
                        ? 'Sign In'
                        : mode === 'signup'
                        ? 'Sign Up'
                        : 'Send Password Reset Link'}
                    </span>
                  )}
                </button>
              </form>

              {/* Back to sign in link for forgot-password */}
              {mode === 'forgot-password' && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleModeChange('signin')}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              )}

              {/* Secondary Actions (Divider, Google OAuth & Continue as Guest) */}
              {mode !== 'forgot-password' && (
                <div className="space-y-3 pt-1">
                  {/* Centered OR Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-3 text-[11px] font-mono text-slate-400 uppercase tracking-wider relative shrink-0 font-medium">
                      OR
                    </span>
                    <div className="border-t border-slate-200 w-full" />
                  </div>

                  {/* Google OAuth Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                    className="w-full h-[36px] flex items-center justify-center gap-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-semibold text-xs border border-slate-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

                  {/* Continue as Guest Button (Sign Up View Only) */}
                  {mode === 'signup' && onContinueAsGuest && (
                    <button
                      type="button"
                      onClick={onContinueAsGuest}
                      className="w-full h-[36px] px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>Continue as Guest</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
