import React from 'react';
import { motion } from 'motion/react';
import { MOTION_EASE, errorShakeVariants } from '../lib/motion';

export interface ActionSuccessCheckProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * ActionSuccessCheck
 *
 * 180ms SVG path stroke draw for 1-click ATS capture confirmation.
 * Follows the Tracklet Executive standard: tactile closure with zero cartoon overshoot.
 */
export const ActionSuccessCheck: React.FC<ActionSuccessCheckProps> = ({
  size = 20,
  className = 'text-emerald-600',
  strokeWidth = 2.5,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <motion.path
        d="M20 6L9 17L4 12"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: 0.18,
          ease: MOTION_EASE.command,
        }}
      />
    </svg>
  );
};

export interface ErrorShakeContainerProps {
  isError: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * ErrorShakeContainer
 *
 * Non-disruptive 4-pixel lateral micro-shake for validation and duplicate warnings.
 * Restricts movement to GPU transform without reflow thrashing.
 */
export const ErrorShakeContainer: React.FC<ErrorShakeContainerProps> = ({
  isError,
  className = '',
  children,
}) => {
  return (
    <motion.div
      variants={errorShakeVariants}
      animate={isError ? 'shake' : 'idle'}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
};
