import React from 'react';
import {
  parseEmailBlocks,
  renderInlineFormattedText,
  normalizeEmailContent,
} from '../../lib/emailContentUtils';

export interface FormattedEmailBodyProps {
  text?: string | null;
  isCollapsed?: boolean;
  className?: string;
  linkClassName?: string;
  showLinkIcon?: boolean;
  stopClickPropagation?: boolean;
}

/**
 * High-clarity email body renderer:
 * - Automatically normalizes HTML markup and Markdown.
 * - In collapsed state: renders a tight 2-line clamped preview with bold and links.
 * - In expanded state: renders structured blocks (paragraphs, bullet lists, blockquotes, bold, links).
 */
export const FormattedEmailBody: React.FC<FormattedEmailBodyProps> = ({
  text,
  isCollapsed = false,
  className = '',
  linkClassName,
  showLinkIcon = false,
  stopClickPropagation = true,
}) => {
  if (!text || !text.trim()) return null;

  const normalized = normalizeEmailContent(text);
  if (!normalized) return null;

  const inlineOptions = {
    linkClassName,
    showLinkIcon,
    stopClickPropagation,
  };

  // Collapsed Preview Mode (tight 2-line clamp)
  if (isCollapsed) {
    // Replace hard newlines with single space so multi-line email previews read cleanly
    const flattenedText = normalized
      .replace(/\r?\n\s*[-*•]\s+/g, ' · ') // Convert list items to bullet separators
      .replace(/\r?\n+/g, ' ')
      .trim();

    return (
      <p className={`text-xs text-slate-600 leading-relaxed line-clamp-2 ${className}`}>
        {renderInlineFormattedText(flattenedText, inlineOptions, 'preview')}
      </p>
    );
  }

  // Expanded / Reader Mode (Full structured blocks)
  const blocks = parseEmailBlocks(normalized);

  return (
    <div className={`space-y-1.5 text-xs text-slate-700 leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        const key = `block-${idx}`;

        switch (block.type) {
          case 'heading': {
            const headingClasses =
              block.level === 1
                ? 'text-sm font-bold text-slate-900 mt-2 mb-1'
                : 'text-xs font-bold text-slate-900 mt-1.5 mb-0.5';
            return (
              <h5 key={key} className={headingClasses}>
                {renderInlineFormattedText(block.content, inlineOptions, key)}
              </h5>
            );
          }

          case 'bullet-list': {
            return (
              <ul key={key} className="my-1.5 pl-4 list-disc space-y-1 text-slate-700">
                {block.items.map((item, itemIdx) => (
                  <li key={`${key}-item-${itemIdx}`} className="leading-relaxed pl-0.5">
                    {renderInlineFormattedText(item, inlineOptions, `${key}-item-${itemIdx}`)}
                  </li>
                ))}
              </ul>
            );
          }

          case 'numbered-list': {
            return (
              <ol key={key} className="my-1.5 pl-4 list-decimal space-y-1 text-slate-700">
                {block.items.map((item, itemIdx) => (
                  <li key={`${key}-item-${itemIdx}`} className="leading-relaxed pl-0.5">
                    {renderInlineFormattedText(item, inlineOptions, `${key}-item-${itemIdx}`)}
                  </li>
                ))}
              </ol>
            );
          }

          case 'quote': {
            return (
              <blockquote
                key={key}
                className="border-l-3 border-blue-400 bg-blue-50/50 pl-3 py-1 my-1.5 text-slate-600 italic rounded-r-lg"
              >
                {renderInlineFormattedText(block.content, inlineOptions, key)}
              </blockquote>
            );
          }

          case 'spacer': {
            return <div key={key} className="h-1" aria-hidden="true" />;
          }

          case 'paragraph':
          default: {
            return (
              <p key={key} className="leading-relaxed break-words">
                {renderInlineFormattedText(block.content, inlineOptions, key)}
              </p>
            );
          }
        }
      })}
    </div>
  );
};
