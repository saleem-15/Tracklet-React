/**
 * Firebase Web Client Configuration
 *
 * In client-side web and mobile architectures (React, Flutter, Android, iOS),
 * Firebase client options (apiKey, projectId, appId) are public application
 * identifiers bundled into the client runtime.
 *
 * Security is enforced via:
 * 1. Firebase Auth ID tokens (JWT)
 * 2. Firestore Security Rules (firestore.rules)
 * 3. Firebase Cloud Storage Security Rules
 * 4. Firebase Authentication Authorized Domains allowlist
 *
 * Environment variables (VITE_FIREBASE_*) act as optional overrides (e.g. for
 * staging/testing projects or local emulator setups).
 */

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  databaseId?: string;
}

/**
 * Canonical default Tracklet Cloud SaaS Firebase Web Client configuration.
 */
export const DEFAULT_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: 'AIzaSyB8_w86FtF-uWWIofxRYODc2URCibEXY5U',
  authDomain: 'tracklet-e3409.firebaseapp.com',
  projectId: 'tracklet-e3409',
  storageBucket: 'tracklet-e3409.firebasestorage.app',
  messagingSenderId: '778531535407',
  appId: '1:778531535407:web:37dc94ef142454b0d0e4da',
  measurementId: 'G-0N13KT5HRG',
};

/**
 * Active client configuration with optional environment variable overrides.
 */
export const FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId,
  databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined,
};

/**
 * Returns true if valid Firebase configuration is active.
 */
export const isFirebaseConfigured = Boolean(
  FIREBASE_CONFIG.apiKey &&
  FIREBASE_CONFIG.projectId &&
  FIREBASE_CONFIG.appId &&
  FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY'
);
