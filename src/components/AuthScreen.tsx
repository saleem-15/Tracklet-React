import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { getFriendlyAuthErrorMessage } from '../lib/authErrors';
import { getAuthModeFromPath, getPathForAuthMode, AuthRouteMode, navigateToRoute } from '../lib/routeUtils';
import { LEGAL_CONFIG } from '../lib/constants';
import { LoginView } from './auth/LoginView';
import { SignupView } from './auth/SignupView';
import { ForgotPasswordView } from './auth/ForgotPasswordView';
import { ResetPasswordView } from './auth/ResetPasswordView';

interface AuthScreenProps {
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onShowToast,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    verifyPasswordResetCode,
    confirmPasswordReset,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<AuthRouteMode>(() => getAuthModeFromPath(window.location.pathname));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  // Cooldown countdown for password reset
  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  // Sync initial URL on mount if at non-standard or alias path
  useEffect(() => {
    const targetPath = getPathForAuthMode(mode);
    const pathname = window.location.pathname;
    if (
      pathname !== targetPath &&
      (pathname === '/login' ||
        pathname === '/signin' ||
        pathname === '/signup' ||
        pathname === '/register' ||
        pathname === '/forgot-password' ||
        pathname === '/reset-password')
    ) {
      window.history.replaceState(null, '', targetPath + window.location.search);
    }
  }, [mode]);

  // Listen to popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const pathMode = getAuthModeFromPath(window.location.pathname);
      setMode(pathMode);
      setLocalError(null);
      setResetSent(false);
      clearError();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [clearError]);

  const handleNavigate = (newMode: AuthRouteMode) => {
    setMode(newMode);
    setLocalError(null);
    setResetSent(false);
    clearError();
    const targetPath = getPathForAuthMode(newMode);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      onShowToast?.('success', 'Signed In', 'Welcome to Tracklet!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : getFriendlyAuthErrorMessage(err);
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (email: string, pass: string) => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signInWithEmail(email, pass);
      onShowToast?.('success', 'Welcome Back', 'Successfully signed in to Tracklet.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : getFriendlyAuthErrorMessage(err);
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (email: string, pass: string) => {
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await signUpWithEmail(email, pass);
      onShowToast?.(
        'info',
        'Account Created',
        'A verification link has been sent to your email. Please verify to access your workspace.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : getFriendlyAuthErrorMessage(err);
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (email: string) => {
    if (resetCooldown > 0) return;
    setLocalError(null);
    setIsSubmitting(true);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
      setResetCooldown(60);
      onShowToast?.(
        'info',
        'Instructions Dispatched',
        `If an account exists for ${email}, reset instructions were sent.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : getFriendlyAuthErrorMessage(err);
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 sm:px-6 bg-slate-50 text-slate-900 select-none font-sans">
      <div className="w-full max-w-[380px] py-10 flex flex-col justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'signin' && (
            <motion.div
              key="signin"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
              className="w-full"
            >
              <LoginView
                onNavigate={handleNavigate}
                onSubmit={handleLoginSubmit}
                onGoogleSignIn={handleGoogleSignIn}
                isSubmitting={isSubmitting}
                errorMessage={localError}
              />
            </motion.div>
          )}

          {mode === 'signup' && (
            <motion.div
              key="signup"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
              className="w-full"
            >
              <SignupView
                onNavigate={handleNavigate}
                onSubmit={handleSignupSubmit}
                onGoogleSignIn={handleGoogleSignIn}
                isSubmitting={isSubmitting}
                errorMessage={localError}
              />
            </motion.div>
          )}

          {mode === 'forgot-password' && (
            <motion.div
              key="forgot-password"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
              className="w-full"
            >
              <ForgotPasswordView
                onNavigate={handleNavigate}
                onSubmit={handleResetSubmit}
                isSubmitting={isSubmitting}
                errorMessage={localError}
                resetSent={resetSent}
                resetCooldown={resetCooldown}
              />
            </motion.div>
          )}

          {mode === 'reset-password' && (
            <motion.div
              key="reset-password"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
              className="w-full"
            >
              <ResetPasswordView
                onNavigate={handleNavigate}
                onVerifyCode={verifyPasswordResetCode}
                onConfirmReset={confirmPasswordReset}
                onShowToast={onShowToast}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Legal & Trust Footer Links */}
        <div className="pt-8 text-center text-[11px] text-slate-500 flex items-center justify-center gap-3">
          <a
            href="/privacy"
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                navigateToRoute('/privacy');
              }
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-800 transition-colors"
          >
            Privacy Policy
          </a>
          <span>•</span>
          <a
            href="/terms"
            onClick={(e) => {
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                navigateToRoute('/terms');
              }
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-800 transition-colors"
          >
            Terms of Service
          </a>
          <span>•</span>
          <a
            href={`mailto:${LEGAL_CONFIG.SUPPORT_EMAIL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-800 transition-colors"
          >
            Support
          </a>
        </div>
      </div>
    </div>
  );
};
