import React from 'react';
import { AuthProvider } from './AuthContext';
import { ToastProvider } from './ToastContext';
import { SettingsProvider } from './SettingsContext';
import { NavigationProvider } from './NavigationContext';
import { ApplicationsProvider } from './ApplicationsContext';
import { ContactsProvider } from './ContactsContext';
import { ExtensionProvider } from './ExtensionContext';

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
 * 5. ExtensionProvider (Browser extension handshake & connection status)
 * 6. ApplicationsProvider (Job applications domain, depends on Auth, Navigation, Toast)
 * 7. ContactsProvider (Networking domain, depends on Auth, Applications, Navigation, Toast)
 *
 * Direct React analogue to Flutter's MultiBlocProvider or MultiProvider.
 */
export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <ToastProvider>
        <SettingsProvider>
          <NavigationProvider>
            <ExtensionProvider>
              <ApplicationsProvider>
                <ContactsProvider>
                  {children}
                </ContactsProvider>
              </ApplicationsProvider>
            </ExtensionProvider>
          </NavigationProvider>
        </SettingsProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

