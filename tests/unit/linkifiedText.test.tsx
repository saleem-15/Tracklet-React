import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { LinkifiedText } from '../../src/components/LinkifiedText';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(props: React.ComponentProps<typeof LinkifiedText>) {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<LinkifiedText {...props} />));
}

function firstAnchor(): HTMLAnchorElement {
  const anchor = host?.querySelector('a');
  if (!anchor) throw new Error('No anchor rendered in current host');
  return anchor as HTMLAnchorElement;
}

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
});

describe('LinkifiedText requireCtrlClick (pipeline card links)', () => {
  it('renders URLs with link styling in both modes', () => {
    mount({ text: 'see https://example.com/job here' });
    expect(firstAnchor().className).toContain('text-blue-600');

    mount({ text: 'see https://example.com/job here', requireCtrlClick: true });
    expect(firstAnchor().className).toContain('text-blue-600');
  });

  it('plain click does NOT navigate in requireCtrlClick mode', () => {
    mount({ text: 'https://example.com', requireCtrlClick: true });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => firstAnchor().dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true); // navigation suppressed
  });

  it('ctrl+click allows default navigation in requireCtrlClick mode', () => {
    mount({ text: 'https://example.com', requireCtrlClick: true });
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    act(() => firstAnchor().dispatchEvent(event));
    expect(event.defaultPrevented).toBe(false); // browser opens new tab
  });

  it('meta+click (macOS) also allows navigation', () => {
    mount({ text: 'https://example.com', requireCtrlClick: true });
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });
    act(() => firstAnchor().dispatchEvent(event));
    expect(event.defaultPrevented).toBe(false);
  });

  it('plain click still navigates when requireCtrlClick is off', () => {
    mount({ text: 'https://example.com' });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => firstAnchor().dispatchEvent(event));
    expect(event.defaultPrevented).toBe(false);
  });
});
