import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useApplicationsContext } from './ApplicationsContext';
import { useToastContext } from './ToastContext';
import { useEntitlement, UseEntitlementReturn } from '../hooks/useEntitlement';

const EntitlementContext = createContext<UseEntitlementReturn | null>(null);

/**
 * EntitlementProvider
 *
 * Scoped provider managing user subscription tier (free vs. pro), active pipeline
 * capacity (20 cards cap), monthly AI scraping quotas, and upgrade paywall triggers.
 */
export const EntitlementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { applications } = useApplicationsContext();
  const { addToast } = useToastContext();

  const entitlement = useEntitlement({
    user,
    applications,
    addToast,
  });

  return (
    <EntitlementContext.Provider value={entitlement}>
      {children}
    </EntitlementContext.Provider>
  );
};

export function useEntitlementContext(): UseEntitlementReturn {
  const ctx = useContext(EntitlementContext);
  if (!ctx) {
    throw new Error('useEntitlementContext must be used within an EntitlementProvider');
  }
  return ctx;
}
