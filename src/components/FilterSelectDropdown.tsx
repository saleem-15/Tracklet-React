import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterSelectDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: FilterOption[];
  labelPrefix: string;
  isActive?: boolean;
}

export const FilterSelectDropdown: React.FC<FilterSelectDropdownProps> = ({
  value,
  onChange,
  options,
  labelPrefix,
  isActive = false,
}) => {
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

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 border rounded-xl pl-3 pr-2.5 py-1.5 font-sans text-xs transition-all shadow-2xs cursor-pointer ${
          isActive
            ? 'bg-blue-50/90 text-blue-950 border-blue-300 font-bold ring-1 ring-blue-400/20'
            : 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200/90 font-medium'
        }`}
      >
        <span>
          {labelPrefix}: <strong className={isActive ? 'text-blue-900' : 'text-slate-900'}>{selectedOption.label}</strong>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          } ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[160px] max-h-60 overflow-y-auto bg-white border border-slate-200/90 rounded-xl shadow-xl p-1 animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
