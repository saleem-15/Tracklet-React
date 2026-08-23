import { describe, it, expect } from 'vitest';
import {
  normalizeUrl,
  formatUrlLabel,
  extractLinks,
  tokenizeTextWithLinks,
} from '../../src/lib/linkUtils';

describe('linkUtils', () => {
  describe('normalizeUrl', () => {
    it('prepends https:// to www. domains', () => {
      expect(normalizeUrl('www.github.com')).toBe('https://www.github.com');
      expect(normalizeUrl('www.linear.app/careers')).toBe('https://www.linear.app/careers');
    });

    it('keeps existing http:// and https:// URLs unchanged', () => {
      expect(normalizeUrl('https://example.com/page')).toBe('https://example.com/page');
      expect(normalizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
    });

    it('trims whitespace', () => {
      expect(normalizeUrl('  https://google.com  ')).toBe('https://google.com');
    });
  });

  describe('formatUrlLabel', () => {
    it('strips protocols and www', () => {
      expect(formatUrlLabel('https://www.google.com')).toBe('google.com');
      expect(formatUrlLabel('http://github.com/facebook/react/')).toBe('github.com/facebook/react');
    });

    it('truncates long URLs with an ellipsis', () => {
      const longUrl = 'https://github.com/facebook/react/blob/main/packages/react-dom/src/client/ReactDOMRoot.js';
      const label = formatUrlLabel(longUrl, 25);
      expect(label.length).toBeLessThanOrEqual(25);
      expect(label.endsWith('…')).toBe(true);
    });

    it('handles empty input gracefully', () => {
      expect(formatUrlLabel('')).toBe('');
    });
  });

  describe('extractLinks', () => {
    it('returns empty array when text has no links or is empty', () => {
      expect(extractLinks('')).toEqual([]);
      expect(extractLinks('No links here, just plain notes.')).toEqual([]);
      expect(extractLinks(undefined)).toEqual([]);
    });

    it('extracts raw https and www URLs without trailing punctuation', () => {
      const text = 'Check out https://github.com/facebook/react. Also see www.linear.app!';
      const links = extractLinks(text);

      expect(links).toHaveLength(2);
      expect(links[0]).toEqual({
        url: 'https://github.com/facebook/react',
        label: 'github.com/facebook/react',
        isMarkdown: false,
      });
      expect(links[1]).toEqual({
        url: 'https://www.linear.app',
        label: 'linear.app',
        isMarkdown: false,
      });
    });

    it('extracts markdown links with custom labels', () => {
      const text = 'Review the [Take-Home Challenge](https://github.com/org/take-home) before Monday.';
      const links = extractLinks(text);

      expect(links).toHaveLength(1);
      expect(links[0]).toEqual({
        url: 'https://github.com/org/take-home',
        label: 'Take-Home Challenge',
        isMarkdown: true,
      });
    });

    it('deduplicates identical URLs', () => {
      const text = 'First link https://google.com and second link https://google.com again.';
      const links = extractLinks(text);

      expect(links).toHaveLength(1);
      expect(links[0].url).toBe('https://google.com');
    });

    it('handles URLs inside parentheses correctly', () => {
      const text = 'Here is the doc (https://docs.google.com/document/d/12345).';
      const links = extractLinks(text);

      expect(links).toHaveLength(1);
      expect(links[0].url).toBe('https://docs.google.com/document/d/12345');
    });
  });

  describe('tokenizeTextWithLinks', () => {
    it('returns empty array for empty input', () => {
      expect(tokenizeTextWithLinks('')).toEqual([]);
      expect(tokenizeTextWithLinks(undefined)).toEqual([]);
    });

    it('returns single text token when no links are present', () => {
      const text = 'Just a regular note without any URLs.';
      const tokens = tokenizeTextWithLinks(text);

      expect(tokens).toEqual([
        { type: 'text', value: 'Just a regular note without any URLs.' },
      ]);
    });

    it('splits text around raw URLs', () => {
      const text = 'Please check https://stripe.com for details.';
      const tokens = tokenizeTextWithLinks(text);

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: 'text', value: 'Please check ' });
      expect(tokens[1]).toEqual({
        type: 'link',
        value: 'https://stripe.com',
        url: 'https://stripe.com',
        label: 'https://stripe.com',
      });
      expect(tokens[2]).toEqual({ type: 'text', value: ' for details.' });
    });

    it('handles Markdown links with custom labels', () => {
      const text = 'Download the [Offer Letter PDF](https://drive.google.com/file/123) now.';
      const tokens = tokenizeTextWithLinks(text);

      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toEqual({ type: 'text', value: 'Download the ' });
      expect(tokens[1]).toEqual({
        type: 'link',
        value: '[Offer Letter PDF](https://drive.google.com/file/123)',
        url: 'https://drive.google.com/file/123',
        label: 'Offer Letter PDF',
      });
      expect(tokens[2]).toEqual({ type: 'text', value: ' now.' });
    });

    it('handles multi-line text with multiple mixed links', () => {
      const text = `Line 1: https://linear.app
Line 2: [Dashboard](https://dashboard.example.com)
Line 3: Plain text`;

      const tokens = tokenizeTextWithLinks(text);
      expect(tokens.filter((t) => t.type === 'link')).toHaveLength(2);
    });
  });
});
