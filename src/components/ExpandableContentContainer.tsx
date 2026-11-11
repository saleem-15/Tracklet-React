import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

export interface ExpandableContentContainerProps {
  /** Optional element ID for aria-controls linkage */
  id?: string;
  /** Whether the container is currently expanded */
  isExpanded: boolean;
  /**
   * The height in pixels when collapsed.
   * Default: 0 (drawer mode, unmounts content when collapsed).
   * For snippet mode (e.g. email cards), pass e.g. 46 to show the first 2 lines.
   */
  collapsedHeight?: number;
  /**
   * Whether the expansion behavior is active.
   * When false, the container ignores collapsedHeight and renders naturally at 'auto'.
   */
  isCollapsible?: boolean;
  /**
   * Whether to animate opacity during height transitions.
   * Defaults to true when collapsedHeight === 0, false when collapsedHeight > 0.
   */
  animateOpacity?: boolean;
  /**
   * Background color for the bottom gradient fade in collapsed mode.
   * 'white' | 'slate-50' | 'none'
   * Defaults to 'none' when collapsedHeight === 0, or 'white' when collapsedHeight > 0.
   */
  fadeColor?: 'white' | 'slate-50' | 'none';
  /** Children to be rendered inside the animated viewport */
  children: React.ReactNode;
  /** Additional container classes */
  className?: string;
}

/**
 * Canonical ExpandableContentContainer Primitive:
 * - In Drawer Mode (collapsedHeight === 0): Mounts and unmounts content cleanly using AnimatePresence,
 *   animating height: 0 <-> auto and opacity: 0 <-> 1 with permanent overflow: hidden clipping.
 * - In Snippet Mode (collapsedHeight > 0): Single persistent viewport where children are NEVER unmounted
 *   or swapped, completely preventing text layout shift and "dancing text" artifacts.
 * - Hardware-accelerated height interpolation between collapsedHeight and 'auto'.
 * - Built-in reduced motion handling (instant 0ms toggle when prefers-reduced-motion is active).
 * - Optional bottom gradient dissolve for graceful visual clipping in snippet mode.
 */
export const ExpandableContentContainer: React.FC<ExpandableContentContainerProps> = ({
  id,
  isExpanded,
  collapsedHeight = 0,
  isCollapsible = true,
  animateOpacity,
  fadeColor,
  children,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const isDrawerMode = collapsedHeight === 0;
  const shouldAnimateOpacity = animateOpacity ?? isDrawerMode;
  const effectiveFadeColor = fadeColor ?? (collapsedHeight > 0 ? 'white' : 'none');

  const transitionConfig = shouldReduceMotion
    ? { duration: 0 }
    : {
        height: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
        ...(shouldAnimateOpacity
          ? { opacity: { duration: 0.18, ease: [0.2, 0, 0, 1] } }
          : {}),
      };

  // Drawer Mode: unmount when collapsed for clean accessibility & zero DOM bloat
  if (isDrawerMode && isCollapsible) {
    return (
      <div className={`relative ${className}`}>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              id={id}
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { height: 0, ...(shouldAnimateOpacity ? { opacity: 0 } : {}) }
              }
              animate={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : { height: 'auto', ...(shouldAnimateOpacity ? { opacity: 1 } : {}) }
              }
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { height: 0, ...(shouldAnimateOpacity ? { opacity: 0 } : {}) }
              }
              transition={transitionConfig}
              style={{ overflow: 'hidden' }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Snippet Mode: persistent DOM viewport to guarantee zero text dancing
  const isCollapsed = isCollapsible && !isExpanded;
  const resolvedHeight = isCollapsed ? collapsedHeight : 'auto';
  const resolvedOpacity = isCollapsed && shouldAnimateOpacity ? 0 : 1;

  return (
    <div className={`relative ${className}`}>
      <motion.div
        id={id}
        initial={false}
        animate={{
          height: resolvedHeight,
          ...(shouldAnimateOpacity ? { opacity: resolvedOpacity } : {}),
        }}
        transition={transitionConfig}
        style={{ overflow: 'hidden' }}
      >
        {children}
      </motion.div>

      {/* Subtle bottom gradient fade in collapsed snippet mode */}
      {isCollapsed && effectiveFadeColor !== 'none' && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t ${
            effectiveFadeColor === 'slate-50' ? 'from-slate-50' : 'from-white'
          } to-transparent`}
        />
      )}
    </div>
  );
};
