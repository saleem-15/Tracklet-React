import { useCallback, useEffect, useState } from 'react';
import {
  BRANDFETCH_CLIENT_ID_STORAGE_KEY,
  LogoPatternMode,
  LOGO_PATTERN_STORAGE_KEY,
  LOGO_SOURCE_STORAGE_KEY,
  LogoSourceMode,
  getBrandfetchClientId,
  getSavedLogoPattern,
  getSavedLogoSource,
  isLogoPatternMode,
  isLogoSourceMode,
  setBrandfetchClientId,
  setSavedLogoPattern,
  setSavedLogoSource,
} from '../lib/logoUtils';

/**
 * Reads and persists the active company-logo display mode.
 *
 * Keeps every logo instance in the app in sync:
 * - same-tab updates arrive via the custom 'tracklet:logo-pattern-changed' event
 * - cross-tab updates arrive via the native 'storage' event
 */
export function useLogoPattern(): [LogoPatternMode, (mode: LogoPatternMode) => void] {
  const [pattern, setPattern] = useState<LogoPatternMode>(getSavedLogoPattern);

  useEffect(() => {
    const handleStorage = (e: Event) => {
      const key = (e as StorageEvent).key;
      if (!key || key === LOGO_PATTERN_STORAGE_KEY) {
        setPattern(getSavedLogoPattern());
      }
    };

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail;
      setPattern(isLogoPatternMode(detail) ? detail : getSavedLogoPattern());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('tracklet:logo-pattern-changed', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('tracklet:logo-pattern-changed', handleCustom);
    };
  }, []);

  const updatePattern = useCallback((newPattern: LogoPatternMode) => {
    setSavedLogoPattern(newPattern);
    setPattern(newPattern);
  }, []);

  return [pattern, updatePattern];
}

/**
 * Reads and persists the active company-logo source plus the lab Brandfetch Client ID.
 *
 * Keeps every logo instance and the floating lab pill in sync:
 * - same-tab updates arrive via the custom 'tracklet:logo-source-changed' event
 * - cross-tab updates arrive via the native 'storage' event
 *
 * Returns `[source, setSource, brandfetchClientId, setClientId]`.
 */
export function useLogoSource(): [
  LogoSourceMode,
  (source: LogoSourceMode) => void,
  string,
  (clientId: string) => void
] {
  const [source, setSource] = useState<LogoSourceMode>(getSavedLogoSource);
  const [clientId, setClientId] = useState<string>(getBrandfetchClientId);

  useEffect(() => {
    const sync = () => {
      setSource(getSavedLogoSource());
      setClientId(getBrandfetchClientId());
    };

    const handleStorage = (e: Event) => {
      const key = (e as StorageEvent).key;
      if (!key || key === LOGO_SOURCE_STORAGE_KEY || key === BRANDFETCH_CLIENT_ID_STORAGE_KEY) {
        sync();
      }
    };

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail;
      setSource(isLogoSourceMode(detail) ? detail : getSavedLogoSource());
      setClientId(getBrandfetchClientId());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('tracklet:logo-source-changed', handleCustom);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('tracklet:logo-source-changed', handleCustom);
    };
  }, []);

  const updateSource = useCallback((newSource: LogoSourceMode) => {
    setSavedLogoSource(newSource);
    setSource(newSource);
  }, []);

  const updateClientId = useCallback((newClientId: string) => {
    setBrandfetchClientId(newClientId);
    setClientId(getBrandfetchClientId());
  }, []);

  return [source, updateSource, clientId, updateClientId];
}
