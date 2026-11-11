import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import React from 'react';
import { Tooltip, TooltipProvider } from '../../src/components/Tooltip';
import {
  parseTooltipText,
  calculateTooltipPosition,
  formatShortcutForPlatform,
} from '../../src/lib/tooltipUtils';

describe('Tooltip Utilities', () => {
  describe('parseTooltipText', () => {
    it('returns raw label when no shortcut is present', () => {
      const res = parseTooltipText('All Applications');
      expect(res.label).toBe('All Applications');
      expect(res.shortcut).toBeUndefined();
    });

    it('extracts single key shortcut like Esc or Del', () => {
      const res1 = parseTooltipText('Close (Esc)');
      expect(res1.label).toBe('Close');
      expect(res1.shortcut).toBe('Esc');

      const res2 = parseTooltipText('Delete selected applications (Del)');
      expect(res2.label).toBe('Delete selected applications');
      expect(res2.shortcut).toBe('Del');
    });

    it('extracts multi-modifier keyboard shortcuts', () => {
      const res = parseTooltipText('Report an Issue or Feedback (Ctrl+Alt+B)');
      expect(res.label).toBe('Report an Issue or Feedback');
      expect(res.shortcut).toBe('Ctrl+Alt+B');
    });

    it('ignores natural english parentheticals that are not keyboard shortcuts', () => {
      const res1 = parseTooltipText('3 contact(s)');
      expect(res1.label).toBe('3 contact(s)');
      expect(res1.shortcut).toBeUndefined();

      const res2 = parseTooltipText('Due date (optional)');
      expect(res2.label).toBe('Due date (optional)');
      expect(res2.shortcut).toBeUndefined();

      const res3 = parseTooltipText('Active Pipeline (Kanban)');
      expect(res3.label).toBe('Active Pipeline (Kanban)');
      expect(res3.shortcut).toBeUndefined();
    });

    it('prefers explicit shortcut argument when provided', () => {
      const res = parseTooltipText('Quick Find', 'Ctrl+K');
      expect(res.label).toBe('Quick Find');
      expect(res.shortcut).toBe('Ctrl+K');
    });
  });

  describe('calculateTooltipPosition', () => {
    const makeRect = (top: number, left: number, width: number, height: number): DOMRect =>
      ({
        top,
        left,
        width,
        height,
        bottom: top + height,
        right: left + width,
        x: left,
        y: top,
        toJSON: () => ({}),
      } as DOMRect);

    it('positions tooltip above target for top placement', () => {
      const target = makeRect(200, 200, 40, 40);
      const tooltip = makeRect(0, 0, 100, 30);
      const pos = calculateTooltipPosition(target, tooltip, 'top');

      expect(pos.placement).toBe('top');
      // top = 200 - 30 - 7 = 163
      expect(pos.top).toBe(163);
      // left = 200 + (40 - 100) / 2 = 170
      expect(pos.left).toBe(170);
    });

    it('flips to bottom when target is too close to top of viewport', () => {
      const target = makeRect(10, 200, 40, 40);
      const tooltip = makeRect(0, 0, 100, 30);
      const pos = calculateTooltipPosition(target, tooltip, 'top');

      expect(pos.placement).toBe('bottom');
      // bottom of target is 50, top = 50 + 7 = 57
      expect(pos.top).toBe(57);
    });

    it('flips to top when target is too close to bottom of viewport', () => {
      const target = makeRect(window.innerHeight - 30, 200, 40, 40);
      const tooltip = makeRect(0, 0, 100, 30);
      const pos = calculateTooltipPosition(target, tooltip, 'bottom');

      expect(pos.placement).toBe('top');
    });

    it('clamps left position so tooltip never overflows left or right viewport boundaries', () => {
      // Near left boundary
      const targetLeft = makeRect(200, 2, 40, 40);
      const tooltip = makeRect(0, 0, 100, 30);
      const posLeft = calculateTooltipPosition(targetLeft, tooltip, 'top');
      expect(posLeft.left).toBeGreaterThanOrEqual(8);

      // Near right boundary
      const targetRight = makeRect(200, window.innerWidth - 20, 40, 40);
      const posRight = calculateTooltipPosition(targetRight, tooltip, 'top');
      expect(posRight.left + tooltip.width).toBeLessThanOrEqual(window.innerWidth - 8);
    });

    it('clamps top and bottom vertical boundaries so tall tooltips never overflow the screen', () => {
      // Extremely tall tooltip at near-top target
      const targetNearTop = makeRect(15, 200, 40, 40);
      const tallTooltip = makeRect(0, 0, 200, 700);
      const pos = calculateTooltipPosition(targetNearTop, tallTooltip, 'top');

      expect(pos.top).toBeGreaterThanOrEqual(8);
      expect(pos.top + tallTooltip.height).toBeLessThanOrEqual(window.innerHeight - 8);
    });

    it('clamps left and right boundaries for side (left/right) placements', () => {
      const targetNearRight = makeRect(200, window.innerWidth - 10, 40, 40);
      const tooltip = makeRect(0, 0, 150, 40);
      const posRight = calculateTooltipPosition(targetNearRight, tooltip, 'right');

      expect(posRight.left).toBeGreaterThanOrEqual(8);
      expect(posRight.left + tooltip.width).toBeLessThanOrEqual(window.innerWidth - 8);
    });
  });
});

