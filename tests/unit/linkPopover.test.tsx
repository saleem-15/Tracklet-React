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
  it('renders input + Apply when open, nothing when closed', () => {
    mount();
    expect(host!.querySelector('input')).not.toBeNull();

    const closed = mount({ open: false });
    void closed;
    expect(host!.querySelector('input')).toBeNull();
  });

  it('shows the Remove button only for existing links', () => {
    mount({ editingExisting: true });
    expect(host!.textContent).toContain('Remove');

    mount({ editingExisting: false });
    expect(host!.textContent).not.toContain('Remove');
  });

  it('closes on pointer press outside its root', () => {
    const props = mount();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    act(() => {
      outside.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true })
      );
    });
    outside.remove();
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when pressing inside the popover', () => {
    const props = mount();
    act(() => {
      host!
        .querySelector('input')!
        .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('Escape closes; Apply invokes callback', () => {
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

    addSpy.mockRestore();

    const fresh = mount({ open: true });
    act(() => {
      host!
        .querySelector('button[aria-label="Apply"], button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(fresh.onApply).toHaveBeenCalled();
  });
});
