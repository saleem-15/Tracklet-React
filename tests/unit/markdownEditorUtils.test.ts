import { describe, it, expect } from 'vitest';
import {
  applyFormattingToText,
  handleListContinuationOnEnter,
} from '../../src/lib/markdownEditorUtils';

describe('markdownEditorUtils', () => {
  describe('applyFormattingToText', () => {
    it('wraps highlighted text with prefix and suffix', () => {
      const text = 'Hello world from notes';
      // Highlight "world" (indices 6 to 11)
      const result = applyFormattingToText(text, 6, 11, '**', '**');

      expect(result.newText).toBe('Hello **world** from notes');
      expect(result.selectionStart).toBe(6);
      expect(result.selectionEnd).toBe(15);
    });

    it('inserts placeholder when no text is highlighted', () => {
      const text = 'Start of note: ';
      // Cursor at end (index 15)
      const result = applyFormattingToText(
        text,
        15,
        15,
        '[',
        '](https://url.com)',
        'link label'
      );

      expect(result.newText).toBe(
        'Start of note: [link label](https://url.com)'
      );
      expect(result.selectionStart).toBe(16); // after '['
      expect(result.selectionEnd).toBe(26); // length of 'link label'
    });

    it('prepends newline for block-level elements if not on a fresh line', () => {
      const text = 'Some content';
      const result = applyFormattingToText(
        text,
        12,
        12,
        '### ',
        '',
        'Heading',
        true
      );

      expect(result.newText).toBe('Some content\n### Heading');
    });

    it('does not prepend extra newline if already at start of line', () => {
      const text = 'Line 1\n';
      const result = applyFormattingToText(
        text,
        7,
        7,
        '- ',
        '',
        'List item',
        true
      );

      expect(result.newText).toBe('Line 1\n- List item');
    });

    it('inserts fenced code block with placeholder when no text is highlighted', () => {
      const text = 'Notes:';
      const result = applyFormattingToText(
        text,
        6,
        6,
        '```\n',
        '\n```',
        'code here',
        true
      );

      expect(result.newText).toBe('Notes:\n```\ncode here\n```');
      expect(result.selectionStart).toBe('Notes:\n```\n'.length);
      expect(result.selectionEnd).toBe('Notes:\n```\ncode here'.length);
    });

    it('wraps highlighted multiline text in fenced code block', () => {
      const text = 'const x = 1;\nconsole.log(x);';
      const result = applyFormattingToText(
        text,
        0,
        text.length,
        '```\n',
        '\n```',
        'code here',
        true
      );

      expect(result.newText).toBe('```\nconst x = 1;\nconsole.log(x);\n```');
    });
  });

  describe('handleListContinuationOnEnter', () => {
    it('auto-increments numbered list items', () => {
      const text = '1. First item';
      const result = handleListContinuationOnEnter(text, text.length);

      expect(result.handled).toBe(true);
      expect(result.newText).toBe('1. First item\n2. ');
      expect(result.newCursorPos).toBe(result.newText.length);
    });

    it('handles multi-digit incrementing correctly (9. -> 10.)', () => {
      const text = '9. Ninth item';
      const result = handleListContinuationOnEnter(text, text.length);

      expect(result.handled).toBe(true);
      expect(result.newText).toBe('9. Ninth item\n10. ');
    });

    it('clears empty numbered list item on Enter to exit list', () => {
      const text = '1. First item\n2. ';
      const result = handleListContinuationOnEnter(text, text.length);

      expect(result.handled).toBe(true);
      expect(result.newText).toBe('1. First item\n');
      expect(result.newCursorPos).toBe('1. First item\n'.length);
    });

    it('continues bullet list items (- item -> - )', () => {
      const text = '- Discussed salary range';
      const result = handleListContinuationOnEnter(text, text.length);

      expect(result.handled).toBe(true);
      expect(result.newText).toBe('- Discussed salary range\n- ');
    });

    it('clears empty bullet list item on Enter to exit list', () => {
      const text = '- First bullet\n- ';
      const result = handleListContinuationOnEnter(text, text.length);

      expect(result.handled).toBe(true);
      expect(result.newText).toBe('- First bullet\n');
    });

    it('returns handled=false for regular non-list text', () => {
      const text = 'Just a standard sentence.';
      const result = handleListContinuationOnEnter(text, text.length);

      expect(result.handled).toBe(false);
      expect(result.newText).toBe(text);
    });
  });
});
