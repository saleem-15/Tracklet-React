import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { AuthRouteMode } from '../../lib/routeUtils';
import { AuthTextField } from './AuthTextField';

interface SignupViewProps {
  onNavigate: (mode: AuthRouteMode) => void;
  onSubmit: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onContinueAsGuest?: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export const SignupView: React.FC<SignupViewProps> = ({
  onNavigate,
  onSubmit,
  onGoogleSignIn,
  onContinueAsGuest,
  isSubmitting,
  errorMessage,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  const validate = () => {
    const nextErrors: { email?: string; password?: string; confirmPassword?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(email.trim(), password);
  };

  return (
    <div className="w-full space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-1.5">
        <img src="/logo.svg" alt="Tracklet Logo" className="w-10 h-10 mx-auto mb-2" />
        <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
          Create an account
        </h1>
        <p className="text-xs text-slate-500 font-sans max-w-xs mx-auto">
          Start tracking your job search with seamless cloud synchronization.
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
            onClick={() => onNavigate('signin')}
            className="self-start text-[11px] font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 cursor-pointer ml-6"
          >
            Already registered? Sign in here
          </button>
        </div>
      )}

      {/* Primary Google OAuth Action */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={isSubmitting}
          className="w-full h-[38px] flex items-center justify-center gap-2.5 px-4 rounded-xl bg-white hover:bg-slate-100/80 active:scale-[0.99] text-slate-800 font-semibold text-xs border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-60"
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
          <span>Sign up with Google</span>
        </button>

        {/* Crisp OR Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-slate-50 px-3 text-[11px] font-mono text-slate-500 uppercase tracking-widest relative shrink-0 font-medium">
            OR WITH EMAIL
          </span>
          <div className="border-t border-slate-200 w-full" />
        </div>

        {/* Email & Password Registration Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          <AuthTextField
            id="signup-email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={errors.email}
            icon={Mail}
            disabled={isSubmitting}
          />

          <AuthTextField
            id="signup-password"
            label="Password"
            isPassword
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={errors.password}
            icon={Lock}
            disabled={isSubmitting}
          />

          <AuthTextField
            id="signup-confirm-password"
            label="Confirm Password"
            isPassword
            placeholder="Re-type your password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            error={errors.confirmPassword}
            icon={Lock}
            disabled={isSubmitting}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full h-[38px] flex items-center justify-center px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
                <span>Creating account...</span>
              </span>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>
      </div>

      {/* Footer Navigation Switcher & Guest Option */}
      <div className="pt-2 text-center space-y-2">
        <p className="text-xs text-slate-600 font-sans">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('signin')}
            className="font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 cursor-pointer ml-0.5"
          >
            Sign in
          </button>
        </p>

        {onContinueAsGuest && (
          <p className="text-[11px] text-slate-500 font-sans">
            Want to explore first?{' '}
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2 cursor-pointer transition-colors"
            >
              Continue as guest →
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
