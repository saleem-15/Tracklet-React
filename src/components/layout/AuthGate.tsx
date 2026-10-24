import { useState, useEffect, type ReactNode } from 'react';
import { EmailVerificationGate } from '../EmailVerificationGate';
import { AuthScreen } from '../AuthScreen';
import { ToastContainer } from '../Toast';
import { PrivacyPolicyPage } from '../legal/PrivacyPolicyPage';
import { TermsOfServicePage } from '../legal/TermsOfServicePage';
import { useAuth } from '../../context/AuthContext';
import { useToastContext } from '../../context/ToastContext';
import { isPrivacyPath, isTermsPath, navigateToRoute } from '../../lib/routeUtils';

export interface AuthGateProps {
  onReloadData: () => Promise<void>;
  children: ReactNode;
}

/**
 * AuthGate
 *
 * Authentication gating wrapper that intercepts rendering when the user
 * is in an unauthenticated or unverified state:
 *
 * 1. Public Legal & Trust Pages (/privacy, /terms, /legal) → LegalView reader (unconditionally accessible)
 * 2. Auth loading → branded loading spinner
 * 3. Authenticated but email unverified → EmailVerificationGate
 * 4. No user → AuthScreen wall
 * 5. Otherwise → renders children (the full workspace)
 *
 * AuthGate consumes user, authLoading, and toast notifications
 * directly from feature context providers.
 */
export function AuthGate({
  onReloadData,
  children,
}: AuthGateProps) {
  const { user, loading: authLoading } = useAuth();
  const { toasts, addToast, dismissToast } = useToastContext();
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  // Synchronize route changes on popstate
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Dedicated Public Legal & Trust Pages (bypasses auth loading, unverified, and login wall)
  if (isPrivacyPath(currentPath)) {
    return (
      <PrivacyPolicyPage
        onNavigateHome={() => {
          const destination = user ? '/applications' : '/login';
          navigateToRoute(destination);
        }}
      />
    );
  }

  if (isTermsPath(currentPath)) {
    return (
      <TermsOfServicePage
        onNavigateHome={() => {
          const destination = user ? '/applications' : '/login';
          navigateToRoute(destination);
        }}
      />
    );
  }

  // 2. Auth state is still loading
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

  // 3. Authenticated with email but unverified
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

  // 4. Not authenticated (Authentication Wall)
  if (!user) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 font-sans">
        <AuthScreen
          onShowToast={addToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // 5. Authenticated — render workspace
  return <>{children}</>;
}
