import React from 'react';
import { tokenizeTextWithLinks } from '../lib/linkUtils';

export interface MarkdownNoteViewProps {
  content?: string | null;
  className?: string;
}

/**
 * Renders a lightweight, high-clarity Markdown note with:
 * - Headings (#, ##, ###)
 * - Bold (**text**) & Italic (*text*) & Inline Code (`code`)
 * - Bullet lists (- or *)
 * - Numbered lists (1. 2. 3.)
 * - Clean clickable links ([label](url) and raw URLs) with no extra trailing icons
 */
export const MarkdownNoteView: React.FC<MarkdownNoteViewProps> = ({
  content,
  className = '',
}) => {
  if (!content || !content.trim()) {
    return (
      <div className="py-6 text-center text-slate-500 font-mono text-xs italic">
        No notes entered yet. Click here to start writing.
      </div>
    );
  }

  const lines = content.split(/\r?\n/);

  return (
    <div className={`space-y-1.5 text-xs text-slate-800 font-sans leading-relaxed break-words ${className}`}>
      {lines.map((rawLine, idx) => {
        const line = rawLine;

        // Empty line
        if (!line.trim()) {
          return <div key={idx} className="h-2" />;
        }

        // Headings: H1, H2, H3
        if (line.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-bold text-slate-900 text-xs font-mono uppercase tracking-wide mt-3 mb-1 text-blue-700">
              {renderInlineFormatting(line.slice(4))}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-bold text-slate-900 text-sm font-sans tracking-tight mt-3 mb-1">
              {renderInlineFormatting(line.slice(3))}
            </h3>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h2 key={idx} className="font-bold text-slate-900 text-base font-sans tracking-tight mt-3.5 mb-1.5 border-b border-slate-200/80 pb-1">
              {renderInlineFormatting(line.slice(2))}
            </h2>
          );
        }

        // Numbered List: 1. 2. 3.
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const itemText = numberedMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="font-mono text-slate-500 font-semibold min-w-[16px] text-right select-none">{num}.</span>
              <span className="text-slate-800 flex-1">{renderInlineFormatting(itemText)}</span>
            </div>
          );
        }

        // Bullet List: - or *
        const bulletMatch = line.match(/^[-*]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="text-blue-500 font-bold leading-none mt-1 select-none">•</span>
              <span className="text-slate-800 flex-1">{renderInlineFormatting(bulletMatch[1])}</span>
            </div>
          );
        }

        // Standard Paragraph line
        return (
          <p key={idx} className="text-slate-800 leading-relaxed">
            {renderInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
};

/**
 * Parses bold (**text**), italic (*text*), inline code (`code`), and links inside a line.
 */
function renderInlineFormatting(text: string): React.ReactNode[] {
  // Tokenize links first so URLs with underscores or formatting don't get corrupted
  const linkTokens = tokenizeTextWithLinks(text);

  return linkTokens.map((token, tokenIdx) => {
    if (token.type === 'link' && token.url) {
      return (
        <a
          key={`link-${tokenIdx}`}
          href={token.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={token.url}
          className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium break-all transition-colors cursor-pointer"
        >
          {token.label || token.value}
        </a>
      );
    }

    // Format markdown styles (bold, italic, code) in the plain text chunk
    return <span key={`chunk-${tokenIdx}`}>{parseMarkdownStyles(token.value)}</span>;
  });
}

/**
 * Parses inline bold (**text**), italic (*text*), and code (`code`).
 */
function parseMarkdownStyles(chunk: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const styleRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = styleRegex.exec(chunk)) !== null) {
    if (match.index > lastIndex) {
      parts.push(chunk.slice(lastIndex, match.index));
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-900">
          {matchedStr.slice(2, -2)}
        </strong>
      );
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-slate-700">
          {matchedStr.slice(1, -1)}
        </em>
      );
    } else if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="font-mono text-[11px] bg-slate-100 text-slate-800 px-1 py-0.5 rounded border border-slate-200"
        >
          {matchedStr.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + matchedStr.length;
  }

  if (lastIndex < chunk.length) {
    parts.push(chunk.slice(lastIndex));
  }

  return parts;
}
