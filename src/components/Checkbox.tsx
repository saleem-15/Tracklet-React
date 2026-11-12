import React, { useState } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { motion, useReducedMotion, type Variants } from 'motion/react';

export interface CheckboxProps
  extends Omit<React.ComponentProps<typeof CheckboxPrimitive.Root>, 'checked' | 'defaultChecked' | 'onCheckedChange' | 'onChange' | 'className'> {
  /** Controlled state. */
  checked?: CheckboxPrimitive.CheckedState;
  /** Initial state when used uncontrolled. */
  defaultChecked?: CheckboxPrimitive.CheckedState;
  /** Radix-compatible state callback. */
  onCheckedChange?: (checked: CheckboxPrimitive.CheckedState) => void;
  /** Boolean callback kept for existing Tracklet call sites. */
  onChange?: (checked: boolean) => void;
  /** Accessible name shorthand. */
  ariaLabel?: string;
  className?: string;
}

const checkVariants: Variants = {
  checked: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.19, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: 0.02 },
      opacity: { duration: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
  },
  unchecked: {
    pathLength: 0,
    opacity: 0,
    transition: {
      pathLength: { duration: 0.12, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
      opacity: { duration: 0.08, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
    },
  },
};

export function Checkbox({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  onChange,
  ariaLabel,
  'aria-label': ariaLabelProp,
  disabled,
  className = '',
  onClick,
  ...props
}: CheckboxProps) {
  const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
  const checked = checkedProp ?? uncontrolledChecked;
  const prefersReducedMotion = useReducedMotion();

  const handleCheckedChange = (next: CheckboxPrimitive.CheckedState) => {
    if (checkedProp === undefined) setUncontrolledChecked(next);
    onCheckedChange?.(next);
    onChange?.(next === true);
  };

  const scaleTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 520, damping: 34, mass: 0.55 };

  return (
    <motion.div
      className="inline-flex shrink-0"
      whileTap={disabled || prefersReducedMotion ? undefined : { scale: 0.94 }}
      whileHover={disabled || prefersReducedMotion ? undefined : { scale: 1.04 }}
      transition={scaleTransition}
    >
      <CheckboxPrimitive.Root
        checked={checked}
        onCheckedChange={handleCheckedChange}
        disabled={disabled}
        aria-label={ariaLabel ?? ariaLabelProp}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        className={`relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-slate-300 bg-white text-white outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-blue-500 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:shadow-sm data-[state=checked]:hover:border-blue-600 data-[state=checked]:hover:bg-blue-600 ${className}`}
        {...props}
      >
        <motion.svg
          className="size-full overflow-visible"
          viewBox="0 0 12 12"
          fill="none"
          initial={false}
        >
          <motion.path
            d="M2.5 6L4.5 8L9.5 3"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={false}
            animate={checked === true ? 'checked' : 'unchecked'}
            variants={checkVariants}
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
          />
        </motion.svg>
      </CheckboxPrimitive.Root>
    </motion.div>
  );
}
