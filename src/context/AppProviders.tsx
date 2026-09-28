import React from 'react';
import { AuthProvider } from './AuthContext';
import { ToastProvider } from './ToastContext';
import { SettingsProvider } from './SettingsContext';
import { NavigationProvider } from './NavigationContext';
import { ApplicationsProvider } from './ApplicationsContext';
import { ContactsProvider } from './ContactsContext';

/**
 * AppProviders
 *
 * Root composite provider configuring the complete feature context tree in
 * strict topological dependency order:
 *
 * 1. AuthProvider (Firebase auth session & user credentials)
 * 2. ToastProvider (system feedback queue, depends on nothing)
 * 3. SettingsProvider (app preferences, depends on nothing)
 * 4. NavigationProvider (URL query routing & drawer state, depends on nothing)
 * 5. ApplicationsProvider (Job applications domain, depends on Auth, Navigation, Toast)
 * 6. ContactsProvider (Networking domain, depends on Auth, Applications, Navigation, Toast)
 *
 * Direct React analogue to Flutter's MultiBlocProvider or MultiProvider.
 */
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ToastProvider>
        <SettingsProvider>
          <NavigationProvider>
            <ApplicationsProvider>
              <ContactsProvider>
                {children}
              </ContactsProvider>
            </ApplicationsProvider>
          </NavigationProvider>
        </SettingsProvider>
      </ToastProvider>
    </AuthProvider>
  );
};
