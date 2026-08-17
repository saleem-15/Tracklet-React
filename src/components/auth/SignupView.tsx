import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { AuthRouteMode } from '../../lib/routeUtils';

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
  const [showPassword, setShowPassword] = useState(false);
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
          <span className="bg-slate-50 px-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest relative shrink-0 font-medium">
            OR WITH EMAIL
          </span>
          <div className="border-t border-slate-200 w-full" />
        </div>

        {/* Email & Password Registration Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          {/* Email Field */}
          <div className="space-y-1">
            <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700 cursor-pointer">
              Email Address
            </label>
            <div className="relative">
              <Mail className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                errors.email ? 'text-rose-500' : 'text-slate-400'
              }`} />
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                disabled={isSubmitting}
                className={`w-full pl-9 pr-3 h-[38px] border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all font-sans disabled:opacity-60 ${
                  errors.email
                    ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                    : 'border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1 pt-0.5 animate-in fade-in">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700 cursor-pointer">
              Password
            </label>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                errors.password ? 'text-rose-500' : 'text-slate-400'
              }`} />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="At least 6 characters"
                disabled={isSubmitting}
                className={`w-full pl-9 pr-10 h-[38px] border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all font-sans disabled:opacity-60 ${
                  errors.password
                    ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                    : 'border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
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
            {errors.password && (
              <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1 pt-0.5 animate-in fade-in">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.password}</span>
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1">
            <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-slate-700 cursor-pointer">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
                errors.confirmPassword ? 'text-rose-500' : 'text-slate-400'
              }`} />
              <input
                id="signup-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                placeholder="Re-type your password"
                disabled={isSubmitting}
                className={`w-full pl-9 pr-3 h-[38px] border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all font-sans disabled:opacity-60 ${
                  errors.confirmPassword
                    ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                    : 'border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1 pt-0.5 animate-in fade-in">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.confirmPassword}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full h-[38px] flex items-center justify-center px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
