import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Checkbox } from '../../src/components/Checkbox';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Checkbox Component', () => {
  let host: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    if (root) {
      act(() => root!.unmount());
      root = null;
    }
    if (host) {
      host.remove();
      host = null;
    }
    vi.restoreAllMocks();
  });

  const render = (props: Partial<React.ComponentProps<typeof Checkbox>> = {}) => {
    act(() => {
      root!.render(<Checkbox checked={false} {...props} />);
    });
  };

  it('renders a role="checkbox" control with the animated stroke path', () => {
    render();

    const box = host!.querySelector('button[role="checkbox"]') as HTMLButtonElement;
    expect(box).not.toBeNull();
    expect(box.className).toContain('data-[state=checked]:bg-blue-600');

    const path = box.querySelector('svg path');
    expect(path).not.toBeNull();
    expect(path!.getAttribute('d')).toBe('M2.5 6L4.5 8L9.5 3');
  });

  it('reflects the controlled checked state in aria-checked', () => {
    render({ checked: true });
    const box = host!.querySelector('button[role="checkbox"]') as HTMLButtonElement;
    expect(box.getAttribute('aria-checked')).toBe('true');

    act(() => root!.render(<Checkbox checked={false} />));
    expect(box.getAttribute('aria-checked')).toBe('false');
  });

  it('calls onChange with the next state on click and stays controlled', () => {
    const onChange = vi.fn();
    render({ checked: false, onChange, ariaLabel: 'Toggle prep task' });

    const box = host!.querySelector('button[role="checkbox"]') as HTMLButtonElement;
    expect(box.getAttribute('aria-label')).toBe('Toggle prep task');

    act(() => {
      box.click();
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
    // Controlled: the DOM state only flips when the parent re-renders
    expect(box.getAttribute('aria-checked')).toBe('false');
  });

  it('does not fire onChange when disabled', () => {
    const onChange = vi.fn();
    render({ checked: false, onChange, disabled: true });

    const box = host!.querySelector('button[role="checkbox"]') as HTMLButtonElement;
    expect(box.disabled).toBe(true);

    act(() => {
      box.click();
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
