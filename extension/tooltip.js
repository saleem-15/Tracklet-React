/**
 * Tracklet Companion Tooltip
 *
 * Vanilla port of the web app's shared TooltipProvider (src/components/Tooltip.tsx).
 * Mirrors its behaviour so the extension popup feels identical to the dashboard:
 *
 * - Fully delegated: targets every element with a `title` or `data-tooltip`
 *   attribute, including dynamically rendered content — native `title`
 *   attributes are suppressed on hover (moved to `data-original-title`) and
 *   restored when the pointer leaves.
 * - 220ms open delay, with a 350ms "warm" window after any close that
 *   re-opens instantly as you trace between tooltips.
 * - Shortcut parsing: "Bold (Ctrl+B)" renders as label + mono kbd chip, with
 *   Mac modifier symbols (⌘⌥⇧) swapped in on Apple platforms.
 * - Fixed-position island 8px from the target, auto-flipping and clamping on
 *   viewport edges, with a 2px directional drift on open/close.
 * - Dismissal on pointerdown, Escape, and scroll; focusin/focusout mirror
 *   pointer events for keyboard users.
 *
 * Usage on an element:
 *   title="Label"                        → implicit (upgraded on first hover)
 *   data-tooltip="Label"                 → explicit, native title never used
 *   data-tooltip-placement="bottom"      → default 'top'
 *   data-tooltip-shortcut="Ctrl+↵"       → kbd chip appended
 *   data-tooltip-delay="500"             → custom open delay (ms)
 *   data-no-tooltip                      → opt-out
 */
