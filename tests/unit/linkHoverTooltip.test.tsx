import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { LinkHoverTooltip } from '../../src/components/editor/LinkHoverTooltip';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let editor: HTMLDivElement;

function setupEditorHtml(html: string) {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);

  editor = document.createElement('div');
  editor.setAttribute('data-editor', 'true');
  editor.innerHTML = html;
  document.body.appendChild(editor);

  act(() => root.render(<LinkHoverTooltip editorRef={{ current: editor }} />));
}

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  document.querySelectorAll('[data-editor]').forEach((n) => n.remove());
  vi.restoreAllMocks();
});

describe('LinkHoverTooltip (hover preview for links)', () => {
  it('shows the URL pill when hovering linked text', () => {
    setupEditorHtml('<p>see <a href="https://example.com/job">this role</a></p>');
    const anchor = editor.querySelector('a')!;

    act(() => {
      anchor.dispatchEvent(
        new MouseEvent('mouseover', { bubbles: true })
      );
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toContain('https://example.com/job');
    expect(tooltip!.textContent).toContain('Ctrl+Click to open');
  });

  it('hides when the pointer leaves the link', () => {
    setupEditorHtml('<p><a href="https://x.co">x</a></p>');
    const anchor = editor.querySelector('a')!;

    act(() => {
      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();

    act(() => {
      anchor.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('ignores plain text hover (no anchor ancestor)', () => {
    setupEditorHtml('<p>no links here</p>');
    act(() => {
      editor
        .querySelector('p')!
        .dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
});
