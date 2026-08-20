import React, { useState, useRef, useEffect, useId } from 'react';
import { ApplicationStatus } from '../types';
import { ChevronDown, Check } from 'lucide-react';
import { UI_TOKENS } from '../theme/tokens';
import { STAGE_CONFIG_MAP, APPLICATION_STATUSES } from '../lib/constants';

interface StageSelectorDropdownProps {
  currentStatus: ApplicationStatus;
  onSelectStatus: (newStatus: ApplicationStatus) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const StageSelectorDropdown: React.FC<StageSelectorDropdownProps> = ({
  currentStatus,
  onSelectStatus,
  size = 'sm',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const uniqueId = useId();
  const buttonId = `${uniqueId}-stage-btn`;
  const listboxId = `${uniqueId}-stage-listbox`;

  const currentConfig = STAGE_CONFIG_MAP[currentStatus] || STAGE_CONFIG_MAP['Applied'];
  const currentIndex = APPLICATION_STATUSES.indexOf(currentStatus);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [isOpen, currentIndex]);

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
        setHighlightedIndex((prev) => (prev < APPLICATION_STATUSES.length - 1 ? prev + 1 : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : APPLICATION_STATUSES.length - 1));
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (highlightedIndex >= 0 && highlightedIndex < APPLICATION_STATUSES.length) {
          event.preventDefault();
          handleSelect(APPLICATION_STATUSES[highlightedIndex]);
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
  }, [isOpen, highlightedIndex]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (s: ApplicationStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (s !== currentStatus) {
      onSelectStatus(s);
    }
    setIsOpen(false);
    triggerButtonRef.current?.focus();
  };

  const sizeClasses =
    size === 'sm'
      ? 'h-7 text-[11px] px-2 rounded-[10px]'
      : `${UI_TOKENS.controlMd} text-xs px-2.5`;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={triggerButtonRef}
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={`Current stage: ${currentStatus}. Change stage.`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1.5 border font-semibold tracking-tight transition-all cursor-pointer shadow-2xs group hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${sizeClasses} ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.dot} shrink-0`} />
        <span>{currentStatus}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 opacity-70 group-hover:opacity-100 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Application Stage"
          tabIndex={-1}
          className="absolute right-0 sm:left-0 mt-1.5 w-44 rounded-[12px] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
        >
          <div className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">
            Advance Stage
          </div>
          {APPLICATION_STATUSES.map((status, idx) => {
            const config = STAGE_CONFIG_MAP[status];
            const isSelected = status === currentStatus;
            const isHighlighted = idx === highlightedIndex;

            return (
              <button
                ref={(el) => { optionRefs.current[idx] = el; }}
                key={status}
                id={`${listboxId}-opt-${status}`}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={(e) => handleSelect(status, e)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? `${config.bg} ${config.text} font-bold ring-1 ring-slate-900/10`
                    : isHighlighted
                    ? 'bg-slate-100 text-slate-900'
                    : 'hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span>{status}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
