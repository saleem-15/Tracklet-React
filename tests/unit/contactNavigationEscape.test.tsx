import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ContactsProvider, useContactsContext } from '../../src/context/ContactsContext';
import { NavigationProvider, useNavigation } from '../../src/context/NavigationContext';
import { ApplicationsProvider } from '../../src/context/ApplicationsContext';
import { ToastProvider } from '../../src/context/ToastContext';
import { AuthProvider } from '../../src/context/AuthContext';
import { Contact, Application } from '../../src/types';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

let contactsContextResult: ReturnType<typeof useContactsContext>;
let navContextResult: ReturnType<typeof useNavigation>;

function TestConsumer() {
  contactsContextResult = useContactsContext();
  navContextResult = useNavigation();
  return null;
}

function TestHarness() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NavigationProvider>
          <ApplicationsProvider>
            <ContactsProvider>
              <TestConsumer />
            </ContactsProvider>
          </ApplicationsProvider>
        </NavigationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

describe('Contact Profile to Linked Application Navigation & Return Stack (Issue #58)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
  });

  function mount() {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) host.remove();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root!.render(<TestHarness />);
    });
  }

  it('restores previous contact profile when application detail panel is closed (Esc / onClose)', async () => {
    mount();

    // 1. User opens a contact profile
    act(() => {
      contactsContextResult.handleSwitchToContact('contact-123');
    });

    expect(contactsContextResult.selectedContactId).toBe('contact-123');
    expect(navContextResult.selectedAppId).toBeNull();

    // 2. User clicks a linked application from the contact profile
    act(() => {
      contactsContextResult.handleSwitchToApp('app-456');
    });

    // Application detail opens, contact drawer closes
    expect(navContextResult.selectedAppId).toBe('app-456');
    expect(contactsContextResult.selectedContactId).toBeNull();

    // 3. User closes the application detail dialog (e.g. via Escape or close button)
    act(() => {
      contactsContextResult.handleCloseApp();
    });

    // Expected: Application closes AND returns user to the contact profile!
    expect(navContextResult.selectedAppId).toBeNull();
    expect(contactsContextResult.selectedContactId).toBe('contact-123');

    // 4. User closes the contact profile (second Escape press)
    act(() => {
      contactsContextResult.handleCloseContact();
    });

    // Expected: lands cleanly on the contacts grid with no modals/drawers open
    expect(contactsContextResult.selectedContactId).toBeNull();
    expect(navContextResult.selectedAppId).toBeNull();
  });

  it('clears return stack when switching active navigation tab', async () => {
    mount();

    // Open contact then switch to app
    act(() => {
      contactsContextResult.handleSwitchToContact('contact-123');
    });
    act(() => {
      contactsContextResult.handleSwitchToApp('app-456');
    });

    expect(navContextResult.selectedAppId).toBe('app-456');

    // Switch navigation tab to pipeline
    act(() => {
      navContextResult.setActiveTab('pipeline');
    });

    // Closing the app detail panel should now close cleanly without returning to contact
    act(() => {
      contactsContextResult.handleCloseApp();
    });

    expect(navContextResult.selectedAppId).toBeNull();
    expect(contactsContextResult.selectedContactId).toBeNull();
  });
});
