import { useState, useCallback } from 'react';
import { ExpiryNotificationSettings } from '../types';
import { loadExpirySettings, saveExpirySettings } from '../lib/expiryUtils';

export interface UseExpirySettingsReturn {
  expirySettings: ExpiryNotificationSettings;
  updateExpirySettings: (newSettings: ExpiryNotificationSettings) => void;
}

/**
 * useExpirySettings
 * 
 * Domain hook encapsulating user expiry notification preferences.
 * - Loads persisted settings from localStorage on initial render
 * - Synchronously updates React state and persists to storage on changes
 */
export function useExpirySettings(): UseExpirySettingsReturn {
  const [expirySettings, setExpirySettings] = useState<ExpiryNotificationSettings>(() => loadExpirySettings());

  const updateExpirySettings = useCallback((newSettings: ExpiryNotificationSettings) => {
    setExpirySettings(newSettings);
    saveExpirySettings(newSettings);
  }, []);

  return {
    expirySettings,
    updateExpirySettings,
  };
}
