import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { AuthRouteMode } from '../../lib/routeUtils';

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
  const [formValidation, setFormValidation] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidation(null);

    if (!email.trim()) {
      setFormValidation('Please enter your email address.');
      return;
    }

    if (resetCooldown > 0) return;

    await onSubmit(email.trim());
  };

  const activeError = formValidation || errorMessage;

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

      {/* Error Alert */}
      {activeError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2 animate-in fade-in"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{activeError}</span>
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

      {/* Reset Sent Success Banner */}
      {resetSent && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex flex-col gap-2 animate-in fade-in"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block text-blue-900">Check Your Inbox</span>
              <span className="text-slate-700 leading-relaxed block text-[11px]">
                If an account exists for <strong>{email}</strong>, a password reset link has been dispatched.
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Not receiving anything?</span>
            <button
              type="button"
              onClick={() => onNavigate('signup')}
              className="font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      )}

      {/* Password Reset Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Email Field */}
        <div className="space-y-1">
          <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700 cursor-pointer">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
              className="w-full pl-9 pr-3 h-[38px] border border-slate-200 bg-white rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans disabled:opacity-60"
            />
          </div>
        </div>

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
