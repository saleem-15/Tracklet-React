import { useCallback, useEffect, useRef, useState } from 'react';
import { copyTextToClipboard, formatDesignLabDecision } from './designLabDecision';
import {
  isEditableEventTarget,
  readLabStoredState,
  writeLabStoredState,
  type DesignLabScenario,
  type DesignLabVariant,
} from './designLabUtils';
import type { DesignLabVariablesBinding } from './designLabVariables';

export interface UseLabBarInteractionsOptions<T extends string, S extends string> {
  labId: string;
  title: string;
  variants: readonly DesignLabVariant<T>[];
  activeVariant: T;
  onVariantChange: (variant: T) => void;
  baselineVariant?: T;
  scenarios?: readonly DesignLabScenario<S>[];
  activeScenario?: S;
  variables?: DesignLabVariablesBinding;
}

function resolveDigitIndex(event: KeyboardEvent): number | null {
  if (/^[1-9]$/.test(event.key)) return Number(event.key) - 1;
  const match = /^(?:Digit|Numpad)([1-9])$/.exec(event.code ?? '');
  return match ? Number(match[1]) - 1 : null;
}

function isAltZeroEvent(event: KeyboardEvent): boolean {
  return event.key === '0' || event.code === 'Digit0' || event.code === 'Numpad0';
}

/**
 * Manages Alt+1..9 variant switching, Hold-to-Peek baseline (pointer + Alt+0),
 * variant elimination shortlist persistence, and 1-click decision prompt copy.
 */
export function useLabBarInteractions<T extends string, S extends string>({
  labId,
  title,
  variants,
  activeVariant,
  onVariantChange,
  baselineVariant,
  scenarios,
  activeScenario,
  variables,
}: UseLabBarInteractionsOptions<T, S>) {
  const [eliminatedIds, setEliminatedIds] = useState<string[]>(
    () => readLabStoredState(labId).eliminatedIds ?? []
  );
  const [isPeekingBaseline, setIsPeekingBaseline] = useState(false);
  const [copiedDecision, setCopiedDecision] = useState(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  const peekReturnRef = useRef<T | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canPeekBaseline =
    baselineVariant !== undefined &&
    variants.some((v) => v.id === baselineVariant) &&
    (isPeekingBaseline || activeVariant !== baselineVariant);

  useEffect(() => {
    writeLabStoredState(labId, { eliminatedIds });
  }, [eliminatedIds, labId]);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );

  const toggleEliminate = useCallback((variantId: T) => {
    setEliminatedIds((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  }, []);

  const startPeekBaseline = useCallback(() => {
    if (!baselineVariant || peekReturnRef.current !== null || activeVariant === baselineVariant) return;
    peekReturnRef.current = activeVariant;
    setIsPeekingBaseline(true);
    onVariantChange(baselineVariant);
  }, [activeVariant, baselineVariant, onVariantChange]);

  const stopPeekBaseline = useCallback(() => {
    const returnTo = peekReturnRef.current;
    if (returnTo === null) return;
    peekReturnRef.current = null;
    setIsPeekingBaseline(false);
    onVariantChange(returnTo);
  }, [onVariantChange]);

  const handleCopyDecision = useCallback(() => {
    const snippet = formatDesignLabDecision({
      labId,
      title,
      variants,
      activeVariant: peekReturnRef.current ?? activeVariant,
      scenarios,
      activeScenario,
      eliminatedIds,
      variables: variables ? { schema: variables.schema, values: variables.values } : undefined,
    });
    void copyTextToClipboard(snippet).then((ok) => {
      if (!ok) return;
      setCopiedDecision(true);
      setStatusAnnouncement('Copied design lab decision prompt');
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedDecision(false);
        setStatusAnnouncement('');
      }, 1500);
    });
  }, [activeScenario, activeVariant, eliminatedIds, labId, scenarios, title, variables, variants]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target) || event.ctrlKey || event.metaKey || !event.altKey) {
        return;
      }

      if (baselineVariant && isAltZeroEvent(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) startPeekBaseline();
        return;
      }

      const digitIndex = resolveDigitIndex(event);
      if (digitIndex !== null && digitIndex < variants.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        peekReturnRef.current = null;
        setIsPeekingBaseline(false);
        onVariantChange(variants[digitIndex].id);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (peekReturnRef.current === null) return;
      if (isAltZeroEvent(event) || event.key === 'Alt') stopPeekBaseline();
    };

    const handleBlur = () => {
      if (peekReturnRef.current !== null) stopPeekBaseline();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, [baselineVariant, onVariantChange, startPeekBaseline, stopPeekBaseline, variants]);

  return {
    eliminatedIds,
    toggleEliminate,
    canPeekBaseline,
    isPeekingBaseline,
    startPeekBaseline,
    stopPeekBaseline,
    copiedDecision,
    handleCopyDecision,
    statusAnnouncement,
  };
}
