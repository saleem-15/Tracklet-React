import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { PrivacyPolicyContent } from '../../src/components/legal/PrivacyPolicyContent';
import { TermsOfServiceContent } from '../../src/components/legal/TermsOfServiceContent';
import { PrivacyPolicyPage } from '../../src/components/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from '../../src/components/legal/TermsOfServicePage';
import { LegalNavbar } from '../../src/components/legal/LegalNavbar';
import { LegalTableOfContents } from '../../src/components/legal/LegalTableOfContents';
import { LegalView } from '../../src/components/legal/LegalView';
import { AuthGate } from '../../src/components/layout/AuthGate';
import { LEGAL_CONFIG } from '../../src/lib/constants';

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
      expect(host!.textContent).not.toContain('OFFICIAL PRIVACY POLICY');
      expect(host!.textContent).toContain('Last updated: October 24, 2026');
      expect(host!.textContent).not.toContain('Version 2.1');
      expect(host!.textContent).not.toContain('Cloud SaaS Edition');
      expect(host!.textContent).not.toContain('Effective Date');
      expect(host!.textContent).toContain('Terms of Service');
      expect(host!.textContent).toContain('Zero Recruiter Monetization Covenant');
      expect(host!.textContent).toContain('We do not sell, rent, broker, exchange, or commercialize your job search data');
      expect(host!.textContent).toContain('Chrome Extension Data & Permissions Disclosure');
      expect(host!.textContent).toContain('Cloud Infrastructure, Encryption & Tenant Isolation');
      expect(host!.textContent).toContain(LEGAL_CONFIG.PRIVACY_EMAIL);

      // Clickable link to Terms of Service exists
      const termsLink = Array.from(host!.querySelectorAll('a')).find((a) =>
        a.textContent?.includes('Terms of Service')
      );
      expect(termsLink).toBeTruthy();
      expect(termsLink?.getAttribute('href')).toBe('/terms');
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
      expect(host!.textContent).not.toContain('OFFICIAL USER AGREEMENT');
      expect(host!.textContent).toContain('Last updated: October 24, 2026');
      expect(host!.textContent).not.toContain('Version 2.1');
      expect(host!.textContent).not.toContain('Commercial SaaS Edition');
      expect(host!.textContent).not.toContain('Effective Date');
      expect(host!.textContent).toContain('Privacy Policy');
      expect(host!.textContent).toContain('You Own 100% of Your Data');
      expect(host!.textContent).toContain('Subscription Plans, Billing & Cancellations');
      expect(host!.textContent).toContain('Acceptable Use Policy & System Protection');
      expect(host!.textContent).toContain(LEGAL_CONFIG.LEGAL_EMAIL);

      // Clickable link to Privacy Policy exists
      const privacyLink = Array.from(host!.querySelectorAll('a')).find((a) =>
        a.textContent?.includes('Privacy Policy')
      );
      expect(privacyLink).toBeTruthy();
      expect(privacyLink?.getAttribute('href')).toBe('/privacy');
    });
  });

  describe('LegalTableOfContents', () => {
    const testSections = [
      { id: 'sec-1', title: '1. Introduction' },
      { id: 'sec-2', title: '2. Data Rights' },
    ];

    it('renders desktop table of contents without section count or border on active item', async () => {
      await act(async () => {
        root!.render(<LegalTableOfContents sections={testSections} />);
      });

      expect(host!.textContent).toContain('Table of Contents');
      // Verifies section count removed per Photo 2
      expect(host!.textContent).not.toContain('sections');
      expect(host!.textContent).toContain('1. Introduction');
      expect(host!.textContent).toContain('2. Data Rights');

      // Verifies active item does not have a border per Photo 2
      const activeLink = host!.querySelector('a[href="#sec-1"]');
      expect(activeLink).toBeTruthy();
      expect(activeLink!.className).not.toContain('border-l');

      // Mobile jump selector button exists
      const jumpBtn = host!.querySelector('button[aria-label*="Table of contents"]');
      expect(jumpBtn).toBeTruthy();

      // Open mobile dropdown
      await act(async () => {
        (jumpBtn as HTMLButtonElement).click();
      });

      expect(jumpBtn!.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('LegalNavbar', () => {
    it('renders brand identity and actions, and omits middle legal document tabs per Photo 1', async () => {
      const onNavigateHome = vi.fn();
      const onNavigateAuth = vi.fn();
      const onPrint = vi.fn();

      await act(async () => {
        root!.render(
          <LegalNavbar
            isAuthenticated={false}
            onNavigateHome={onNavigateHome}
            onNavigateAuth={onNavigateAuth}
            onPrint={onPrint}
          />
        );
      });

      expect(host!.textContent).toContain('Tracklet');
      expect(host!.textContent).not.toContain('Trust & Legal');
      // Verifies middle document tabs removed from header per user request Photo 1
      expect(host!.textContent).not.toContain('Privacy Policy');
      expect(host!.textContent).not.toContain('Terms of Service');
      expect(host!.textContent).toContain('Sign In');
      expect(host!.textContent).toContain('Print');
    });

    it('displays "Back to App" button when user is authenticated', async () => {
      await act(async () => {
        root!.render(
          <LegalNavbar
            isAuthenticated={true}
            onNavigateHome={vi.fn()}
            onNavigateAuth={vi.fn()}
            onPrint={vi.fn()}
          />
        );
      });

      expect(host!.textContent).toContain('Back to App');
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

    it('switches document when clicking cross-link or footer link inside LegalView', async () => {
      await act(async () => {
        root!.render(<LegalView initialDoc="privacy" />);
      });

      const termsLink = Array.from(host!.querySelectorAll('a, button')).find((el) =>
        el.textContent?.trim() === 'Terms of Service'
      );
      expect(termsLink).toBeTruthy();

      await act(async () => {
        (termsLink as HTMLElement).click();
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

  describe('PrivacyPolicyPage Standalone Component', () => {
    it('renders open unboxed reading canvas with persistent sticky table of contents and no snapshot box', async () => {
      await act(async () => {
        root!.render(<PrivacyPolicyPage />);
      });

      expect(document.title).toBe('Privacy Policy | Tracklet');
      expect(host!.textContent).toContain('Tracklet Privacy Policy');
      expect(host!.textContent).toContain('Table of Contents');

      // Verifies the snapshot section table was removed per user request
      expect(host!.textContent).not.toContain('Privacy & Security Snapshot');
      expect(host!.textContent).not.toContain('Recruiter Monetization\tZero');

      // Verifies persistent sticky table of contents sidebar
      const stickyNav = host!.querySelector('nav[aria-label="Table of contents"]');
      expect(stickyNav).toBeTruthy();
      expect(stickyNav!.className).toContain('sticky');
      expect(stickyNav!.className).toContain('top-24');

      // Verifies no enclosing boxed-card wrapper around main content
      const boxedCard = host!.querySelector('.rounded-3xl.border.p-6.bg-white');
      expect(boxedCard).toBeNull();
    });
  });

  describe('TermsOfServicePage Standalone Component', () => {
    it('renders open unboxed reading canvas with persistent sticky table of contents and no snapshot box', async () => {
      await act(async () => {
        root!.render(<TermsOfServicePage />);
      });

      expect(document.title).toBe('Terms of Service | Tracklet');
      expect(host!.textContent).toContain('Tracklet Terms of Service');
      expect(host!.textContent).toContain('Table of Contents');

      // Verifies the snapshot section table was removed per user request
      expect(host!.textContent).not.toContain('Agreement Snapshot');

      // Verifies persistent sticky table of contents sidebar
      const stickyNav = host!.querySelector('nav[aria-label="Table of contents"]');
      expect(stickyNav).toBeTruthy();
      expect(stickyNav!.className).toContain('sticky');
      expect(stickyNav!.className).toContain('top-24');

      // Verifies no enclosing boxed-card wrapper around main content
      const boxedCard = host!.querySelector('.rounded-3xl.border.p-6.bg-white');
      expect(boxedCard).toBeNull();
    });
  });
});
