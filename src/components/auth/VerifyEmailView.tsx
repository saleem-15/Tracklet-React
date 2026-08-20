import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MailCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EMAIL_VERIFICATION_COOLDOWN_SECONDS, LOCAL_STORAGE_KEYS } from '../../lib/constants';

interface VerifyEmailViewProps {
  onVerified?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({
  onVerified,
  onShowToast,
}) => {
  const {
    user,
    sendEmailVerification,
    reloadUserVerification,
    applyActionCode,
    signOut,
  } = useAuth();

  const [isManualChecking, setIsManualChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAutoVerifying, setIsAutoVerifying] = useState(false);
  const [autoVerifiedSuccess, setAutoVerifiedSuccess] = useState(false);
  const isVerifiedRef = useRef(false);

  // Initialize cooldown from localStorage if active (persists across refreshes/tabs)
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

  const isCooldownActive = cooldown > 0;

  // Cooldown countdown interval linked to wall clock
  useEffect(() => {
    if (!isCooldownActive) return;

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
  }, [isCooldownActive]);

  // Silent verification check (used by auto-poller and window focus/visibility triggers)
  const checkVerificationSilently = useCallback(async () => {
    if (isVerifiedRef.current) return;
    try {
      const verified = await reloadUserVerification();
      if (verified && !isVerifiedRef.current) {
        isVerifiedRef.current = true;
        setAutoVerifiedSuccess(true);
        onShowToast?.('success', 'Email Verified!', 'Welcome to your Tracklet workspace.');
        onVerified?.();
      }
    } catch {
      // Ignore silent background check errors
    }
  }, [reloadUserVerification, onVerified, onShowToast]);

  // 1. Auto-polling: poll verification status every 3.5 seconds while mounted and document is visible
  useEffect(() => {
    if (autoVerifiedSuccess) return;

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkVerificationSilently();
      }
    }, 3500);

