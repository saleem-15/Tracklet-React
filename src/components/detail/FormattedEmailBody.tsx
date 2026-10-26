import React from 'react';
import {
  parseEmailBlocks,
  renderInlineFormattedText,
  normalizeEmailContent,
} from '../../lib/emailContentUtils';
import { detectTextDirection } from '../../lib/rtlUtils';

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
 * - Fully supports RTL languages (Arabic, Hebrew, etc.) and bidirectional mixed text.
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

    const previewDir = detectTextDirection(flattenedText);

    return (
      <p
        dir="auto"
        className={`text-xs text-slate-600 leading-relaxed line-clamp-2 text-start ${className}`}
      >
        {renderInlineFormattedText(
          flattenedText,
          { ...inlineOptions, baseDir: previewDir },
          'preview'
        )}
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
                ? 'text-sm font-bold text-slate-900 mt-2 mb-1 text-start'
                : 'text-xs font-bold text-slate-900 mt-1.5 mb-0.5 text-start';
            const headingDir = detectTextDirection(block.content);
            return (
              <h5 key={key} dir="auto" className={headingClasses}>
                {renderInlineFormattedText(
                  block.content,
                  { ...inlineOptions, baseDir: headingDir },
                  key
                )}
              </h5>
            );
          }

          case 'bullet-list': {
            return (
              <ul
                key={key}
                dir="auto"
                className="my-1.5 ps-5 list-disc space-y-1 text-slate-700 text-start"
              >
                {block.items.map((item, itemIdx) => {
                  const itemDir = detectTextDirection(item);
                  return (
                    <li
                      key={`${key}-item-${itemIdx}`}
                      dir="auto"
                      className="leading-relaxed ps-0.5"
                    >
                      {renderInlineFormattedText(
                        item,
                        { ...inlineOptions, baseDir: itemDir },
                        `${key}-item-${itemIdx}`
                      )}
                    </li>
                  );
                })}
              </ul>
            );
          }

          case 'numbered-list': {
            return (
              <ol
                key={key}
                dir="auto"
                className="my-1.5 ps-5 list-decimal space-y-1 text-slate-700 text-start"
              >
                {block.items.map((item, itemIdx) => {
                  const itemDir = detectTextDirection(item);
                  return (
                    <li
                      key={`${key}-item-${itemIdx}`}
                      dir="auto"
                      className="leading-relaxed ps-0.5"
                    >
                      {renderInlineFormattedText(
                        item,
                        { ...inlineOptions, baseDir: itemDir },
                        `${key}-item-${itemIdx}`
                      )}
                    </li>
                  );
                })}
              </ol>
            );
          }

          case 'quote': {
            const quoteDir = detectTextDirection(block.content);
            return (
              <blockquote
                key={key}
                dir="auto"
                className="border-s-3 border-blue-400 bg-blue-50/50 ps-3 pe-2 py-1 my-1.5 text-slate-600 italic rounded-e-lg text-start"
              >
                {renderInlineFormattedText(
                  block.content,
                  { ...inlineOptions, baseDir: quoteDir },
                  key
                )}
              </blockquote>
            );
          }

          case 'spacer': {
            return <div key={key} className="h-1" aria-hidden="true" />;
          }

          case 'paragraph':
          default: {
            const paraDir = detectTextDirection(block.content);
            return (
              <p
                key={key}
                dir="auto"
                className="leading-relaxed break-words text-start"
              >
                {renderInlineFormattedText(
                  block.content,
                  { ...inlineOptions, baseDir: paraDir },
                  key
                )}
              </p>
            );
          }
        }
      })}
    </div>
  );
};
