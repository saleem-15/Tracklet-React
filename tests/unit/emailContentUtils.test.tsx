import { describe, it, expect } from 'vitest';
import React from 'react';
import {
  normalizeEmailContent,
  parseEmailBlocks,
  renderInlineFormattedText,
} from '../../src/lib/emailContentUtils';

describe('emailContentUtils', () => {
  describe('normalizeEmailContent', () => {
    it('returns empty string for null, undefined or empty input', () => {
      expect(normalizeEmailContent(null)).toBe('');
      expect(normalizeEmailContent(undefined)).toBe('');
      expect(normalizeEmailContent('   ')).toBe('');
    });

    it('preserves plain text and markdown as-is', () => {
      const text = 'Hi Saleem,\n\n**Thank you** for applying!\nVisit https://example.com';
      expect(normalizeEmailContent(text)).toBe(text);
    });

    it('converts HTML tags to clean canonical Markdown when HTML tags are present', () => {
      const html = '<p>Hi Saleem,</p><p>We are pleased to offer you the <b>Senior Engineer</b> role.</p><p><a href="https://example.com">Portal Link</a></p>';
      const normalized = normalizeEmailContent(html);
      expect(normalized).toContain('**Senior Engineer**');
      expect(normalized).toContain('[Portal Link](https://example.com)');
      expect(normalized).not.toContain('<p>');
      expect(normalized).not.toContain('<b>');
    });
  });

  describe('renderInlineFormattedText', () => {
    it('renders plain text into string nodes', () => {
      const nodes = renderInlineFormattedText('Hello world');
      expect(nodes).toBeDefined();
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('renders **bold** and __bold__ as strong tags', () => {
      const nodes = renderInlineFormattedText('Hello **bold text** and __also bold__');
      const renderedStr = JSON.stringify(nodes);
      expect(renderedStr).toContain('strong');
      expect(renderedStr).toContain('bold text');
      expect(renderedStr).toContain('also bold');
    });

    it('renders *italic* and _italic_ as em tags', () => {
      const nodes = renderInlineFormattedText('Hello *italic text* and _more italic_');
      const renderedStr = JSON.stringify(nodes);
      expect(renderedStr).toContain('em');
      expect(renderedStr).toContain('italic text');
      expect(renderedStr).toContain('more italic');
    });

    it('renders `code` as code tags', () => {
      const nodes = renderInlineFormattedText('Run `npm run dev` to start');
      const renderedStr = JSON.stringify(nodes);
      expect(renderedStr).toContain('code');
      expect(renderedStr).toContain('npm run dev');
    });

    it('renders raw URLs and markdown links as anchor tags with target="_blank"', () => {
      const nodes = renderInlineFormattedText('Check https://example.com and [GitHub](https://github.com)');
      const renderedStr = JSON.stringify(nodes);
      expect(renderedStr).toContain('https://example.com');
      expect(renderedStr).toContain('https://github.com');
      expect(renderedStr).toContain('_blank');
      expect(renderedStr).toContain('noopener noreferrer');
    });
  });

  describe('parseEmailBlocks', () => {
    it('parses bullet lists with -, *, and unicode •', () => {
      const input = 'Terms:\n• Salary: $200k\n- Bonus: $20k\n* Equity: 10,000 RSUs';
      const blocks = parseEmailBlocks(input);
      const listBlock = blocks.find((b) => b.type === 'bullet-list');
      expect(listBlock).toBeDefined();
      if (listBlock && listBlock.type === 'bullet-list') {
        expect(listBlock.items).toHaveLength(3);
        expect(listBlock.items[0]).toContain('Salary: $200k');
        expect(listBlock.items[1]).toContain('Bonus: $20k');
        expect(listBlock.items[2]).toContain('Equity: 10,000 RSUs');
      }
    });

    it('parses blockquotes starting with >', () => {
      const input = '> This is a quoted message\n> Second line of quote';
      const blocks = parseEmailBlocks(input);
      const quoteBlock = blocks.find((b) => b.type === 'quote');
      expect(quoteBlock).toBeDefined();
      if (quoteBlock && quoteBlock.type === 'quote') {
        expect(quoteBlock.content).toContain('This is a quoted message');
      }
    });

    it('parses headings starting with #, ##, or ###', () => {
      const input = '# Offer Letter\n\n### Next Steps';
      const blocks = parseEmailBlocks(input);
      const h1 = blocks.find((b) => b.type === 'heading' && b.level === 1);
      const h3 = blocks.find((b) => b.type === 'heading' && b.level === 3);
      expect(h1).toBeDefined();
      expect(h3).toBeDefined();
    });
  });
});
