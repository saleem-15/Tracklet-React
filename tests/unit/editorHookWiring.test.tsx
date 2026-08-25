/**
 * Hook-wiring safety net for the editor refactor.
 * Drives the real hook handlers directly (no event-system dependence) so
 * every behavior below must keep passing while modules are split/moved.
 */
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { useRichTextEditor } from '../../src/lib/editor/useRichTextEditor';
import { placeCaretAtOffset } from '../../src/lib/editor/editorDom';

type Api = ReturnType<typeof useRichTextEditor>;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
let api: Api;

function Harness({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  api = useRichTextEditor({ value, onChange });
  return (
    <div
      ref={api.editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={api.handleInput}
      onKeyDown={api.handleKeyDown as unknown as React.EventHandler<any>}
    />
  );
}

function mount(value: string) {
  const onChange = vi.fn();
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Harness value={value} onChange={onChange} />));
  return {
    onChange,
    get editor() {
      return api.editorRef.current!;
    },
  };
}

function fakeKey(patch: Partial<Record<string, unknown>>): React.KeyboardEvent<HTMLDivElement> {
  const target = document.createElement('div');
  return {
    key: '',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target,
    ...patch,
  } as unknown as React.KeyboardEvent<HTMLDivElement>;
}

function clipEvt(flavors: Record<string, string>): React.ClipboardEvent<HTMLDivElement> {
  return {
    clipboardData: {
      getData: (t: string) => flavors[t] ?? '',
      setData: vi.fn(),
    },
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as React.ClipboardEvent<HTMLDivElement>;
}

function typeIntoEditor(text: string): void {
  const el = api.editorRef.current!;
  // Simulate typing at the current caret: append/insert text node content.
  const sel = window.getSelection()!;
  let node = sel.anchorNode;
  if (!node || !el.contains(node)) {
    el.insertBefore(document.createTextNode(''), null);
    node = el.lastChild!;
  }
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node as Text;
    const off = sel.anchorOffset;
    t.insertData(off, text);
    const r = document.createRange();
    r.setStart(t, off + text.length);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  } else {
    const t = document.createTextNode(text);
    node.appendChild(t);
    const r = document.createRange();
    r.setStart(t, text.length);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  }
  act(() => api.handleInput());
}

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
});

/**
 * Minimal execCommand shim â€” happy-dom ships none. Implements exactly the
 * commands our handlers exercise so wiring assertions stay deterministic.
 */
