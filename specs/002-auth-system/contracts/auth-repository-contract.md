# AuthRepository Interface Contract

**Location**: `src/lib/authRepository.ts`  
**Purpose**: Encapsulate all Firebase Authentication SDK operations away from UI components and Context.

```typescript
import { User as FirebaseUser } from 'firebase/auth';
import { AuthUser } from '../types';

export interface IAuthRepository {
  /**
   * Subscribe to auth state changes. Returns unsubscribe function.
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void;

  /**
   * Get the current authenticated Firebase user.
   */
  getCurrentUser(): FirebaseUser | null;

  /**
   * Convert a Firebase User into a clean AuthUser entity.
   */
  mapToAuthUser(user: FirebaseUser | null): AuthUser | null;

  /**
   * Sign in using Google OAuth Popup.
   */
  signInWithGoogle(): Promise<FirebaseUser>;

  /**
   * Sign in using Email and Password.
   */
  signInWithEmail(email: string, password: string): Promise<FirebaseUser>;

  /**
   * Create account using Email and Password, automatically dispatching email verification.
   */
  signUpWithEmail(email: string, password: string): Promise<FirebaseUser>;

  /**
   * Send email verification link to current user.
   */
  sendEmailVerification(): Promise<void>;

  /**
   * Send password reset email to the specified address.
   */
  sendPasswordReset(email: string): Promise<void>;

  /**
   * Reload the current user to refresh email verification and token state.
   */
  reloadUser(): Promise<FirebaseUser | null>;

  /**
   * Sign out the active user.
   */
  signOut(): Promise<void>;

  /**
   * Delete the active user account from Firebase Auth.
   */
  deleteAccount(): Promise<void>;
}
```
