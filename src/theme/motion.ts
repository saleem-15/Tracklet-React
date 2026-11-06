/**
 * Tracklet Motion & Animation Tokens
 * Single source of truth for micro-durations, easing curves, and physics springs.
 * Grounded in: Apple HIG (brevity, critically damped) + Stageshow (travel & arrival curves).
 * 
 * Rules:
 * - Pro tools use fast, non-bouncy motion (damping >= 30, zero overshoot).
 * - Routine transitions must complete in <= 200ms.
 * - Always respect `prefers-reduced-motion` (instant 0ms snap).
 */

export const MOTION_TOKENS = {
  // 1. Duration Scale (Strictly <= 250ms for Pro SaaS)
  duration: {
    instant: '100ms',  // Button clicks, micro-state changes
    snappy: '150ms',   // Tooltips, dropdowns, tabs, hover fills
    drawer: '200ms',   // Slide-over detail panel, modal reveals
    maxAllowedMs: 250, // Hard ceiling for lint/CI gates
  },

  // 2. Easing Curves
  easing: {
    // Arrival from edge / slide-over (Stageshow + Apple deceleration)
    decelerate: 'cubic-bezier(0.16, 1, 0.3, 1)',
    // In-place micro-interactions (fast out, soft settle)
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    // Travel between coordinates
    travel: 'cubic-bezier(0.45, 0, 0.1, 1)',
  },

  // 3. Spring Configurations (For 'motion' / framer-motion components)
  // Critically damped (zeta >= 1.0): Accelerates smoothly, stops firmly with 0% bounce.
  spring: {
    // Slide-over drawer (ApplicationDetailPanel)
    drawer: {
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 1,
    },
    // Kanban card drag & reorder (ActivePipelineBoard)
    cardReorder: {
      type: 'spring',
      stiffness: 450,
      damping: 32,
      mass: 0.8,
    },
    // Row height collapse on delete/archive
    collapse: {
      type: 'spring',
      stiffness: 500,
      damping: 40,
    },
    // Status badge transition burst (StatusBadge)
    badge: {
      type: 'spring',
      stiffness: 450,
      damping: 28,
    },
  },

  // 4. Standard CSS Transition Classes (Replacing transition-all)
  classes: {
    interactive: 'transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out',
    colors: 'transition-colors duration-150 ease-out',
    opacity: 'transition-opacity duration-150 ease-out',
    transform: 'transition-transform duration-150 ease-out',
    tapCompression: 'active:scale-[0.98] transition-transform duration-100 ease-out',
  },
} as const;
