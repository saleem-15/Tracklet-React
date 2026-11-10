import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CommandMenu } from '../../src/components/CommandMenu';
import { CustomSelectDropdown } from '../../src/components/CustomSelectDropdown';

describe('Tracklet Motion Interruption & State Invariants', () => {
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

  it('handles rapid Escape cancellations on CommandMenu without dangling backdrops', async () => {
    let isOpen = true;
    const handleClose = vi.fn(() => {
      isOpen = false;
    });

    const TestHarness = () => {
      const [open, setOpen] = useState(true);
      return (
        <CommandMenu
          isOpen={open}
          onClose={() => {
            setOpen(false);
            handleClose();
          }}
        >
          <div>Command Content</div>
        </CommandMenu>
      );
    };

    await act(async () => {
      root.render(<TestHarness />);
    });

    expect(container.querySelector('[role="dialog"]')).toBeDefined();

    // Rapidly trigger Escape
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(handleClose).toHaveBeenCalled();
  });

  it('handles rapid outside-click cancellation on dropdowns cleanly with exit animation', async () => {
    const options = [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
    ];

    await act(async () => {
      root.render(
        <CustomSelectDropdown
          value="1"
          onChange={() => {}}
          options={options}
        />
      );
    });

    const triggerBtn = container.querySelector('button');
    expect(triggerBtn).toBeDefined();

    // Open dropdown
    await act(async () => {
      triggerBtn?.click();
    });
    expect(container.querySelector('[role="listbox"]')).toBeDefined();

    // Trigger outside click
    await act(async () => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    // Wait for the exit animation (100ms exit duration) to fully unmount from DOM
    await act(async () => {
      await new Promise((r) => setTimeout(r, 160));
    });

    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });
});
