import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { AuthRouteMode } from '../../lib/routeUtils';
import { AuthTextField } from './AuthTextField';

interface ResetPasswordViewProps {
  onNavigate: (mode: AuthRouteMode) => void;
  onVerifyCode: (code: string) => Promise<string>;
  onConfirmReset: (code: string, newPass: string) => Promise<void>;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  onNavigate,
  onVerifyCode,
  onConfirmReset,
  onShowToast,
}) => {
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState<string | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(true);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [resetSuccess, setResetSuccess] = useState(false);

  // Extract oobCode from URL query parameters (e.g. ?oobCode=... or ?mode=resetPassword&oobCode=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('oobCode');

    if (!code) {
      setCodeError('Missing or invalid password reset code. Please request a new link.');
      setIsValidatingCode(false);
      return;
    }

    setOobCode(code);

    // Verify code with Firebase Auth
    onVerifyCode(code)
      .then((email) => {
        setTargetEmail(email);
        setIsValidatingCode(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'This password reset link is invalid or has expired.';
        setCodeError(msg);
        setIsValidatingCode(false);
      });
  }, [onVerifyCode]);

  const validate = () => {
    const nextErrors: { password?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      nextErrors.password = 'New password is required.';
    } else if (newPassword.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode || !validate()) return;

    setIsSubmitting(true);
    try {
      await onConfirmReset(oobCode, newPassword);
      setResetSuccess(true);
      onShowToast?.('success', 'Password Updated', 'Your password has been changed successfully. You can now sign in.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password. Link may have expired.';
      setCodeError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Validating Code Loading State
  if (isValidatingCode) {
    return (
      <div className="w-full text-center space-y-4 py-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto shadow-2xs">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900">Verifying reset link...</h2>
          <p className="text-xs text-slate-500 font-sans">Connecting to your security credentials</p>
        </div>
      </div>
    );
  }

  // 2. Success State
  if (resetSuccess) {
    return (
      <div className="w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
            Password updated!
          </h1>
          <p className="text-xs text-slate-600 font-sans max-w-xs mx-auto">
            Your account credentials have been successfully updated. You can now sign in with your new password.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('signin')}
          className="w-full h-[38px] flex items-center justify-center px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs shadow-blue-500/20 transition-all cursor-pointer mt-2"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  // 3. Invalid or Expired Code Error State
  if (codeError) {
    return (
      <div className="w-full space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
            Reset link expired
          </h1>
          <p className="text-xs text-rose-700/90 font-sans max-w-xs mx-auto leading-relaxed">
            {codeError}
          </p>
        </div>
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('forgot-password')}
            className="w-full h-[38px] flex items-center justify-center px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            Request New Reset Link
          </button>
          <button
            type="button"
            onClick={() => onNavigate('signin')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer block mx-auto pt-1"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // 4. Form to Set New Password
  return (
    <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Brand Header */}
      <div className="text-center space-y-1.5">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto mb-2 shadow-2xs">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">
          Set new password
        </h1>
        <p className="text-xs text-slate-500 font-sans max-w-xs mx-auto">
          {targetEmail ? (
            <>
              Create a new secure password for <strong className="text-slate-800 font-semibold">{targetEmail}</strong>.
            </>
          ) : (
            'Choose a strong password with at least 6 characters.'
          )}
        </p>
      </div>

      {/* Set New Password Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
        <AuthTextField
          id="new-password"
          label="New Password"
          isPassword
          placeholder="••••••••"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={formErrors.password}
          icon={Lock}
          disabled={isSubmitting}
        />

        <AuthTextField
          id="confirm-new-password"
          label="Confirm New Password"
          isPassword
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (formErrors.confirmPassword) setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          error={formErrors.confirmPassword}
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
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Updating password...</span>
            </span>
          ) : (
            <span>Save New Password</span>
          )}
        </button>
      </form>

      {/* Footer link */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => onNavigate('signin')}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer transition-colors"
        >
          Cancel & Back to Sign In
        </button>
      </div>
    </div>
  );
};