    return () => clearInterval(pollInterval);
  }, [autoVerifiedSuccess, checkVerificationSilently]);

  // 2. Window Focus & Visibility: re-check immediately when tab regains focus or becomes visible
  useEffect(() => {
    if (autoVerifiedSuccess) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkVerificationSilently();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [autoVerifiedSuccess, checkVerificationSilently]);

  // 3. Handle direct oobCode in URL if arriving from email confirmation action link
  const processedCodesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oobCode = params.get('oobCode');

    if (!oobCode || processedCodesRef.current.has(oobCode)) return;
    processedCodesRef.current.add(oobCode);

    let isMounted = true;
    setIsAutoVerifying(true);
    setErrorMessage(null);

    applyActionCode(oobCode)
      .then(() => {
        if (!isMounted) return;
        isVerifiedRef.current = true;
        setAutoVerifiedSuccess(true);
        setIsAutoVerifying(false);
        onShowToast?.('success', 'Email Verified!', 'Welcome to your Tracklet workspace.');
        window.history.replaceState(null, '', '/verify-email');
        onVerified?.();
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setIsAutoVerifying(false);
        const msg = err instanceof Error ? err.message : 'Invalid or expired verification link.';
        setErrorMessage(msg);
      });

    return () => {
      isMounted = false;
    };
  }, [applyActionCode, onShowToast, onVerified]);

  // Manual fallback check link handler
  const handleManualCheck = async () => {
    setErrorMessage(null);
    setIsManualChecking(true);
    try {
      const verified = await reloadUserVerification();
      if (verified) {
        isVerifiedRef.current = true;
        setAutoVerifiedSuccess(true);
        onShowToast?.('success', 'Email Verified!', 'Welcome to your Tracklet workspace.');
        onVerified?.();
      } else {
        onShowToast?.(
          'warning',
          'Not Verified Yet',
          'We haven’t detected your verification yet. Please click the link in your email, or wait a moment.'
        );
      }
    } catch {
      setErrorMessage('Could not refresh verification status. Please try again.');
      onShowToast?.('error', 'Check Failed', 'Could not refresh verification status. Please try again.');
    } finally {
      setIsManualChecking(false);
    }
  };

  // Resend verification email with cooldown protection
  const handleResendEmail = async () => {
    if (cooldown > 0 || isResending) return;
    setErrorMessage(null);
    setIsResending(true);
    try {
      await sendEmailVerification();
      const targetTime = Date.now() + EMAIL_VERIFICATION_COOLDOWN_SECONDS * 1000;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.EMAIL_RESEND_COOLDOWN, targetTime.toString());
      } catch {
        // Ignore
      }
      setCooldown(EMAIL_VERIFICATION_COOLDOWN_SECONDS);
      onShowToast?.('success', 'Verification Link Sent', `A new verification email was sent to ${user?.email}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification email.';
      setErrorMessage(msg);
      onShowToast?.('error', 'Resend Error', msg);
    } finally {
      setIsResending(false);
    }
  };

  // Change email: sign out unverified user and route to signup
  const handleChangeEmail = async () => {
    try {
      await signOut();
      window.history.pushState(null, '', '/signup');
      onShowToast?.('info', 'Change Email', 'Please register with your preferred email address.');
    } catch {
      // Ignore
    }
  };

  // 1. Auto-verifying oobCode state
  if (isAutoVerifying) {
    return (
      <div className="w-full space-y-6 text-center py-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
          <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
            Verifying your email…
          </h1>
          <p className="text-xs text-slate-500 font-sans max-w-xs mx-auto">
            Activating your account and preparing your workspace.
          </p>
        </div>
      </div>
    );
  }

  // 2. Verified Success State
  if (autoVerifiedSuccess) {
    return (
      <div className="w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-13 h-13 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
            Email verified!
          </h1>
          <p className="text-xs text-slate-600 font-sans max-w-xs mx-auto">
            Your email has been confirmed. You now have full access to Tracklet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onVerified?.()}
          className="w-full h-[38px] flex items-center justify-center gap-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs shadow-blue-500/20 transition-all cursor-pointer mt-2"
        >
          <span>Open Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // 3. Ultra-Clean Standard Verification Screen
  return (
    <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-200 text-center select-none font-sans">
      {/* Brand Icon Header */}
      <div className="space-y-3">
        <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
          <MailCheck className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
            Verify your email
          </h1>
          <p className="text-xs text-slate-600 font-sans leading-relaxed max-w-[320px] mx-auto">
            We sent a verification link to{' '}
            <strong className="text-slate-900 font-semibold break-all">{user?.email || 'your email'}</strong>.
            Click the link in the email to continue.
          </p>
        </div>
      </div>

      {/* Global Error Alert if any */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 text-left animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Live Status Indicator (Unboxed, natural pulse) */}
      <div className="flex flex-col items-center justify-center gap-1.5 py-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          <span>Waiting for verification…</span>
        </div>

        <button
          type="button"
          onClick={handleManualCheck}
          disabled={isManualChecking}
          className="text-[11px] font-sans text-slate-500 hover:text-blue-700 cursor-pointer underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          {isManualChecking ? 'Checking status…' : 'Already verified? Check now'}
        </button>
      </div>

      {/* Secondary Actions & Microcopy */}
      <div className="pt-4 border-t border-slate-200/60 space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <span>Didn't receive the email?</span>
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={cooldown > 0 || isResending}
            className="font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 cursor-pointer disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend email (${cooldown}s)` : isResending ? 'Sending…' : 'Resend email'}
          </button>
        </div>

        <p className="text-[11px] text-slate-500 font-sans">
          Can't find it? Check your spam or junk folder.
        </p>

        {/* Change Email Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleChangeEmail}
            className="text-[11px] font-sans text-slate-500 hover:text-slate-900 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Wrong email address? Change email
          </button>
        </div>
      </div>
    </div>
  );
};
