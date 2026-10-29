import { useState, useCallback, useEffect } from 'react';
import { ExpiryNotificationSettings } from '../types';
import { loadExpirySettings, saveExpirySettings } from '../lib/expiryUtils';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

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
  const userId = user?.uid;

  const [expirySettings, setExpirySettings] = useState<ExpiryNotificationSettings>(() => loadExpirySettings(userId));
  const [isLoading, setIsLoading] = useState(false);

  // Sync from Cloud Firestore whenever user auth session initializes or changes
  useEffect(() => {
    if (!userId) {
      setExpirySettings(loadExpirySettings());
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const docRef = doc(db, 'users', userId, 'preferences', 'settings');
    getDoc(docRef)
      .then((docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.expirySettings) {
            const cloudSettings: ExpiryNotificationSettings = {
              enabled: typeof data.expirySettings.enabled === 'boolean' ? data.expirySettings.enabled : true,
              expiryThresholdHours: typeof data.expirySettings.expiryThresholdHours === 'number' ? data.expirySettings.expiryThresholdHours : 48,
            };
            setExpirySettings(cloudSettings);
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
    // 1. Optimistic React State update
    setExpirySettings(newSettings);
    // 2. Synchronous Local Storage update
    saveExpirySettings(newSettings, userId);
    // 3. Background Cloud Firestore persistence
    if (userId) {
      const docRef = doc(db, 'users', userId, 'preferences', 'settings');
      setDoc(docRef, {
        expirySettings: newSettings,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch((err) => {
        console.error('Failed to sync expiry settings to Firestore:', err);
      });
    }
  }, [userId]);

  return {
    expirySettings,
    updateExpirySettings,
    isLoading,
  };
}
