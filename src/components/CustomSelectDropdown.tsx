import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { UI_TOKENS } from '../theme/tokens';

export interface SelectOption<T = string | number> {
  label: string;
  value: T;
  icon?: React.ReactNode;
}

interface CustomSelectDropdownProps<T = string | number> {
  value: T;
  onChange: (val: T) => void;
  options: SelectOption<T>[];
  labelPrefix?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'filter' | 'subtle';
  isActive?: boolean;
  className?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export function CustomSelectDropdown<T extends string | number = string>({
  value,
  onChange,
  options,
  labelPrefix,
  placeholder = 'Select...',
  size = 'md',
  variant = 'default',
  isActive = false,
  className = '',
  menuClassName = '',
  disabled = false,
}: CustomSelectDropdownProps<T>): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: T) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  const getButtonStyles = () => {
    if (disabled) {
      return 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed';
    }

    if (variant === 'filter') {
      if (isActive) {
        return 'bg-blue-50/90 text-blue-950 border-blue-300 font-bold ring-1 ring-blue-400/20 hover:bg-blue-100/80';
      }
      return 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/90 font-medium';
    }

    if (variant === 'subtle') {
      return 'bg-transparent hover:bg-slate-100/80 text-slate-700 border-transparent hover:border-slate-200 font-medium';
    }

    // Default button style
    return 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300 font-semibold shadow-2xs';
  };

  const getSizeStyles = () => {
    if (size === 'sm') {
      return `${UI_TOKENS.controlSm} px-2.5 text-xs`;
    }
    return `${UI_TOKENS.controlMd} px-3 text-xs`;
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 border font-sans transition-all cursor-pointer ${getButtonStyles()} ${getSizeStyles()}`}
      >
        <span className="truncate flex items-center gap-1.5">
          {selectedOption?.icon}
          {labelPrefix ? (
            <span>
              {labelPrefix}: <strong className={isActive ? 'text-blue-900' : 'text-slate-900'}>{selectedOption?.label || placeholder}</strong>
            </span>
          ) : (
            <span>{selectedOption?.label || placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-150 shrink-0 ml-1 ${
            isOpen ? 'rotate-180' : ''
          } ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-1.5 z-50 min-w-[160px] max-h-60 overflow-y-auto bg-white border border-slate-200/90 rounded-[12px] shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-1.5 rounded-[8px] text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  {opt.icon}
                  {opt.label}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
