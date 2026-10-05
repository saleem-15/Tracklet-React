import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from '../../src/lib/htmlToMarkdown';

describe('htmlToMarkdown', () => {
  it('returns plain text unchanged if no HTML tags are present', () => {
    const plain = 'Simple job description with no tags.';
    expect(htmlToMarkdown(plain)).toBe(plain);
  });

  it('converts headings h1 to h6 to markdown headings', () => {
    const html = '<h1>Role Title</h1><p>Intro</p><h2>Requirements</h2><p>Details</p><h3>Nice to have</h3>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('# Role Title');
    expect(md).toContain('## Requirements');
    expect(md).toContain('### Nice to have');
  });

  it('converts bold and italic tags into markdown tokens', () => {
    const html = '<p>We are <strong>boldly</strong> seeking an <em>exceptional</em> <b>Senior</b> <i>Engineer</i>.</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('**boldly**');
    expect(md).toContain('*exceptional*');
    expect(md).toContain('**Senior**');
    expect(md).toContain('*Engineer*');
  });

  it('converts unordered lists into markdown bullet points', () => {
    const html = `
      <h3>Key Responsibilities:</h3>
      <ul>
        <li>Develop modern React and TypeScript web applications</li>
        <li>Collaborate with cross-functional product designers</li>
        <li>Maintain 99.9% uptime and reliable performance</li>
      </ul>
    `;
    const md = htmlToMarkdown(html);
    expect(md).toContain('- Develop modern React and TypeScript web applications');
    expect(md).toContain('- Collaborate with cross-functional product designers');
    expect(md).toContain('- Maintain 99.9% uptime and reliable performance');
  });

  it('converts code and pre blocks', () => {
    const html = '<p>Must have knowledge of <code>git rebase</code> and Docker:</p><pre>npm test</pre>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('`git rebase`');
    expect(md).toContain('```\nnpm test\n```');
  });

  it('converts hyperlinks to markdown link format', () => {
    const html = '<p>Apply on our portal: <a href="https://example.com/apply">Careers Page</a></p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('[Careers Page](https://example.com/apply)');
  });

  it('strips script, style, and comments completely', () => {
    const html = `
      <style>.hidden { display: none; }</style>
      <p>Clean text</p>
      <!-- comment here -->
      <script>console.log("bad");</script>
    `;
    const md = htmlToMarkdown(html);
    expect(md).not.toContain('console.log');
    expect(md).not.toContain('.hidden');
    expect(md).not.toContain('comment here');
    expect(md).toBe('Clean text');
  });

  it('decodes HTML entities properly', () => {
    const html = '<p>Tom &amp; Jerry &bull; Salary: &gt; $100k &ndash; $120k &quot;Full-time&quot;&#39;s</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('Tom & Jerry • Salary: > $100k – $120k "Full-time"\'s');
  });

  it('does NOT truncate long descriptions (preserves full text beyond 350 characters)', () => {
    const longDesc = `
      <h2>About the Company</h2>
      <p>${'A'.repeat(500)}</p>
      <h2>Responsibilities</h2>
      <ul>
        <li>${'B'.repeat(300)}</li>
        <li>${'C'.repeat(300)}</li>
      </ul>
      <h2>Benefits</h2>
      <p>${'D'.repeat(400)}</p>
    `;
    const md = htmlToMarkdown(longDesc);
    expect(md.length).toBeGreaterThan(1500);
    expect(md).toContain('## About the Company');
    expect(md).toContain('## Responsibilities');
    expect(md).toContain('## Benefits');
  });

  it('handles null, undefined, or non-string inputs safely', () => {
    expect(htmlToMarkdown('')).toBe('');
    expect(htmlToMarkdown(null)).toBe('');
    expect(htmlToMarkdown(undefined)).toBe('');
  });
});
