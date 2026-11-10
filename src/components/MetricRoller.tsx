import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { digitRollerVariants } from '../lib/motion';

export interface MetricRollerProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  className?: string;
  valueClassName?: string;
}

/**
 * MetricRoller
 *
 * High-craft, zero-horizontal-jitter counter animation for KPI metrics and pipeline stats.
 * Uses font-mono and tabular-nums to prevent adjacent layout twitch.
 */
export const MetricRoller: React.FC<MetricRollerProps> = ({
  value,
  prefix,
  suffix,
  className = '',
  valueClassName = 'text-slate-900',
}) => {
  return (
    <span className={`inline-flex items-baseline font-mono tabular-nums ${className}`}>
      {prefix && <span className="mr-0.5 text-xs text-slate-500 font-sans">{prefix}</span>}
      <span className="relative inline-block h-[1.25em] overflow-hidden leading-[1.25em] min-w-[1ch] align-baseline">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(value)}
            variants={digitRollerVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className={`block ${valueClassName}`}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      {suffix && <span className="ml-0.5 text-xs text-slate-500 font-sans">{suffix}</span>}
    </span>
  );
};

export default MetricRoller;
