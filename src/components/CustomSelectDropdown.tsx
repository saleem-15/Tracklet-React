import React, { useState, useRef, useEffect, useId } from 'react';
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
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const uniqueId = useId();
  const buttonId = `${uniqueId}-btn`;
  const listboxId = `${uniqueId}-listbox`;

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : options[0];

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerButtonRef.current?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          event.preventDefault();
          handleSelect(options[highlightedIndex].value);
        }
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
  }, [isOpen, highlightedIndex, options]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (val: T) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
    triggerButtonRef.current?.focus();
  };

  const getButtonStyles = () => {
    if (disabled) {
      return 'bg-slate-100 text-slate-500 border-slate-200 opacity-60 cursor-not-allowed';
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
      return 'h-[32px] rounded-lg px-2.5 text-xs';
    }
    return 'h-[38px] rounded-xl px-3 text-xs';
  };

  const accessibleLabel = labelPrefix
    ? `${labelPrefix}: ${selectedOption?.label || placeholder}`
    : selectedOption?.label || placeholder;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        ref={triggerButtonRef}
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={accessibleLabel}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 border font-sans transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${getButtonStyles()} ${getSizeStyles()}`}
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
          } ${isActive ? 'text-blue-600' : 'text-slate-500'}`}
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={labelPrefix || placeholder}
          tabIndex={-1}
          className={`absolute top-full left-0 mt-1.5 z-50 min-w-[160px] max-h-60 overflow-y-auto bg-white border border-slate-200/90 rounded-[12px] shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightedIndex;

            return (
              <button
                ref={(el) => { optionRefs.current[idx] = el; }}
                key={String(opt.value)}
                id={`${listboxId}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleSelect(opt.value)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full text-left px-3 py-1.5 rounded-[8px] text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-900 font-bold'
                    : isHighlighted
                    ? 'bg-slate-100 text-slate-900'
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
