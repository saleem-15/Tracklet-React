import { describe, it, expect } from 'vitest';
import {
  markdownToHtml,
  htmlToMarkdown,
  escapeHtml,
  canonicalizeMarkdown,
  compareCanonical,
  isInsideCodeFence,
} from '../../src/lib/richTextMarkdownUtils';

describe('richTextMarkdownUtils', () => {
  describe('escapeHtml', () => {
    it('escapes &, <, >, ", and single quotes', () => {
      expect(escapeHtml('<script>alert("xss & \'test\'")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss &amp; &#039;test&#039;&quot;)&lt;/script&gt;'
      );
    });
  });

  describe('markdownToHtml', () => {
    it('returns empty paragraph for empty string', () => {
      expect(markdownToHtml('')).toBe('<p><br></p>');
      expect(markdownToHtml('   ')).toBe('<p><br></p>');
    });

    it('converts headings correctly with card-tuned hierarchy', () => {
      const md = '# Title\n## Subtitle\n### Section';
      const html = markdownToHtml(md);

      expect(html).toContain('<h2 class="font-bold text-slate-900 text-sm');
      expect(html).toContain('Title');
      expect(html).toContain('<h3 class="font-bold text-slate-900 text-[13px]');
      expect(html).toContain('Subtitle');
      expect(html).toContain('<h4 class="font-semibold text-blue-700 text-xs');
      expect(html).toContain('Section');
    });

    it('converts inline bold, italic, and code', () => {
      const md = 'This is **bold**, this is *italic*, and `code snippet`.';
      const html = markdownToHtml(md);

      expect(html).toContain('<strong class="font-bold text-slate-900">bold</strong>');
      expect(html).toContain('<em class="italic text-slate-700">italic</em>');
      expect(html).toContain('<code class="font-mono text-[11px] bg-slate-100 text-slate-800');
      expect(html).toContain('code snippet</code>');
    });

    it('converts bullet lists and numbered lists', () => {
      const md = '- Bullet 1\n- Bullet 2\n\n1. Step 1\n2. Step 2';
      const html = markdownToHtml(md);

      expect(html).toContain('<ul class="list-disc pl-4');
      expect(html).toContain('<li class="leading-relaxed">Bullet 1</li>');
      expect(html).toContain('<li class="leading-relaxed">Bullet 2</li>');
      expect(html).toContain('</ul>');

      expect(html).toContain('<ol class="list-decimal pl-4');
      expect(html).toContain('<li class="leading-relaxed">Step 1</li>');
      expect(html).toContain('<li class="leading-relaxed">Step 2</li>');
      expect(html).toContain('</ol>');
    });

    it('converts markdown links and raw URLs to anchor tags', () => {
      const md = 'Check out [Company Portal](https://company.com) and https://google.com';
      const html = markdownToHtml(md);

      expect(html).toContain('<a href="https://company.com" target="_blank" rel="noopener noreferrer"');
      expect(html).toContain('>Company Portal</a>');
      expect(html).toContain('<a href="https://google.com" target="_blank" rel="noopener noreferrer"');
    });

    it('converts fenced code blocks to pre/code tags', () => {
      const md = '```\nconst x = 42;\nconsole.log(x);\n```';
      const html = markdownToHtml(md);

      expect(html).toContain('<pre class="my-2 p-3 bg-slate-900 text-slate-100');
      expect(html).toContain('<code>const x = 42;\nconsole.log(x);</code>');
    });
  });

  describe('htmlToMarkdown', () => {
    it('converts headings back to markdown syntax with proper levels', () => {
      const html = '<h2>Title</h2><h3>Subtitle</h3><h4>Section</h4>';
      const md = htmlToMarkdown(html);

      expect(md).toContain('# Title');
      expect(md).toContain('## Subtitle');
      expect(md).toContain('### Section');
    });

    it('converts strong and em tags to bold and italic markdown', () => {
      const html = '<p><strong>Bold text</strong> and <em>Italic text</em></p>';
      const md = htmlToMarkdown(html);

      expect(md).toBe('**Bold text** and *Italic text*');
    });

    it('converts unordered and ordered lists to markdown lists', () => {
      const html = '<ul><li>First item</li><li>Second item</li></ul>';
      const md = htmlToMarkdown(html);

      expect(md).toBe('- First item\n- Second item');

      const olHtml = '<ol><li>Step one</li><li>Step two</li></ol>';
      const olMd = htmlToMarkdown(olHtml);

      expect(olMd).toBe('1. Step one\n2. Step two');
    });

    it('converts links to markdown links', () => {
      const html = '<p>Visit <a href="https://example.com">Example Site</a> today.</p>';
      const md = htmlToMarkdown(html);

      expect(md).toBe('Visit [Example Site](https://example.com) today.');
    });

    it('converts pre code blocks to fenced code blocks', () => {
      const html = '<pre><code>const a = 1;\nconst b = 2;</code></pre>';
      const md = htmlToMarkdown(html);

      expect(md).toBe('```\nconst a = 1;\nconst b = 2;\n```');
    });

    it('preserves multi-paragraph round-trip fidelity', () => {
      const originalMd = '## Interview Notes\n\n- Discussed compensation\n- Next round on Monday\n\nVisit [Offer Portal](https://portal.com)';
      const html = markdownToHtml(originalMd);
      const convertedMd = htmlToMarkdown(html);

      expect(convertedMd).toContain('## Interview Notes');
      expect(convertedMd).toContain('- Discussed compensation');
      expect(convertedMd).toContain('- Next round on Monday');
      expect(convertedMd).toContain('[Offer Portal](https://portal.com)');
    });
  });

  describe('round-trip idempotency (SC-002)', () => {
    const roundTrip = (m: string) => htmlToMarkdown(markdownToHtml(m));

    const corpus: string[] = [
      '# Title\n\nSome paragraph text here.',
      '### H3 heading only',
      '- alpha\n- beta\n- gamma',
      '1. one\n2. two\n3. three',
      '```\nconst x = 1;\nlet y = 2;\n```',
      '**bold** and *italic* and `inline code`',
      '[label text](https://example.com) plus https://raw.dev/url',
      'Para one.\n\nPara two.\n\nPara three.',
      '> A quoted takeaway line',
      '# Role\n\n## Compensation Band\n\n- Base:\n- Equity:\n\n## Next Steps\n\n1. Send email\n2. Schedule call',
    ];

    it.each(corpus)('converges after first pass: %j', (input) => {
      const once = roundTrip(input);
      const twice = roundTrip(once);
      expect(twice).toBe(once);
    });

    it('is a fixed point for already-canonical markdown (byte-stable reopen)', () => {
      const canonical = '# Title\n\nBody paragraph.\n\n- item one\n- item two';
      expect(roundTrip(canonical)).toBe(canonical);
    });

    it('collapses 3+ newlines to a single blank line between blocks', () => {
      const messy = 'First para.\n\n\n\n\nSecond para.';
      const out = roundTrip(messy);
      expect(out).toBe('First para.\n\nSecond para.');
    });

    it('trims outer whitespace exactly once', () => {
      const out = roundTrip('\n\n  Padded para.  \n\n');
      expect(out).toBe('Padded para.');
      expect(roundTrip(out)).toBe(out);
    });

    it('canonicalizeMarkdown matches single round-trip output', () => {
      const input = '- x\n- y';
      expect(canonicalizeMarkdown(input)).toBe(roundTrip(input));
      expect(canonicalizeMarkdown(canonicalizeMarkdown(input))).toBe(
        canonicalizeMarkdown(input)
      );
    });

    it('compareCanonical treats equivalent forms as equal and distinct forms as different', () => {
      expect(compareCanonical('# T\n\nbody', '# T\n\nbody')).toBe(true);
      expect(compareCanonical('# T\n\n\n\nbody', '# T\n\nbody')).toBe(true);
      expect(compareCanonical('# T', '## T')).toBe(false);
      expect(compareCanonical('', '')).toBe(true);
    });
  });

  describe('task lists & quotes (FR-010/FR-011)', () => {
    it('renders unchecked/checked task items as interactive checkboxes', () => {
      const html = markdownToHtml('- [ ] Send email\n- [x] Prep questions');
      expect(html).toContain('data-task="true"');
      expect(html).toContain('data-checked="false"');
      expect(html).toContain('data-checked="true"');
      expect(html).toContain('type="checkbox"');
      expect(html).not.toContain('disabled'); // editable context: interactive
      expect(html).toContain('Send email');
      expect(html).toContain('Prep questions');
    });

    it('renders disabled checkboxes in read-only mode', () => {
      const html = markdownToHtml('- [ ] a', { readOnly: true });
      expect(html).toContain('disabled');
    });

    it('round-trips task list state byte-stably (mixed checked)', () => {
      const md = '- [ ] alpha\n- [x] beta\n- [ ] gamma with [link](https://x.co)';
      const once = htmlToMarkdown(markdownToHtml(md));
      expect(once).toBe(md);
      expect(htmlToMarkdown(markdownToHtml(once))).toBe(md);
    });

    it('keeps task items distinct from plain bullets', () => {
      const md = '- plain bullet\n- [ ] task item';
      const once = htmlToMarkdown(markdownToHtml(md));
      expect(once).toBe(md);
    });

    it('renders blockquotes as callouts with accent border', () => {
      const html = markdownToHtml('> Red flag: vague comp answer');
      expect(html).toContain('<blockquote class="border-l-4 border-blue-400');
      expect(html).toContain('Red flag: vague comp answer');
    });

    it('groups consecutive quote lines into one callout', () => {
      const md = '> line one\n> line two';
      const once = htmlToMarkdown(markdownToHtml(md));
      expect(once).toBe(md);
      expect(markdownToHtml(md)).toBe(markdownToHtml(once));
    });

    it('isInsideCodeFence detects pre ancestry for text and element nodes', () => {
      document.body.innerHTML =
        '<div id="root"><pre><code>const a;</code></pre><p id="para">hi</p></div>';
      const codeText = document.querySelector('pre code')!.firstChild!;
      expect(isInsideCodeFence(codeText)).toBe(true);
      expect(isInsideCodeFence(document.getElementById('para')!)).toBe(false);
    });

    it('toggleTaskItem flips state and strike-through without touching siblings', async () => {
      const { toggleTaskItem } = await import('../../src/lib/richTextMarkdownUtils');
      document.body.innerHTML =
        '<ul>' +
        '<li class="task-item" data-task="true" data-checked="false"><input type="checkbox" data-task-checkbox="true"><span class="task-text">one</span></li>' +
        '<li class="task-item" data-task="true" data-checked="false"><input type="checkbox" data-task-checkbox="true"><span class="task-text">two</span></li>' +
        '</ul>';
      const items = document.querySelectorAll('li.task-item');
      toggleTaskItem(items[0] as HTMLElement);
      expect((items[0] as HTMLElement).dataset.checked).toBe('true');
      expect((items[0].querySelector('.task-text') as HTMLElement).classList.contains('line-through')).toBe(true);
      expect((items[1] as HTMLElement).dataset.checked).toBe('false');

      toggleTaskItem(items[0] as HTMLElement);
      expect((items[0] as HTMLElement).dataset.checked).toBe('false');
      // Serialized output reflects the flip
      const md = htmlToMarkdown(document.querySelector('ul')!);
      expect(md).toBe('- [ ] one\n- [ ] two');
    });

    it('spawnNextTaskItem appends an unchecked sibling and returns it', async () => {
      const { spawnNextTaskItem } = await import('../../src/lib/richTextMarkdownUtils');
      document.body.innerHTML =
        '<ul><li class="task-item" data-task="true" data-checked="true"><input type="checkbox" checked data-task-checkbox="true"><span class="task-text">done</span></li></ul>';
      const li = document.querySelector('li.task-item') as HTMLElement;
      const next = spawnNextTaskItem(li);
      expect(next.dataset.checked).toBe('false');
      expect(next.parentElement).toBe(li.parentElement);
      expect(li.parentElement!.querySelectorAll('li.task-item').length).toBe(2);
      expect((next.querySelector('.task-text') as HTMLElement).textContent).toBe('');
    });
  });
});