describe('Tooltip Component & Global TooltipProvider', () => {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root!.unmount());
    root = null;
    host?.remove();
    host = null;
    // Clean up any remaining portal elements in document.body
    document.querySelectorAll('[role="tooltip"]').forEach((el) => el.remove());
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders children without crashing', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          <button type="button">Test Trigger</button>
        </TooltipProvider>
      );
    });

    expect(host!.textContent).toContain('Test Trigger');
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('shows tooltip on hover for elements with data-tooltip after delay', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          <button type="button" data-tooltip="Inspect Details">
            Action
          </button>
        </TooltipProvider>
      );
    });

    const button = host!.querySelector('button')!;

    act(() => {
      button.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });

    // Before timer advances, tooltip is not shown yet
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    // Advance timer past hover delay (250ms)
    act(() => {
      vi.advanceTimersByTime(260);
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toContain('Inspect Details');
  });

  it('intercepts native title, suppresses it to prevent Chrome default tooltip, and restores on pointerout', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          <button type="button" title="Delete record (Del)">
            Delete
          </button>
        </TooltipProvider>
      );
    });

    const button = host!.querySelector('button')!;
    expect(button.getAttribute('title')).toBe('Delete record (Del)');

    act(() => {
      button.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });

    // Title is removed from HTML to suppress native Chrome tooltip, and saved to data attributes
    expect(button.getAttribute('title')).toBeNull();
    expect(button.getAttribute('data-tooltip')).toBe('Delete record (Del)');
    expect(button.getAttribute('data-original-title')).toBe('Delete record (Del)');

    // Advance past delay
    act(() => {
      vi.advanceTimersByTime(260);
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toContain('Delete record');
    const kbd = tooltip!.querySelector('kbd');
    expect(kbd).not.toBeNull();
    expect(kbd!.textContent).toBe('Del');

    // Pointer out restores title attribute
    act(() => {
      button.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });

    expect(button.getAttribute('title')).toBe('Delete record (Del)');
    expect(button.getAttribute('data-original-title')).toBeNull();
  });

  it('suppresses native title on both child badge and parent button simultaneously without duplicate tooltips', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          <button id="nav-btn" type="button" title="Contacts & Mentors">
            <span>Contacts</span>
            <span id="badge" title="3 follow-ups due soon">3</span>
          </button>
        </TooltipProvider>
      );
    });

    const button = host!.querySelector('#nav-btn') as HTMLElement;
    const badge = host!.querySelector('#badge') as HTMLElement;

    expect(button.getAttribute('title')).toBe('Contacts & Mentors');
    expect(badge.getAttribute('title')).toBe('3 follow-ups due soon');

    // Hover directly over the badge
    act(() => {
      badge.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });

    // BOTH child and parent titles must be removed from HTML to suppress native Chrome tooltips!
    expect(badge.getAttribute('title')).toBeNull();
    expect(button.getAttribute('title')).toBeNull();
    expect(badge.getAttribute('data-tooltip')).toBe('3 follow-ups due soon');
    expect(button.getAttribute('data-tooltip')).toBe('Contacts & Mentors');

    // Advance past delay
    act(() => {
      vi.advanceTimersByTime(260);
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    // Must display the innermost target's tooltip: the badge!
    expect(tooltip!.textContent).toContain('3 follow-ups due soon');
    expect(tooltip!.textContent).not.toContain('Contacts & Mentors');

    // Pointer moves from badge to the rest of the button (relatedTarget is button)
    act(() => {
      badge.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, cancelable: true, relatedTarget: button, pointerType: 'mouse' })
      );
    });

    // Button title MUST NOT be prematurely restored while pointer is still inside button!
    expect(button.getAttribute('title')).toBeNull();

    // Pointer leaves button entirely (relatedTarget is outside)
    act(() => {
      button.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, cancelable: true, relatedTarget: host, pointerType: 'mouse' })
      );
    });

    // Both titles restored
    expect(badge.getAttribute('title')).toBe('3 follow-ups due soon');
    expect(button.getAttribute('title')).toBe('Contacts & Mentors');
  });

  it('respects data-no-tooltip on open drawer sections while still allowing tooltips on child badges', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          {/* Drawer open: section button has data-no-tooltip */}
          <button id="open-section" type="button" title="Settings" data-no-tooltip>
            <span>Settings</span>
          </button>
          {/* Drawer closed: section button has data-tooltip without data-no-tooltip */}
          <button id="closed-section" type="button" title="Settings" data-tooltip="Settings" data-tooltip-placement="right">
            <span>⚙️</span>
          </button>
        </TooltipProvider>
      );
    });

    const openBtn = host!.querySelector('#open-section') as HTMLElement;
    const closedBtn = host!.querySelector('#closed-section') as HTMLElement;

    // Hover open section button: no tooltip should appear
    act(() => {
      openBtn.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
      vi.advanceTimersByTime(260);
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    // But native title MUST still be suppressed from DOM!
    expect(openBtn.getAttribute('title')).toBeNull();

    act(() => {
      openBtn.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });

    // Hover closed section button: custom tooltip should appear on the right
    act(() => {
      closedBtn.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
      vi.advanceTimersByTime(260);
    });
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toContain('Settings');
  });

  it('dismisses tooltip immediately when Escape key is pressed', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          <button type="button" data-tooltip="Settings shortcut">
            Settings
          </button>
        </TooltipProvider>
      );
    });

    const button = host!.querySelector('button')!;

    act(() => {
      button.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
      vi.advanceTimersByTime(260);
    });

    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('dismisses tooltip immediately when pointerdown occurs', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          <button type="button" data-tooltip="Click me">
            Click
          </button>
        </TooltipProvider>
      );
    });

    const button = host!.querySelector('button')!;

    act(() => {
      button.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
      vi.advanceTimersByTime(260);
    });

    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();

    act(() => {
      document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });

    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('renders explicit Tooltip component wrapper correctly', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          <Tooltip content="Custom Wrapper Content" shortcut="Ctrl+S" placement="bottom">
            <button type="button">Save</button>
          </Tooltip>
        </TooltipProvider>
      );
    });

    const button = host!.querySelector('button')!;

    act(() => {
      button.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
      vi.advanceTimersByTime(260);
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toContain('Custom Wrapper Content');
    expect(tooltip!.querySelector('kbd')?.textContent).toBe('Ctrl+S');
  });

  it('supports warm-up mode where adjacent tooltips open instantly within grace window', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          <div className="flex gap-2">
            <button id="btn-1" type="button" data-tooltip="First Tooltip">
              First
            </button>
            <button id="btn-2" type="button" data-tooltip="Second Tooltip">
              Second
            </button>
          </div>
        </TooltipProvider>
      );
    });

    const btn1 = host!.querySelector('#btn-1')!;
    const btn2 = host!.querySelector('#btn-2')!;

    // Hover first button (cold start: requires 250ms delay)
    act(() => {
      btn1.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(260);
    });
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('First Tooltip');

    // Leave first button
    act(() => {
      btn1.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });

    // Enter second button immediately (within 350ms warmup window)
    act(() => {
      btn2.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });

    // Warm start: delay is 0ms, so it opens without waiting 250ms!
    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Second Tooltip');
  });

  it('triggers tooltip on keyboard focusin and dismisses on focusout for keyboard accessibility', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          <button id="focus-btn" type="button" data-tooltip="Keyboard accessible tooltip">
            Focus Me
          </button>
        </TooltipProvider>
      );
    });

    const button = host!.querySelector('#focus-btn')!;

    // Focus event
    act(() => {
      button.dispatchEvent(new FocusEvent('focusin', { bubbles: true, cancelable: true }));
    });

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Keyboard accessible tooltip');

    // Blur / focusout event
    act(() => {
      button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, cancelable: true }));
    });

    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('applies directional walking glide animation and travel delta when moving between adjacent triggers in warm state', () => {
    act(() => {
      root!.render(
        <TooltipProvider>
          <div className="flex gap-4">
            <button id="btn-copy" type="button" data-tooltip="Copy link">
              Copy
            </button>
            <button id="btn-share" type="button" data-tooltip="Share with team">
              Share
            </button>
          </div>
        </TooltipProvider>
      );
    });

    const copyBtn = host!.querySelector('#btn-copy') as HTMLElement;
    const shareBtn = host!.querySelector('#btn-share') as HTMLElement;

    // Mock bounding client rects for copy (left: 100) and share (left: 180)
    vi.spyOn(copyBtn, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      left: 100,
      width: 60,
      height: 36,
      bottom: 236,
      right: 160,
      x: 100,
      y: 200,
      toJSON: () => ({}),
    } as DOMRect);

    vi.spyOn(shareBtn, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      left: 180,
      width: 60,
      height: 36,
      bottom: 236,
      right: 240,
      x: 180,
      y: 200,
      toJSON: () => ({}),
    } as DOMRect);

    // 1. Initial hover over Copy (cold start)
    act(() => {
      copyBtn.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });
    act(() => {
      vi.advanceTimersByTime(260);
    });

    const firstTooltip = document.querySelector('[role="tooltip"]') as HTMLElement;
    expect(firstTooltip).not.toBeNull();
    expect(firstTooltip.textContent).toContain('Copy link');
    // Cold start uses directional pop-in (not travel)
    expect(firstTooltip.className).toContain('animate-[tooltipInTop_160ms_cubic-bezier(0.16,1,0.3,1)_forwards]');

    // 2. Move directly from Copy to Share (warm transition: left to right)
    act(() => {
      copyBtn.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });
    act(() => {
      shareBtn.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });
    act(() => {
      vi.advanceTimersByTime(10);
    });

    const travelingTooltip = document.querySelector('[role="tooltip"]') as HTMLElement;
    expect(travelingTooltip).not.toBeNull();
    expect(travelingTooltip.textContent).toContain('Share with team');
    // Warm adjacent transition triggers the walking/traveling animation!
    expect(travelingTooltip.className).toContain('animate-[tooltipTravel_160ms_cubic-bezier(0.16,1,0.3,1)_forwards]');
    // deltaX: previous left (130) - new left (210) = -80px (enters from the left direction where cursor came from!)
    expect(travelingTooltip.style.getPropertyValue('--tt-travel-x')).toBe('-80px');
    expect(travelingTooltip.style.getPropertyValue('--tt-content-drift')).toBe('-6px');

    // 3. Move backwards from Share to Copy (warm transition: right to left)
    act(() => {
      shareBtn.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });
    act(() => {
      copyBtn.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });
    act(() => {
      vi.advanceTimersByTime(10);
    });

    const returnTooltip = document.querySelector('[role="tooltip"]') as HTMLElement;
    expect(returnTooltip).not.toBeNull();
    expect(returnTooltip.textContent).toContain('Copy link');
    expect(returnTooltip.className).toContain('animate-[tooltipTravel_160ms_cubic-bezier(0.16,1,0.3,1)_forwards]');
    // deltaX: previous left (210) - new left (130) = +80px (enters from the right direction where cursor came from!)
    expect(returnTooltip.style.getPropertyValue('--tt-travel-x')).toBe('80px');
    expect(returnTooltip.style.getPropertyValue('--tt-content-drift')).toBe('6px');
  });

  it('formats long link URLs as a single-line truncated monospace pill with overflow containment', () => {
    const longUrl =
      'https://links.wellfound.com/s/c/QWzr4bUqZa6i9oUT0J5vI8iDSCFUhcbKZFbfri7mbb-cS0HDVuVhgBMEILkda6mff8mOCB5aBmuiPw4fn5S4WjAz5Rp5L1EvWz3msPGLE3WoPA2gldSZ5ZUNOiH5VuWvG4jTcRhYEA1pPDYw2LWhjqbe7tGH6-KciMlbt7clq2fsfW9Pz9HTjRYKLTn9Et1X7vlggku0OA9qcosmjB4JCmaEfCXCw0l73nqd5HceJUdGG49ZWhXhyiNU50ZzdxylOzzhJs_OV/25';

    act(() => {
      root!.render(
        <TooltipProvider>
          <div>
            <a id="test-link" href={longUrl} title={longUrl}>
              View my application
            </a>
          </div>
        </TooltipProvider>
      );
    });

    const link = document.getElementById('test-link') as HTMLAnchorElement;
    expect(link).not.toBeNull();

    // Hover over link
    act(() => {
      link.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const tooltip = document.querySelector('[role="tooltip"]') as HTMLElement;
    expect(tooltip).not.toBeNull();
    expect(tooltip.className).toContain('overflow-hidden');
    expect(tooltip.className).toContain('max-w-xs');
    expect(tooltip.className).toContain('items-center');

    const span = tooltip.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.className).toContain('truncate');
    expect(span?.className).toContain('font-mono');
    expect(span?.className).toContain('whitespace-nowrap');
  });

  it('formats long non-URL text with break-words [overflow-wrap:anywhere] without break-all', () => {
    const longText =
      'This is a multi-line explanation detailing why this candidate application is marked stale after 14 days.';

    act(() => {
      root!.render(
        <TooltipProvider>
          <div>
            <button id="test-btn" type="button" data-tooltip={longText}>
              Stale Warning
            </button>
          </div>
        </TooltipProvider>
      );
    });

    const btn = document.getElementById('test-btn') as HTMLButtonElement;
    act(() => {
      btn.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, cancelable: true, pointerType: 'mouse' })
      );
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const tooltip = document.querySelector('[role="tooltip"]') as HTMLElement;
    expect(tooltip).not.toBeNull();

    const span = tooltip.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.className).toContain('break-words');
    expect(span?.className).toContain('[overflow-wrap:anywhere]');
    expect(span?.className).not.toContain('break-all');
  });
});

describe('formatShortcutForPlatform', () => {
  it('formats shortcuts with Apple symbols when on macOS', () => {
    expect(formatShortcutForPlatform('Ctrl+K', true)).toBe('⌘K');
    expect(formatShortcutForPlatform('Cmd+P', true)).toBe('⌘P');
    expect(formatShortcutForPlatform('Alt+S', true)).toBe('⌥S');
    expect(formatShortcutForPlatform('Shift+Enter', true)).toBe('⇧Enter');
  });

  it('preserves standard modifier strings on Windows/Linux', () => {
    expect(formatShortcutForPlatform('Ctrl+K', false)).toBe('Ctrl+K');
    expect(formatShortcutForPlatform('Alt+S', false)).toBe('Alt+S');
  });
});
