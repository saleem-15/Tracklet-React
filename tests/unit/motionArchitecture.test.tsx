import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MOTION_TIMING, MOTION_EASE, transitionCommand, transitionPanel } from '../../src/lib/motion';
import { MetricRoller } from '../../src/components/MetricRoller';
import { ActionSuccessCheck, ErrorShakeContainer } from '../../src/components/ActionFeedback';
import { CustomSelectDropdown } from '../../src/components/CustomSelectDropdown';

describe('Tracklet Motion Architecture & Standards', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('Motion Timing & Curve Invariants', () => {
    it('enforces maximum duration upper bounds (<= 220ms)', () => {
      expect(MOTION_TIMING.instant).toBeLessThanOrEqual(0.1);
      expect(MOTION_TIMING.snappy).toBeLessThanOrEqual(0.16);
      expect(MOTION_TIMING.panel).toBeLessThanOrEqual(0.22);
    });

    it('enforces critically damped easing with zero cartoon overshoot', () => {
      // For any curve [x1, y1, x2, y2], y1 and y2 must be <= 1.0 to prevent rebound/bounce
      Object.entries(MOTION_EASE).forEach(([name, curve]) => {
        const [, y1, , y2] = curve;
        expect(y1, `${name} curve y1 must not overshoot 1.0`).toBeLessThanOrEqual(1.0);
        expect(y2, `${name} curve y2 must not overshoot 1.0`).toBeLessThanOrEqual(1.0);
      });
    });

    it('provides valid transition configurations', () => {
      expect(transitionCommand.duration).toBe(MOTION_TIMING.snappy);
      expect(transitionPanel.duration).toBe(MOTION_TIMING.panel);
    });
  });

  describe('MetricRoller Component', () => {
    it('renders numerical values with tabular-nums and font-mono styling', async () => {
      await act(async () => {
        root.render(<MetricRoller value={42} prefix="+" suffix="%" />);
      });

      expect(container.textContent).toContain('42');
      expect(container.textContent).toContain('+');
      expect(container.textContent).toContain('%');
      const rootSpan = container.firstElementChild as HTMLElement;
      expect(rootSpan.className).toContain('tabular-nums');
      expect(rootSpan.className).toContain('font-mono');
    });
  });

  describe('ActionFeedback Components', () => {
    it('renders ActionSuccessCheck SVG with accessible hidden attribute', async () => {
      await act(async () => {
        root.render(<ActionSuccessCheck size={24} />);
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeDefined();
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(svg?.getAttribute('width')).toBe('24');
    });

    it('renders ErrorShakeContainer with children intact', async () => {
      await act(async () => {
        root.render(
          <ErrorShakeContainer isError={false}>
            <input data-testid="test-input" defaultValue="test" />
          </ErrorShakeContainer>
        );
      });

      const input = container.querySelector('input');
      expect(input).toBeDefined();
      expect(input?.defaultValue).toBe('test');
    });
  });

  describe('Animated Dropdown Integration', () => {
    it('toggles listbox with animated presence and origin styling', async () => {
      const options = [
        { label: 'Remote', value: 'remote' },
        { label: 'Hybrid', value: 'hybrid' },
      ];

      await act(async () => {
        root.render(
          <CustomSelectDropdown
            value="remote"
            onChange={() => {}}
            options={options}
            labelPrefix="Location"
          />
        );
      });

      const button = container.querySelector('button');
      expect(button).toBeDefined();
      expect(container.querySelector('[role="listbox"]')).toBeNull();

      // Click to open
      await act(async () => {
        button?.click();
      });

      const listbox = container.querySelector('[role="listbox"]') as HTMLElement;
      expect(listbox).toBeDefined();
      expect(listbox.style.transformOrigin).toBe('top left');
      expect(listbox.className).toContain('will-change-transform');
    });
  });
});
