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
  runTransaction,
  serverTimestamp, 
  orderBy,
  arrayUnion,
  arrayRemove,
  deleteField
} from 'firebase/firestore';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config/firebase.config';

const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with optional custom database ID and ignoreUndefinedProperties
const firestoreDatabaseId = FIREBASE_CONFIG.databaseId;

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
  isFirebaseConfigured,
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
  runTransaction,
  serverTimestamp, 
  orderBy,
  arrayUnion,
  arrayRemove,
  deleteField,
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
