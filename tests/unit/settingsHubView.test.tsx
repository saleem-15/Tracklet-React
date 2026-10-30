import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import React, { act } from 'react';
import { SettingsHubView } from '../../src/components/settings/SettingsHubView';
import { SettingsPaneId, CandidateProfile } from '../../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock Auth
const mockUser = {
  uid: 'test-user-hub-1',
  email: 'developer@example.com',
  displayName: 'Antigravity Tester',
  emailVerified: true,
  providerData: [{ providerId: 'password' }],
};

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn(),
  }),
}));

// Mock Toast
const mockAddToast = vi.fn();
vi.mock('../../src/context/ToastContext', () => ({
  useToastContext: () => ({
    toasts: [],
    addToast: mockAddToast,
    dismissToast: vi.fn(),
  }),
}));

// Mock Navigation
const mockNavigateToTab = vi.fn();
vi.mock('../../src/context/NavigationContext', () => ({
  useNavigation: () => ({
    activeTab: 'settings',
    navigateToTab: mockNavigateToTab,
  }),
}));

// Mock Settings (Workflow Alerts)
let mockExpirySettings = {
  enabled: true,
  expiryThresholdHours: 48,
};
const mockUpdateExpirySettings = vi.fn((newSettings) => {
  mockExpirySettings = newSettings;
});

vi.mock('../../src/context/SettingsContext', () => ({
  useSettings: () => ({
    expirySettings: mockExpirySettings,
    updateExpirySettings: mockUpdateExpirySettings,
    isLoading: false,
  }),
}));

// Mock Entitlement (Billing)
vi.mock('../../src/context/EntitlementContext', () => ({
  useEntitlementContext: () => ({
    planTier: 'free',
    isPro: false,
    isGrandfathered: false,
    canCreateApplication: true,
    canUseAtsAutoFill: false,
    canUploadResume: false,
    canUseAdvancedAnalytics: false,
    scrapesUsed: 2,
    activeCount: 5,
    maxActiveQuota: 20,
    maxScrapes: 20,
    subscriptionsEnabled: true,
    openUpgradeModal: vi.fn(),
    openPaywall: vi.fn(),
  }),
}));

// Mock Applications & Contacts (Data Portability)
vi.mock('../../src/context/ApplicationsContext', () => ({
  useApplicationsContext: () => ({
    applications: [
      {
        id: 'app-test-1',
        userId: 'test-user-hub-1',
        company: 'Stripe',
        position: 'Staff Engineer',
        status: 'applied',
        appliedDate: '2026-10-01',
      },
    ],
    setApplications: vi.fn(),
    addToast: mockAddToast,
    handleExportCSV: vi.fn(),
    handleBatchImportApplications: vi.fn(),
  }),
}));

vi.mock('../../src/context/ContactsContext', () => ({
  useContactsContext: () => ({
    contacts: [],
  }),
}));

// Stable Mock Candidate Profile
const mockCandidateProfile: CandidateProfile = {
  firstName: 'Alex',
  lastName: 'Mercer',
  email: 'alex.mercer@example.com',
  phone: '+1 555-0199',
  location: 'San Francisco, CA',
  targetTitles: ['Senior Systems Architect', 'Staff Engineer'],
  salaryTarget: {
    currency: 'USD',
    minimumBase: 180000,
    targetOTE: 220000,
  },
  workAuth: {
    isLegallyAuthorized: true,
    requiresSponsorship: false,
    currentStatus: 'Citizen / Permanent Resident',
  },
  experience: {
    currentTitle: 'Senior Systems Architect',
    currentCompany: 'Tracklet Labs',
    yearsOfExperience: 8,
  },
  noticePeriod: '2_weeks',
  relocationPreference: 'remote_only',
  linkedInUrl: 'https://linkedin.com/in/tester',
  githubUrl: 'https://github.com/tester',
  portfolioUrl: 'https://alex.dev',
  bioSnippet: 'Senior systems architect passionate about developer tooling.',
  updatedAt: '2026-10-28T12:00:00Z',
};

const mockSaveProfile = vi.fn().mockResolvedValue(true);

vi.mock('../../src/hooks/useCandidateProfile', () => ({
  useCandidateProfile: () => ({
    profile: mockCandidateProfile,
    saveProfile: mockSaveProfile,
    isLoading: false,
    isSaving: false,
  }),
}));

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(initialPane?: SettingsPaneId) {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(<SettingsHubView initialPane={initialPane} />);
  });
}

