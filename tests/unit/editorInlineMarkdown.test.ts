import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  matchInlineMarkdown,
  tryApplyInlineMarkdown,
} from '../../src/lib/editor/editorInlineMarkdown';
import { shorthandFor, resolveEnterStrategy, executeEnterStrategy } from '../../src/lib/editor/editorKeyboard';

describe('editorInlineMarkdown unit tests', () => {
  describe('matchInlineMarkdown pattern recognition', () => {
    it('matches bold with asterisks **bold**', () => {
      const match = matchInlineMarkdown('some **bold text**');
      expect(match).not.toBeNull();
      expect(match?.type).toBe('bold');
      expect(match?.innerContent).toBe('bold text');
      expect(match?.fullMatch).toBe('**bold text**');
    });

    it('matches bold with underscores __bold__', () => {
      const match = matchInlineMarkdown('prefix __bold text__');
      expect(match).not.toBeNull();
      expect(match?.type).toBe('bold-underscore');
      expect(match?.innerContent).toBe('bold text');
      expect(match?.fullMatch).toBe('__bold text__');
    });

    it('matches inline code `const x = 1`', () => {
      const match = matchInlineMarkdown('test `const x = 1`');
      expect(match).not.toBeNull();
      expect(match?.type).toBe('code');
      expect(match?.innerContent).toBe('const x = 1');
      expect(match?.fullMatch).toBe('`const x = 1`');
    });

    it('matches strikethrough ~~deleted~~', () => {
      const match = matchInlineMarkdown('old ~~deleted text~~');
      expect(match).not.toBeNull();
      expect(match?.type).toBe('strike');
      expect(match?.innerContent).toBe('deleted text');
      expect(match?.fullMatch).toBe('~~deleted text~~');
    });

    it('matches markdown link [Tracklet](https://tracklet.app)', () => {
      const match = matchInlineMarkdown('visit [Tracklet](https://tracklet.app)');
      expect(match).not.toBeNull();
      expect(match?.type).toBe('link');
      expect(match?.innerContent).toBe('Tracklet');
      expect(match?.url).toBe('https://tracklet.app');
    });

    it('matches italic when followed by space *italic* ', () => {
      const match = matchInlineMarkdown('some *italic text* ');
      expect(match).not.toBeNull();
      expect(match?.type).toBe('italic-asterisk');
      expect(match?.innerContent).toBe('italic text');
      expect(match?.trailingSpace).toBe(true);
    });

    it('returns null for incomplete or non-matching syntax', () => {
      expect(matchInlineMarkdown('some **incomplete')).toBeNull();
      expect(matchInlineMarkdown('2 * 3 * 4')).toBeNull();
      expect(matchInlineMarkdown('[label](incomplete')).toBeNull();
    });
  });

  describe('tryApplyInlineMarkdown DOM transformation', () => {
    let editor: HTMLDivElement;

    beforeEach(() => {
      editor = document.createElement('div');
      editor.contentEditable = 'true';
      document.body.appendChild(editor);
    });

    afterEach(() => {
      editor.remove();
      window.getSelection()?.removeAllRanges();
    });

    it('transforms **bold text** into <strong>bold text</strong> in place with active caret', () => {
      const p = document.createElement('p');
      const textNode = document.createTextNode('Here is **bold text**');
      p.appendChild(textNode);
      editor.appendChild(p);

      const range = document.createRange();
      range.setStart(textNode, textNode.length);
      range.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      const transformed = tryApplyInlineMarkdown(editor, sel);
      expect(transformed).toBe(true);

      const strong = p.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong?.textContent).toBe('bold text');
      expect(strong?.className).toContain('font-semibold');
      expect(p.textContent).toBe('Here is bold text\u200B');
    });

    it('transforms `inline code` into <code> in place', () => {
      const p = document.createElement('p');
      const textNode = document.createTextNode('Use `const a = 1`');
      p.appendChild(textNode);
      editor.appendChild(p);

      const range = document.createRange();
      range.setStart(textNode, textNode.length);
      range.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      const transformed = tryApplyInlineMarkdown(editor, sel);
      expect(transformed).toBe(true);

      const code = p.querySelector('code');
      expect(code).not.toBeNull();
      expect(code?.textContent).toBe('const a = 1');
    });

    it('transforms [Website](https://example.com) into <a> link in place', () => {
      const p = document.createElement('p');
      const textNode = document.createTextNode('Click [Website](https://example.com)');
      p.appendChild(textNode);
      editor.appendChild(p);

      const range = document.createRange();
      range.setStart(textNode, textNode.length);
      range.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      const transformed = tryApplyInlineMarkdown(editor, sel);
      expect(transformed).toBe(true);

      const a = p.querySelector('a');
      expect(a).not.toBeNull();
      expect(a?.textContent).toBe('Website');
      expect(a?.getAttribute('href')).toBe('https://example.com');
      expect(a?.getAttribute('target')).toBe('_blank');
    });

    it('does not transform inside code fences <pre><code>', () => {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      const textNode = document.createTextNode('**literal text**');
      code.appendChild(textNode);
      pre.appendChild(code);
      editor.appendChild(pre);

      const range = document.createRange();
      range.setStart(textNode, textNode.length);
      range.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      const transformed = tryApplyInlineMarkdown(editor, sel);
      expect(transformed).toBe(false);
      expect(code.querySelector('strong')).toBeNull();
    });
  });

  describe('shorthandFor block prefixes', () => {
    it('recognizes > for quote / callout', () => {
      const sh = shorthandFor('>');
      expect(sh).not.toBeNull();
      expect(sh?.actionId).toBe('quote');
    });

    it('recognizes --- for divider', () => {
      const sh = shorthandFor('---');
      expect(sh).not.toBeNull();
      expect(sh?.actionId).toBe('divider');
    });
  });

  describe('code fence and divider enter strategies', () => {
    let editor: HTMLDivElement;

    beforeEach(() => {
      editor = document.createElement('div');
      editor.contentEditable = 'true';
      document.body.appendChild(editor);
    });

    afterEach(() => {
      editor.remove();
      window.getSelection()?.removeAllRanges();
    });

    it('resolves and creates code fence block when typing ``` and pressing Enter', () => {
      const p = document.createElement('p');
      const textNode = document.createTextNode('```typescript');
      p.appendChild(textNode);
      editor.appendChild(p);

      const range = document.createRange();
      range.setStart(textNode, textNode.length);
      range.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      const strategy = resolveEnterStrategy(editor, sel);
      expect(strategy).toBe('code-fence-create');

      executeEnterStrategy(editor, strategy!, sel);
      const pre = editor.querySelector('pre');
      expect(pre).not.toBeNull();
      expect(pre?.dataset.language).toBe('typescript');
      expect(pre?.querySelector('code')).not.toBeNull();
    });

    it('resolves and creates divider when typing --- and pressing Enter', () => {
      const p = document.createElement('p');
      const textNode = document.createTextNode('---');
      p.appendChild(textNode);
      editor.appendChild(p);

      const range = document.createRange();
      range.setStart(textNode, textNode.length);
      range.collapse(true);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      const strategy = resolveEnterStrategy(editor, sel);
      expect(strategy).toBe('divider-create');

      executeEnterStrategy(editor, strategy!, sel);
      const hr = editor.querySelector('hr');
      expect(hr).not.toBeNull();
    });
  });
});
