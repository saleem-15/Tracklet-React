import { useState, useCallback, useEffect, useRef } from 'react';
import { ExpiryNotificationSettings } from '../types';
import { loadExpirySettings, saveExpirySettings } from '../lib/expiryUtils';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';

export interface UseExpirySettingsReturn {
  expirySettings: ExpiryNotificationSettings;
  updateExpirySettings: (newSettings: ExpiryNotificationSettings) => void;
  isLoading: boolean;
}

/**
 * useExpirySettings
 *
 * Domain hook encapsulating user expiry notification preferences.
 * Adheres to Constitution Principle I (Cloud-First, User-Scoped Persistence):
 * - Loads persisted settings from local cache immediately (zero-flicker UI)
 * - Automatically synchronizes with Cloud Firestore (`users/{userId}/preferences/settings`)
 * - Persists updates optimistically with background cloud sync
 */
export function useExpirySettings(): UseExpirySettingsReturn {
  const { user } = useAuth();
  const { addToast } = useToastContext();
  const userId = user?.uid;

  const [expirySettings, setExpirySettings] = useState<ExpiryNotificationSettings>(() => loadExpirySettings(userId));
  const [isLoading, setIsLoading] = useState(false);

  // Increments whenever a local edit lands while a cloud fetch is in flight,
  // so a stale Firestore snapshot cannot overwrite newer local state.
  const localUpdateSeqRef = useRef(0);
  // Last locally-consistent settings value, used to roll back failed cloud writes.
  const expirySettingsRef = useRef(expirySettings);

  // Sync from Cloud Firestore whenever user auth session initializes or changes
  useEffect(() => {
    if (!userId) {
      const local = loadExpirySettings();
      expirySettingsRef.current = local;
      setExpirySettings(local);
      return;
    }

    let isMounted = true;
    // Immediately replace the previous account's settings with the new user's
    // scoped cached settings (or defaults) so a missing or slow cloud document
    // cannot leave another account's preferences visible in the UI.
    const scopedLocal = loadExpirySettings(userId);
    expirySettingsRef.current = scopedLocal;
    setExpirySettings(scopedLocal);
    setIsLoading(true);

    const localUpdateSeq = localUpdateSeqRef.current;
    const docRef = doc(db, 'users', userId, 'preferences', 'settings');
    getDoc(docRef)
      .then((docSnap) => {
        if (!isMounted) return;
        // A local edit occurred since this request started: ignore the stale
        // cloud snapshot. The newer local state is already persisted to the
        // scoped cache and queued for cloud sync.
        if (localUpdateSeq !== localUpdateSeqRef.current) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.expirySettings) {
            const cloudSettings: ExpiryNotificationSettings = {
              enabled: typeof data.expirySettings.enabled === 'boolean' ? data.expirySettings.enabled : true,
              expiryThresholdHours: typeof data.expirySettings.expiryThresholdHours === 'number' ? data.expirySettings.expiryThresholdHours : 48,
            };
            setExpirySettings(cloudSettings);
            expirySettingsRef.current = cloudSettings;
            saveExpirySettings(cloudSettings, userId);
          }
        } else {
          // Document does not exist yet: migrate local settings to Firestore
          const current = loadExpirySettings(userId);
          setDoc(docRef, { expirySettings: current, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('Could not fetch cloud preferences, falling back to local cache:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const updateExpirySettings = useCallback((newSettings: ExpiryNotificationSettings) => {
    // 1. Optimistic React State update (remembered locally for rollback)
    const previous = expirySettingsRef.current;
    expirySettingsRef.current = newSettings;
    setExpirySettings(newSettings);
    localUpdateSeqRef.current += 1;
    // 2. Synchronous Local Storage update
    saveExpirySettings(newSettings, userId);
    // 3. Background Cloud Firestore persistence (queued while offline by the
    // SDK's persistent local cache, applied automatically on reconnect)
    if (userId) {
      const docRef = doc(db, 'users', userId, 'preferences', 'settings');
      setDoc(docRef, {
        expirySettings: newSettings,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch((err) => {
        console.error('Failed to sync expiry settings to Firestore:', err);
        // Surface the failure and roll back the optimistic value so the UI and
        // the scoped cache stay consistent with the persisted cloud state.
        expirySettingsRef.current = previous;
        setExpirySettings(previous);
        saveExpirySettings(previous, userId);
        addToast('error', 'Settings Sync Failed', 'Could not save expiry preferences. Please try again.');
      });
    }
  }, [userId, addToast]);

  return {
    expirySettings,
    updateExpirySettings,
    isLoading,
  };
}