(function () {
  'use strict';

  var DELAY_MS = 220;
  var WARM_WINDOW_MS = 350;
  var GAP_PX = 8;
  var VIEWPORT_PAD = 8;

  var SHORTCUT_REGEX =
    /^(?:(?:Ctrl|Cmd|Alt|Shift|Meta|Option)(?:\s*\+\s*[A-Za-z0-9]+)+|Esc|Escape|Del|Delete|Enter|Tab|Space|Backspace|F\d{1,2})$/i;

  /** Mac modifier symbols on Apple platforms (matches the app's formatting). */
  function formatShortcutForPlatform(shortcut, isMac) {
    var mac =
      typeof isMac === 'boolean'
        ? isMac
        : /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
    if (!mac) return shortcut;
    return shortcut
      .replace(/Ctrl\s*\+\s*/gi, '⌘')
      .replace(/Cmd\s*\+\s*/gi, '⌘')
      .replace(/Alt\s*\+\s*/gi, '⌥')
      .replace(/Option\s*\+\s*/gi, '⌥')
      .replace(/Shift\s*\+\s*/gi, '⇧');
  }

  /** Parses "Label (Ctrl+B)" → { label, shortcut? }, skipping natural parentheticals. */
  function parseTooltipText(rawText, explicitShortcut) {
    if (explicitShortcut) return { label: rawText, shortcut: explicitShortcut };
    var match = rawText.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (match && SHORTCUT_REGEX.test(match[2].trim())) {
      return { label: match[1].trim(), shortcut: match[2].trim() };
    }
    return { label: rawText };
  }

  /**
   * Clamped viewport coordinates with edge-collision flipping
   * (ports src/lib/tooltipUtils.ts calculateTooltipPosition, 8px gap).
   */
  function calculatePosition(targetRect, tooltipRect, preferred, gap) {
    var placement = preferred;
    var winW = window.innerWidth;
    var winH = window.innerHeight;

    if (placement === 'top' && targetRect.top - tooltipRect.height - gap < VIEWPORT_PAD) {
      placement = 'bottom';
    } else if (
      placement === 'bottom' &&
      targetRect.bottom + tooltipRect.height + gap > winH - VIEWPORT_PAD
    ) {
      placement = 'top';
    } else if (placement === 'left' && targetRect.left - tooltipRect.width - gap < VIEWPORT_PAD) {
      placement = 'right';
    } else if (
      placement === 'right' &&
      targetRect.right + tooltipRect.width + gap > winW - VIEWPORT_PAD
    ) {
      placement = 'left';
    }

    var top;
    var left;
    if (placement === 'top' || placement === 'bottom') {
      top =
        placement === 'top'
          ? targetRect.top - tooltipRect.height - gap
          : targetRect.bottom + gap;
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      left = Math.max(VIEWPORT_PAD, Math.min(winW - tooltipRect.width - VIEWPORT_PAD, left));
    } else {
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      left = placement === 'left' ? targetRect.left - tooltipRect.width - gap : targetRect.right + gap;
      top = Math.max(VIEWPORT_PAD, Math.min(winH - tooltipRect.height - VIEWPORT_PAD, top));
    }

    return { top: top, left: left, placement: placement };
  }

  // ---------------------------------------------------------------------------
  // Floating island element (portal equivalent)
  // ---------------------------------------------------------------------------

  var tooltipEl = null;
  var labelEl = null;
  var kbdEl = null;
  var active = null; // { target, text, shortcut, placement, delay }
  var openTimer = null;
  var revertTimer = null;
  var lastClosedAt = 0;

  function ensureTooltipEl() {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tl-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.style.top = '-9999px';
    tooltipEl.style.left = '-9999px';
    labelEl = document.createElement('span');
    labelEl.className = 'tl-tooltip-label';
    kbdEl = document.createElement('kbd');
    kbdEl.className = 'tl-tooltip-kbd';
    tooltipEl.appendChild(labelEl);
    tooltipEl.appendChild(kbdEl);
    document.body.appendChild(tooltipEl);
  }

  function clearOpenTimer() {
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = null;
    }
  }

  function hide(activeTarget) {
    clearOpenTimer();
    if (!active || !tooltipEl) return;
    if (activeTarget && active.target !== activeTarget) return;
    lastClosedAt = Date.now();
    active = null;
    // Drift back into the hidden state; park offscreen once the fade settles.
    tooltipEl.classList.remove('tl-tooltip--visible');
    if (revertTimer) clearTimeout(revertTimer);
    revertTimer = setTimeout(function () {
      if (!active && tooltipEl) {
        tooltipEl.style.top = '-9999px';
        tooltipEl.style.left = '-9999px';
      }
    }, 120);
  }

  function show(state) {
    ensureTooltipEl();
    if (active && active.target === state.target) return; // already hover-tracked
    clearOpenTimer();
    var warm = Date.now() - lastClosedAt < WARM_WINDOW_MS;
    var delay = warm ? 0 : typeof state.delay === 'number' ? state.delay : DELAY_MS;
    openTimer = setTimeout(function () {
      active = state;
      render();
    }, delay);
  }

  function render() {
    if (!active || !tooltipEl) return;
    var parsed = parseTooltipText(active.text, active.shortcut);
    labelEl.textContent = parsed.label;
    labelEl.classList.toggle('tl-tooltip-label--wrap', parsed.label.length > 50);
    if (parsed.shortcut) {
      kbdEl.textContent = formatShortcutForPlatform(parsed.shortcut);
      kbdEl.style.display = '';
    } else {
      kbdEl.style.display = 'none';
    }
    // Park offscreen for measurement, then clamp into place.
    tooltipEl.classList.toggle('tl-tooltip--top', active.placement === 'top');
    tooltipEl.classList.toggle('tl-tooltip--bottom', active.placement === 'bottom');
    tooltipEl.classList.toggle('tl-tooltip--left', active.placement === 'left');
    tooltipEl.classList.toggle('tl-tooltip--right', active.placement === 'right');
    tooltipEl.style.top = '-9999px';
    tooltipEl.style.left = '-9999px';
    var placement = active.placement;
    var targetRect = active.target.getBoundingClientRect();
    var tooltipRect = tooltipEl.getBoundingClientRect();
    var pos = calculatePosition(targetRect, tooltipRect, placement, GAP_PX);
    tooltipEl.className = 'tl-tooltip tl-tooltip--' + pos.placement + ' tl-tooltip--visible';
    tooltipEl.style.top = pos.top + 'px';
    tooltipEl.style.left = pos.left + 'px';
  }

  // ---------------------------------------------------------------------------
  // Native `title` suppression & delegated listeners
  // ---------------------------------------------------------------------------

  function resolveTarget(start) {
    var curr = start;
    var found = null;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      if (curr.hasAttribute && curr.hasAttribute('title')) {
        var rawTitle = curr.getAttribute('title');
        if (rawTitle && rawTitle.trim()) {
          var prev = curr.getAttribute('data-original-title');
          if (prev !== rawTitle) {
            // First hover on a fresh title, or the popup JS rewrote it live.
            curr.setAttribute('data-tooltip', rawTitle.trim());
          }
          curr.setAttribute('data-original-title', rawTitle);
          if (!curr.hasAttribute('aria-label')) {
            curr.setAttribute('aria-label', rawTitle);
          }
        }
        curr.removeAttribute('title');
      }
      if (
        !found &&
        curr.hasAttribute('data-tooltip') &&
        typeof curr.getAttribute === 'function' &&
        curr.getAttribute('data-tooltip').trim() &&
        !curr.hasAttribute('data-no-tooltip')
      ) {
        found = curr;
      }
      curr = curr.parentElement;
    }
    return found;
  }

  function trigger(el) {
    var text = el.getAttribute('data-tooltip');
    if (!text || !text.trim()) return;
    var rawDelay = el.getAttribute('data-tooltip-delay');
    show({
      target: el,
      text: text.trim(),
      placement: el.getAttribute('data-tooltip-placement') || 'top',
      shortcut: el.getAttribute('data-tooltip-shortcut') || null,
      delay: rawDelay ? parseInt(rawDelay, 10) : undefined
    });
  }

  function handlePointerOver(e) {
    if (e.pointerType === 'touch') return;
    var el = resolveTarget(e.target);
    if (el) trigger(el);
  }

  function handlePointerOut(e) {
    var target = e.target;
    var related = e.relatedTarget;
    // Restore suppressed native titles along the exit chain
    var curr = target;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      if (curr.hasAttribute && curr.hasAttribute('data-original-title')) {
        if (!related || !curr.contains(related)) {
          curr.setAttribute('title', curr.getAttribute('data-original-title'));
          curr.removeAttribute('data-original-title');
        }
      }
      curr = curr.parentElement;
    }
    if (active && (!related || !active.target.contains(related))) {
      hide(active.target);
    }
  }

  function handleFocusIn(e) {
    var el = resolveTarget(e.target);
    if (el) trigger(el);
  }

  function handleFocusOut(e) {
    if (active && e.target === active.target) {
      hide(active.target);
    }
  }

  function boot() {
    if (document.body) {
      ensureTooltipEl();
      document.addEventListener('pointerover', handlePointerOver, { capture: true, passive: true });
      document.addEventListener('pointerout', handlePointerOut, { capture: true, passive: true });
      document.addEventListener('focusin', handleFocusIn, { capture: true, passive: true });
      document.addEventListener('focusout', handleFocusOut, { capture: true, passive: true });
      document.addEventListener('pointerdown', function () { hide(); }, { capture: true, passive: true });
      window.addEventListener('scroll', function () { hide(); }, { capture: true, passive: true });
      window.addEventListener(
        'keydown',
        function (e) {
          if (e.key === 'Escape') hide();
        }
      );
    } else {
      document.addEventListener('DOMContentLoaded', boot);
    }
  }

  boot();
})();
