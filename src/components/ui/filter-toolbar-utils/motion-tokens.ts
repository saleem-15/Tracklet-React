export const motionTokens = {
  duration: {
    instant: 0.12,
    fast: 0.16,
    standard: 0.22,
    considered: 0.35,
    spring: 0.45,
  },
  ease: {
    enter: [0.16, 1, 0.3, 1] as const,
    standard: [0.22, 1, 0.36, 1] as const,
  },
  blur: {
    subtle: 2,
    soft: 4,
  },
  spring: {
    morph: { type: 'spring', stiffness: 480, damping: 34, mass: 0.7 } as const,
    smooth: { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const,
    snappy: { type: 'spring', stiffness: 540, damping: 32, mass: 0.6 } as const,
  },
};
