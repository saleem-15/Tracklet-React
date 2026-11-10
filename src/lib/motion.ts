import { type Transition, type Variants } from 'motion/react';

/**
 * Tracklet Motion Architecture: Precision Timing & Physical Easing Tokens
 *
 * Rules:
 * - Executive Command Center: Motion must be tactile, fast (<220ms), and informative.
 * - Zero Overshoot: Easing curves never exceed 1.0 to prevent cartoon/toy bounce.
 * - 100% GPU Accelerated: Strictly animate `transform` and `opacity`.
 */

export const MOTION_TIMING = {
  instant: 0.1,  // 100ms: tactile button presses, toggles, focus rings
  snappy: 0.16,  // 160ms: dropdowns, modals, badges, error shakes
  panel: 0.22,   // 220ms: slide-over drawers, layout sheets
} as const;

export const MOTION_EASE = {
  /** Decelerating curve for entrances and layout expansions */
  command: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** Accelerating sharp curve for exits and dismissals */
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
  /** Symmetrical curve for continuous morphs and icon state transitions */
  standard: [0.2, 0, 0, 1] as [number, number, number, number],
} as const;

// ---------------------------------------------------------------------------
// Base Transitions
// ---------------------------------------------------------------------------

export const transitionInstant: Transition = {
  duration: MOTION_TIMING.instant,
  ease: MOTION_EASE.command,
};

export const transitionCommand: Transition = {
  duration: MOTION_TIMING.snappy,
  ease: MOTION_EASE.command,
};

export const transitionPanel: Transition = {
  duration: MOTION_TIMING.panel,
  ease: MOTION_EASE.command,
};

export const transitionExit: Transition = {
  duration: MOTION_TIMING.snappy,
  ease: MOTION_EASE.exit,
};

// ---------------------------------------------------------------------------
// Canonical Component Variants
// ---------------------------------------------------------------------------

/**
 * Origin-aware Command Modal & Dialog variant
 */
export const modalVariants: Variants = {
  closed: {
    opacity: 0,
    scale: 0.98,
    y: -4,
    transition: {
      duration: MOTION_TIMING.instant,
      ease: MOTION_EASE.exit,
    },
  },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.snappy,
      ease: MOTION_EASE.command,
    },
  },
};

/**
 * Origin-aware dropdown menu variant
 */
export const dropdownVariants: Variants = {
  closed: {
    opacity: 0,
    scale: 0.97,
    y: -2,
    transition: {
      duration: MOTION_TIMING.instant,
      ease: MOTION_EASE.exit,
    },
  },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: MOTION_TIMING.snappy,
      ease: MOTION_EASE.command,
    },
  },
};

/**
 * Slide-over Drawer variant (e.g. ApplicationDetailPanel)
 */
export const drawerVariants: Variants = {
  hidden: {
    x: '100%',
    transition: {
      duration: MOTION_TIMING.snappy,
      ease: MOTION_EASE.exit,
    },
  },
  visible: {
    x: '0%',
    transition: {
      duration: MOTION_TIMING.panel,
      ease: MOTION_EASE.command,
    },
  },
};

/**
 * 4-Pixel non-disruptive lateral shake for validation & duplicate warning feedback
 */
export const errorShakeVariants: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -4, 4, -3, 3, -1, 0],
    transition: {
      duration: MOTION_TIMING.snappy,
      ease: 'easeInOut',
    },
  },
};

/**
 * Vertical digit roll variant for KPI and metric counters (no width jitter)
 */
export const digitRollerVariants: Variants = {
  enter: {
    y: '100%',
    opacity: 0,
  },
  center: {
    y: '0%',
    opacity: 1,
    transition: {
      duration: 0.14,
      ease: MOTION_EASE.command,
    },
  },
  exit: {
    y: '-100%',
    opacity: 0,
    transition: {
      duration: MOTION_TIMING.instant,
      ease: MOTION_EASE.exit,
    },
  },
};
