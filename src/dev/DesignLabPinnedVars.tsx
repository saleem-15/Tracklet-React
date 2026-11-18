import { LAB_FOCUS_RING, LAB_TRANSITION } from './DesignLabBarChrome';
import { LabTooltip } from './DesignLabTooltip';
import type { DesignLabSurface } from './designLabUtils';
import {
  normalizeChoiceOptions,
  type DesignLabVariableDef,
  type DesignLabVariablePrimitive,
  type DesignLabVariablesBinding,
} from './designLabVariables';

export interface DesignLabPinnedVarsProps {
  variables: DesignLabVariablesBinding;
  surface: DesignLabSurface;
  barTop: number;
}

const MAX_PINNED_VISIBLE = 2;

function renderPinnedControl(
  key: string,
  def: DesignLabVariableDef,
  value: DesignLabVariablePrimitive,
  onChange: (next: DesignLabVariablePrimitive) => void,
  surface: DesignLabSurface,
  barTop: number
) {
  const isDark = surface === 'dark';
  const chipBase = `flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold select-none cursor-pointer active:scale-[0.95] ${LAB_TRANSITION} ${LAB_FOCUS_RING}`;
  const inactiveChip = isDark
    ? 'bg-white/[0.06] text-white/80 hover:text-white hover:bg-white/[0.12]'
    : 'bg-black/[0.05] text-neutral-700 hover:text-neutral-900 hover:bg-black/[0.09]';
  const activeChip = isDark
    ? 'bg-white/[0.16] text-white'
    : 'bg-neutral-900 text-white';

  if (def.type === 'boolean') {
    const checked = Boolean(value);
    return (
      <LabTooltip key={key} label={`Toggle ${def.label}`} surface={surface} barTop={barTop}>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          data-testid={`design-lab-pinned-${key}`}
          onClick={() => onChange(!checked)}
          className={`${chipBase} ${checked ? activeChip : inactiveChip}`}
        >
          <span>{def.label}</span>
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              checked ? 'bg-emerald-400' : isDark ? 'bg-white/30' : 'bg-neutral-400'
            }`}
          />
        </button>
      </LabTooltip>
    );
  }

  if (def.type === 'choice') {
    const options = normalizeChoiceOptions(def.options);
    const currentIndex = Math.max(0, options.findIndex((o) => o.id === value));
    const current = options[currentIndex];
    const next = options[(currentIndex + 1) % options.length];
    return (
      <LabTooltip key={key} label={`${def.label} (click to cycle)`} surface={surface} barTop={barTop}>
        <button
          type="button"
          data-testid={`design-lab-pinned-${key}`}
          onClick={() => next && onChange(next.id)}
          className={`${chipBase} ${inactiveChip}`}
        >
          <span className={`font-mono text-[9px] uppercase tracking-wider ${isDark ? 'text-white/55' : 'text-neutral-500'}`}>
            {def.label}
          </span>
          <span>{current?.label ?? String(value)}</span>
        </button>
      </LabTooltip>
    );
  }

  if (def.type === 'color') {
    const currentIndex = Math.max(0, def.options.findIndex((o) => o.id === value));
    const current = def.options[currentIndex];
    const next = def.options[(currentIndex + 1) % def.options.length];
    return (
      <LabTooltip key={key} label={`${def.label}: ${current?.label ?? String(value)}`} surface={surface} barTop={barTop}>
        <button
          type="button"
          data-testid={`design-lab-pinned-${key}`}
          onClick={() => next && onChange(next.id)}
          className={`${chipBase} ${inactiveChip}`}
        >
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-black/15 ${current?.swatchClass ?? ''}`}
          />
          <span>{current?.label ?? def.label}</span>
        </button>
      </LabTooltip>
    );
  }

  const num = typeof value === 'number' ? value : def.default;
  const step = def.step && def.step > 0 ? def.step : 1;
  const nextVal = num + step > def.max ? def.min : num + step;
  return (
    <LabTooltip key={key} label={`${def.label} (click to step)`} surface={surface} barTop={barTop}>
      <button
        type="button"
        data-testid={`design-lab-pinned-${key}`}
        onClick={() => onChange(nextVal)}
        className={`${chipBase} ${inactiveChip}`}
      >
        <span className={`font-mono text-[9px] uppercase tracking-wider ${isDark ? 'text-white/55' : 'text-neutral-500'}`}>
          {def.label}
        </span>
        <span className="font-mono tabular-nums">
          {num}
          {def.unit ?? ''}
        </span>
      </button>
    </LabTooltip>
  );
}

/** Renders up to 2 pinned variables directly on the capsule toolbar. */
export function DesignLabPinnedVars({ variables, surface, barTop }: DesignLabPinnedVarsProps) {
  const keys = variables.pinnedKeys.slice(0, MAX_PINNED_VISIBLE);
  if (keys.length === 0) return null;

  return (
    <div role="group" aria-label="Pinned variables" className="flex items-center gap-1">
      {keys.map((key) => {
        const def = variables.schema[key];
        if (!def) return null;
        return renderPinnedControl(
          key,
          def,
          variables.values[key],
          (next) => variables.setValue(key, next),
          surface,
          barTop
        );
      })}
    </div>
  );
}
