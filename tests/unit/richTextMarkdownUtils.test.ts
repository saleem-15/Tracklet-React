import { describe, it, expect } from 'vitest';
import {
  markdownToHtml,
  htmlToMarkdown,
  escapeHtml,
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

    it('converts headings correctly', () => {
      const md = '# Title\n## Subtitle\n### Section';
      const html = markdownToHtml(md);

      expect(html).toContain('<h2 class="font-bold text-slate-900 text-base');
      expect(html).toContain('Title');
      expect(html).toContain('<h3 class="font-bold text-slate-900 text-sm');
      expect(html).toContain('Subtitle');
      expect(html).toContain('<h4 class="font-bold text-blue-700 text-xs');
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

      expect(html).toContain('<ul class="list-disc pl-5');
      expect(html).toContain('<li class="leading-relaxed">Bullet 1</li>');
      expect(html).toContain('<li class="leading-relaxed">Bullet 2</li>');
      expect(html).toContain('</ul>');

      expect(html).toContain('<ol class="list-decimal pl-5');
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

      expect(html).toContain('<pre class="my-2.5 p-3 bg-slate-900 text-slate-100');
      expect(html).toContain('<code>const x = 42;\nconsole.log(x);</code>');
    });
  });

  describe('htmlToMarkdown', () => {
    it('converts headings back to markdown syntax', () => {
      const html = '<h2>Title</h2><h3>Subtitle</h3><h4>Section</h4>';
      const md = htmlToMarkdown(html);

      expect(md).toContain('## Title');
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
});
