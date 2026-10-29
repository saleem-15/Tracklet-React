import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  LogOut, 
  KeyRound, 
  Clock
} from 'lucide-react';
import { SettingsCard } from '../SettingsCard';
import { AccountDataPortabilityCard } from './account/AccountDataPortabilityCard';
import { useAuth } from '../../../context/AuthContext';
import { useToastContext } from '../../../context/ToastContext';
import { DeleteAccountModal } from '../../account/DeleteAccountModal';

export interface AccountProfilePaneProps {
  handleAccountDeleted?: () => Promise<void>;
}

const VERIF_COOLDOWN_KEY = 'tracklet_verif_email_cooldown';

/**
 * AccountProfilePane
 *
 * Dedicated section for user identity, authentication credentials, and account lifecycle.
 * - Displays user identity with clean avatar/name/email (no clutter badges)
 * - Password reset & Sign out actions
 * - Calm-at-rest Danger Zone for full cloud data wipe & account deletion
 */
export const AccountProfilePane: React.FC<AccountProfilePaneProps> = ({
  handleAccountDeleted,
}) => {
  const { user, sendEmailVerification, reloadUserVerification, sendPasswordReset, signOut, deleteAccount } = useAuth();
  const { addToast } = useToastContext();

  const [isSendingVerif, setIsSendingVerif] = useState(false);
  const [isCheckingVerif, setIsCheckingVerif] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check email verification cooldown
  const [cooldown, setCooldown] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(VERIF_COOLDOWN_KEY);
      if (stored) {
        const remaining = Math.ceil((parseInt(stored, 10) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
    } catch {
      // Ignore
    }
    return 0;
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Please sign in to view and manage account settings.
      </div>
    );
  }

  const authUser = user.providerData?.[0];
  const isPasswordProvider = authUser?.providerId === 'password';

  const handlePasswordReset = async () => {
    if (!user.email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordReset(user.email);
      addToast('success', 'Reset Email Dispatched', `Password reset instructions sent to ${user.email}`);
    } catch {
      addToast('error', 'Reset Failed', 'Could not send password reset email. Please try again later.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResendVerification = async () => {
    setIsSendingVerif(true);
    try {
      await sendEmailVerification();
      const expiresAt = Date.now() + 60 * 1000;
      localStorage.setItem(VERIF_COOLDOWN_KEY, String(expiresAt));
      setCooldown(60);
      addToast('success', 'Verification Sent', 'Please check your inbox and spam folder.');
    } catch {
      addToast('error', 'Send Failed', 'Could not dispatch verification email.');
    } finally {
      setIsSendingVerif(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsCheckingVerif(true);
    try {
      const verified = await reloadUserVerification();
      if (verified) {
        addToast('success', 'Verified!', 'Your email address is confirmed.');
      } else {
        addToast('warning', 'Not Verified Yet', 'Please click the link in your email first.');
      }
    } catch {
      addToast('error', 'Check Failed', 'Could not refresh verification status.');
    } finally {
      setIsCheckingVerif(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (handleAccountDeleted) {
        await handleAccountDeleted();
      }
      await deleteAccount();
      setIsDeleteModalOpen(false);
      addToast('info', 'Account Deleted', 'Your account and personal cloud data have been removed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account.';
      addToast('error', 'Deletion Failed', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-0">
      {/* ── 1. Candidate Identity & Credentials ── */}
      <SettingsCard
        title={
          <span className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User avatar'}
                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </span>
            )}
            <span className="flex flex-col min-w-0">
              <span className="block truncate">
                {user.displayName || user.email || 'Candidate Account'}
              </span>
              {user.email && user.displayName && (
                <span className="block truncate text-xs font-normal text-slate-500 font-mono">
                  {user.email}
                </span>
              )}
            </span>
          </span>
        }
      >
        {/* Unverified Email Warning Banner */}
        {!user.emailVerified && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
              <Mail className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Verify your email to activate full cloud sync and account features.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isSendingVerif || cooldown > 0}
                className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {cooldown > 0 && <Clock className="w-3 h-3 text-amber-600 animate-pulse" />}
                <span>{cooldown > 0 ? `Resend in ${cooldown}s` : isSendingVerif ? 'Sending...' : 'Resend Link'}</span>
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

        {/* Security Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {isPasswordProvider && (
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isSendingReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs hover:shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-500" />
              <span>{isSendingReset ? 'Sending...' : 'Reset Password'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => signOut()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs hover:shadow-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </SettingsCard>

      {/* ── 2. Workspace Data Portability & Backups ── */}
      <AccountDataPortabilityCard />

      {/* ── 3. Danger Zone (Safely Bounded Warning Container) ── */}
      <h3 className="font-heading font-bold text-base sm:text-lg text-rose-950 tracking-tight mt-6">
        Danger Zone
      </h3>
      <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Delete Account & Wipe Cloud Data</h4>
          <p className="text-xs text-slate-500 mt-0.5 max-w-md">
            Permanently purge all job applications, history timeline records, and delete your Firebase account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-rose-200 bg-white text-rose-700 hover:text-rose-800 hover:border-rose-300 hover:bg-rose-50 transition-colors shadow-2xs cursor-pointer shrink-0"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <DeleteAccountModal
          isOpen={isDeleteModalOpen}
          isDeleting={isDeleting}
          onConfirmDelete={handleConfirmDelete}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      )}
    </div>
  );
};
