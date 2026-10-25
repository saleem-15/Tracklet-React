import React from 'react';
import { AuthProvider } from './AuthContext';
import { ToastProvider } from './ToastContext';
import { TooltipProvider } from '../components/Tooltip';
import { SettingsProvider } from './SettingsContext';
import { NavigationProvider } from './NavigationContext';
import { ApplicationsProvider } from './ApplicationsContext';
import { ContactsProvider } from './ContactsContext';
import { ExtensionProvider } from './ExtensionContext';
import { EntitlementProvider } from './EntitlementContext';

/**
 * AppProviders
 *
 * Root composite provider configuring the complete feature context tree in
 * strict topological dependency order:
 *
 * 1. AuthProvider (Firebase auth session & user credentials)
 * 2. ToastProvider (system feedback queue, depends on nothing)
 * 3. TooltipProvider (global custom tooltips, depends on nothing)
 * 4. SettingsProvider (app preferences, depends on nothing)
 * 5. NavigationProvider (URL query routing & drawer state, depends on nothing)
 * 6. ExtensionProvider (Browser extension handshake & connection status)
 * 7. ApplicationsProvider (Job applications domain, depends on Auth, Navigation, Toast)
 * 8. ContactsProvider (Networking domain, depends on Auth, Applications, Navigation, Toast)
 * 9. EntitlementProvider (SaaS entitlement tier & limits, depends on Auth, Applications, Toast)
 *
 * Direct React analogue to Flutter's MultiBlocProvider or MultiProvider.
 */
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ToastProvider>
        <TooltipProvider>
          <SettingsProvider>
            <NavigationProvider>
              <ExtensionProvider>
                <ApplicationsProvider>
                  <ContactsProvider>
                    <EntitlementProvider>
                      {children}
                    </EntitlementProvider>
                  </ContactsProvider>
                </ApplicationsProvider>
              </ExtensionProvider>
            </NavigationProvider>
          </SettingsProvider>
        </TooltipProvider>
      </ToastProvider>
    </AuthProvider>
  );
};