beforeAll(() => {
  (document as any).execCommand = (cmd: string, _ui?: boolean, value?: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return true;
    const range = sel.getRangeAt(0);
    switch (cmd) {
      case 'insertText': {
        range.deleteContents();
        const t = document.createTextNode(value ?? '');
        range.insertNode(t);
        range.setStart(t, t.length);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      case 'bold': {
        if (!range.collapsed && range.toString()) {
          const b = document.createElement('b');
          b.appendChild(range.extractContents());
          range.insertNode(b);
          range.setStartAfter(b);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        return true;
      }
      case 'createLink': {
        if (range.toString()) {
          const a = document.createElement('a');
          a.setAttribute('href', value ?? '');
          a.appendChild(range.extractContents());
          range.insertNode(a);
        }
        return true;
      }
      case 'insertHTML': {
        const tmp = document.createElement('div');
        tmp.innerHTML = value ?? '';
        const frag = document.createDocumentFragment();
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);
        range.deleteContents();
        const last = frag.lastChild;
        range.insertNode(frag);
        if (last) {
          range.setStartAfter(last);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        return true;
      }
      default:
        return true; // formatBlock / insertUnorderedList etc.: no-op success
    }
  };
});

describe('value sync & seeding', () => {
  it('seeds a caret-able <p><br></p> line for EMPTY documents', () => {
    mount('');
    expect(api.editorRef.current!.querySelector('p')).not.toBeNull();
  });

  it('renders markdown blocks for non-empty value', () => {
    mount('# Title\n\nbody');
    expect(api.editorRef.current!.querySelector('h2')?.textContent).toBe('Title');
  });
});

describe('slash menu pipeline', () => {
  it('optimistic "/" opens the menu on an empty line and excludes menu-hidden actions', () => {
    mount('');
    act(() => {
      const p = api.editorRef.current!.querySelector('p')!;
      placeCaretAtOffset(p, 0);
    });

    act(() => {
      api.handleKeyDown(fakeKey({ key: '/' }));
    });

    expect(api.slash.open).toBe(true);
    expect(api.slash.query).toBe(''); // query excludes the "/" literal
    expect(api.slash.items.map((i) => i.id)).not.toContain('bold');
    expect(api.slash.items.map((i) => i.id)).toContain('todo');
  });

  it('ArrowDown / Escape drive selection state', () => {
    mount('');
    act(() => {
      const p = api.editorRef.current!.querySelector('p')!;
      placeCaretAtOffset(p, 0);
      api.handleKeyDown(fakeKey({ key: '/' }));
    });

    act(() => api.handleKeyDown(fakeKey({ key: 'ArrowDown' })));
    expect(api.slash.selectedIndex).toBe(1);

    act(() => api.handleKeyDown(fakeKey({ key: 'Escape' })));
    expect(api.slash.open).toBe(false);
  });

  it('typing past the query closes the menu', () => {
    mount('');
    act(() => {
      const p = api.editorRef.current!.querySelector('p')!;
      placeCaretAtOffset(p, 0);
      api.handleKeyDown(fakeKey({ key: '/' }));
    });
    expect(api.slash.open).toBe(true);

    // Overwrite with plain word (no slash) then fire input
    const p = api.editorRef.current!.querySelector('p')!;
    p.textContent = 'hello';
    placeCaretAtOffset(p, 5);
    act(() => api.handleInput());

    expect(api.slash.open).toBe(false);
  });
});

describe('keyboard shortcuts dispatch into the registry', () => {
  it('Ctrl+B routes to the bold action (execCommand bold)', () => {
    mount('<p>word</p>');
    const p = api.editorRef.current!.querySelector('p')!;
    const range = document.createRange();
    range.selectNodeContents(p);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);

    const spy = vi.spyOn(document, 'execCommand');
    act(() => api.handleKeyDown(fakeKey({ key: 'b', ctrlKey: true })));
    expect(spy.mock.calls.some(([cmd]) => cmd === 'bold')).toBe(true);
    spy.mockRestore();
  });

  it('Ctrl+K opens the link popover', () => {
    mount('<p>text</p>');
    placeCaretAtOffset(api.editorRef.current!.querySelector('p')!, 2);

    act(() => api.handleKeyDown(fakeKey({ key: 'k', ctrlKey: true })));
    expect(api.linkDialog.open).toBe(true);
  });
});

describe('clipboard wiring', () => {
  it('copy writes canonical Markdown to the plain-text flavor', () => {
    mount('## Title\n\n- one\n- two');

    const range = document.createRange();
    range.selectNodeContents(api.editorRef.current!);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const evt = clipEvt({});
    act(() => api.handleCopy(evt));

    const data = (evt.clipboardData as unknown as { setData: ReturnType<typeof vi.fn> }).setData;
    expect(data).toHaveBeenCalledWith(
      'text/plain',
      expect.stringContaining('- one')
    );
  });

  it('paste of a URL over a selection links it', () => {
    mount('<p>apply here</p>');
    const p = api.editorRef.current!.querySelector('p')!;
    const range = document.createRange();
    range.selectNodeContents(p);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);

    act(() =>
      api.handlePaste(clipEvt({ 'text/plain': 'https://jobs.dev/role' }))
    );

    expect(api.editorRef.current!.querySelector('a')?.getAttribute('href')).toBe(
      'https://jobs.dev/role'
    );
  });

  it('paste of rich HTML is sanitized and structure-preserving', () => {
    mount('<p>before</p>');
    placeCaretAtOffset(api.editorRef.current!.querySelector('p')!, 0);

    act(() =>
      api.handlePaste(
        clipEvt({
          'text/plain': 'T',
          'text/html':
            '<div style="x"><h3>Plan</h3><ul><li><strong>a</strong></li></ul></div>',
        })
      )
    );

    const html = api.editorRef.current!.innerHTML;
    expect(html).toContain('Plan');
    expect(html).toContain('<li>');
    expect(html).not.toContain('style=');
  });

  it('paste of multi-line PLAIN text normalizes into blocks', () => {
    mount('<p>x</p>');
    placeCaretAtEndOf(api.editorRef.current!);

    act(() =>
      api.handlePaste(clipEvt({ 'text/plain': '# Head\n\n- a\n- b' }))
    );

    expect(api.editorRef.current!.querySelectorAll('ul li').length).toBe(2);
  });
});

function placeCaretAtEndOf(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = document.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
}

describe('enter strategies via wiring', () => {
  it('Enter mid-to-do splits the item through the hook handler', () => {
    mount('- [ ] call Sarah');
    const span = api.editorRef.current!.querySelector('.task-text') as HTMLElement;
    const range = document.createRange();
    range.setStart(span.firstChild!, 5); // after "call "
    range.collapse(true);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    act(() => api.handleKeyDown(fakeKey({ key: 'Enter' })));

    const lis = api.editorRef.current!.querySelectorAll('li.task-item');
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toBe('call ');
    expect(lis[1].textContent).toBe('Sarah');
  });

  it('Enter inside a callout exits instead of stacking quotes', () => {
    mount('> flagged concern');
    const bq = api.editorRef.current!.querySelector('blockquote')!;
    placeCaretAtOffset(bq, bq.textContent!.length);

    act(() => api.handleKeyDown(fakeKey({ key: 'Enter' })));

    expect(api.editorRef.current!.querySelector('blockquote')).not.toBeNull(); // original kept
    const pAfter = bq.nextElementSibling!;
    expect(pAfter.tagName).toBe('P'); // exited to paragraph
  });
});

describe('markdown space-shorthand wiring (pre-engine behavior lock)', () => {
  it('"# " trigger consumes the marker and prevents default space insert', () => {
    mount('<p>/</p>');
    const p = api.editorRef.current!.querySelector('p')!;
    p.innerHTML = '#';
    const textNode = p.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 1);
    range.collapse(true);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const evt = fakeKey({ key: ' ' });
    const prevent = evt.preventDefault as ReturnType<typeof vi.fn>;
    act(() => api.handleKeyDown(evt));

    expect(prevent).toHaveBeenCalled();
    expect(textNode.nodeValue ?? '').not.toContain('#');
  });
});
