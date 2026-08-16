import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  Inbox,
  Clock,
  Loader2,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { EMAIL_VERIFICATION_COOLDOWN_SECONDS, LOCAL_STORAGE_KEYS } from '../lib/constants';

interface EmailVerificationGateProps {
  onVerified?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const EmailVerificationGate: React.FC<EmailVerificationGateProps> = ({
  onVerified,
  onShowToast,
}) => {
  const { user, sendEmailVerification, reloadUserVerification, signOut } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  // Initialize cooldown from localStorage if active
  const [cooldown, setCooldown] = useState<number>(() => {
    try {
      const storedTime = localStorage.getItem(LOCAL_STORAGE_KEYS.EMAIL_RESEND_COOLDOWN);
      if (storedTime) {
        const remaining = Math.ceil((parseInt(storedTime, 10) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 0;
  });

  // Cooldown countdown interval linked to wall clock
  useEffect(() => {
    if (cooldown <= 0) return;

    const interval = setInterval(() => {
      try {
        const storedTime = localStorage.getItem(LOCAL_STORAGE_KEYS.EMAIL_RESEND_COOLDOWN);
        if (storedTime) {
          const remaining = Math.ceil((parseInt(storedTime, 10) - Date.now()) / 1000);
          if (remaining > 0) {
            setCooldown(remaining);
          } else {
            localStorage.removeItem(LOCAL_STORAGE_KEYS.EMAIL_RESEND_COOLDOWN);
            setCooldown(0);
          }
        } else {
          setCooldown(0);
        }
      } catch {
        setCooldown((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown > 0]);

  const handleCheckVerification = async () => {
    setIsChecking(true);
    try {
      const verified = await reloadUserVerification();
      if (verified) {
        onShowToast?.('success', 'Email Verified!', 'Welcome to your Tracklet workspace.');
        onVerified?.();
      } else {
        onShowToast?.(
          'warning',
          'Not Verified Yet',
          'Please click the link sent to your inbox (or check your spam folder), then click here again.'
        );
      }
    } catch {
      onShowToast?.('error', 'Check Failed', 'Could not refresh verification status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await sendEmailVerification();
      const targetTime = Date.now() + EMAIL_VERIFICATION_COOLDOWN_SECONDS * 1000;
      localStorage.setItem(LOCAL_STORAGE_KEYS.EMAIL_RESEND_COOLDOWN, targetTime.toString());
      setCooldown(EMAIL_VERIFICATION_COOLDOWN_SECONDS);
      onShowToast?.('success', 'Verification Link Sent', `A new verification email was sent to ${user?.email}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification email.';
      onShowToast?.('error', 'Resend Error', msg);
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.history.pushState(null, '', '/login');
      onShowToast?.('info', 'Signed Out', 'Returned to login screen.');
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col lg:flex-row items-stretch select-none overflow-y-auto">
      {/* Left Brand & Verification Progress Section */}
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
                  Security Gate
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-sans">Strict Identity & Workspace Protection</p>
            </div>
          </div>
        </div>

        {/* Verification Progress Hero */}
        <div className="relative z-10 my-10 lg:my-0 space-y-6 max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>One Final Step Required</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Verify your email to unlock your workspace.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              We take job application data privacy seriously. Verifying your email ensures that only you can access and manage your cloud applications.
            </p>
          </div>

          {/* Step Progression Indicators */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-emerald-500/30 backdrop-blur-xs">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Check className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-100">1. Account Registered</h3>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase">Done</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Your credentials and secure vault have been initialized.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 backdrop-blur-xs">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 border border-blue-500/40 animate-pulse">
                <Mail className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white">2. Confirm Email Ownership</h3>
                  <span className="text-[11px] font-mono text-amber-300 font-semibold uppercase">Action Required</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal">
                  Open the verification link sent to your inbox.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-xs opacity-60">
              <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 border border-slate-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-300">3. Workspace Activation</h3>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold uppercase">Locked</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Instant access to Kanban board, analytics, and browser clipping.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security Footer */}
        <div className="relative z-10 flex items-center gap-2 text-xs font-mono text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Strict Email Verification • Zero Unauthorized Access</span>
        </div>
      </div>

      {/* Right Action Card Section */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-slate-950">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
          {/* Card Header */}
          <div className="p-6 pb-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs shrink-0">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Check Your Inbox</h2>
                <p className="text-xs text-slate-500">We've sent a verification link to your email</p>
              </div>
            </div>

            {/* Email Address Pill */}
            <div className="mt-4 p-3 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-mono text-xs font-bold text-slate-800 truncate">
                  {user?.email || 'your email'}
                </span>
              </div>
              <span className="text-[11px] font-mono font-semibold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                Unverified
              </span>
            </div>
          </div>

          {/* Card Body Instructions */}
          <div className="p-6 space-y-5">
            <div className="space-y-3 text-xs text-slate-600 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Open your email client and locate the message from <strong>Tracklet</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Click the confirmation link inside the email to verify.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>Click the button below once verified to open your workspace.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Primary Verify Button */}
              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={isChecking}
                aria-busy={isChecking}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Checking verification status...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>I've Verified My Email</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Resend Link & Sign Out Row */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={cooldown > 0 || isResending}
                  aria-busy={isResending}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isResending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : cooldown > 0 ? (
                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  <span className={cooldown > 0 ? 'text-amber-700 font-mono font-medium' : ''}>
                    {cooldown > 0
                       ? `Resend in ${cooldown}s`
                      : isResending
                      ? 'Sending link...'
                      : 'Resend Verification Email'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors p-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

