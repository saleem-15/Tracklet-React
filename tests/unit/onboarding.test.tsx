import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { OnboardingModal } from '../../src/components/onboarding/OnboardingModal';
import { OnboardingEmptyState } from '../../src/components/OnboardingEmptyState';
import { useOnboardingTrigger } from '../../src/hooks/useOnboardingTrigger';
import * as AuthContextModule from '../../src/context/AuthContext';
import * as NavigationContextModule from '../../src/context/NavigationContext';
import * as ExtensionContextModule from '../../src/context/ExtensionContext';
import { EntitlementRepository } from '../../src/lib/entitlementRepository';
import { LOCAL_STORAGE_KEYS } from '../../src/lib/constants';

// Enable React act environment in HappyDOM
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

describe('Onboarding Flow & Triggers', () => {
  let mockAuth: any;
  let mockNav: any;
  let mockExtension: any;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    mockAuth = {
      user: {
        uid: 'test-user-123',
        email: 'tester@example.com',
        emailVerified: true,
      },
    };

    mockNav = {
      openExtensionModal: vi.fn(),
      openImportModal: vi.fn(),
      openAddModal: vi.fn(),
      openOnboardingModal: vi.fn(),
    };

    mockExtension = {
      status: 'not_installed',
      installedVersion: null,
      latestVersion: '1.3.3',
    };

    vi.spyOn(AuthContextModule, 'useAuth').mockImplementation(() => mockAuth);
    vi.spyOn(NavigationContextModule, 'useNavigation').mockImplementation(() => mockNav);
    vi.spyOn(ExtensionContextModule, 'useExtensionContext').mockImplementation(() => mockExtension);
    vi.spyOn(EntitlementRepository, 'updateOnboardingState').mockResolvedValue(undefined);

    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
  });

  describe('useOnboardingTrigger', () => {
    function TriggerTestComponent({
      isLoading = false,
      user = mockAuth.user,
      profile = { uid: 'test-user-123', planTier: 'free', quotas: {} as any, createdAt: '', updatedAt: '' },
      totalAppCount = 0,
      openOnboardingModal,
    }: any) {
      useOnboardingTrigger({
        isLoading,
        user,
        profile,
        totalAppCount,
        openOnboardingModal,
      });
      return <div data-testid="trigger-component" />;
    }

    it('triggers openOnboardingModal for verified users with 0 applications', () => {
      const openModalMock = vi.fn();

      act(() => {
        root!.render(
          <TriggerTestComponent
            isLoading={false}
            openOnboardingModal={openModalMock}
          />
        );
      });

      expect(openModalMock).toHaveBeenCalledWith(1);
    });

    it('does not trigger when user is unverified', () => {
      const openModalMock = vi.fn();
      const unverifiedUser = { ...mockAuth.user, emailVerified: false };

      act(() => {
        root!.render(
          <TriggerTestComponent
            user={unverifiedUser}
            openOnboardingModal={openModalMock}
          />
        );
      });

      expect(openModalMock).not.toHaveBeenCalled();
    });

    it('does not trigger when totalAppCount > 0', () => {
      const openModalMock = vi.fn();

      act(() => {
        root!.render(
          <TriggerTestComponent
            totalAppCount={5}
            openOnboardingModal={openModalMock}
          />
        );
      });

      expect(openModalMock).not.toHaveBeenCalled();
    });

    it('does not trigger when onboarding is already completed in profile', () => {
      const openModalMock = vi.fn();
      const completedProfile = {
        uid: 'test-user-123',
        planTier: 'free',
        onboarding: { completed: true, dismissed: false },
        quotas: {} as any,
        createdAt: '',
        updatedAt: '',
      };

      act(() => {
        root!.render(
          <TriggerTestComponent
            profile={completedProfile}
            openOnboardingModal={openModalMock}
          />
        );
      });

      expect(openModalMock).not.toHaveBeenCalled();
    });

    it('does not trigger when onboarding is completed in localStorage', () => {
      const openModalMock = vi.fn();
      localStorage.setItem(`${LOCAL_STORAGE_KEYS.ONBOARDING_COMPLETED_PREFIX}test-user-123`, 'true');

      act(() => {
        root!.render(
          <TriggerTestComponent
            openOnboardingModal={openModalMock}
          />
        );
      });

      expect(openModalMock).not.toHaveBeenCalled();
    });
  });

  describe('OnboardingModal (Linear/Superhuman-Tier 3-Act Flow)', () => {
    it('renders clean visual stepper dots in header with no text step numbers', () => {
      act(() => {
        root!.render(
          <OnboardingModal
            isOpen={true}
            initialStep={1}
            onClose={vi.fn()}
          />
        );
      });

      // No text step numbers like "Step 1 of 3"
      expect(host!.textContent).not.toMatch(/Step\s+\d+\s+of\s+\d+/i);

      // Visual stepper nav exists
      const stepperNav = host!.querySelector('nav[aria-label="Onboarding Progress"]');
      expect(stepperNav).toBeTruthy();
      expect(stepperNav!.querySelectorAll('div').length).toBe(3);

      // Card radio indicator styling: 1 selected (bg-blue-600 solid) and 2 unselected (border-slate-300)
      const selectedRadio = host!.querySelector('.bg-blue-600.rounded-full');
      expect(selectedRadio).toBeTruthy();
      const unselectedRadios = host!.querySelectorAll('.border-2.border-slate-300.rounded-full');
      expect(unselectedRadios.length).toBe(2);
    });

    it('renders step 1 with 3 choices and advances clean canvas to the Extension step', async () => {
      const handleClose = vi.fn();

      act(() => {
        root!.render(
          <OnboardingModal
            isOpen={true}
            initialStep={1}
            onClose={handleClose}
          />
        );
      });

      expect(host!.textContent).toContain('Workspace Setup');
      expect(host!.textContent).toContain('Choose how to initialize your applications pipeline.');
      expect(host!.textContent).toContain('Import Spreadsheet (.CSV / .JSON)');
      expect(host!.textContent).toContain('Explore Sample Roles');
      expect(host!.textContent).toContain('Start with a Clean Slate');

      // Click "Start with a Clean Slate"
      const cleanSlateCard = Array.from(host!.querySelectorAll('span')).find(
        (s) => s.textContent?.includes('Start with a Clean Slate')
      );
      expect(cleanSlateCard).toBeTruthy();
      act(() => {
        cleanSlateCard!.click();
      });

      // Click "Continue to Extension"
      const nextBtn = Array.from(host!.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Continue to Extension')
      );
      expect(nextBtn).toBeTruthy();

      act(() => {
        nextBtn!.click();
      });

      // Golden thread: Advances to Step 2 Extension step
      expect(host!.textContent).toContain('Browser Extension');
      expect(host!.textContent).toContain('Alt+S');
    });

    it('seeds demo roles and transitions seamlessly to the Extension step', async () => {
      const handleClose = vi.fn();
      const seedMock = vi.fn();
      const toastMock = vi.fn();

      act(() => {
        root!.render(
          <OnboardingModal
            isOpen={true}
            initialStep={1}
            onClose={handleClose}
            onSeedDemoData={seedMock}
            onShowToast={toastMock}
          />
        );
      });

      // Click "Load 3 Sample Roles"
      const loadBtn = Array.from(host!.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Load 3 Sample Roles')
      );
      expect(loadBtn).toBeTruthy();

      act(() => {
        loadBtn!.click();
      });

      expect(seedMock).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        'success',
        'Demo Roles Loaded',
        expect.any(String)
      );
      expect(host!.textContent).toContain('3 Demo Roles Loaded');

      // Click "Continue to Extension"
      const nextBtn = Array.from(host!.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Continue to Extension')
      );
      act(() => {
        nextBtn!.click();
      });

      // Must advance to Step 2
      expect(host!.textContent).toContain('Browser Extension');
    });

    it('handles inline CSV ingestion without modal stacking and advances to Extension step', async () => {
      const handleClose = vi.fn();
      const importJSONMock = vi.fn().mockResolvedValue(undefined);
      const toastMock = vi.fn();

      const csvContent = 'Company,Role,Platform,Status,Date Applied\nAcme Corp,Staff Engineer,LinkedIn,Applied,2026-07-20';
      class MockFileReader {
        onload: any = null;
        onerror: any = null;
        readAsText() {
          if (this.onload) {
            this.onload({ target: { result: csvContent } });
          }
        }
      }
      vi.stubGlobal('FileReader', MockFileReader);

      act(() => {
        root!.render(
          <OnboardingModal
            isOpen={true}
            initialStep={1}
            onClose={handleClose}
            onImportJSON={importJSONMock}
            onShowToast={toastMock}
          />
        );
      });

      // Select file via input
      const fileInput = host!.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();

      const file = new File([csvContent], 'applications.csv', { type: 'text/csv' });
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: true,
      });

      act(() => {
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Inline confirmation receipt is rendered (never spawns second dialog)
      expect(host!.textContent).toContain('1 applications ready to import');

      // Click inline import button
      const importBtn = Array.from(host!.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Import 1 Applications')
      );
      expect(importBtn).toBeTruthy();

      await act(async () => {
        importBtn!.click();
      });

      expect(importJSONMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            company: 'Acme Corp',
            role: 'Staff Engineer',
          }),
        ])
      );
      expect(host!.textContent).toContain('1 Applications Loaded');

      // Click "Continue to Extension" in footer
      const nextBtn = Array.from(host!.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Continue to Extension')
      );
      expect(nextBtn).toBeTruthy();

      act(() => {
        nextBtn!.click();
      });

      // Spreadsheet users experience the extension step without stacked dialogs
      expect(host!.textContent).toContain('Browser Extension');
    });

    it('reactively updates extension step when companion connects', async () => {
      act(() => {
        root!.render(
          <OnboardingModal
            isOpen={true}
            initialStep={2}
            onClose={vi.fn()}
          />
        );
      });

      // Initially disconnected: Single Primary CTA is Download Extension (.zip) with quiet "I'll install this later"
      expect(host!.textContent).toContain('Install in 2 Simple Steps');
      expect(host!.textContent).toContain('Download Extension (.zip)');
      expect(host!.textContent).toContain("I'll install this later");

      // Update mock extension to connected
      mockExtension.status = 'connected';
      mockExtension.installedVersion = '1.3.3';

      act(() => {
        root!.render(
          <OnboardingModal
            isOpen={true}
            initialStep={2}
            onClose={vi.fn()}
          />
        );
      });

      // Reactively renders connected state and switches primary CTA to Continue to Features
      expect(host!.textContent).toContain('Extension Connected');
      expect(host!.textContent).toContain('v1.3.3');
      expect(host!.textContent).toContain('Continue to Features');
      expect(host!.textContent).toContain('Pin to Toolbar');
    });

    it('advances from extension step to Step 3 and completes workspace entry', async () => {
      const handleClose = vi.fn();
      const toastMock = vi.fn();

      act(() => {
        root!.render(
          <OnboardingModal
            isOpen={true}
            initialStep={2}
            onClose={handleClose}
            onShowToast={toastMock}
          />
        );
      });

      // Click quiet link "I'll install this later" on disconnected state
      const laterBtn = Array.from(host!.querySelectorAll('button')).find(
        (b) => b.textContent?.includes("I'll install this later")
      );
      expect(laterBtn).toBeTruthy();

      act(() => {
        laterBtn!.click();
      });

      // Now on Step 3
      expect(host!.textContent).toContain('Data Ownership & Notes');
      expect(host!.textContent).toContain('100% Data Portability (Zero Lock-in)');
      expect(host!.textContent).toContain('Markdown Notes with Slash Commands');
      expect(host!.textContent).toContain('Stage Velocity & Stale Application Alerts');

      // Click "Enter Workspace"
      const enterBtn = Array.from(host!.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Enter Workspace')
      );
      expect(enterBtn).toBeTruthy();

      act(() => {
        enterBtn!.click();
      });

      expect(handleClose).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith('success', 'Welcome to Tracklet!', 'Your workspace is ready.');
      expect(EntitlementRepository.updateOnboardingState).toHaveBeenCalledWith(
        'test-user-123',
        expect.objectContaining({ completed: true })
      );
    });

    it('dismisses when skip button is clicked', () => {
      const handleClose = vi.fn();

      act(() => {
        root!.render(
          <OnboardingModal
            isOpen={true}
            initialStep={1}
            onClose={handleClose}
          />
        );
      });

      const skipBtn = Array.from(host!.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Skip guide')
      );
      expect(skipBtn).toBeTruthy();

      act(() => {
        skipBtn!.click();
      });

      expect(handleClose).toHaveBeenCalled();
      expect(EntitlementRepository.updateOnboardingState).toHaveBeenCalledWith(
        'test-user-123',
        expect.objectContaining({ dismissed: true })
      );
    });

    it('dismisses when Escape key is pressed', () => {
      const handleClose = vi.fn();

      act(() => {
        root!.render(
          <OnboardingModal
            isOpen={true}
            initialStep={1}
            onClose={handleClose}
          />
        );
      });

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('OnboardingEmptyState (Linear-Inspired Launchpad Checklist)', () => {
    it('renders incomplete checklist with 0 applications and disconnected extension', () => {
      act(() => {
        root!.render(
          <OnboardingEmptyState
            onOpenAddModal={vi.fn()}
            onSeedDemoData={vi.fn()}
            applicationsCount={0}
            contactsCount={0}
          />
        );
      });

      expect(host!.textContent).toContain('Setup Launchpad');
      expect(host!.textContent).toContain('(0 of 3 complete)');
      expect(host!.textContent).toContain('0%');
      expect(host!.textContent).toContain('1. Populate applications');
      expect(host!.textContent).toContain('2. Connect extension');
      expect(host!.textContent).toContain('3. Add first contact');
    });

    it('auto-checks items live when applications and extension are connected', () => {
      mockExtension.status = 'connected';
      mockExtension.installedVersion = '1.3.3';

      act(() => {
        root!.render(
          <OnboardingEmptyState
            onOpenAddModal={vi.fn()}
            onSeedDemoData={vi.fn()}
            applicationsCount={3}
            contactsCount={1}
          />
        );
      });

      expect(host!.textContent).toContain('(3 of 3 complete)');
      expect(host!.textContent).toContain('100%');
      expect(host!.textContent).toContain('Connected');
      expect(host!.textContent).toContain('100% Data Portability Guarantee');
    });

    it('re-opens welcome tour when Re-open Welcome Tour is clicked', () => {
      act(() => {
        root!.render(
          <OnboardingEmptyState
            onOpenAddModal={vi.fn()}
            onSeedDemoData={vi.fn()}
            applicationsCount={0}
            contactsCount={0}
          />
        );
      });

      const tourLink = Array.from(host!.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('Re-open Welcome Tour')
      );
      expect(tourLink).toBeTruthy();

      act(() => {
        tourLink!.click();
      });

      expect(mockNav.openOnboardingModal).toHaveBeenCalledWith(1);
    });
  });
});
