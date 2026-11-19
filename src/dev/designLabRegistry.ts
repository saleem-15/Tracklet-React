import { useEffect, useSyncExternalStore } from 'react';
import type { DesignLabScenario, DesignLabVariant } from './designLabUtils';
import type { DesignLabVariablesBinding } from './designLabVariables';

export interface RegisteredDesignLab<T extends string = string, S extends string = string> {
  labId: string;
  title: string;
  variants: readonly DesignLabVariant<T>[];
  activeVariant: T;
  onVariantChange: (variant: T) => void;
  baselineVariant?: T;
  variables?: DesignLabVariablesBinding;
  scenarios?: readonly DesignLabScenario<S>[];
  activeScenario?: S;
  onScenarioChange?: (scenario: S) => void;
  forceRender?: boolean;
  topLayer?: boolean;
}

type Listener = () => void;

let currentActiveLab: RegisteredDesignLab<any, any> | null = null;
const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Registers an active feature design lab with the global floating bar.
 * When a component registers a lab, the global DesignLabBar binds to its variants and variables.
 * Returns an unregister cleanup function.
 */
export function registerDesignLab(lab: RegisteredDesignLab<any, any>): () => void {
  currentActiveLab = lab;
  notifyListeners();
  return () => {
    if (currentActiveLab === lab) {
      currentActiveLab = null;
      notifyListeners();
    }
  };
}

/**
 * Returns the currently active registered design lab (or null if none).
 */
export function getActiveDesignLab(): RegisteredDesignLab<any, any> | null {
  return currentActiveLab;
}

/**
 * Subscribes to changes in the active registered design lab.
 */
export function subscribeDesignLab(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * React hook that returns the currently registered design lab, re-rendering on updates.
 */
export function useActiveDesignLab(): RegisteredDesignLab<any, any> | null {
  return useSyncExternalStore(subscribeDesignLab, getActiveDesignLab, getActiveDesignLab);
}

/**
 * Hook for feature views (like CompanyLogo, ActivePipelineBoard, etc.) to register
 * their lab with the global floating bar during their lifecycle.
 */
export function useRegisterDesignLab<T extends string, S extends string>(
  lab: RegisteredDesignLab<T, S> | null
): void {
  useEffect(() => {
    if (!lab) return;
    return registerDesignLab(lab);
  }, [lab]);
}
