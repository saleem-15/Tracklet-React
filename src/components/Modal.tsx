import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  modalVariants,
  modalBackdropVariants,
  modalReducedVariants,
} from '../lib/motion';
import { useEscapeKey } from '../lib/useEscapeKey';

export interface ModalProps {
  /** Controls visibility with synchronized entrance & exit motion orchestration */
  isOpen: boolean;
  /** Callback invoked on backdrop click or Escape key dismissal */
  onClose: () => void;
  /** Callback fired when the exit animation finishes and DOM node unmounts */
  onExitComplete?: () => void;
  /** Accessible title (used for aria-label if ariaLabelledBy is omitted) */
  title?: string;
  /** Explicit aria-label for screen readers */
  ariaLabel?: string;
  /** DOM ID of heading element for aria-labelledby */
  ariaLabelledBy?: string;
  /** DOM ID of description element for aria-describedby */
  ariaDescribedBy?: string;
  /** WAI-ARIA role: 'dialog' (default) or 'alertdialog' (for destructive confirmations) */
  role?: 'dialog' | 'alertdialog';
  /** Max width utility class (defaults to 'max-w-lg') */
  maxWidthClassName?: string;
  /** Custom utility classes for the dialog card panel */
  className?: string;
  /** Custom utility classes for the backdrop overlay */
  backdropClassName?: string;
  /** Custom utility classes for the outer centering viewport container */
  containerClassName?: string;
  /** Vertical alignment: 'center' (default) or 'top' (for command palettes & search bars) */
  align?: 'center' | 'top';
  /** Whether clicking the backdrop closes the modal (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal (default: true) */
  closeOnEscape?: boolean;
  /** Optional ref to focus when modal opens (overrides default auto-focus) */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Whether to automatically focus the first interactive element on open (default: true). Set to false so no child component receives focus. */
  autoFocus?: boolean;
  /** Whether to lock document body scroll while open (default: true) */
  lockScroll?: boolean;
  /** Children rendered inside the dialog card */
  children: React.ReactNode;
}

