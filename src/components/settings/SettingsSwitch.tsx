import React from 'react';

export interface SettingsSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}

/**
 * SettingsSwitch
 *
 * Accessible toggle control adhering to Apple HIG and WCAG 2.2 touch guidelines:
 * - 44x44px invisible tap target container
 * - Command Blue (`bg-blue-600`) active hue (replacing alarming amber)
 * - Clear keyboard focus rings
 * - Explicit role="switch" and aria-checked semantics
 */
export const SettingsSwitch: React.FC<SettingsSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  id,
}) => {
  return (
    <label
      htmlFor={id}
      className={`relative inline-flex items-center justify-center p-2.5 -m-2.5 select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
      title={label}
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      {/* Track */}
      <div
        className={`w-11 h-6 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/20 ${
          checked ? 'bg-blue-600' : 'bg-slate-200'
        }`}
      >
        {/* Thumb */}
        <div
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  );
};
