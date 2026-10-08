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

  const runHandshake = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await pingExtension(EXTENSION_DISTRIBUTION_CONFIG.handshakeTimeoutMs);
      if (!mountedRef.current) return;

      setLastCheckedAt(Date.now());
      setIsChecking(false);

      if (result.installed && result.version) {
        setInstalledVersion(result.version);
        if (isUpdateAvailable(result.version, LATEST_EXTENSION_VERSION)) {
          setStatus('update_available');
        } else {
          setStatus('connected');
        }
      } else {
        setInstalledVersion(null);
        setStatus('not_installed');
      }
    } catch {
      if (!mountedRef.current) return;
      setIsChecking(false);
      setStatus('not_installed');
      setInstalledVersion(null);
    }
  }, []);

  // Run on mount
  useEffect(() => {
    mountedRef.current = true;
    runHandshake();

    // Listen for unsolicited or reload pong messages from extension
    const handleLatePong = (event: MessageEvent) => {
      if (event.source !== window || !event.data) return;
      if (event.data.type === 'TRACKLET_EXT_PONG' && event.data.payload) {
        const payload = event.data.payload;
        if (payload.version) {
          setInstalledVersion(payload.version);
          setLastCheckedAt(Date.now());
          setIsChecking(false);
          if (isUpdateAvailable(payload.version, LATEST_EXTENSION_VERSION)) {
            setStatus('update_available');
          } else {
            setStatus('connected');
          }
        }
      }
    };

    window.addEventListener('message', handleLatePong);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('message', handleLatePong);
    };
  }, [runHandshake]);

  return {
    status,
    installedVersion,
    latestVersion: LATEST_EXTENSION_VERSION,
    isChecking,
    lastCheckedAt,
    recheck: runHandshake,
  };
}
