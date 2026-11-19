import { useMemo } from 'react';
import { useLogoPattern, useLogoSource } from '../hooks/useLogoPattern';
import { useRegisterDesignLab, type RegisteredDesignLab } from './designLabRegistry';
import type { DesignLabVariant } from './designLabUtils';
import type { DesignLabVariablesBinding } from './designLabVariables';
import type { LogoPatternMode, LogoSourceMode } from '../lib/logoUtils';

export const LOGO_LAB_VARIANTS: readonly DesignLabVariant<LogoPatternMode>[] = [
  {
    id: 'smart-keyline',
    label: 'Smart Keyline',
    shortLabel: 'Keyline',
    summary: 'Hairline keyline overlay with dynamic 8-point geometric circle detection and zero-CLS optical breathing room.',
    recommended: true,
  },
  {
    id: 'ghost-squircle',
    label: 'Ghost Squircle',
    shortLabel: 'Ghost',
    summary: 'Linear/Raycast style: quiet surface tint + microscopic keyline + multiply blend.',
  },
  {
    id: 'pure-borderless',
    label: 'Borderless Squircle',
    shortLabel: 'Borderless',
    summary: 'Full-bleed squircle corner clipping with zero outer frame.',
  },
  {
    id: 'original',
    label: 'Baseline',
    shortLabel: 'Baseline',
    summary: 'Legacy production white card with border and shadow.',
  },
];

const LOGO_LAB_VARIABLES_SCHEMA = {
  source: {
    type: 'choice' as const,
    label: 'Source',
    default: 'brandfetch-icon',
    options: [
      { id: 'brandfetch-icon', label: 'BF Icon' },
      { id: 'brandfetch-symbol', label: 'BF Symbol' },
      { id: 'google', label: 'Google' },
    ],
    pinned: true,
  },
};

/**
 * Registers the Company Logo DesignLab with Tracklet's global floating DesignLabBar.
 * Directly binds to `useLogoPattern` and `useLogoSource` with zero URL parameter conflict.
 */
export function useCompanyLogoDesignLab(enabled: boolean = true): void {
  const [pattern, setPattern] = useLogoPattern();
  const [source, setSource] = useLogoSource();

  // Direct, lightweight variables binding without intermediate conflicting state or URL churn
  const variablesBinding = useMemo<DesignLabVariablesBinding>(
    () => ({
      schema: LOGO_LAB_VARIABLES_SCHEMA,
      values: { source },
      setValue: (key, val) => {
        if (key === 'source' && typeof val === 'string') {
          setSource(val as LogoSourceMode);
        }
      },
      resetAll: () => setSource('brandfetch-icon'),
      isDirty: source !== 'brandfetch-icon',
      modifiedCount: source !== 'brandfetch-icon' ? 1 : 0,
      pinnedKeys: ['source'],
      togglePin: () => {},
      snapshots: [],
      saveSnapshot: () => {},
      applySnapshot: () => {},
      deleteSnapshot: () => {},
    }),
    [source, setSource]
  );

  const lab = useMemo<RegisteredDesignLab<LogoPatternMode> | null>(() => {
    if (!enabled) return null;
    return {
      labId: 'company-logo-lab',
      title: 'Company Logos',
      variants: LOGO_LAB_VARIANTS,
      activeVariant: pattern,
      onVariantChange: setPattern,
      baselineVariant: 'original',
      variables: variablesBinding,
    };
  }, [enabled, pattern, setPattern, variablesBinding]);

  useRegisterDesignLab(lab);
}
