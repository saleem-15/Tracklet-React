import { type ReactNode } from 'react';
import { Pin } from 'lucide-react';
import { motion } from 'motion/react';
import {
  AGENTATION_CONTENT_EASE,
  LAB_FOCUS_RING,
  LAB_TRANSITION,
} from './DesignLabBarChrome';
import { LAB_POPOVER_SKINS } from './DesignLabPopoverChrome';
import { isActTestEnvironment, type DesignLabSurface } from './designLabUtils';
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
  reducedMotion?: boolean;
  onChange: (next: DesignLabVariablePrimitive) => void;
  onTogglePin: () => void;
}

const ROW_CLASS = 'flex items-center justify-between gap-3 py-1.5';
const LABEL_SIDE_CLASS = 'flex min-w-0 items-center gap-1.5';

export function DesignLabVariableRow({
  varKey,
  def,
  value,
  isPinned,
  surface,
  reducedMotion = false,
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

  const labelSide = (
    <div className={LABEL_SIDE_CLASS}>
      <span className={`truncate text-[11px] font-medium ${skin.heading}`}>{def.label}</span>
      <button
        type="button"
        aria-pressed={isPinned}
        aria-label={isPinned ? `Unpin ${def.label} from bar` : `Pin ${def.label} to bar`}
        data-testid={`design-lab-pin-${varKey}`}
        onClick={onTogglePin}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full cursor-pointer active:scale-[0.92] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${pinClass}`}
      >
        <Pin className="w-2.5 h-2.5" aria-hidden="true" />
      </button>
    </div>
  );

  /** Single horizontal row: label + pin left, the variable's control right. */
  const row = (control: ReactNode) => (
    <div className={ROW_CLASS}>
      {labelSide}
      {control}
    </div>
  );

  if (def.type === 'boolean') {
    const checked = Boolean(value);
    return row(
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
    );
  }

  if (def.type === 'choice') {
    const options = normalizeChoiceOptions(def.options);
    const instant = reducedMotion || isActTestEnvironment();
    return row(
      <div
        role="radiogroup"
        aria-label={def.label}
        className={`relative flex shrink-0 items-center gap-0.5 rounded-full p-0.5 ${
          isDark ? 'bg-white/[0.06]' : 'bg-black/[0.05]'
        }`}
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
              className={`relative max-w-[76px] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold select-none cursor-pointer active:scale-[0.92] ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
                selected
                  ? isDark
                    ? 'text-white'
                    : 'text-neutral-900'
                  : isDark
                    ? 'text-white/65 hover:text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {selected && (
                <motion.span
                  layoutId={`design-lab-choice-indicator-${varKey}`}
                  data-testid={`design-lab-choice-indicator-${varKey}`}
                  className={`pointer-events-none absolute inset-0 rounded-full ${
                    isDark
                      ? 'bg-white/[0.18]'
                      : 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                  }`}
                  transition={
                    instant
                      ? { duration: 0 }
                      : { duration: 0.18, ease: AGENTATION_CONTENT_EASE }
                  }
                />
              )}
              <span className="relative z-10 truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (def.type === 'color') {
    return row(
      <div role="radiogroup" aria-label={def.label} className="flex shrink-0 items-center gap-2">
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
              className={`h-4 w-4 rounded-full cursor-pointer active:scale-[0.92] ${option.swatchClass} ${LAB_TRANSITION} ${LAB_FOCUS_RING} ${
                selected
                  ? isDark
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900'
                    : 'ring-2 ring-neutral-900 ring-offset-2 ring-offset-white'
                  : 'opacity-80 hover:opacity-100'
              }`}
            />
          );
        })}
      </div>
    );
  }

  const num = typeof value === 'number' ? value : def.default;
  return row(
    <div className="flex w-full max-w-[145px] items-center gap-2">
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
        className={`h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full ${LAB_FOCUS_RING} ${
          isDark ? 'bg-white/15 accent-white' : 'bg-black/15 accent-neutral-900'
        }`}
      />
      <button
        type="button"
        onDoubleClick={() => onChange(def.default)}
        aria-label={`Double-click to reset ${def.label} to ${def.default}${def.unit ?? ''}`}
        data-testid={`design-lab-var-readout-${varKey}`}
        className={`shrink-0 rounded px-1 py-0.5 font-mono text-[10px] tabular-nums cursor-pointer ${LAB_FOCUS_RING} ${skin.meta} ${skin.itemHover}`}
      >
        {num}
        {def.unit ?? ''}
      </button>
    </div>
  );
}
