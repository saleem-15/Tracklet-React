import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { LinkPopover } from '../../src/components/editor/LinkPopover';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(overrides?: Partial<Parameters<typeof LinkPopover>[0]>) {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);

  const props = {
    open: true,
    url: 'https://example.com',
    editingExisting: false,
    rect: { anchorTop: 100, anchorBottom: 116, left: 40 },
    onUrlChange: vi.fn(),
    onApply: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  act(() => root.render(<LinkPopover {...props} />));
  return props;
}

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
});

describe('LinkPopover (floating link UX)', () => {
  it('renders input without Apply button when open, nothing when closed', () => {
    mount();
    expect(host!.querySelector('input')).not.toBeNull();
    expect(host!.textContent).not.toContain('Apply');

    const closed = mount({ open: false });
    void closed;
    expect(host!.querySelector('input')).toBeNull();
  });

  it('shows the Remove button only for existing links', () => {
    mount({ editingExisting: true });
    expect(host!.querySelector('button[aria-label="Remove link"]')).not.toBeNull();

    mount({ editingExisting: false });
    expect(host!.querySelector('button[aria-label="Remove link"]')).toBeNull();
  });

  it('auto-saves on pointer press outside its root for valid URL', () => {
    const props = mount({ url: 'https://example.com' });
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    act(() => {
      outside.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true })
      );
    });
    outside.remove();
    expect(props.onApply).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when pressing inside the popover', () => {
    const props = mount();
    act(() => {
      host!
        .querySelector('input')!
        .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it('Escape closes without applying; Enter auto-saves and applies', () => {
    let keyHandler: ((e: Event) => void) | null = null;
    const addSpy = vi.spyOn(document, 'addEventListener').mockImplementation(
      ((type: string, handler: EventListenerOrEventListenerObject) => {
        if (type === 'keydown' && typeof handler === 'function') {
          keyHandler = handler as (e: Event) => void;
        }
      }) as typeof document.addEventListener
    );
    const props = mount();
    expect(keyHandler).not.toBeNull();

    act(() => {
      if (keyHandler) keyHandler(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onApply).not.toHaveBeenCalled();

    addSpy.mockRestore();

    const fresh = mount({ open: true, url: 'https://github.com' });
    act(() => {
      host!
        .querySelector('input')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(fresh.onApply).toHaveBeenCalledTimes(1);
  });
});
