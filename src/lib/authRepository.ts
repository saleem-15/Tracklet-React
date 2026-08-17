import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  deleteUser as firebaseDeleteUser,
  reload as firebaseReload,
  firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from './firebase';
import { AuthUser, AuthProviderType } from '../types';
import { LOCAL_STORAGE_KEYS, EMAIL_VERIFICATION_COOLDOWN_SECONDS } from './constants';

export class AuthRepository {
  /**
   * Listen to Firebase auth state changes. Returns an unsubscribe function.
   */
  static onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return firebaseOnAuthStateChanged(auth, callback);
  }

  /**
   * Get currently active Firebase User.
   */
  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Map raw Firebase User object to sanitized AuthUser entity.
   */
  static mapToAuthUser(user: FirebaseUser | null): AuthUser | null {
    if (!user) return null;

    const providerId: AuthProviderType =
      user.providerData && user.providerData.length > 0
        ? (user.providerData[0].providerId as AuthProviderType)
        : 'password';

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
      photoURL: user.photoURL,
      providerId,
      emailVerified: user.emailVerified,
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
    };
  }

  /**
   * Sign in using Google OAuth Popup.
   */
  static async signInWithGoogle(): Promise<FirebaseUser> {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }

  /**
   * Sign in using Email & Password.
   */
  static async signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
    const trimmedEmail = email.trim();
    const result = await signInWithEmailAndPassword(auth, trimmedEmail, password);
    return result.user;
  }

  /**
   * Register a new account with Email & Password, automatically sending verification email.
   */
  static async signUpWithEmail(email: string, password: string): Promise<FirebaseUser> {
    const trimmedEmail = email.trim();
    const result = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    const user = result.user;

    try {
      await firebaseSendEmailVerification(user);
      try {
        const targetTime = Date.now() + EMAIL_VERIFICATION_COOLDOWN_SECONDS * 1000;
        localStorage.setItem(LOCAL_STORAGE_KEYS.EMAIL_RESEND_COOLDOWN, targetTime.toString());
      } catch {
        // Ignore localStorage error
      }
    } catch (verifErr) {
      console.warn('Auto email verification failed to dispatch on sign-up:', verifErr);
    }

    return user;
  }

  /**
   * Send or resend email verification to current user.
   */
  static async sendEmailVerification(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user currently signed in to receive verification email.');
    }
    await firebaseSendEmailVerification(user);
    try {
      const targetTime = Date.now() + EMAIL_VERIFICATION_COOLDOWN_SECONDS * 1000;
      localStorage.setItem(LOCAL_STORAGE_KEYS.EMAIL_RESEND_COOLDOWN, targetTime.toString());
    } catch {
      // Ignore localStorage error
    }
  }

  /**
   * Send password reset email using Firebase Auth.
   */
  static async sendPasswordReset(email: string): Promise<void> {
    const trimmedEmail = email.trim();
    await firebaseSendPasswordResetEmail(auth, trimmedEmail);
  }

  /**
   * Verify password reset code (oobCode) from email link and return the associated email.
   */
  static async verifyPasswordResetCode(code: string): Promise<string> {
    return await firebaseVerifyPasswordResetCode(auth, code);
  }

  /**
   * Confirm password reset with the code (oobCode) and apply the new password.
   */
  static async confirmPasswordReset(code: string, newPass: string): Promise<void> {
    await firebaseConfirmPasswordReset(auth, code, newPass);
  }

  /**
   * Reload current user to refresh tokens and emailVerified status.
   */
  static async reloadUser(): Promise<FirebaseUser | null> {
    const user = auth.currentUser;
    if (user) {
      await firebaseReload(user);
      return auth.currentUser;
    }
    return null;
  }

  /**
   * Sign out the active user.
   */
  static async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  /**
   * Delete current user account from Firebase Auth.
   */
  static async deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user currently signed in to delete.');
    }
    await firebaseDeleteUser(user);
  }
}
