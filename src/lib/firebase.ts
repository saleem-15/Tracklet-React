import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  applyActionCode,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut as firebaseSignOut,
  deleteUser,
  reload,
  updateProfile,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch, 
  serverTimestamp, 
  orderBy,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
// Check if Firebase environment variables are configured
export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'YOUR_API_KEY'
);

if (!isFirebaseConfigured) {
  console.warn(
    '[Tracklet] Firebase environment variables (VITE_FIREBASE_*) are not fully configured. Using fallback demo configuration for offline/guest mode.'
  );
}

const activeConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-tracklet.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-tracklet',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-tracklet.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:00000000000000',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

const app = !getApps().length ? initializeApp(activeConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with optional custom database ID and ignoreUndefinedProperties
const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  }, firestoreDatabaseId);
} catch (err) {
  console.warn('Firestore initialization with custom settings failed, falling back to getFirestore:', err);
  firestoreInstance = getFirestore(app, firestoreDatabaseId);
}
export const db = firestoreInstance;

export { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch, 
  serverTimestamp, 
  orderBy,
  arrayUnion,
  arrayRemove,
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  applyActionCode,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  deleteUser,
  reload,
  updateProfile,
  firebaseSignOut,
  onAuthStateChanged
};

export type { User };
