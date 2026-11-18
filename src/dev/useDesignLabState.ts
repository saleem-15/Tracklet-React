import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  readVariantFromUrl,
  writeVariantToUrl,
  type DesignLabVariant,
} from './designLabUtils';

export interface UseDesignLabStateOptions<T extends string = string> {
  labId: string;
  variants: readonly DesignLabVariant<T>[];
  defaultVariant?: T;
  syncUrl?: boolean;
  urlParam?: string;
}

export interface UseDesignLabStateResult<T extends string = string> {
  variant: T;
  setVariant: (variant: T) => void;
  activeVariant: DesignLabVariant<T> | undefined;
  cycleVariant: (direction: 1 | -1) => void;
}

/**
 * Controlled variant selection for a design lab.
 * Reads a deep-linked `?variant=` value on mount and writes it back on change so
 * designers can share an exact variant URL. Callers own the labId namespace; the
 * hook itself stays stateless beyond React state.
 */
export function useDesignLabState<T extends string = string>({
  labId,
  variants,
  defaultVariant,
  syncUrl = true,
  urlParam = 'variant',
}: UseDesignLabStateOptions<T>): UseDesignLabStateResult<T> {
  const variantIds = useMemo(() => variants.map((variant) => variant.id), [variants]);

  const [variant, setVariantState] = useState<T>(() => {
    if (syncUrl) {
      const fromUrl = readVariantFromUrl(variantIds, urlParam);
      if (fromUrl) return fromUrl;
    }
    if (defaultVariant) return defaultVariant;
    return (variants[0]?.id ?? '') as T;
  });

  // Keep selection valid if the caller swaps the variant list. labId scopes this hook.
  useEffect(() => {
    if (variantIds.length === 0) return;
    if (variantIds.includes(variant)) return;
    setVariantState(variantIds[0]);
  }, [labId, variantIds, variant]);

  useEffect(() => {
    if (!syncUrl) return;
    writeVariantToUrl(variant, urlParam);
  }, [syncUrl, variant, urlParam]);

  const setVariant = useCallback((next: T) => {
    setVariantState(next);
  }, []);

  const cycleVariant = useCallback(
    (direction: 1 | -1) => {
      if (variantIds.length === 0) return;
      setVariantState((current) => {
        const index = variantIds.indexOf(current);
        const base = index === -1 ? 0 : index;
        const next = (base + direction + variantIds.length) % variantIds.length;
        return variantIds[next];
      });
    },
    [variantIds]
  );

  const activeVariant = variants.find((candidate) => candidate.id === variant) ?? variants[0];

  return { variant, setVariant, activeVariant, cycleVariant };
}
