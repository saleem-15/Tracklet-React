import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { EDITOR_ACTIONS, getActionById } from '../../src/components/editor/editorActions';
import { placeCaretAtOffset } from '../../src/lib/editorDom';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function setupEditor(html: string): HTMLElement {
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  // Render nothing React-managed; we only need a mounted React context so
  // dispatched events behave like the real app.
  act(() => root.render(<div data-testid="noop" />));

  const editor = document.createElement('div');
  editor.setAttribute('data-editor', 'true');
  editor.innerHTML = html;
  document.body.appendChild(editor);
  return editor;
}

function apply(id: Parameters<typeof getActionById>[0], editor: HTMLElement) {
  const action = getActionById(id)!;
  action.apply({ editor });
}

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  document.querySelectorAll('[data-editor]').forEach((n) => n.remove());
});

describe('deterministic block transformations (bug-fix regression)', () => {
  it('h1 on a plain paragraph converts to h2 and keeps the caret inside it', () => {
    const ed = setupEditor('<p class="leading-relaxed">Interview notes</p>');
    placeCaretAtOffset(ed.querySelector('p')!, 3);

    apply('h1', ed);

    const h = ed.querySelector('h2')!;
    expect(h.textContent).toBe('Interview notes');
    const sel = document.getSelection()!;
    expect(h.contains(sel.anchorNode)).toBe(true); // never jumps lines
  });

  it('h1 toggles back to a paragraph when already an H2', () => {
    const ed = setupEditor('<h2 class="x">Title</h2>');
    placeCaretAtOffset(ed.querySelector('h2')!, 1);

    apply('h1', ed);
    expect(ed.querySelector('p')).not.toBeNull();
    expect(ed.querySelector('h2')).toBeNull();
  });

  it('todo converts a plain line into a task row with checkbox', () => {
    const ed = setupEditor('<p>Buy milk</p>');
    placeCaretAtOffset(ed.querySelector('p')!, 0);

    apply('todo', ed);

    const li = ed.querySelector('li.task-item') as HTMLElement;
    expect(li.dataset.task).toBe('true');
    expect(li.querySelector('input[type=checkbox]')).not.toBeNull();
    expect(li.textContent).toContain('Buy milk');
    expect(document.getSelection()!.anchorNode && li.contains(document.getSelection()!.anchorNode)).toBe(true);
  });

  it('bullet after an existing bullet list merges instead of nesting lists', () => {
    const ed = setupEditor(
      '<ul class="list-disc pl-4 space-y-0.5 my-1 text-slate-800 text-xs"><li>first</li></ul><p>second</p>'
    );
    placeCaretAtOffset(ed.querySelector('p')!, 0);

    apply('bullet', ed);

    expect(ed.querySelectorAll('ul').length).toBe(1); // coalesced
    expect(ed.querySelectorAll('li').length).toBe(2);
  });

  it('converting an li to a heading extracts it and preserves trailing siblings', () => {
    const ed = setupEditor(
      '<ul><li>one</li><li>two</li><li>three</li></ul>'
    );
    placeCaretAtOffset(ed.querySelectorAll('li')[1]!, 1); // caret in "two"

    apply('h1', ed);

    const h = ed.querySelector('h2');
    expect(h?.textContent).toBe('two');
    const lists = ed.querySelectorAll('ul');
    expect(lists.length).toBe(2);
    expect(lists[0].textContent).toContain('one');
    expect(lists[1].textContent).toContain('three');
    // Order preserved: one -> two(heading) -> three
    const order = Array.from(ed.children).map((c) => c.textContent ?? '');
    expect(order.indexOf(order.find((t) => t === 'one')!)).toBeLessThan(
      order.findIndex((t) => t!.includes('two'))
    );
  });

  it('quote inside a quote toggles OFF by unwrapping the whole quote', () => {
    const ed = setupEditor(
      '<blockquote class="q"><p>flag line</p><p>second line</p></blockquote>'
    );
    placeCaretAtOffset(ed.querySelector('p')!, 0);

    apply('quote', ed);

    expect(ed.querySelector('blockquote')).toBeNull();
    expect(ed.querySelectorAll('p').length).toBeGreaterThanOrEqual(1);
    expect(ed.textContent).toContain('flag line');
    expect(ed.textContent).toContain('second line');
  });

  it('registry stays intact after refactor (FR-007 minimum set)', () => {
    const ids = EDITOR_ACTIONS.map((a) => a.id);
    for (const required of ['bold','italic','h1','h2','h3','bullet','numbered','todo','quote','code','link'] as const) {
      expect(ids).toContain(required);
    }
  });
});
