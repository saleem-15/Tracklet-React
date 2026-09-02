import { useEffect, useRef } from 'react';

type EscapeHandler = () => void;

// Global LIFO stack of active escape handlers
const escapeStack: EscapeHandler[] = [];

if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (escapeStack.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          // Call and trigger ONLY the topmost overlay handler
          const topHandler = escapeStack[escapeStack.length - 1];
          if (topHandler) {
            topHandler();
          }
        }
      }
    },
    { capture: true }
  );
}

/**
 * Registers an Escape key handler on the global LIFO overlay stack.
 * When the Escape key is pressed, ONLY the topmost active overlay is dismissed,
 * preventing nested or underneath modals and drawers from accidentally closing.
 *
 * @param handler Callback to invoke when Escape is pressed while this overlay is active.
 * @param isActive Whether this overlay is currently open/mounted (defaults to true).
 */
export function useEscapeKey(handler: EscapeHandler, isActive: boolean = true): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!isActive) return;

    const currentHandler = () => {
      handlerRef.current();
    };

    escapeStack.push(currentHandler);

    return () => {
      const index = escapeStack.lastIndexOf(currentHandler);
      if (index !== -1) {
        escapeStack.splice(index, 1);
      }
    };
  }, [isActive]);
}
