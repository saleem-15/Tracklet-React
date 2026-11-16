import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { MOTION_EASE } from '../lib/motion';

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
 * High-craft, zero-horizontal-jitter directional counter animation for KPI metrics and pipeline stats.
 * Rolls up on increment (+1) and rolls down on decrement (-1).
 * Uses font-mono and tabular-nums to prevent adjacent layout twitch.
 * Respects prefers-reduced-motion with instant crossfades.
 */
export const MetricRoller: React.FC<MetricRollerProps> = ({
  value,
  prefix,
  suffix,
  className = '',
  valueClassName = 'text-slate-900',
}) => {
  const reduceMotion = useReducedMotion();
  const prevValueRef = useRef(value);

  const prev = prevValueRef.current;
  // Direction: 1 = increment (roll up from bottom), -1 = decrement (roll down from top)
  const isNumeric = typeof value === 'number' && typeof prev === 'number';
  const direction = isNumeric ? ((value as number) >= (prev as number) ? 1 : -1) : 1;

  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

  const variants = {
    enter: {
      y: reduceMotion ? '0%' : `${direction * 110}%`,
      opacity: 0,
      scale: reduceMotion ? 1 : 0.92,
    },
    center: {
      y: '0%',
      opacity: 1,
      scale: 1,
      transition: reduceMotion
        ? { duration: 0.05 }
        : {
            y: { type: 'spring', stiffness: 220, damping: 22, mass: 0.7 },
            opacity: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
            scale: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
          },
    },
    exit: {
      y: reduceMotion ? '0%' : `${-direction * 110}%`,
      opacity: 0,
      scale: reduceMotion ? 1 : 0.92,
      transition: reduceMotion
        ? { duration: 0.05 }
        : {
            y: { duration: 0.26, ease: [0.32, 0, 0.67, 0] },
            opacity: { duration: 0.18, ease: 'easeOut' },
            scale: { duration: 0.2, ease: 'easeOut' },
          },
    },
  };

  const drumMask: React.CSSProperties = {
    maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
  };

  return (
    <span className={`inline-flex items-baseline font-mono tabular-nums ${className}`}>
      {prefix && <span className="mr-0.5 text-xs text-slate-500 font-sans">{prefix}</span>}
      <span
        style={drumMask}
        className="relative inline-block h-[1.35em] overflow-hidden leading-[1.35em] min-w-[1ch] align-baseline px-0.5"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(value)}
            variants={variants}
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
