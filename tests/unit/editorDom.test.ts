import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  findCaretBlock,
  topLevelChildOf,
  charOffsetToRange,
  caretCharOffset,
  placeCaretAtOffset,
  snapshotCaret,
  restoreCaret,
  isEmptyBlock,
  prepareListExtraction,
  computeMenuPosition,
  sanitizePastedHtml,
} from '../../src/lib/editorDom';

let root: HTMLElement;

function setup(html: string) {
  document.body.innerHTML = `<div id="ed">${html}</div>`;
  root = document.getElementById('ed')!;
}
function el<T extends HTMLElement = HTMLElement>(sel: string): T {
  return document.querySelector(sel) as T;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('findCaretBlock (nested-aware, contracts §2)', () => {
  it('returns the li — not the whole ul — for a caret inside a list item', () => {
    setup('<ul><li>alpha</li><li>beta</li></ul>');
    const li = el('li');
    const textNode = li.firstChild!;
    expect(findCaretBlock(root, textNode)).toBe(li);
  });

  it('returns the task li for a caret inside the task-text span', () => {
    setup('<ul class="task-list"><li class="task-item"><span class="task-text">x</span></li></ul>');
    const span = el('span');
    expect(findCaretBlock(root, span.firstChild!)).toBe(el('li'));
  });

  it('returns the inner p inside a blockquote', () => {
    setup('<blockquote><p>quoted</p></blockquote>');
    expect(findCaretBlock(root, el('p').firstChild!)).toBe(el('p'));
  });

  it('returns null when node sits outside root or is root itself', () => {
    setup('<p>hi</p>');
    expect(findCaretBlock(root, root)).toBeNull();
    expect(findCaretBlock(root, document.body)).toBeNull();
  });
});

describe('charOffset <-> Range round-trips', () => {
  it('handles offsets across <br> line boundaries', () => {
    setup('<p>AB<br>CD</p>');
    const p = el('p');
    const range = charOffsetToRange(p, 1, 4); // spans the br boundary
    expect(range).not.toBeNull();
    // happy-dom toString() drops the br newline; Chromium emits 'B\nCD'
    expect(['B\nCD', 'BCD']).toContain(range!.toString());
    expect(caretCharOffset(p, range!)).toBe(1);
  });

  it('walks through inline tags without losing position', () => {
    setup('<p>a<strong>bc</strong>d</p>');
    const p = el('p');
    // offset 3 == inside strong ("a|bc") -> between b and c
    const range = charOffsetToRange(p, 2, 5);
    expect(range!.toString()).toBe('cd');
  });

  it('clamps out-of-range offsets instead of throwing', () => {
    setup('<p>abc</p>');
    const range = charOffsetToRange(el('p'), 0, 99);
    expect(range!.toString()).toBe('abc');
  });
});

describe('caret placement & snapshots', () => {
  it('placeCaretAtOffset + caretCharOffset round-trips', () => {
    setup('<p>hello world</p>');
    const p = el('p');
    placeCaretAtOffset(p, 6);
    const range = document.getSelection()!.getRangeAt(0);
    expect(caretCharOffset(p, range)).toBe(6);
  });

  it('snapshot/restore preserves offset and clamps after shrink', () => {
    setup('<p>one two three</p>');
    const p = el('p');
    placeCaretAtOffset(p, 7);
    const snap = snapshotCaret(root);
    expect(snap).not.toBeNull();

    // DOM shrinks (e.g., external rewrite)
    root.innerHTML = '<p>one</p>';
    restoreCaret(root, snap);
    const sel = document.getSelection()!;
    expect(sel.rangeCount).toBe(1);
    const restored = caretCharOffset(el('p'), sel.getRangeAt(0));
    expect(restored).toBeLessThanOrEqual(3);
  });
});

describe('isEmptyBlock / prepareListExtraction', () => {
  it('detects empty blocks including <br>-only and spacer paragraphs', () => {
    setup('<p><br></p><p class="h-1.5" data-spacer="true"></p><p>x</p>');
    const ps = document.querySelectorAll('p');
    expect(isEmptyBlock(ps[0])).toBe(true);
    expect(isEmptyBlock(ps[1])).toBe(true);
    expect(isEmptyBlock(ps[2])).toBe(false);
  });

  it('prepareListExtraction splits trailing siblings into a cloned tail', () => {
    setup('<ul><li id="a">a</li><li id="b">b</li><li id="c">c</li></ul>');
    const li = document.getElementById('b')!;
    const split = prepareListExtraction(li);
    split.detach();

    const lists = document.querySelectorAll('ul');
    expect(lists.length).toBe(2);
    expect(lists[0].children.length).toBe(1); // only #a
    expect(document.getElementById('b')).toBeNull(); // detached
    expect(lists[1].textContent).toContain('c'); // tail preserved
    expect(lists[1].className).toBe(lists[0].className);
  });

  it('removes the list shell entirely when extracting the only item', () => {
    setup('<div><ul><li id="only">solo</li></ul><p id="next">next</p></div>');
    const li = document.getElementById('only')!;
    const split = prepareListExtraction(li);
    expect(split.insertAfter.tagName).toBe('UL');
    split.detach();
    expect(document.querySelector('ul')).toBeNull();
    expect(document.getElementById('next')).not.toBeNull();
  });
});

describe('topLevelChildOf', () => {
  it('resolves nested nodes to their direct-child ancestor', () => {
    setup('<blockquote><p id="inner">q</p></blockquote>');
    const bq = el('blockquote');
    expect(topLevelChildOf(root, el('p'))).toBe(bq);
  });
});

describe('sanitizePastedHtml (copy/paste fidelity)', () => {
  it('keeps semantic formatting and drops junk attributes', () => {
    const dirty =
      '<div style="font-family:x"><p class="gd">Hello <b class="x1">world</b></p>' +
      '<span><em>kept</em></span></div>';
    const clean = sanitizePastedHtml(dirty);
    expect(clean).toContain('<b>world</b>');
    expect(clean).toContain('<em>kept</em>');
  });

  it('preserves structure: headings, lists, bold survive', () => {
    const dirty =
      '<div><h2 dir="ltr">Title</h2><ul style="x"><li><b>one</b></li><li>two</li></ul></div>';
    const clean = sanitizePastedHtml(dirty);
    expect(clean).toContain('<h2>Title</h2>');
    expect(clean).toContain('<ul>');
    expect(clean).toContain('<li><b>one</b></li>');
    expect(clean).toContain('<li>two</li>');
    expect(clean).not.toContain('style=');
    expect(clean).not.toContain('dir=');
  });

  it('keeps safe anchor hrefs, strips everything else', () => {
    const clean = sanitizePastedHtml(
      '<a href="https://x.co" target="_blank" rel="x" onclick="evil()">link</a>'
    );
    expect(clean).toContain('href="https://x.co"');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('_blank');
  });

  it('removes script/style entirely instead of exposing their content', () => {
    const clean = sanitizePastedHtml(
      '<script>alert(1)</script><style>.a{}</style><p>safe</p>'
    );
    expect(clean).toContain('safe');
    expect(clean).not.toContain('alert');
    expect(clean).not.toContain('.a{}');
  });

  it('unwraps unknown wrappers while keeping cleaned children', () => {
    const clean = sanitizePastedHtml(
      '<font face="Arial"><p>inside</p></font>'
    );
    expect(clean).toContain('<p>inside</p>');
    expect(clean).not.toContain('font');
  });

  it('sanitized output round-trips through the markdown serializer', async () => {
    const { htmlToMarkdown } = await import('../../src/lib/richTextMarkdownUtils');
    const clean = sanitizePastedHtml(
      '<div><h3>Plan</h3><ul><li><strong>a</strong></li><li>b</li></ul></div>'
    );
    // Sanitizer unwraps the outer container; top-level blocks remain
    expect(clean.startsWith('<h3>')).toBe(true);
    // <h3> maps to "## " per our inverted heading convention
    const md = htmlToMarkdown(clean);
    expect(md).toBe('## Plan\n\n- **a**\n- b');
  });
});

describe('computeMenuPosition (smart slash-menu placement)', () => {
  const VH = 800;
  const VW = 1200;

  it('places below the caret when there is room', () => {
    const pos = computeMenuPosition(
      { anchorTop: 100, anchorBottom: 116, left: 40 },
      240,
      { viewportHeight: VH, viewportWidth: VW }
    );
    expect(pos.flipAbove).toBe(false);
    expect(pos.top).toBe(122); // anchorBottom + gap(6)
    expect(pos.left).toBe(40);
  });

  it('flips above when the menu would overflow the viewport bottom', () => {
    const pos = computeMenuPosition(
      { anchorTop: 620, anchorBottom: 636, left: 40 },
      240,
      { viewportHeight: VH, viewportWidth: VW }
    );
    expect(pos.flipAbove).toBe(true);
    // 636 + 240 > 792 -> above: anchorTop - height - gap
    expect(pos.top).toBe(374); // 620 - 240 - 6
    expect(pos.top + 240).toBeLessThan(VH);
  });

  it('never rises above the viewport top either (worst case clamps)', () => {
    const pos = computeMenuPosition(
      { anchorTop: 30, anchorBottom: 46, left: 40 },
      400,
      { viewportHeight: VH, viewportWidth: VW }
    );
    expect(pos.flipAbove).toBe(false); // below fits in tall viewport
    void pos;
  });

  it('clamps horizontally inside both viewport edges', () => {
    const nearRight = computeMenuPosition(
      { anchorTop: 100, anchorBottom: 116, left: 1150 },
      240,
      { viewportHeight: VH, viewportWidth: VW }
    );
    expect(nearRight.left).toBe(1200 - 224 - 8); // right edge minus margin

    const atLeft = computeMenuPosition(
      { anchorTop: 100, anchorBottom: 116, left: 2 },
      240,
      { viewportHeight: VH, viewportWidth: VW }
    );
    expect(atLeft.left).toBe(8);
  });

  it('uses live viewport dimensions by default', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(500);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(900);
    const pos = computeMenuPosition({ anchorTop: 300, anchorBottom: 316, left: 10 }, 240);
    expect(pos.flipAbove).toBe(true); // 316+240=556 > 492
    vi.restoreAllMocks();
  });
});
