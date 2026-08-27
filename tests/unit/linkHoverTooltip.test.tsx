import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { LinkHoverTooltip } from '../../src/components/editor/LinkHoverTooltip';

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let editor: HTMLDivElement;

function setupEditorHtml(html: string, onEditLink = vi.fn(), disabled = false) {
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

  act(() =>
    root!.render(
      <LinkHoverTooltip
        editorRef={{ current: editor }}
        onEditLink={onEditLink}
        disabled={disabled}
      />
    )
  );
  return { onEditLink };
}

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  document.querySelectorAll('[data-editor]').forEach((n) => n.remove());
  vi.restoreAllMocks();
});

describe('LinkHoverTooltip (interactive hover preview for links)', () => {
  it('shows the URL and action buttons when hovering linked text, without Ctrl+Click text', () => {
    setupEditorHtml('<p>see <a href="https://example.com/job">this role</a></p>');
    const anchor = editor.querySelector('a')!;

    act(() => {
      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toContain('https://example.com/job');
    expect(tooltip!.textContent).not.toContain('Ctrl+Click');

    // Has Copy and Edit buttons
    const copyBtn = tooltip!.querySelector('button[aria-label="Copy link URL"]');
    const editBtn = tooltip!.querySelector('button[aria-label="Edit link"]');
    expect(copyBtn).not.toBeNull();
    expect(editBtn).not.toBeNull();
  });

  it('clicking copy button copies the URL and triggers visual feedback', () => {
    const writeTextSpy = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true,
    });

    setupEditorHtml('<p><a href="https://example.com/portfolio">Portfolio</a></p>');
    const anchor = editor.querySelector('a')!;

    act(() => {
      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    const copyBtn = document.querySelector('button[aria-label="Copy link URL"]')!;
    act(() => {
      copyBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(writeTextSpy).toHaveBeenCalledWith('https://example.com/portfolio');
  });

  it('clicking edit button invokes onEditLink callback with the anchor', () => {
    const onEditLink = vi.fn();
    setupEditorHtml('<p><a href="https://github.com">GitHub</a></p>', onEditLink);
    const anchor = editor.querySelector('a')!;

    act(() => {
      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    const editBtn = document.querySelector('button[aria-label="Edit link"]')!;
    act(() => {
      editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onEditLink).toHaveBeenCalledWith(anchor);
  });

  it('hides after pointer leaves the link', async () => {
    vi.useFakeTimers();
    setupEditorHtml('<p><a href="https://x.co">x</a></p>');
    const anchor = editor.querySelector('a')!;

    act(() => {
      anchor.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(document.querySelector('[role="tooltip"]')).not.toBeNull();

    act(() => {
      anchor.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      vi.advanceTimersByTime(300);
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    vi.useRealTimers();
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
