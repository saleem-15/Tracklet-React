import React, { createContext, useContext, useMemo } from 'react';
import { ExpiryNotificationSettings } from '../types';
import { useExpirySettings } from '../hooks/useExpirySettings';

export interface SettingsContextType {
  expirySettings: ExpiryNotificationSettings;
  updateExpirySettings: (newSettings: ExpiryNotificationSettings) => void;
  expiryThresholdHours: number;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

/**
 * SettingsProvider
 *
 * Scoped feature provider for application preferences and expiry thresholds.
 * Analogous to Flutter's SettingsCubit / PreferencesService backed by SharedPreferences/Isar.
 * Eliminates prop-drilling `expirySettings` and `expiryThresholdHours`.
 */
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { expirySettings, updateExpirySettings } = useExpirySettings();

  const value = useMemo<SettingsContextType>(() => ({
    expirySettings,
    updateExpirySettings,
    expiryThresholdHours: expirySettings.expiryThresholdHours,
  }), [expirySettings, updateExpirySettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
