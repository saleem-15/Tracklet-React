# AuthContext Interface Contract

**Location**: `src/context/AuthContext.tsx`  
**Purpose**: Centralized authentication provider contract for Tracklet React components.

```typescript
import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { AuthUser, AuthViewMode } from '../types';

export interface AuthContextType {
  // Current user state (null if unauthenticated guest)
  user: FirebaseUser | null;
  authUser: AuthUser | null;
  loading: boolean;
  error: string | null;

  // Authentication actions
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  checkEmailVerified: () => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;

  // Dialog management
  isAuthModalOpen: boolean;
  authModalMode: AuthViewMode;
  openAuthModal: (mode?: AuthViewMode) => void;
  closeAuthModal: () => void;
}

export declare const useAuth: () => AuthContextType;
export declare const AuthProvider: React.FC<{ children: React.ReactNode }>;
```
