import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { AuthRepository } from '../lib/authRepository';
import { ApplicationRepository } from '../lib/applicationRepository';
import { AuthUser, AuthViewMode } from '../types';
import { getFriendlyAuthErrorMessage } from '../lib/authErrors';

export interface AuthContextType {
  user: FirebaseUser | null;
  authUser: AuthUser | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;

  // Dialog Controls
  isAuthModalOpen: boolean;
  authModalMode: AuthViewMode;
  openAuthModal: (mode?: AuthViewMode) => void;
  closeAuthModal: () => void;

  // Auth Operations
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  applyActionCode: (code: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  verifyPasswordResetCode: (code: string) => Promise<string>;
  confirmPasswordReset: (code: string, newPass: string) => Promise<void>;
  reloadUserVerification: () => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthViewMode>('signin');

  const clearError = useCallback(() => setError(null), []);

  const openAuthModal = useCallback((mode: AuthViewMode = 'signin') => {
    setAuthModalMode(mode);
    setError(null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setError(null);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = AuthRepository.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        // If not verified and password provider, try a silent reload to get latest status
        if (!currentUser.emailVerified && currentUser.providerData[0]?.providerId === 'password') {
          try {
            await AuthRepository.reloadUser();
            currentUser = AuthRepository.getCurrentUser();
          } catch {
            // Ignore reload errors during initialization
          }
        }
        setUser(currentUser);
        setAuthUser(AuthRepository.mapToAuthUser(currentUser));
      } else {
        setUser(null);
        setAuthUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const loggedUser = await AuthRepository.signInWithGoogle();
      setUser(loggedUser);
      setAuthUser(AuthRepository.mapToAuthUser(loggedUser));
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    setError(null);
    try {
      const loggedUser = await AuthRepository.signInWithEmail(email, pass);
      setUser(loggedUser);
      setAuthUser(AuthRepository.mapToAuthUser(loggedUser));
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string) => {
    setError(null);
    try {
      const registeredUser = await AuthRepository.signUpWithEmail(email, pass);
      setUser(registeredUser);
      setAuthUser(AuthRepository.mapToAuthUser(registeredUser));
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  const sendEmailVerification = useCallback(async () => {
    setError(null);
    try {
      await AuthRepository.sendEmailVerification();
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  const applyActionCode = useCallback(async (code: string) => {
    setError(null);
    try {
      await AuthRepository.applyActionCode(code);
      const reloaded = await AuthRepository.reloadUser();
      if (reloaded) {
        setUser(reloaded);
        setAuthUser(AuthRepository.mapToAuthUser(reloaded));
      }
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    setError(null);
    try {
      await AuthRepository.sendPasswordReset(email);
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  const verifyPasswordResetCode = useCallback(async (code: string) => {
    setError(null);
    try {
      return await AuthRepository.verifyPasswordResetCode(code);
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  const confirmPasswordReset = useCallback(async (code: string, newPass: string) => {
    setError(null);
    try {
      await AuthRepository.confirmPasswordReset(code, newPass);
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  const reloadUserVerification = useCallback(async (): Promise<boolean> => {
    try {
      const reloadedUser = await AuthRepository.reloadUser();
      if (reloadedUser) {
        setUser(reloadedUser);
        setAuthUser(AuthRepository.mapToAuthUser(reloadedUser));
        return reloadedUser.emailVerified;
      }
      return false;
    } catch (err) {
      console.warn('Failed to reload user verification:', err);
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await AuthRepository.signOut();
      setUser(null);
      setAuthUser(null);
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    setError(null);
    try {
      if (user?.uid) {
        await ApplicationRepository.purgeUserData(user.uid);
      }
      await AuthRepository.deleteAccount();
      setUser(null);
      setAuthUser(null);
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  }, [user?.uid]);

  const value: AuthContextType = {
    user,
    authUser,
    loading,
    error,
    clearError,
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendEmailVerification,
    applyActionCode,
    sendPasswordReset,
    verifyPasswordResetCode,
    confirmPasswordReset,
    reloadUserVerification,
    signOut,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
