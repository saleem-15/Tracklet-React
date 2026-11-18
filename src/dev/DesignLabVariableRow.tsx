import { Pin } from 'lucide-react';
import { LAB_FOCUS_RING, LAB_TRANSITION } from './DesignLabBarChrome';
import { LAB_POPOVER_SKINS } from './DesignLabPopoverChrome';
import type { DesignLabSurface } from './designLabUtils';
import {
  normalizeChoiceOptions,
  type DesignLabVariableDef,
  type DesignLabVariablePrimitive,
} from './designLabVariables';

export interface DesignLabVariableRowProps {
  varKey: string;
  def: DesignLabVariableDef;
  value: DesignLabVariablePrimitive;
  isPinned: boolean;
  surface: DesignLabSurface;
  onChange: (next: DesignLabVariablePrimitive) => void;
  onTogglePin: () => void;
}

export function DesignLabVariableRow({
  varKey,
  def,
  value,
  isPinned,
  surface,
  onChange,
  onTogglePin,
}: DesignLabVariableRowProps) {
  const isDark = surface === 'dark';
  const skin = LAB_POPOVER_SKINS[surface];
  const pinClass = isPinned
    ? isDark
      ? 'text-white bg-white/[0.15]'
      : 'text-neutral-900 bg-black/[0.08]'
    : isDark
      ? 'text-white/40 hover:text-white/85 hover:bg-white/[0.08]'
      : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/[0.06]';

  const header = (
    <div className="flex items-center justify-between gap-2">
      <span className={`text-[11px] font-medium ${skin.heading}`}>{def.label}</span>
      <div className="flex items-center gap-1.5">
        {def.type === 'range' && (
          <button
            type="button"
            onDoubleClick={() => onChange(def.default)}
            aria-label={`Double-click to reset ${def.label} to ${def.default}${def.unit ?? ''}`}
            data-testid={`design-lab-var-readout-${varKey}`}
            className={`font-mono text-[10px] tabular-nums cursor-pointer rounded px-1 py-0.5 ${LAB_FOCUS_RING} ${skin.meta} ${skin.itemHover}`}
          >
            {typeof value === 'number' ? value : def.default}
            {def.unit ?? ''}
          </button>
        )}
        <button
          type="button"
          aria-pressed={isPinned}
          aria-label={isPinned ? `Unpin ${def.label} from bar` : `Pin ${def.label} to bar`}
          data-testid={`design-lab-pin-${varKey}`}
          onClick={onTogglePin}
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full cursor-pointer ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${pinClass}`}
        >
          <Pin className="w-2.5 h-2.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  if (def.type === 'boolean') {
    const checked = Boolean(value);
    return (
      <div className="flex items-center justify-between gap-2 py-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[11px] font-medium truncate ${skin.heading}`}>{def.label}</span>
          <button
            type="button"
            aria-pressed={isPinned}
            aria-label={isPinned ? `Unpin ${def.label} from bar` : `Pin ${def.label} to bar`}
            data-testid={`design-lab-pin-${varKey}`}
            onClick={onTogglePin}
            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full cursor-pointer ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${pinClass}`}
          >
            <Pin className="w-2.5 h-2.5" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={def.label}
          data-testid={`design-lab-var-${varKey}`}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 cursor-pointer transition-colors duration-150 ${LAB_FOCUS_RING} ${
            checked
              ? isDark
                ? 'bg-white/90'
                : 'bg-neutral-900'
              : isDark
                ? 'bg-white/15'
                : 'bg-black/15'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-4 w-4 rounded-full transition-transform duration-150 ease-out motion-reduce:transition-none ${
              checked
                ? `translate-x-4 ${isDark ? 'bg-neutral-900' : 'bg-white'}`
                : `translate-x-0 ${isDark ? 'bg-white' : 'bg-white shadow-xs'}`
            }`}
          />
        </button>
      </div>
    );
  }

  if (def.type === 'choice') {
    const options = normalizeChoiceOptions(def.options);
    return (
      <div className="space-y-1.5">
        {header}
        <div
          role="radiogroup"
          aria-label={def.label}
          className={`grid gap-0.5 rounded-full p-0.5 ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]'}`}
          style={{ gridTemplateColumns: `repeat(${Math.max(1, options.length)}, minmax(0, 1fr))` }}
        >
          {options.map((option) => {
            const selected = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`design-lab-var-${varKey}-${option.id}`}
                onClick={() => onChange(option.id)}
                className={`rounded-full px-2 py-1 text-[10px] font-semibold truncate cursor-pointer ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
                  selected
                    ? isDark
                      ? 'bg-white/[0.16] text-white'
                      : 'bg-white text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                    : isDark
                      ? 'text-white/65 hover:text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (def.type === 'color') {
    return (
      <div className="space-y-1.5">
        {header}
        <div role="radiogroup" aria-label={def.label} className="flex flex-wrap items-center gap-2.5 py-0.5">
          {def.options.map((option) => {
            const selected = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${def.label}: ${option.label}`}
                data-testid={`design-lab-var-${varKey}-${option.id}`}
                onClick={() => onChange(option.id)}
                className={`h-5 w-5 rounded-full cursor-pointer ${option.swatchClass} ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
                  selected
                    ? isDark
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110'
                      : 'ring-2 ring-neutral-900 ring-offset-2 ring-offset-white scale-110'
                    : 'opacity-80 hover:opacity-100 hover:scale-105'
                }`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const num = typeof value === 'number' ? value : def.default;
  return (
    <div className="space-y-1">
      {header}
      <div className="flex h-5 items-center px-0.5">
        <input
          type="range"
          min={def.min}
          max={def.max}
          step={def.step ?? 1}
          value={num}
          aria-label={def.label}
          data-testid={`design-lab-var-${varKey}`}
          onChange={(event) => onChange(Number(event.target.value))}
          onDoubleClick={() => onChange(def.default)}
          className={`h-1.5 w-full cursor-pointer appearance-none rounded-full ${LAB_FOCUS_RING} ${
            isDark ? 'bg-white/15 accent-white' : 'bg-black/15 accent-neutral-900'
          }`}
        />
      </div>
    </div>
  );
}
