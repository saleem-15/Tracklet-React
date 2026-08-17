import React, { useState } from 'react';
import { Mail, MailCheck, AlertCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { AuthRouteMode } from '../../lib/routeUtils';
import { AuthTextField } from './AuthTextField';

interface ForgotPasswordViewProps {
  onNavigate: (mode: AuthRouteMode) => void;
  onSubmit: (email: string) => Promise<void>;
  isSubmitting: boolean;
  errorMessage: string | null;
  resetSent: boolean;
  resetCooldown: number;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  onNavigate,
  onSubmit,
  isSubmitting,
  errorMessage,
  resetSent,
  resetCooldown,
}) => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const validate = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (resetCooldown > 0) return;
    await onSubmit(email.trim());
  };

  const handleResend = async () => {
    if (resetCooldown > 0 || isSubmitting) return;
    await onSubmit(email.trim());
  };

  // Dedicated Success / Confirmation State
  if (resetSent) {
    return (
      <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <MailCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
            Check your inbox
          </h1>
          <p className="text-xs text-slate-600 font-sans leading-relaxed max-w-xs mx-auto">
            We sent a password reset link to{' '}
            <strong className="text-slate-900 font-semibold break-all">{email}</strong>.
            Click the link in the email to set a new password.
          </p>
        </div>

        {/* Global Error if resend fails */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('signin')}
            className="w-full h-[38px] flex items-center justify-center px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            Back to Sign In
          </button>

          <div className="text-center space-y-1.5 pt-1">
            <p className="text-xs text-slate-500 font-sans">
              Didn't receive the email?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resetCooldown > 0 || isSubmitting}
                className="font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 cursor-pointer disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed ml-0.5"
              >
                {resetCooldown > 0 ? `Resend in ${resetCooldown}s` : 'Click to resend'}
              </button>
            </p>

            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="text-[11px] font-sans text-slate-500 hover:text-slate-800 cursor-pointer underline underline-offset-2 transition-colors block mx-auto"
            >
              Try a different email or create account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial Request Form State
  return (
    <div className="w-full space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-1.5">
        <img src="/logo.svg" alt="Tracklet Logo" className="w-10 h-10 mx-auto mb-2" />
        <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
          Reset password
        </h1>
        <p className="text-xs text-slate-500 font-sans max-w-xs mx-auto">
          Enter the email associated with your account to receive password reset instructions.
        </p>
      </div>

      {/* Global Auth Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2 animate-in fade-in"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('signup')}
            className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer ml-6"
          >
            Don't have an account? Create one
          </button>
        </div>
      )}

      {/* Password Reset Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
        <AuthTextField
          id="reset-email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          error={emailError || undefined}
          icon={Mail}
          disabled={isSubmitting}
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || resetCooldown > 0}
          aria-busy={isSubmitting}
          className="w-full h-[38px] flex items-center justify-center px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sending reset link...</span>
            </span>
          ) : resetCooldown > 0 ? (
            <span>Resend in {resetCooldown}s</span>
          ) : (
            <span>Send Password Reset Link</span>
          )}
        </button>
      </form>

      {/* Back to Sign In Link */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => onNavigate('signin')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  );
};
