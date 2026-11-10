import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MOTION_TIMING, modalVariants } from '../lib/motion';

export interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  maxWidthClassName?: string;
  children: React.ReactNode;
}

/**
 * CommandMenu
 *
 * Origin-aware centered modal dialog wrapper.
 * Features:
 * - 160ms deceleration curve (zero overshoot)
 * - Hardware-accelerated transform & opacity
 * - Instant Escape-key dismissal without animation delay
 * - Zero border reflow via constant-width borders
 */
export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  title,
  maxWidthClassName = 'max-w-xl',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto">
          {/* Backdrop with 160ms fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION_TIMING.snappy }}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Command Dialog'}
            variants={modalVariants}
            initial="closed"
            animate="open"
            exit="closed"
            style={{ transformOrigin: 'top center' }}
            className={`relative z-10 w-full ${maxWidthClassName} overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl will-change-transform`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandMenu;
