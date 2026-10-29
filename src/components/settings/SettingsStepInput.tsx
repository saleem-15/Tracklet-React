import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface SettingsStepInputProps {
  valueHours: number;
  onChangeHours: (hours: number) => void;
  minHours?: number;
  maxHours?: number;
}

/**
 * SettingsStepInput
 *
 * Precision stepped threshold control with dual-unit awareness (Hours vs Days).
 * Eliminates the confusing, non-standard 1h-168h continuous slider in favor of
 * clear, predictable numerical stepping with full keyboard and touchscreen support.
 */
export const SettingsStepInput: React.FC<SettingsStepInputProps> = ({
  valueHours,
  onChangeHours,
  minHours = 1,
  maxHours = 720, // 30 days
}) => {
  const [unit, setUnit] = useState<'hours' | 'days'>(() => (valueHours >= 48 && valueHours % 24 === 0 ? 'days' : 'hours'));

  const isDays = unit === 'days';
  const displayValue = isDays ? Math.round(valueHours / 24) : valueHours;

  const handleStep = (delta: number) => {
    const stepHours = isDays ? delta * 24 : delta;
    const next = Math.max(minHours, Math.min(maxHours, valueHours + stepHours));
    onChangeHours(next);
  };

  const handleDirectChange = (raw: string) => {
    const num = parseInt(raw, 10);
    if (isNaN(num)) return;
    const targetHours = isDays ? num * 24 : num;
    const clamped = Math.max(minHours, Math.min(maxHours, targetHours));
    onChangeHours(clamped);
  };

  const toggleUnit = (nextUnit: 'hours' | 'days') => {
    setUnit(nextUnit);
    if (nextUnit === 'days' && valueHours < 24) {
      onChangeHours(24);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Stepper container */}
      <div className="flex items-center border border-slate-200 bg-white rounded-xl shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => handleStep(-1)}
          disabled={valueHours <= minHours}
          aria-label={`Decrease by 1 ${isDays ? 'day' : 'hour'}`}
          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="px-2 border-x border-slate-100 min-w-[50px] text-center">
          <input
            type="number"
            min={isDays ? 1 : minHours}
            max={isDays ? Math.floor(maxHours / 24) : maxHours}
            value={displayValue}
            onChange={(e) => handleDirectChange(e.target.value)}
            aria-label="Expiry alert threshold value"
            className="w-12 text-center font-mono text-xs font-bold text-slate-900 bg-transparent focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => handleStep(1)}
          disabled={valueHours >= maxHours}
          aria-label={`Increase by 1 ${isDays ? 'day' : 'hour'}`}
          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Unit Selector */}
      <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80 text-xs font-semibold">
        <button
          type="button"
          onClick={() => toggleUnit('hours')}
          className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
            !isDays
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Hours
        </button>
        <button
          type="button"
          onClick={() => toggleUnit('days')}
          className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
            isDays
              ? 'bg-white text-slate-900 shadow-2xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Days
        </button>
      </div>
    </div>
  );
};
