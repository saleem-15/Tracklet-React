import React from 'react';
import { ExternalLink } from 'lucide-react';
import { tokenizeTextWithLinks } from './linkUtils';
import { htmlToMarkdown } from './editor/richTextMarkdownUtils';

/**
 * Normalizes email body content by converting HTML fragments to clean Markdown
 * if HTML tags are detected. If already plain text or Markdown, returns as-is.
 */
export function normalizeEmailContent(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Check if content contains HTML tags (e.g. <p>, <br>, <b>, <div>, <a>)
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    try {
      const converted = htmlToMarkdown(trimmed);
      if (converted && converted.trim()) {
        return converted;
      }
    } catch {
      // Fallback to original text if HTML parser fails
    }
  }

  return trimmed;
}

export interface RenderInlineOptions {
  linkClassName?: string;
  showLinkIcon?: boolean;
  stopClickPropagation?: boolean;
}

/**
 * Parses inline formatting (links, bold, italic, code, strikethrough)
 * and returns safe, pure React nodes.
 */
export function renderInlineFormattedText(
  text: string,
  options: RenderInlineOptions = {},
  keyPrefix: string = 'inline'
): React.ReactNode[] {
  if (!text) return [];

  const {
    linkClassName = 'text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium transition-colors cursor-pointer',
    showLinkIcon = false,
    stopClickPropagation = true,
  } = options;

  // 1. Tokenize links first to prevent inner underscores or formatting from breaking URLs
  const linkTokens = tokenizeTextWithLinks(text);

  return linkTokens.map((token, tokenIdx) => {
    const tokenKey = `${keyPrefix}-t${tokenIdx}`;

    if (token.type === 'link' && token.url) {
      // Parse any inline bold/italic inside the link label if present
      const labelNodes = token.label
        ? parseInlineStyles(token.label, `${tokenKey}-lbl`)
        : [token.value];

      return (
        <a
          key={tokenKey}
          href={token.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (stopClickPropagation) e.stopPropagation();
          }}
          className={`${linkClassName} inline-flex items-center gap-0.5 break-all`}
          title={token.url}
        >
          <span>{labelNodes}</span>
          {showLinkIcon && <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />}
        </a>
      );
    }

    // For plain text tokens, parse bold (**text** or __text__), italic (*text* or _text_), code (`text`), strike (~~text~~)
    return (
      <React.Fragment key={tokenKey}>
        {parseInlineStyles(token.value, tokenKey)}
      </React.Fragment>
    );
  });
}

/**
 * Helper to split text by markdown inline tokens:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code: `text`
 * - Strike: ~~text~~
 */
function parseInlineStyles(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];

  // Match:
  // 1. Bold: **...** or __...__
  // 2. Inline code: `...`
  // 3. Strikethrough: ~~...~~
  // 4. Italic: *...* or _..._
  const REGEX = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|~~[^~]+~~|(?<!\w)\*[^*]+\*(?!\w)|(?<!\w)_[^_]+_(?!\w))/g;
  const parts = text.split(REGEX);

  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (!part) return null;

    // Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      const inner = part.slice(2, -2);
      return (
        <strong key={key} className="font-semibold text-slate-900">
          {inner}
        </strong>
      );
    }

    // Inline code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={key}
          className="font-mono text-[11px] bg-slate-100 text-slate-800 px-1 py-0.5 rounded border border-slate-200"
        >
          {inner}
        </code>
      );
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <del key={key} className="line-through text-slate-400">
          {inner}
        </del>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <em key={key} className="italic text-slate-800">
          {inner}
        </em>
      );
    }

    return part;
  });
}

export type EmailBlock =
  | { type: 'heading'; level: number; content: string }
  | { type: 'bullet-list'; items: string[] }
  | { type: 'numbered-list'; items: string[] }
  | { type: 'quote'; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'spacer' };

/**
 * Splits normalized multi-line email content into structured blocks
 * for clean visual rendering (headings, bullet lists, blockquotes, paragraphs).
 */
export function parseEmailBlocks(rawContent: string): EmailBlock[] {
  const content = normalizeEmailContent(rawContent);
  if (!content) return [];

  const lines = content.split(/\r?\n/);
  const blocks: EmailBlock[] = [];

  let currentBulletList: string[] | null = null;
  let currentNumberedList: string[] | null = null;
  let currentQuote: string[] | null = null;

  const flushLists = () => {
    if (currentBulletList && currentBulletList.length > 0) {
      blocks.push({ type: 'bullet-list', items: currentBulletList });
      currentBulletList = null;
    }
    if (currentNumberedList && currentNumberedList.length > 0) {
      blocks.push({ type: 'numbered-list', items: currentNumberedList });
      currentNumberedList = null;
    }
  };

  const flushQuote = () => {
    if (currentQuote && currentQuote.length > 0) {
      blocks.push({ type: 'quote', content: currentQuote.join('\n') });
      currentQuote = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line -> spacer
    if (!trimmed) {
      flushLists();
      flushQuote();
      // Avoid duplicate spacers
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== 'spacer') {
        blocks.push({ type: 'spacer' });
      }
      continue;
    }

    // Blockquote: > quote
    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushLists();
      if (!currentQuote) currentQuote = [];
      currentQuote.push(quoteMatch[1]);
      continue;
    }
    flushQuote();

    // Headings: ### H3, ## H2, # H1
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushLists();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      continue;
    }

    // Bullet item: - item, * item, • item
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (currentNumberedList) flushLists();
      if (!currentBulletList) currentBulletList = [];
      currentBulletList.push(bulletMatch[1]);
      continue;
    }

    // Numbered item: 1. item, 2. item
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      if (currentBulletList) flushLists();
      if (!currentNumberedList) currentNumberedList = [];
      currentNumberedList.push(numberedMatch[2]);
      continue;
    }

    // Regular line / paragraph
    flushLists();
    blocks.push({ type: 'paragraph', content: line });
  }

  flushLists();
  flushQuote();

  return blocks;
}
