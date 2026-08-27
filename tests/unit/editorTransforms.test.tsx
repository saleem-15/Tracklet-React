import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type React from 'react';
import { EDITOR_ACTIONS, getActionById } from '../../src/components/editor/editorActions';
import { placeCaretAtOffset, exitCalloutOnEnter } from '../../src/lib/editor/editorDom';
import { spawnNextTaskItem } from '../../src/lib/editor/richTextMarkdownUtils';

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

  it('todo on a FRESH EMPTY line: seeds <br> for line-box, caret inside span, typing lands in item', () => {
    const ed = setupEditor('<p><br></p>');
    placeCaretAtOffset(ed.querySelector('p')!, 0);

    apply('todo', ed);

    const span = ed.querySelector('.task-text') as HTMLElement;
    expect(span.innerHTML).toContain('<br'); // seed br creates active line-box
    expect((span.textContent ?? '').length).toBe(0);

    // Caret must sit INSIDE the span (container-start fallback)
    const sel = document.getSelection()!;
    expect(span.contains(sel.anchorNode)).toBe(true);

    // Simulate typing the first character
    span.insertBefore(document.createTextNode('A'), null);
    expect(ed.querySelector('.task-text')!.textContent).toBe('A');
  });

  it('checkbox includes data-task-checkbox attribute and handles checked state', async () => {
    const { markdownToHtml } = await import('../../src/lib/editor/richTextMarkdownUtils');
    const html = markdownToHtml('- [ ] x');
    expect(html).toContain('data-task-checkbox="true"');
    expect(html).toContain('task-item');

    const checked = markdownToHtml('- [x] done');
    expect(checked).toContain('checked');
    expect(checked).toContain('task-checked');
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

  it('labels Quote action as Callout for discoverability', () => {
    expect(getActionById('quote')!.label).toBe('Callout');
    expect(getActionById('divider')!.label).toBe('Divider');
  });

  it('callout applies on a fresh empty line (regression: dead command)', () => {
    const ed = setupEditor('<p><br></p>');
    placeCaretAtOffset(ed.querySelector('p')!, 0);

    apply('quote', ed);

    const bq = ed.querySelector('blockquote');
    expect(bq).not.toBeNull();
    expect(bq!.classList.contains('border-l-4')).toBe(true);
    const sel = document.getSelection()!;
    expect(sel.anchorNode && bq!.contains(sel.anchorNode)).toBe(true);
  });

  it('divider inserts an hr followed by a paragraph holding the caret', () => {
    const ed = setupEditor('<p>section one</p>');
    placeCaretAtOffset(ed.querySelector('p')!, 2);

    apply('divider', ed);

    const hr = ed.querySelector('hr');
    expect(hr).not.toBeNull();
    const pAfter = hr!.nextElementSibling;
    expect(pAfter?.tagName).toBe('P');
    const sel = document.getSelection()!;
    expect(pAfter!.contains(sel.anchorNode)).toBe(true);
  });

  describe('Enter inside a callout exits (no stacked quotes)', () => {
    it('caret at end of line: quote keeps text, new empty p follows', () => {
      const ed = setupEditor(
        '<blockquote class="q">red flag</blockquote><p class="x">after</p>'
      );
      placeCaretAtOffset(ed.querySelector('blockquote')!, 8); // end of "red flag"

      const handled = exitCalloutOnEnter(ed);
      expect(handled).toBe(true);

      const bq = ed.querySelector('blockquote')!;
      expect(bq.textContent).toBe('red flag'); // stays quoted
      expect(bq.contains(document.getSelection()!.anchorNode)).toBe(false);
      const p = bq.nextElementSibling!;
      expect(p.tagName).toBe('P');
      expect(p.classList.contains('leading-relaxed')).toBe(true); // normal paragraph
      expect(p.contains(document.getSelection()!.anchorNode)).toBe(true);
      expect(p.nextElementSibling?.textContent).toContain('after');
    });

    it('caret mid-line splits: pre-text stays quoted, remainder moves out', () => {
      const ed = setupEditor('<blockquote>re|d flag</blockquote>'.replace('|', ''));
      // place caret between "re" and "d flag"
      const bqText = ed.querySelector('blockquote')!.firstChild as Text;
      const range = document.createRange();
      range.setStart(bqText, 2);
      range.collapse(true);
      const sel = document.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      exitCalloutOnEnter(ed);

      expect(ed.querySelector('blockquote')!.textContent).toBe('re');
      expect(ed.querySelector('p')!.textContent).toBe('d flag');
    });

    it('multi-line quote: caret on second line exits with that line only', () => {
      const ed = setupEditor('<blockquote>a<br>b</blockquote>');
      const bq = ed.querySelector('blockquote')!;
      const bNode = bq.lastChild!; // text node "b" after the <br>
      const range = document.createRange();
      range.setStart(bNode, 0);
      range.collapse(true);
      const sel = document.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      exitCalloutOnEnter(ed);

      expect(ed.querySelector('blockquote')!.textContent).toBe('a');
      expect(ed.querySelector('p')!.textContent).toBe('b');
    });

    it('exiting an emptied quote removes the shell entirely', () => {
      const ed = setupEditor('<blockquote></blockquote>');
      const bq = ed.querySelector('blockquote')!;
      const range = document.createRange();
      range.selectNodeContents(bq);
      range.collapse(true);
      const sel = document.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      expect(exitCalloutOnEnter(ed)).toBe(true);
      expect(ed.querySelector('blockquote')).toBeNull();
      expect(ed.querySelector('p')).not.toBeNull();
    });

    it('mid-line Enter splits: remainder moves into the new unchecked item', () => {
      const ed = setupEditor(
        '<ul class="task-list"><li class="task-item" data-task="true" data-checked="false"><input type="checkbox" data-task-checkbox="true"><span class="task-text">call Sarah</span></li></ul>'
      );
      const span = ed.querySelector('.task-text')!;
      const range = document.createRange();
      range.setStart(span.firstChild!, 5); // after "call "
      range.collapse(true);
      const sel = document.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      // Enter mid-line is handled by the hook; simulate its split path via
      // the same primitives it uses (spawn + extract tail).
      const taskLi = ed.querySelector('li.task-item') as HTMLElement;
      const tail = document.createRange();
      tail.setStart(span.firstChild!, 5);
      tail.setEndAfter(span.lastChild ?? span);
      const frag = tail.extractContents();

      const next = spawnNextTaskItem(taskLi);
      const nextText = next.querySelector('.task-text') as HTMLElement;
      if (frag.hasChildNodes()) nextText.appendChild(frag);
      placeCaretAtOffset(nextText, 0);

      expect(ed.querySelectorAll('li.task-item').length).toBe(2);
      expect(taskLi.querySelector('.task-text')!.textContent).toBe('call ');
      expect(nextText.textContent).toBe('Sarah');
      expect(next.dataset.checked).toBe('false');
    });

    it('returns false when caret is outside any quote', () => {
      const ed = setupEditor('<p>plain</p>');
      placeCaretAtOffset(ed.querySelector('p')!, 1);
      expect(exitCalloutOnEnter(ed)).toBe(false);
    });
  });

  describe('security and fidelity serialization regressions', () => {
    it('sanitizes unsafe javascript links while preserving safe links and input checkboxes', async () => {
      const { sanitizePastedHtml } = await import('../../src/lib/editor/editorDom');
      const untrusted =
        '<p><a href="javascript:alert(1)">Click me</a> and <a href="https://example.com">Safe</a> and <input type="checkbox" checked /></p>';
      const clean = sanitizePastedHtml(untrusted);
      expect(clean).not.toContain('javascript:');
      expect(clean).toContain('https://example.com');
      expect(clean).toContain('Click me');
      expect(clean).toContain('type="checkbox"');
    });

    it('preserves code block language tags through round-trip markdown conversion', async () => {
      const { markdownToHtml, htmlToMarkdown } = await import(
        '../../src/lib/editor/richTextMarkdownUtils'
      );
      const original = '```typescript\nconst x: number = 42;\n```';
      const html = markdownToHtml(original);
      expect(html).toContain('data-language="typescript"');

      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const roundTrip = htmlToMarkdown(tmp);
      expect(roundTrip).toBe(original);
    });

    it('transforms task item into heading without preserving checkbox input element in heading', () => {
      const ed = setupEditor(
        '<ul class="task-list"><li class="task-item" data-task="true" data-checked="false"><input type="checkbox" data-task-checkbox="true"><span class="task-text">Architecture Plan</span></li></ul>'
      );
      const span = ed.querySelector('.task-text')!;
      placeCaretAtOffset(span as HTMLElement, 2);

      apply('h1', ed);
      const h2 = ed.querySelector('h2')!;
      expect(h2).not.toBeNull();
      expect(h2.textContent).toBe('Architecture Plan');
      expect(h2.querySelector('input')).toBeNull();
    });

    it('decorates newly linked selected text with LINK_CLASS, target, and rel', async () => {
      const { LINK_CLASS } = await import('../../src/lib/editor/richTextMarkdownUtils');
      const ed = setupEditor('<p>Visit my portfolio today</p>');
      const p = ed.querySelector('p')!;
      const range = document.createRange();
      range.setStart(p.firstChild!, 6); // "my portfolio"
      range.setEnd(p.firstChild!, 18);
      const sel = document.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      // Simulate execCommand createLink and decoration flow
      document.execCommand = vi.fn((cmd, _showUi, val) => {
        if (cmd === 'createLink' && range.toString()) {
          const a = document.createElement('a');
          a.setAttribute('href', val as string);
          a.appendChild(range.extractContents());
          range.insertNode(a);
          return true;
        }
        return false;
      });

      const { useLinkPopover } = await import('../../src/lib/editor/useLinkPopover');
      const editorRef: React.RefObject<HTMLDivElement | null> = {
        current: ed as HTMLDivElement,
      };
      const emitChange = vi.fn();

      // Test hook invocation
      let popoverApi: ReturnType<typeof useLinkPopover> | null = null;
      function TestComponent() {
        popoverApi = useLinkPopover(editorRef, emitChange);
        return null;
      }
      act(() => {
        root!.render(<TestComponent />);
      });

      act(() => {
        popoverApi!.openLinkDialog();
      });

      act(() => {
        popoverApi!.applyLinkFromDialog('https://example.com');
      });

      const anchor = ed.querySelector('a')!;
      expect(anchor).not.toBeNull();
      expect(anchor.getAttribute('href')).toBe('https://example.com');
      expect(anchor.className).toBe(LINK_CLASS);
      expect(anchor.getAttribute('target')).toBe('_blank');
      expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
      expect(anchor.textContent).toBe('my portfolio');
    });

    it('parses Notion and Linear plain text markdown variants ([ ], [x], indented, empty)', async () => {
      const { markdownToHtml, htmlToMarkdown } = await import('../../src/lib/editor/richTextMarkdownUtils');
      
      // Notion plain text copy without leading dashes
      const notionHtml = markdownToHtml('[ ] Notion task 1\n[x] Notion task 2');
      expect(notionHtml).toContain('data-task="true"');
      expect(notionHtml).toContain('Notion task 1');
      expect(notionHtml).toContain('Notion task 2');
      expect(notionHtml).toContain('task-checked');
      
      const notionMd = htmlToMarkdown(notionHtml);
      expect(notionMd).toBe('- [ ] Notion task 1\n- [x] Notion task 2');

      // Indented task lists
      const indentedHtml = markdownToHtml('  - [ ] Indented task');
      expect(indentedHtml).toContain('data-task="true"');
      expect(indentedHtml).toContain('Indented task');

      // Asterisk task lists
      const starHtml = markdownToHtml('* [ ] Star task\n* [x] Completed star');
      expect(starHtml).toContain('data-task="true"');
      expect(starHtml).toContain('Star task');

      // Empty task item
      const emptyHtml = markdownToHtml('- [ ]');
      expect(emptyHtml).toContain('data-task="true"');
      expect(emptyHtml).toContain('<br>');
    });

    it('switching between bullet lists and to-do lists maintains list structure and task attributes', async () => {
      const { markdownToHtml, htmlToMarkdown } = await import('../../src/lib/editor/richTextMarkdownUtils');
      const md = '- Bullet 1\n- [ ] Task 1\n- Bullet 2';
      const html = markdownToHtml(md);
      
      expect(html).toContain('data-task="true"');
      expect(html).toContain('Task 1');
      
      const roundTrip = htmlToMarkdown(html);
      expect(roundTrip).toBe('- Bullet 1\n- [ ] Task 1\n- Bullet 2');
    });

    it('toggleTaskItem synchronizes task-checked class and dataset.checked', async () => {
      const { toggleTaskItem } = await import('../../src/lib/editor/richTextMarkdownUtils');
      const ed = setupEditor(
        '<ul class="task-list"><li class="task-item" data-task="true" data-checked="false"><input type="checkbox" data-task-checkbox="true" /><span class="task-text">My item</span></li></ul>'
      );
      const li = ed.querySelector('li')!;
      
      toggleTaskItem(li);
      expect(li.dataset.checked).toBe('true');
      expect(li.classList.contains('task-checked')).toBe(true);
      expect(li.querySelector('input')!.checked).toBe(true);
      expect(li.querySelector('.task-text')!.classList.contains('line-through')).toBe(true);

      toggleTaskItem(li);
      expect(li.dataset.checked).toBe('false');
      expect(li.classList.contains('task-checked')).toBe(false);
      expect(li.querySelector('input')!.checked).toBe(false);
      expect(li.querySelector('.task-text')!.classList.contains('line-through')).toBe(false);
    });

    it('sanitizePastedHtml normalizes foreign Notion and Linear to-do HTML into interactive task items', async () => {
      const { sanitizePastedHtml } = await import('../../src/lib/editor/editorDom');
      const { htmlToMarkdown } = await import('../../src/lib/editor/richTextMarkdownUtils');

      // Notion style DIV task block
      const notionForeignHtml = '<div class="notion-to-do-block"><div role="checkbox" aria-checked="true"></div><div>Fix alignment bug</div></div>';
      const clean = sanitizePastedHtml(notionForeignHtml);
      expect(clean).toContain('data-task="true"');
      expect(clean).toContain('data-task-checkbox="true"');
      expect(clean).toContain('Fix alignment bug');

      const md = htmlToMarkdown(clean);
      expect(md).toBe('- [x] Fix alignment bug');
    });
  });
});
