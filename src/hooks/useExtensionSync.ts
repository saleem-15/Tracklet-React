import { useEffect, useRef, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { Application, Contact } from '../types';
import { ApplicationRepository } from '../lib/applicationRepository';
import { appendStatusHistory } from '../lib/historyService';
import { 
  setupExtensionSync, 
  syncAuthSessionToExtension, 
  syncApplicationsToExtension, 
  normalizeJobUrl, 
  IncomingEmailPayload 
} from '../lib/extensionSync';

export interface UseExtensionSyncProps {
  user: User | null;
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  applicationsRef: React.MutableRefObject<Application[]>;
  contacts: Contact[];
  dataLoading: boolean;
  handleAddContact: (newContact: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
  setSelectedAppId: (id: string | null) => void;
  addToast: (
    type: 'success' | 'error' | 'info' | 'warning', 
    title: string, 
    message?: string, 
    action?: { label: string; onClick: () => void }
  ) => void;
}

/**
 * useExtensionSync
 * 
 * Domain hook encapsulating Chrome extension integration, background event listeners,
 * real-time session synchronization, application/email ingestion buffer, and contact extraction.
 */
export function useExtensionSync({
  user,
  applications,
  setApplications,
  applicationsRef,
  contacts,
  dataLoading,
  handleAddContact,
  setSelectedAppId,
  addToast,
}: UseExtensionSyncProps): void {
  // Sync Auth Session to Browser Extension on login/logout & token refresh
  useEffect(() => {
    syncAuthSessionToExtension(user);
    // Periodically refresh auth token every 15 minutes to keep extension session fresh
    const interval = setInterval(() => {
      if (user) {
        syncAuthSessionToExtension(user);
      }
    }, 1000 * 60 * 15);
    return () => clearInterval(interval);
  }, [user]);

  // Sync applications and contacts index to Chrome Extension for instant duplicate detection and email matching
  useEffect(() => {
    if (applications.length >= 0) {
      syncApplicationsToExtension(applications, contacts);
    }
  }, [applications, contacts]);

  // Buffer for incoming emails and applications received before applications data load completes
  const pendingEmailPayloadsRef = useRef<IncomingEmailPayload[]>([]);
  const pendingAppPayloadsRef = useRef<{ clippedApp: Application; persistedToCloud?: boolean }[]>([]);
  const dataLoadingRef = useRef(dataLoading);
  useEffect(() => {
    dataLoadingRef.current = dataLoading;
  }, [dataLoading]);

  const handleAddContactRef = useRef(handleAddContact);
  useEffect(() => {
    handleAddContactRef.current = handleAddContact;
  });

  const processIncomingEmail = useCallback(async (payload: IncomingEmailPayload) => {
    const { appId, emailLog, updatedStatus, newContact } = payload;
    let wasAdded = false;
    let updatedTargetApp: Application | null = null;
    let nextApplicationsState: Application[] = [];

    setApplications((prev) => {
      const appIndex = prev.findIndex((a) => a.id === appId);
      if (appIndex < 0) return prev;

      const existingApp = prev[appIndex];
      // Duplicate guard
      if (
        (existingApp.emails || []).some(
          (e) => e.id === emailLog.id || (e.emailUrl && emailLog.emailUrl && e.emailUrl === emailLog.emailUrl)
        )
      ) {
        return prev;
      }

      const updatedEmails = [...(existingApp.emails || []), emailLog];
      const nowISO = new Date().toISOString();

      let updatedApp: Application = {
        ...existingApp,
        emails: updatedEmails,
        updatedAt: nowISO,
      };

      if (updatedStatus && updatedStatus !== existingApp.status) {
        updatedApp.status = updatedStatus;
        updatedApp.stageUpdatedAt = nowISO;
        updatedApp.history = appendStatusHistory(
          existingApp.history,
          updatedStatus,
          existingApp.status,
          nowISO
        );
      }

      const next = [...prev];
      next[appIndex] = updatedApp;

      wasAdded = true;
      updatedTargetApp = updatedApp;
      nextApplicationsState = next;

      return next;
    });

    if (!wasAdded || !updatedTargetApp) {
      if (dataLoadingRef.current) {
        pendingEmailPayloadsRef.current.push(payload);
      }
      return;
    }

    // Persist update outside setApplications updater
    if (user?.emailVerified) {
      ApplicationRepository.updateApplication(appId, updatedTargetApp, user.uid, updatedTargetApp).catch((err) => {
        console.error('Failed to update email log in Firestore:', err);
      });
    } else {
      ApplicationRepository.saveGuestApplications(nextApplicationsState);
    }

    // Acknowledge stored email to extension content script
    try {
      window.postMessage({
        type: 'TRACKLET_EXT_EMAIL_ACK',
        emailLogId: emailLog.id,
      }, window.location.origin);
    } catch {
      // ignore
    }

    // User receipt toast
    addToast(
      'success',
      'Email Logged via Extension',
      `Logged "${emailLog.subject}" to ${(updatedTargetApp as Application).company}`,
      {
        label: 'View',
        onClick: () => {
          setSelectedAppId(appId);
        },
      }
    );

    // Auto-link discovered contact only when email was successfully added
    if (newContact && newContact.name && newContact.email) {
      handleAddContactRef.current({
        name: newContact.name,
        email: newContact.email,
        organization: newContact.organization || undefined,
        category: 'Recruiter',
        applicationIds: [appId],
      }).catch((err) => {
        console.warn('Failed to auto-create contact from email log:', err);
      });
    }
  }, [user, addToast, setApplications, setSelectedAppId]);

  const processIncomingApplication = useCallback(async (clippedApp: Application, persistedToCloud?: boolean) => {
    // Multi-account guard: if tab is logged in and clipped item is explicitly for another user, skip
    if (user && clippedApp.userId && clippedApp.userId !== 'guest' && clippedApp.userId !== user.uid) {
      return;
    }

    // Buffer if applications data is still loading from repository to prevent false duplicates
    if (dataLoadingRef.current) {
      pendingAppPayloadsRef.current.push({ clippedApp, persistedToCloud });
      return;
    }

    const normUrl = clippedApp.jobLink ? normalizeJobUrl(clippedApp.jobLink) : '';
    const currentApps = applicationsRef.current;

    const existingIdx = currentApps.findIndex((a) => {
      const existingNormUrl = a.jobLink ? normalizeJobUrl(a.jobLink) : '';
      if (normUrl && existingNormUrl) {
        return normUrl === existingNormUrl;
      }
      return (
        a.id === clippedApp.id ||
        (a.company.trim().toLowerCase() === clippedApp.company.trim().toLowerCase() &&
         a.role.trim().toLowerCase() === clippedApp.role.trim().toLowerCase())
      );
    });

    const isUpdate = existingIdx >= 0;
    let finalApp = clippedApp;
    let next: Application[];

    if (isUpdate) {
      const existingApp = currentApps[existingIdx];

      // Safe preservation of user progress:
      // 1. If existing status is advanced (e.g. Applied) and clipped app is Saved, preserve user's stage
      const shouldPreserveStatus = existingApp.status !== 'Saved' && clippedApp.status === 'Saved';
      const resolvedStatus = shouldPreserveStatus ? existingApp.status : (clippedApp.status || existingApp.status);
      const resolvedStageUpdatedAt = shouldPreserveStatus ? existingApp.stageUpdatedAt : (clippedApp.stageUpdatedAt || existingApp.stageUpdatedAt);

      // 2. If existing application has non-empty notes and incoming has none/whitespace, preserve existing notes
      const resolvedNotes = (existingApp.notes && existingApp.notes.trim().length > 0)
        ? ((!clippedApp.notes || !clippedApp.notes.trim()) ? existingApp.notes : clippedApp.notes)
        : (clippedApp.notes || '');

      finalApp = {
        ...existingApp,
        ...clippedApp,
        id: existingApp.id, // Preserve existing application ID
        status: resolvedStatus,
        stageUpdatedAt: resolvedStageUpdatedAt,
        notes: resolvedNotes,
        location: clippedApp.location || existingApp.location || '',
        workLocation: clippedApp.workLocation || existingApp.workLocation,
        employmentType: clippedApp.employmentType || existingApp.employmentType,
        contacts: existingApp.contacts && existingApp.contacts.length > 0 ? existingApp.contacts : (clippedApp.contacts || []),
        emails: existingApp.emails && existingApp.emails.length > 0 ? existingApp.emails : (clippedApp.emails || []),
        history: clippedApp.history || existingApp.history,
        updatedAt: new Date().toISOString(),
      };
      next = [...currentApps];
      next[existingIdx] = finalApp;
    } else {
      next = [finalApp, ...currentApps];
    }

    applicationsRef.current = next;
    setApplications(next);

    // Side effects performed strictly outside setApplications with computed values
    if (isUpdate) {
      if (user?.emailVerified) {
        ApplicationRepository.updateApplication(finalApp.id, finalApp, user.uid).catch((err) => {
          console.error('Failed to update application in Firestore:', err);
        });
      }
      addToast(
        'success',
        'Updated via Tracklet Extension',
        `Updated "${finalApp.role}" at ${finalApp.company}`
      );
    } else {
      if (user?.emailVerified && !persistedToCloud) {
        ApplicationRepository.addApplication(finalApp, user.uid).then((created) => {
          applicationsRef.current = applicationsRef.current.map((a) => (a.id === finalApp.id ? created : a));
          setApplications(applicationsRef.current);
        }).catch((err) => {
          console.error('Failed to add unpersisted application to Firestore:', err);
        });
      }
      addToast(
        'success',
        'Clipped via Tracklet Extension',
        `Saved "${finalApp.role}" at ${finalApp.company}`
      );
    }

    if (!user?.emailVerified) {
      ApplicationRepository.saveGuestApplications(next);
    }
  }, [user, addToast, setApplications, applicationsRef]);

  // Drain buffered incoming applications and emails once applications data loading completes
  useEffect(() => {
    if (!dataLoading) {
      if (pendingAppPayloadsRef.current.length > 0) {
        const appQueue = [...pendingAppPayloadsRef.current];
        pendingAppPayloadsRef.current = [];
        appQueue.forEach(({ clippedApp, persistedToCloud }) => {
          processIncomingApplication(clippedApp, persistedToCloud);
        });
      }
      if (pendingEmailPayloadsRef.current.length > 0) {
        const emailQueue = [...pendingEmailPayloadsRef.current];
        pendingEmailPayloadsRef.current = [];
        emailQueue.forEach((payload) => {
          processIncomingEmail(payload);
        });
      }
    }
  }, [dataLoading, processIncomingApplication, processIncomingEmail]);

  // Browser Extension Sync Listener
  useEffect(() => {
    const cleanup = setupExtensionSync({
      onApplicationReceived: (clippedApp, persistedToCloud) => {
        processIncomingApplication(clippedApp, persistedToCloud);
      },
      onEmailReceived: (payload) => {
        processIncomingEmail(payload);
      },
    });

    return () => cleanup();
  }, [processIncomingApplication, processIncomingEmail]);
}
