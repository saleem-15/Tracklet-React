import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { RichTextEditor } from '../../src/components/editor/RichTextEditor';
import { NOTE_TEMPLATES } from '../../src/lib/editor/noteTemplates';
import { compareCanonical } from '../../src/lib/editor/richTextMarkdownUtils';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(props: Partial<React.ComponentProps<typeof RichTextEditor>>) {
  if (root) {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  }
  const currentHost = document.createElement('div');
  document.body.appendChild(currentHost);
  const currentRoot = createRoot(currentHost);
  host = currentHost;
  root = currentRoot;
  const onChange = props.onChange ?? vi.fn();
  const value = props.value ?? '';
  act(() => {
    currentRoot.render(
      <RichTextEditor value={value} onChange={onChange} {...props} />
    );
  });
  return { getHtml: () => currentHost.innerHTML };
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

describe('RichTextEditor mount (contracts §1)', () => {
  it('renders an editable surface with placeholder when empty', () => {
    const { getHtml } = mount({ value: '' });
    expect(getHtml()).toContain('role="textbox"');
    expect(getHtml()).toContain('Start writing');
  });

  it('shows starter template pills only while empty', () => {
    const empty = mount({ value: '', templates: NOTE_TEMPLATES });
    expect(empty.getHtml()).toContain('Recruiter Screen');

    const filled = mount({ value: '## Existing notes', templates: NOTE_TEMPLATES });
    expect(filled.getHtml()).not.toContain('Recruiter Screen');
  });

  it('replaces DOM for external value changes (template insert path)', () => {
    const { getHtml } = mount({ value: '' });
    // Simulate host persisting a template skeleton -> new value prop
    act(() => {
      root!.render(
        <RichTextEditor
          value={NOTE_TEMPLATES[0].skeleton}
          onChange={vi.fn()}
          templates={NOTE_TEMPLATES}
        />
      );
    });
    expect(getHtml()).toContain('Role Info');
    expect(getHtml()).toContain('data-task="true"');
  });

  it('treats canonical equivalents as equal (no-op sync contract G1)', () => {
    expect(compareCanonical('# T\n\n\n\nBody', '# T\n\nBody')).toBe(true);
    expect(compareCanonical('- a\n- b', '## different')).toBe(false);
  });

  it('exposes multiline textbox semantics', () => {
    const { getHtml } = mount({ ariaLabel: 'Application Notes' });
    expect(getHtml()).toContain('aria-label="Application Notes"');
    expect(getHtml()).toContain('aria-multiline="true"');
  });

  it('shows a resize handle only when resizable', () => {
    const plain = mount({});
    expect(plain.getHtml()).not.toContain('data-resize-handle');

    const sized = mount({ resizable: true });
    expect(sized.getHtml()).toContain('data-resize-handle');
  });

  it('slash dialog opens when "/" is typed into an EMPTY surface (regression)', () => {
    const onChange = vi.fn();
    const mounted = mount({ value: '', onChange });

    const editable = host!.querySelector('[role="textbox"]') as HTMLElement;
    act(() => {
      editable.focus();
      // Caret inside the empty paragraph
      const p = editable.querySelector('p') ?? editable;
      const range = document.createRange();
      range.selectNodeContents(p);
      range.collapse(true);
      document.getSelection()!.removeAllRanges();
      document.getSelection()!.addRange(range);
    });

    // Insert "/" + fire the input event (full pipeline, no keydown shortcut)
    act(() => {
      const p = editable.querySelector('p')!;
      p.innerHTML = '/';
      const range = document.createRange();
      range.selectNodeContents(p);
      range.collapse(false);
      document.getSelection()!.removeAllRanges();
      document.getSelection()!.addRange(range);
      editable.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(host!.querySelector('[role="listbox"]')).not.toBeNull();
    expect(host!.querySelectorAll('[role="option"]').length).toBeGreaterThan(0);
  });
});
