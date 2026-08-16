import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  ShieldCheck, 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Key, 
  LogOut,
  RefreshCw,
  X,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LOCAL_STORAGE_KEYS, EMAIL_VERIFICATION_COOLDOWN_SECONDS } from '../lib/constants';

interface AccountSettingsCardProps {
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  onAccountDeleted?: () => void;
}

export const AccountSettingsCard: React.FC<AccountSettingsCardProps> = ({
  onShowToast,
  onAccountDeleted,
}) => {
  const { 
    user, 
    authUser, 
    signOut, 
    sendPasswordReset, 
    sendEmailVerification, 
    reloadUserVerification,
    deleteAccount,
    openAuthModal
  } = useAuth();

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCheckingVerif, setIsCheckingVerif] = useState(false);
  const [isSendingVerif, setIsSendingVerif] = useState(false);

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

  if (!user) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Guest Session</h3>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                You are currently exploring Tracklet in offline guest mode. Data is stored in this browser only.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('signin')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  const isPasswordProvider = authUser?.providerId === 'password';

  const handlePasswordReset = async () => {
    if (!user.email) return;
    try {
      await sendPasswordReset(user.email);
      onShowToast?.('success', 'Reset Link Sent', `Password reset instructions sent to ${user.email}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset email.';
      onShowToast?.('error', 'Reset Error', msg);
    }
  };

  const handleResendVerification = async () => {
    if (cooldown > 0 || isSendingVerif) return;
    setIsSendingVerif(true);
    try {
      await sendEmailVerification();
      const targetTime = Date.now() + EMAIL_VERIFICATION_COOLDOWN_SECONDS * 1000;
      localStorage.setItem(LOCAL_STORAGE_KEYS.EMAIL_RESEND_COOLDOWN, targetTime.toString());
      setCooldown(EMAIL_VERIFICATION_COOLDOWN_SECONDS);
      onShowToast?.('success', 'Verification Link Sent', `Sent a new link to ${user.email}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send verification email.';
      onShowToast?.('error', 'Verification Error', msg);
    } finally {
      setIsSendingVerif(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsCheckingVerif(true);
    try {
      const verified = await reloadUserVerification();
      if (verified) {
        onShowToast?.('success', 'Verified!', 'Your email address is confirmed.');
      } else {
        onShowToast?.('warning', 'Not Verified Yet', 'Please click the link in your email first.');
      }
    } catch {
      onShowToast?.('error', 'Check Failed', 'Could not refresh verification status.');
    } finally {
      setIsCheckingVerif(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmationInput !== 'DELETE') return;
    setIsDeleting(true);
    try {
      if (onAccountDeleted) {
        await onAccountDeleted();
      }
      await deleteAccount();
      setIsDeleteModalOpen(false);
      onShowToast?.('info', 'Account Deleted', 'Your account and personal cloud data have been permanently removed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account.';
      onShowToast?.('error', 'Deletion Failed', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-12 h-12 rounded-2xl border border-slate-200 shrink-0 shadow-2xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs font-bold text-base">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {user.displayName || (user.email ? user.email.split('@')[0] : 'User')}
                </h3>
                <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold border border-slate-200">
                  {isPasswordProvider ? 'Email & Password' : 'Google OAuth'}
                </span>
              </div>
              <p className="font-mono text-xs text-slate-500">{user.email}</p>
            </div>
          </div>

          {/* Verification Badge */}
          <div>
            {user.emailVerified ? (
              <div className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 font-mono text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Unverified</span>
              </div>
            )}
          </div>
        </div>

        {/* Verification Alert if unverified */}
        {!user.emailVerified && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
              <Mail className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Your email is not verified yet. Check your inbox to activate full account features.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isSendingVerif || cooldown > 0}
                className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {cooldown > 0 && <Clock className="w-3 h-3 text-amber-600 animate-pulse" />}
                <span>
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : isSendingVerif
                    ? 'Sending...'
                    : 'Resend Link'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={isCheckingVerif}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                {isCheckingVerif ? 'Checking...' : "I've Verified"}
              </button>
            </div>
          </div>
        )}

        {/* Account Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {isPasswordProvider && (
            <button
              type="button"
              onClick={handlePasswordReset}
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                <Key className="w-4 h-4 text-slate-500" />
                <span>Send Password Reset Email</span>
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={signOut}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Sign Out of Tracklet</span>
            </div>
          </button>
        </div>

        {/* Danger Zone: GDPR Account Deletion */}
        <div className="pt-4 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Delete Account & Wipe Cloud Data</span>
              </div>
              <p className="text-[11px] text-rose-700/90 font-sans">
                Permanently purge all job applications, history timeline records, and delete your Firebase account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Destructive Deletion Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-rose-200 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Confirm Permanent Deletion</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action is <strong>irreversible</strong>. All your tracked job applications, interview history logs, and cloud credentials will be immediately purged.
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-mono text-slate-700 font-semibold">
                Type <span className="text-rose-600 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmationInput !== 'DELETE' || isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
