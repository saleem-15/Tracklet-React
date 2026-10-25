export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipCoordinates {
  top: number;
  left: number;
  placement: TooltipPlacement;
  arrowOffset: number;
}

const SHORTCUT_REGEX =
  /^(?:(?:Ctrl|Cmd|Alt|Shift|Meta|Option)(?:\s*\+\s*[A-Za-z0-9]+)+|Esc|Escape|Del|Delete|Enter|Tab|Space|Backspace|F\d{1,2})$/i;

/**
 * Formats a keyboard shortcut to display native Mac modifier symbols on Apple platforms,
 * or standard Windows/Linux strings (e.g. '⌘K' on Mac vs 'Ctrl+K' on Windows).
 */
export function formatShortcutForPlatform(shortcut: string, isMac?: boolean): string {
  const mac =
    isMac ??
    (typeof navigator !== 'undefined' &&
      /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent));

  if (!mac) return shortcut;

  return shortcut
    .replace(/Ctrl\s*\+\s*/gi, '⌘')
    .replace(/Cmd\s*\+\s*/gi, '⌘')
    .replace(/Alt\s*\+\s*/gi, '⌥')
    .replace(/Option\s*\+\s*/gi, '⌥')
    .replace(/Shift\s*\+\s*/gi, '⇧');
}

/**
 * Parses raw tooltip string into a human readable label and an optional keyboard shortcut badge.
 * Handles patterns like "Close (Esc)" or "Delete selected applications (Del)".
 * Ignores natural parentheticals like "3 contact(s)" or "Due date (optional)".
 */
export function parseTooltipText(
  rawText: string,
  explicitShortcut?: string
): { label: string; shortcut?: string } {
  if (explicitShortcut) {
    return { label: rawText, shortcut: explicitShortcut };
  }
  const match = rawText.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (match) {
    const candidate = match[2].trim();
    if (SHORTCUT_REGEX.test(candidate)) {
      return {
        label: match[1].trim(),
        shortcut: candidate,
      };
    }
  }
  return { label: rawText };
}

/**
 * Calculates clamped viewport coordinates and arrow placement for a tooltip
 * with automatic edge collision flipping.
 */
export function calculateTooltipPosition(
  targetRect: DOMRect,
  tooltipRect: DOMRect,
  preferredPlacement: TooltipPlacement,
  gap: number = 7
): TooltipCoordinates {
  const viewportPad = 8;
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

  let placement = preferredPlacement;

  // Collision detection and auto-flipping
  if (placement === 'top' && targetRect.top - tooltipRect.height - gap < viewportPad) {
    placement = 'bottom';
  } else if (
    placement === 'bottom' &&
    targetRect.bottom + tooltipRect.height + gap > windowHeight - viewportPad
  ) {
    placement = 'top';
  } else if (placement === 'left' && targetRect.left - tooltipRect.width - gap < viewportPad) {
    placement = 'right';
  } else if (
    placement === 'right' &&
    targetRect.right + tooltipRect.width + gap > windowWidth - viewportPad
  ) {
    placement = 'left';
  }

  let top = 0;
  let left = 0;
  let arrowOffset = 0;

  if (placement === 'top' || placement === 'bottom') {
    top =
      placement === 'top'
        ? targetRect.top - tooltipRect.height - gap
        : targetRect.bottom + gap;
    left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;

    const clampedLeft = Math.max(
      viewportPad,
      Math.min(windowWidth - tooltipRect.width - viewportPad, left)
    );
    const targetCenterX = targetRect.left + targetRect.width / 2;
    arrowOffset = Math.max(10, Math.min(tooltipRect.width - 10, targetCenterX - clampedLeft));
    left = clampedLeft;
  } else {
    top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
    left =
      placement === 'left'
        ? targetRect.left - tooltipRect.width - gap
        : targetRect.right + gap;

    const clampedTop = Math.max(
      viewportPad,
      Math.min(windowHeight - tooltipRect.height - viewportPad, top)
    );
    const targetCenterY = targetRect.top + targetRect.height / 2;
    arrowOffset = Math.max(10, Math.min(tooltipRect.height - 10, targetCenterY - clampedTop));
    top = clampedTop;
  }

  return { top, left, placement, arrowOffset };
}
