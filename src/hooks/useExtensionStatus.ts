import { useState, useEffect, useCallback, useRef } from 'react';
import { ExtensionStatus, ExtensionState } from '../types';
import { 
  LATEST_EXTENSION_VERSION, 
  EXTENSION_DISTRIBUTION_CONFIG 
} from '../lib/constants';
import { pingExtension } from '../lib/extensionSync';
import { isUpdateAvailable } from '../lib/versionUtils';

/**
 * Reactive hook that manages the browser extension handshake,
 * detecting installation presence and active version.
 */
export function useExtensionStatus(): ExtensionState {
  const [status, setStatus] = useState<ExtensionStatus>('checking');
  const [installedVersion, setInstalledVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  const mountedRef = useRef(true);
  const statusRef = useRef<ExtensionStatus>(status);
  statusRef.current = status;
  const retryTimersRef = useRef<any[]>([]);

  const clearRetryTimers = useCallback(() => {
    retryTimersRef.current.forEach((t) => clearTimeout(t));
    retryTimersRef.current = [];
  }, []);

  const applyDetectedVersion = useCallback((version: string) => {
    if (!mountedRef.current) return;
    setInstalledVersion(version);
    setLastCheckedAt(Date.now());
    setIsChecking(false);
    clearRetryTimers();

    if (isUpdateAvailable(version, LATEST_EXTENSION_VERSION)) {
      setStatus('update_available');
    } else {
      setStatus('connected');
    }
  }, [clearRetryTimers]);

  const runHandshake = useCallback(async (): Promise<{ status: ExtensionStatus; version: string | null }> => {
    setIsChecking(true);

    // 1. Instant check: did content.js already set DOM attribute markers?
    if (typeof document !== 'undefined' && document.documentElement) {
      const isDomInstalled = document.documentElement.getAttribute('data-tracklet-extension-installed') === 'true';
      const domVersion = document.documentElement.getAttribute('data-tracklet-extension-version');
      if (isDomInstalled && domVersion) {
        applyDetectedVersion(domVersion);
        const resolvedStatus = isUpdateAvailable(domVersion, LATEST_EXTENSION_VERSION) ? 'update_available' : 'connected';
        return { status: resolvedStatus, version: domVersion };
      }
    }

    try {
      const result = await pingExtension(EXTENSION_DISTRIBUTION_CONFIG.handshakeTimeoutMs);
      if (!mountedRef.current) return { status: 'not_installed', version: null };

      setLastCheckedAt(Date.now());
      setIsChecking(false);

      if (result.installed && result.version) {
        applyDetectedVersion(result.version);
        const resolvedStatus = isUpdateAvailable(result.version, LATEST_EXTENSION_VERSION) ? 'update_available' : 'connected';
        return { status: resolvedStatus, version: result.version };
      } else {
        // Only set not_installed if we haven't already connected via another event
        if (statusRef.current !== 'connected' && statusRef.current !== 'update_available') {
          setInstalledVersion(null);
          setStatus('not_installed');
        }
        return { status: 'not_installed', version: null };
      }
    } catch {
      if (!mountedRef.current) return { status: 'not_installed', version: null };
      setIsChecking(false);
      if (statusRef.current !== 'connected' && statusRef.current !== 'update_available') {
        setStatus('not_installed');
        setInstalledVersion(null);
      }
      return { status: 'not_installed', version: null };
    }
  }, [applyDetectedVersion]);

  // Run on mount, listen for events, and schedule progressive detection retries
  useEffect(() => {
    mountedRef.current = true;

    // Initial check
    runHandshake();

    // 2. Progressive backoff retries to catch late content script injection (run_at: document_idle)
    const retryDelays = [400, 1000, 2200, 4200];
    retryDelays.forEach((delay) => {
      const timer = setTimeout(() => {
        if (mountedRef.current && statusRef.current !== 'connected' && statusRef.current !== 'update_available') {
          runHandshake();
        }
      }, delay);
      retryTimersRef.current.push(timer);
    });

    // 3. Listen for unsolicited or reload pong messages from extension
    const handleLatePong = (event: MessageEvent) => {
      if (event.source !== window || !event.data) return;
      if (event.data.type === 'TRACKLET_EXT_PONG' && event.data.payload) {
        const payload = event.data.payload;
        if (payload.version) {
          applyDetectedVersion(payload.version);
        }
      }
    };

    // 4. Listen for synchronous custom event dispatched by content.js
    const handleCustomReady = (event: Event) => {
      const customEvt = event as CustomEvent;
      const version = customEvt.detail?.version;
      if (version) {
        applyDetectedVersion(version);
      }
    };

    // 5. Auto re-check on tab focus or visibility change (e.g. user reloaded extension in chrome://extensions)
    const handleTabReactivation = () => {
      if (document.visibilityState === 'visible' && statusRef.current !== 'connected') {
        runHandshake();
      }
    };

    // 6. MutationObserver on documentElement to catch DOM attribute stamping without polling
    let observer: MutationObserver | null = null;
    try {
      if (typeof document !== 'undefined' && document.documentElement && typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(() => {
          const domVersion = document.documentElement.getAttribute('data-tracklet-extension-version');
          if (domVersion) {
            applyDetectedVersion(domVersion);
          }
        });
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-tracklet-extension-installed', 'data-tracklet-extension-version'],
        });
      }
    } catch {
      // Safe fallback if MutationObserver is restricted
    }

    window.addEventListener('message', handleLatePong);
    window.addEventListener('tracklet:extension:ready', handleCustomReady);
    window.addEventListener('focus', handleTabReactivation);
    document.addEventListener('visibilitychange', handleTabReactivation);

    return () => {
      mountedRef.current = false;
      clearRetryTimers();
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('message', handleLatePong);
      window.removeEventListener('tracklet:extension:ready', handleCustomReady);
      window.removeEventListener('focus', handleTabReactivation);
      document.removeEventListener('visibilitychange', handleTabReactivation);
    };
  }, [runHandshake, applyDetectedVersion, clearRetryTimers]);

  return {
    status,
    installedVersion,
    latestVersion: LATEST_EXTENSION_VERSION,
    isChecking,
    lastCheckedAt,
    recheck: runHandshake,
  };
}