/**
 * Universal Modal Dialog Component
 *
 * Provides executive-grade entrance and exit animations by default:
 * - 160ms critically damped entrance curve (zero cartoon overshoot)
 * - 100ms instant exit curve (unmounts cleanly via AnimatePresence)
 * - 100% GPU-composited transform and opacity (zero layout reflow)
 * - WAI-ARIA 1.2 compliant: role="dialog", aria-modal="true", focus trap & restoration
 * - Stack-aware Escape key dismissal via global LIFO useEscapeKey
 * - WCAG 2.2 AAA reduced motion support (collapses to instant transitions)
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onExitComplete,
  title,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  role = 'dialog',
  maxWidthClassName = 'max-w-lg',
  className = '',
  backdropClassName = '',
  containerClassName = '',
  align = 'center',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  initialFocusRef,
  autoFocus = true,
  lockScroll = true,
  children,
}) => {
  const isTest =
    typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' || Boolean((globalThis as any).IS_REACT_ACT_ENVIRONMENT));
  const prefersReduced = useReducedMotion();
  const shouldReduceMotion = prefersReduced || isTest;
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const portalRootRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pressTargetRef = useRef<EventTarget | null>(null);

  // Stack-aware Escape dismissal (LIFO order ensures top-most dialog handles Escape)
  useEscapeKey(onClose, isOpen && closeOnEscape);

  // Prevent background body scrolling while modal is open
  useEffect(() => {
    if (!isOpen || !lockScroll) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, lockScroll]);

  // Focus capture and restoration lifecycle keyed strictly on isOpen
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    return () => {
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    };
  }, [isOpen]);

  // Dialog auto-focus lifecycle keyed on isOpen, initialFocusRef, and autoFocus
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!autoFocus) {
        // Keep keyboard events and screen reader scope bounded to the dialog panel without focusing any child component
        dialogRef.current?.focus({ preventScroll: true });
        return;
      }

      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (dialogRef.current) {
        // 1. Explicit [autofocus] element inside dialog
        const autoFocusEl = dialogRef.current.querySelector<HTMLElement>('[autofocus]:not([disabled])');
        if (autoFocusEl) {
          autoFocusEl.focus();
          return;
        }

        // 2. First form input field (prevents focus jumping to header Close button in form modals)
        const firstInput = dialogRef.current.querySelector<HTMLElement>(
          'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
        );
        if (firstInput) {
          firstInput.focus();
          return;
        }

        // 3. Fallback to any focusable element (e.g. action buttons in confirmation dialogs)
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, initialFocusRef, autoFocus]);

  // Cycle focus on Tab / Shift+Tab within modal bounds
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;
      const isOutsideOrOnPanel = !activeEl || activeEl === dialogRef.current || !dialogRef.current.contains(activeEl);

      if (isOutsideOrOnPanel) {
        e.preventDefault();
        if (e.shiftKey) {
          last.focus();
        } else {
          first.focus();
        }
      } else if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const isBackdropTarget = (target: EventTarget | null) => {
    if (!target) return false;
    if (target === backdropRef.current || target === portalRootRef.current) return true;
    return !dialogRef.current?.contains(target as Node);
  };

  const activePanelVariants = shouldReduceMotion ? modalReducedVariants : modalVariants;
  const activeBackdropVariants = shouldReduceMotion ? modalReducedVariants : modalBackdropVariants;

  const resolvedAriaLabel = ariaLabel || (!ariaLabelledBy ? title : undefined);

  const hasCustomRounded = /(^|\s)rounded(-|\b)/.test(className);
  const hasCustomBorderColor = /(^|\s)border-[a-z]/.test(className);
  const defaultRounded = hasCustomRounded ? '' : 'rounded-2xl';
  const defaultBorder = hasCustomBorderColor
    ? (/(^|\s)border(\s|$)/.test(className) ? '' : 'border')
    : 'border border-slate-200/90';

  const panelClassName = [
    'relative z-10 w-full select-text',
    maxWidthClassName,
    'bg-white',
    defaultRounded,
    defaultBorder,
    'shadow-2xl overflow-hidden my-auto will-change-transform outline-none',
    className,
  ].filter(Boolean).join(' ');

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {isOpen && (
        <motion.div
          ref={portalRootRef}
          key="modal-portal-root"
          data-testid="modal-portal-root"
          className={`fixed inset-0 z-50 flex ${
            align === 'top' ? 'items-start pt-16 sm:pt-24' : 'items-center'
          } justify-center p-3 sm:p-4 md:p-6 overflow-y-auto select-none ${containerClassName}`}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => {
            pressTargetRef.current = e.target;
          }}
          onClick={
            closeOnBackdropClick
              ? (e) => {
                  const pressTarget = pressTargetRef.current;
                  pressTargetRef.current = null;
                  const isPressOnBackdrop = pressTarget === null ? isBackdropTarget(e.target) : isBackdropTarget(pressTarget);
                  const isReleaseOnBackdrop = isBackdropTarget(e.target);
                  if (isPressOnBackdrop && isReleaseOnBackdrop) {
                    onClose();
                  }
                }
              : undefined
          }
        >
          {/* Backdrop overlay */}
          <motion.div
            ref={backdropRef}
            data-testid="modal-backdrop"
            variants={activeBackdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs ${backdropClassName}`}
            aria-hidden="true"
          />

          {/* Dialog Card Panel */}
          <motion.div
            ref={dialogRef}
            data-testid="modal-panel"
            role={role}
            aria-modal="true"
            aria-label={resolvedAriaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            tabIndex={-1}
            variants={activePanelVariants}
            initial="closed"
            animate="open"
            exit="closed"
            style={{ transformOrigin: align === 'top' ? 'top center' : 'center center' }}
            className={panelClassName}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
