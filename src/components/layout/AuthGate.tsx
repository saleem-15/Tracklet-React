import { type ReactNode } from 'react';
import { EmailVerificationGate } from '../EmailVerificationGate';
import { AuthScreen } from '../AuthScreen';
import { ToastContainer } from '../Toast';
import { useAuth } from '../../context/AuthContext';
import { useToastContext } from '../../context/ToastContext';

export interface AuthGateProps {
  isGuestMode: boolean;
  onContinueAsGuest: () => void;
  onReloadData: () => Promise<void>;
  children: ReactNode;
}

/**
 * AuthGate
 *
 * Authentication gating wrapper that intercepts rendering when the user
 * is in an unauthenticated or unverified state:
 *
 * 1. Auth loading → branded loading spinner
 * 2. Authenticated but email unverified → EmailVerificationGate
 * 3. No user and no guest mode → AuthScreen wall
 * 4. Otherwise → renders children (the full workspace)
 *
 * In Phase 3, AuthGate consumes user, authLoading, and toast notifications
 * directly from feature context providers.
 */
export function AuthGate({
  isGuestMode,
  onContinueAsGuest,
  onReloadData,
  children,
}: AuthGateProps) {
  const { user, loading: authLoading } = useAuth();
  const { toasts, addToast, dismissToast } = useToastContext();
  // Auth state is still loading
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 font-sans text-xs text-slate-500 select-none">
        <div className="flex flex-col items-center gap-3 p-8 bg-white border border-slate-200/90 rounded-2xl shadow-xs animate-in fade-in duration-200 motion-reduce:animate-none">
          <img src="/logo.svg" alt="Tracklet Logo" className="w-10 h-10 animate-pulse motion-reduce:animate-none" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-heading font-bold text-slate-900 text-sm tracking-tight">Tracklet</span>
            <span className="font-mono text-[11px] text-slate-500">Loading workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated with email but unverified
  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 font-sans">
        <EmailVerificationGate
          onVerified={onReloadData}
          onShowToast={addToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Not authenticated and has not chosen guest mode (Authentication Wall)
  if (!user && !isGuestMode) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 font-sans">
        <AuthScreen
          onShowToast={addToast}
          onContinueAsGuest={onContinueAsGuest}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Authenticated (or guest mode) — render workspace
  return <>{children}</>;
}
