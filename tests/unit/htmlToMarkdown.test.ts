import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from '../../src/lib/htmlToMarkdown';

describe('htmlToMarkdown', () => {
  it('returns plain text unchanged if no HTML tags are present', () => {
    const plain = 'Simple job description with no tags.';
    expect(htmlToMarkdown(plain)).toBe(plain);
  });

  it('converts headings h1 to h6 to clean markdown headings', () => {
    const html = '<h1>Role Title</h1><p>Intro</p><h2>Requirements</h2><p>Details</p><h3>Nice to have</h3>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('## Role Title');
    expect(md).toContain('## Requirements');
    expect(md).toContain('### Nice to have');
  });

  it('strips internal formatting tags from headings so they do not produce redundant bold markers', () => {
    const html = '<h2><b>Job Description</b></h2><p>Overview</p><h3><strong>Required Qualifications:</strong></h3>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('## Job Description');
    expect(md).not.toContain('## **Job Description**');
    expect(md).toContain('### Required Qualifications:');
    expect(md).not.toContain('### **Required Qualifications:**');
  });

  it('converts implicit bold section titles (CMS style on job boards) to markdown headings', () => {
    const html = `
      <p><b>Job Description</b></p>
      <p>We are looking for a Senior Developer to join our team.</p>
      <p><strong>Requirements:</strong></p>
      <ul>
        <li>TypeScript & React</li>
      </ul>
      <div><b>Skills</b></div>
      <ul>
        <li>Node.js</li>
      </ul>
      <b>Preferred Candidate:</b><br>
      <p>Master's degree or equivalent experience.</p>
    `;
    const md = htmlToMarkdown(html);
    expect(md).toContain('### Job Description');
    expect(md).not.toContain('**Job Description**');
    expect(md).toContain('### Requirements:');
    expect(md).not.toContain('**Requirements:**');
    expect(md).toContain('### Skills');
    expect(md).toContain('### Preferred Candidate:');
    expect(md).toContain('- TypeScript & React');
    expect(md).toContain('- Node.js');
  });

  it('preserves normal inline bold text in sentences and does not convert them to headings', () => {
    const html = '<p>We are seeking an <b>exceptional</b> candidate with <strong>solid</strong> fundamentals.</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('**exceptional**');
    expect(md).toContain('**solid**');
    expect(md).not.toContain('### exceptional');
    expect(md).not.toContain('### solid');
  });

  it('preserves full-sentence bold notes ending with a period and does not convert them to headings', () => {
    const html = '<p><strong>Note: Applications without a cover letter will not be reviewed.</strong></p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('**Note: Applications without a cover letter will not be reviewed.**');
    expect(md).not.toContain('### Note:');
  });

  it('unescapes HTML tags that were entity-encoded in JSON-LD', () => {
    const html = '&lt;h2&gt;Job Overview&lt;/h2&gt;&lt;p&gt;Overview details&lt;/p&gt;&lt;b&gt;Qualifications:&lt;/b&gt;&lt;br&gt;';
    const md = htmlToMarkdown(html);
    expect(md).toContain('## Job Overview');
    expect(md).toContain('Overview details');
    expect(md).toContain('### Qualifications:');
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