describe('SettingsHubView component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
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

  it('renders the single Account navigation tab and defaults to the Account pane with consolidated Data Portability', () => {
    mount();

    // Only the Account pane is enabled; autofill/billing/workflow are disabled
    expect(host?.textContent).toContain('Account');
    expect(host?.textContent).not.toContain('ATS Autofill');
    expect(host?.textContent).not.toContain('Billing');
    expect(host?.textContent).not.toContain('Workflow');

    // Default pane header
    expect(host?.textContent).toContain('Antigravity Tester');
    expect(host?.textContent).toContain('developer@example.com');

    // Consolidated Data Portability directly inside Account pane
    expect(host?.textContent).toContain('Data Portability & Backups');
    expect(host?.textContent).toContain('JSON Backup');
    expect(host?.textContent).toContain('Export Jobs CSV');
    expect(host?.textContent).toContain('Export Contacts Directory (CSV)');

    // Badges & sections removed per user requirements
    expect(host?.textContent).not.toContain('Google OAuth');
    expect(host?.textContent).not.toContain('Verified');
    expect(host?.textContent).not.toContain('Enterprise Security & Privacy Covenants');
    expect(host?.textContent).not.toContain('Diagnostics & Issue Reporting');
    expect(host?.textContent).not.toContain('Reload Sample Demo Data');
  });

  // Skipped while the ATS Autofill pane is disabled in SettingsHubView
  it.skip('switches to dedicated ATS Autofill pane and renders candidate career target form', () => {
    mount();

    const autofillTab = Array.from(host?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('ATS Autofill')
    );
    expect(autofillTab).toBeDefined();

    act(() => {
      autofillTab?.click();
    });

    expect(host?.textContent).toContain('Personal & Contact Information');
    expect(host?.textContent).toContain('Work Authorization & Availability');
    expect(host?.textContent).toContain('Current Role & Career Targeting');
    expect(host?.textContent).toContain('Salary & Compensation Expectations');
    expect(host?.textContent).toContain('Online Presence & Portfolios');
    expect(host?.textContent).toContain('Application Snippets & Bio');

    // Check specific fields
    const titleInput = host?.querySelector('#target-titles') as HTMLInputElement;
    expect(titleInput?.value).toBe('Senior Systems Architect, Staff Engineer');

    const firstNameInput = host?.querySelector('#first-name') as HTMLInputElement;
    expect(firstNameInput?.value).toBe('Alex');

    // Flexible online presence: free-form additional links replace hardcoded GitHub
    expect(host?.textContent).toContain('Additional Links');
    expect(host?.textContent).toContain('Add link');
    expect(host?.textContent).toContain('Dribbble or Behance');
    expect(host?.querySelector('#github-url')).toBeNull();

    // Verify removed badges and text
    expect(host?.textContent).not.toContain('1-Click ATS Sync');
    expect(host?.textContent).not.toContain('Encrypted at rest in Cloud Firestore. Never shared with third parties.');
  });

  // Skipped while the Billing pane is disabled in SettingsHubView
  it.skip('switches to Subscription Billing pane and renders clean Upgrade to Pro button without star icon', () => {
    mount();

    const billingTab = Array.from(host?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.trim() === 'Billing'
    );
    expect(billingTab).toBeDefined();

    act(() => {
      billingTab?.click();
    });

    expect(host?.textContent).toContain('Tracklet Free Workspace');
    expect(host?.textContent).toContain('Active Pipeline Capacity');
    expect(host?.textContent).toContain('Job Hunt Pass');
    expect(host?.textContent).toContain('$29');

    // Verify Upgrade button is clean
    const upgradeBtn = Array.from(host?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.trim() === 'Upgrade to Pro'
    );
    expect(upgradeBtn).toBeDefined();
    expect(upgradeBtn?.querySelector('svg')).toBeNull();
  });

  // Skipped while the Workflow pane is disabled in SettingsHubView
  it.skip('switches to Workflow pane and interacts with expiry controls', () => {
    mount();

    const workflowTab = Array.from(host?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.trim() === 'Workflow'
    );
    expect(workflowTab).toBeDefined();

    act(() => {
      workflowTab?.click();
    });

    expect(host?.textContent).toContain("'Soon to Expire' Task Notification Indicator");
    expect(host?.textContent).toContain('Application Staleness & Ghosting Rules');
  });

  it('houses Data Portability actions seamlessly within the Account pane above Danger Zone', () => {
    mount('account');

    // Pure data portability actions inside Account pane
    expect(host?.textContent).toContain('Data Portability & Backups');
    expect(host?.textContent).toContain('JSON Backup');
    expect(host?.textContent).toContain('Export Jobs CSV');
    expect(host?.textContent).toContain('Export Contacts Directory (CSV)');
    expect(host?.textContent).toContain('Danger Zone');
    expect(host?.textContent).toContain('Delete Account');

    // Sections removed per user requirement
    expect(host?.textContent).not.toContain('Enterprise Security & Privacy Covenants');
    expect(host?.textContent).not.toContain('Diagnostics & Issue Reporting');
    expect(host?.textContent).not.toContain('Reload Sample Demo Data');
  });

  // Skipped while the autofill pane (the targeted pane) is disabled in SettingsHubView
  it.skip('respects initialPane prop and loads targeted pane directly', () => {
    mount('autofill');

    expect(host?.textContent).toContain('Personal & Contact Information');
    expect(host?.textContent).toContain('Target Job Titles');
  });
});
