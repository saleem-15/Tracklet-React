import React from 'react';
import { SettingsHubView } from './settings/SettingsHubView';
import { Application, Contact, ExpiryNotificationSettings } from '../types';

export interface SettingsViewProps {
  settings?: ExpiryNotificationSettings;
  onUpdateSettings?: (newSettings: ExpiryNotificationSettings) => void;
  applications?: Application[];
  contacts?: Contact[];
  onSelectApplication?: (appId: string) => void;
  onExportCSV?: () => void;
  onExportContactsCSV?: () => void;
  onExportJSON?: () => void;
  onImportCSV?: (
    apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => Promise<void>;
  onImportJSON?: (
    apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => Promise<void>;
  onSeedDemoData?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  onAccountDeleted?: () => void;
  userId?: string;
}

/**
 * SettingsView
 *
 * Backwards-compatible adapter routing to the modular SettingsHubView.
 * In Phase 4, all child settings panes consume domain state directly
 * from mounted React feature contexts, eliminating 12 drilled props.
 */
export const SettingsView: React.FC<SettingsViewProps> = () => {
  return <SettingsHubView />;
};
