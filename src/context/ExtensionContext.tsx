import React, { createContext, useContext } from 'react';
import { ExtensionState } from '../types';
import { useExtensionStatus } from '../hooks/useExtensionStatus';

const ExtensionContext = createContext<ExtensionState | null>(null);

/**
 * ExtensionProvider
 *
 * Provides a single reactive source of truth for the browser extension's
 * connection status and installed manifest version across all components.
 */
export const ExtensionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const extensionState = useExtensionStatus();

  return (
    <ExtensionContext.Provider value={extensionState}>
      {children}
    </ExtensionContext.Provider>
  );
};

export const useExtensionContext = (): ExtensionState => {
  const context = useContext(ExtensionContext);
  if (!context) {
    throw new Error('useExtensionContext must be used within an ExtensionProvider');
  }
  return context;
};
