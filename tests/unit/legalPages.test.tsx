import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { PrivacyPolicyContent } from '../../src/components/legal/PrivacyPolicyContent';
import { TermsOfServiceContent } from '../../src/components/legal/TermsOfServiceContent';
import { LegalNavbar } from '../../src/components/legal/LegalNavbar';
import { LegalTableOfContents } from '../../src/components/legal/LegalTableOfContents';
import { LegalView } from '../../src/components/legal/LegalView';
import { AuthGate } from '../../src/components/layout/AuthGate';

// Mock context providers
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    signOut: vi.fn(),
  })),
}));

vi.mock('../../src/context/ToastContext', () => ({
  useToastContext: vi.fn(() => ({
    toasts: [],
    addToast: vi.fn(),
    dismissToast: vi.fn(),
  })),
}));

let host: HTMLDivElement | null = null;
let root: Root | null = null;

describe('Public Legal & Trust Pages', () => {
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
      host = null;
    }
    window.history.pushState(null, '', '/');
  });

  describe('PrivacyPolicyContent', () => {
    it('renders the non-monetization pledge and essential compliance sections', async () => {
      await act(async () => {
        root!.render(<PrivacyPolicyContent />);
      });

      expect(host!.textContent).toContain('Tracklet Privacy Policy');
      expect(host!.textContent).toContain('Zero Recruiter Monetization Covenant');
      expect(host!.textContent).toContain('We do not sell, rent, broker, exchange, or commercialize your job search data');
      expect(host!.textContent).toContain('Chrome Extension Data & Permissions Disclosure');
      expect(host!.textContent).toContain('Cloud Infrastructure, Encryption & Tenant Isolation');
      expect(host!.textContent).toContain('privacy@tracklet.app');
    });

    it('contains full explanation for Manifest V3 extension permissions', async () => {
      await act(async () => {
        root!.render(<PrivacyPolicyContent />);
      });

      expect(host!.textContent).toContain('storage');
      expect(host!.textContent).toContain('activeTab');
      expect(host!.textContent).toContain('scripting');
      expect(host!.textContent).toContain('host_permissions');
    });
  });

  describe('TermsOfServiceContent', () => {
    it('renders customer content ownership and subscription terms', async () => {
      await act(async () => {
        root!.render(<TermsOfServiceContent />);
      });

      expect(host!.textContent).toContain('Tracklet Terms of Service');
      expect(host!.textContent).toContain('You Own 100% of Your Data');
      expect(host!.textContent).toContain('Subscription Plans, Billing & Cancellations');
      expect(host!.textContent).toContain('Acceptable Use Policy & System Protection');
      expect(host!.textContent).toContain('legal@tracklet.app');
    });
  });

  describe('LegalNavbar', () => {
    it('renders document tabs and triggers onSelectDoc callback', async () => {
      const onSelectDoc = vi.fn();
      const onNavigateHome = vi.fn();
      const onNavigateAuth = vi.fn();
      const onPrint = vi.fn();

      await act(async () => {
        root!.render(
          <LegalNavbar
            activeDoc="privacy"
            onSelectDoc={onSelectDoc}
            isAuthenticated={false}
            onNavigateHome={onNavigateHome}
            onNavigateAuth={onNavigateAuth}
            onPrint={onPrint}
          />
        );
      });

      expect(host!.textContent).toContain('Tracklet');
      expect(host!.textContent).toContain('Privacy Policy');
      expect(host!.textContent).toContain('Terms of Service');
      expect(host!.textContent).toContain('Sign In');

      const termsBtn = Array.from(host!.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Terms of Service')
      );
      expect(termsBtn).toBeTruthy();

      await act(async () => {
        termsBtn!.click();
      });

      expect(onSelectDoc).toHaveBeenCalledWith('terms');
    });

    it('displays "Back to Workspace" button when user is authenticated', async () => {
      await act(async () => {
        root!.render(
          <LegalNavbar
            activeDoc="privacy"
            onSelectDoc={vi.fn()}
            isAuthenticated={true}
            onNavigateHome={vi.fn()}
            onNavigateAuth={vi.fn()}
            onPrint={vi.fn()}
          />
        );
      });

      expect(host!.textContent).toContain('Back to Workspace');
      expect(host!.textContent).not.toContain('Sign In');
    });
  });

  describe('LegalView Component', () => {
    it('renders privacy policy by default and updates document title', async () => {
      await act(async () => {
        root!.render(<LegalView initialDoc="privacy" />);
      });

      expect(document.title).toBe('Privacy Policy | Tracklet');
      expect(host!.textContent).toContain('Tracklet Privacy Policy');
    });

    it('renders terms of service when initialDoc is terms', async () => {
      await act(async () => {
        root!.render(<LegalView initialDoc="terms" />);
      });

      expect(document.title).toBe('Terms of Service | Tracklet');
      expect(host!.textContent).toContain('Tracklet Terms of Service');
    });

    it('switches document when clicking tab inside LegalView', async () => {
      await act(async () => {
        root!.render(<LegalView initialDoc="privacy" />);
      });

      const termsBtn = Array.from(host!.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Terms of Service')
      );
      expect(termsBtn).toBeTruthy();

      await act(async () => {
        termsBtn!.click();
      });

      expect(document.title).toBe('Terms of Service | Tracklet');
      expect(host!.textContent).toContain('Tracklet Terms of Service');
      expect(window.location.pathname).toBe('/terms');
    });
  });

  describe('AuthGate Public Access Integration', () => {
    it('bypasses login gate when visiting /privacy directly without authenticated user', async () => {
      window.history.pushState(null, '', '/privacy');

      await act(async () => {
        root!.render(
          <AuthGate onReloadData={async () => {}}>
            <div>Private Workspace Protected Content</div>
          </AuthGate>
        );
      });

      // Does NOT render private content and does NOT render AuthScreen login inputs
      expect(host!.textContent).not.toContain('Private Workspace Protected Content');
      expect(host!.textContent).not.toContain('Welcome back');
      // DOES render standalone Privacy Policy
      expect(host!.textContent).toContain('Tracklet Privacy Policy');
      expect(host!.textContent).toContain('Zero Recruiter Monetization Covenant');
    });

    it('bypasses login gate when visiting /terms directly', async () => {
      window.history.pushState(null, '', '/terms');

      await act(async () => {
        root!.render(
          <AuthGate onReloadData={async () => {}}>
            <div>Private Workspace Protected Content</div>
          </AuthGate>
        );
      });

      expect(host!.textContent).toContain('Tracklet Terms of Service');
      expect(host!.textContent).toContain('You Own 100% of Your Data');
    });
  });
});
