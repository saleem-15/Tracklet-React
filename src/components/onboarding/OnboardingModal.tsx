import React, { useState, useEffect, useRef } from 'react';
import { Application } from '../../types';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { useAuth } from '../../context/AuthContext';
import { EntitlementRepository } from '../../lib/entitlementRepository';
import { LOCAL_STORAGE_KEYS, EXTENSION_DISTRIBUTION_CONFIG } from '../../lib/constants';
import { useNavigation } from '../../context/NavigationContext';
import { useExtensionContext } from '../../context/ExtensionContext';
import posthog from '../../lib/posthog';
import { OnboardingModalHeader } from './OnboardingModalHeader';
import { OnboardingModalFooter } from './OnboardingModalFooter';
import { WorkspaceSetupStep } from './steps/WorkspaceSetupStep';
import { ExtensionGuideStep } from './steps/ExtensionGuideStep';
import { CapabilitiesStep } from './steps/CapabilitiesStep';

export interface OnboardingModalProps {
  isOpen: boolean;
  initialStep?: number;
  onClose: () => void;
  onImportCSV?: () => void;
  onBatchImportCSV?: (
    apps: Omit<Application, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'stageUpdatedAt'>[]
  ) => Promise<boolean | void>;
  onSeedDemoData?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  totalAppCount?: number;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  initialStep = 1,
  onClose,
  onImportCSV,
  onBatchImportCSV,
  onSeedDemoData,
  onShowToast,
  totalAppCount = 0,
}) => {
  const { user } = useAuth();
  const { openExtensionModal } = useNavigation();
  const extensionState = useExtensionContext();
  const isExtensionConnected = extensionState.status === 'connected';

  const [step, setStep] = useState<number>(initialStep);
  const [isCompleting, setIsCompleting] = useState(false);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Sync initialStep when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      posthog.capture('onboarding_opened', { initialStep });
    } else if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
    }
  }, [isOpen, initialStep]);

  // Escape key handler
  useEscapeKey(() => handleDismiss('escape'), isOpen);

  // Multi-tab sync via storage events
  useEffect(() => {
    if (!isOpen || !user?.uid) return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `${LOCAL_STORAGE_KEYS.ONBOARDING_COMPLETED_PREFIX}${user.uid}`) {
        onClose();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isOpen, user?.uid, onClose]);

  if (!isOpen) return null;

  const persistCompletion = async (isCompleted: boolean, reason?: string) => {
    if (!user?.uid) return;
    const key = `${LOCAL_STORAGE_KEYS.ONBOARDING_COMPLETED_PREFIX}${user.uid}`;
    try {
      localStorage.setItem(key, 'true');
    } catch {
      // Ignore localStorage exceptions in private browsing
    }

    const nowISO = new Date().toISOString();
    await EntitlementRepository.updateOnboardingState(user.uid, {
      completed: isCompleted,
      completedAt: isCompleted ? nowISO : null,
      dismissed: !isCompleted,
      dismissedAt: !isCompleted ? nowISO : null,
      lastStepViewed: step,
    });
  };

  const handleDismiss = (reason: string = 'skip') => {
    onClose();
    posthog.capture('onboarding_dismissed', { step, reason });
    persistCompletion(false, reason).catch((err) => {
      console.warn('Failed to persist onboarding dismissal:', err);
    });
  };

  const handleComplete = () => {
    setIsCompleting(true);
    onClose();
    onShowToast?.('success', 'Welcome to Tracklet!', 'Your workspace is ready.');
    posthog.capture('onboarding_completed');
    persistCompletion(true).catch((err) => {
      console.warn('Failed to persist onboarding completion:', err);
    });
  };

  const handleDownloadExtension = () => {
    onShowToast?.(
      'info',
      'Download Started',
      `Downloading ${EXTENSION_DISTRIBUTION_CONFIG.downloadFilename} (v${extensionState.latestVersion}).`
    );
  };

  const advanceToStep = (nextStep: number) => {
    posthog.capture('onboarding_step_viewed', { step: nextStep });
    setStep(nextStep);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => handleDismiss('backdrop')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Step Indicator & Stepper Dots */}
        <OnboardingModalHeader
          step={step}
          onDismiss={() => handleDismiss('close_button')}
        />

        {/* Modal Body - 3-Act Narrative */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <WorkspaceSetupStep
              onContinue={() => advanceToStep(2)}
              onLaunchCSVImport={onImportCSV}
              onImportCSV={onBatchImportCSV}
              onSeedDemoData={onSeedDemoData}
              onShowToast={onShowToast}
              totalAppCount={totalAppCount}
            />
          )}

          {step === 2 && (
            <ExtensionGuideStep
              onBack={() => setStep(1)}
              onContinue={() => advanceToStep(3)}
              onOpenExtensionModal={openExtensionModal}
              onShowToast={onShowToast}
            />
          )}

          {step === 3 && (
            <CapabilitiesStep
              onBack={() => setStep(2)}
              onComplete={handleComplete}
              isCompleting={isCompleting}
            />
          )}
        </div>

        {/* Modal Footer - Single Source of Navigation Controls (Deduplicated Step Counter) */}
        <OnboardingModalFooter
          step={step}
          isExtensionConnected={isExtensionConnected}
          isCompleting={isCompleting}
          onBack={() => setStep((s) => s - 1)}
          onSkip={() => handleDismiss('skip_link')}
          onAdvanceToStep={advanceToStep}
          onDownloadExtension={handleDownloadExtension}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
};
