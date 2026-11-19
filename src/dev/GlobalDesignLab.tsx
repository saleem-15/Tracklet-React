import { useEffect, useMemo } from 'react';
import { DesignLabBar } from './DesignLabBar';
import { useDesignLabState } from './useDesignLabState';
import { useDesignLabVariables } from './useDesignLabVariables';
import { useActiveDesignLab } from './designLabRegistry';
import type { DesignLabVariant } from './designLabUtils';
import type { DesignLabVariableSchema } from './designLabVariables';

export type GlobalWorkspaceVariant = 'standard' | 'dense' | 'calm';

const GLOBAL_VARIANTS: readonly DesignLabVariant<GlobalWorkspaceVariant>[] = [
  {
    id: 'standard',
    label: 'Standard Hub',
    shortLabel: 'Standard',
    summary: 'Production baseline spacing, standard padding, and balanced card typography.',
  },
  {
    id: 'dense',
    label: 'Dense Scanner',
    shortLabel: 'Dense',
    summary: 'High-density row scanning, compact padding, and left-aligned metrics.',
    recommended: true,
  },
  {
    id: 'calm',
    label: 'Calm Canvas',
    shortLabel: 'Calm',
    summary: 'Expanded breathing room, softer card outlines, and ambient calm.',
  },
];

const GLOBAL_VARIABLES: DesignLabVariableSchema = {
  density: {
    type: 'choice',
    label: 'Density',
    default: 'normal',
    options: [
      { id: 'tight', label: 'Tight (36px)' },
      { id: 'normal', label: 'Normal (44px)' },
      { id: 'relaxed', label: 'Relaxed (52px)' },
    ],
    pinned: true,
  },
  radius: {
    type: 'range',
    label: 'Corner radius',
    default: 8,
    min: 0,
    max: 24,
    step: 2,
    unit: 'px',
    pinned: true,
  },
  contrastKeylines: {
    type: 'boolean',
    label: 'Keyline borders',
    default: false,
  },
  accentStrip: {
    type: 'choice',
    label: 'Accent brand',
    default: 'blue',
    options: [
      { id: 'blue', label: 'Tracklet Blue' },
      { id: 'slate', label: 'Slate Minimal' },
      { id: 'emerald', label: 'Emerald Signal' },
    ],
  },
};

export interface GlobalDesignLabProps {
  forceRender?: boolean;
}

/**
 * Global floating DesignLabBar mounted at the application root during development.
 *
 * If a feature view (e.g., CompanyLogo, TimelineLab, TableScanLab) registers an active lab
 * via `useRegisterDesignLab`, this component automatically binds to and surfaces that lab.
 * Otherwise, it surfaces the global Tracklet workspace layout and density lab.
 */
export function GlobalDesignLab({ forceRender = false }: GlobalDesignLabProps) {
  const registeredLab = useActiveDesignLab();

  const { variant, setVariant } = useDesignLabState<GlobalWorkspaceVariant>({
    labId: 'tracklet-global-lab',
    variants: GLOBAL_VARIANTS,
    defaultVariant: 'standard',
  });

  const vars = useDesignLabVariables('tracklet-global-lab', GLOBAL_VARIABLES);

  // Sync global variables to CSS custom properties & data attributes on documentElement
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    const radius = Number(vars.values.radius ?? 8);
    root.style.setProperty('--tracklet-radius', `${radius}px`);

    const density = String(vars.values.density ?? 'normal');
    root.setAttribute('data-tracklet-density', density);

    const contrast = Boolean(vars.values.contrastKeylines);
    root.setAttribute('data-tracklet-contrast', contrast ? 'high' : 'normal');

    const accent = String(vars.values.accentStrip ?? 'blue');
    root.setAttribute('data-tracklet-accent', accent);
    root.setAttribute('data-tracklet-variant', variant);

    return () => {
      root.style.removeProperty('--tracklet-radius');
      root.removeAttribute('data-tracklet-density');
      root.removeAttribute('data-tracklet-contrast');
      root.removeAttribute('data-tracklet-accent');
      root.removeAttribute('data-tracklet-variant');
    };
  }, [vars.values.radius, vars.values.density, vars.values.contrastKeylines, vars.values.accentStrip, variant]);

  // If a feature-specific lab is registered, render that lab directly
  if (registeredLab) {
    return (
      <DesignLabBar
        {...registeredLab}
        title={registeredLab.title}
        forceRender={forceRender || registeredLab.forceRender}
      />
    );
  }

  return (
    <DesignLabBar
      labId="tracklet-global-lab"
      title="Tracklet Lab"
      variants={GLOBAL_VARIANTS}
      activeVariant={variant}
      onVariantChange={setVariant}
      baselineVariant="standard"
      variables={vars}
      forceRender={forceRender}
    />
  );
}

export default GlobalDesignLab;
