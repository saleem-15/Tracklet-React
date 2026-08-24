import React from 'react';
import { ExternalLink } from 'lucide-react';
import { tokenizeTextWithLinks } from '../lib/linkUtils';

export interface LinkifiedTextProps {
  text?: string | null;
  className?: string;
  linkClassName?: string;
  showIcon?: boolean;
  stopClickPropagation?: boolean;
  /**
   * When true, links are styled normally but do NOT open on plain click —
   * only Ctrl/Cmd+Click opens them in a new tab. Plain clicks fall through
   * (e.g., to open the surrounding card).
   */
  requireCtrlClick?: boolean;
}

/**
 * Renders text with automatic linkification of URLs and Markdown links.
 * All links open safely in a new tab (target="_blank" rel="noopener noreferrer").
 */
export const LinkifiedText: React.FC<LinkifiedTextProps> = ({
  text,
  className = '',
  linkClassName = '',
  showIcon = false,
  stopClickPropagation = true,
  requireCtrlClick = false,
}) => {
  if (!text) return null;

  const tokens = tokenizeTextWithLinks(text);

  return (
    <span className={className}>
      {tokens.map((token, idx) => {
        if (token.type === 'link' && token.url) {
          return (
            <a
              key={idx}
              href={token.url}
              target="_blank"
              rel="noopener noreferrer"
              draggable={false}
              onClick={(e) => {
                const opensNow =
                  !requireCtrlClick || e.ctrlKey || e.metaKey;
                if (!opensNow) {
                  // Stay on the page; let the event bubble to the host surface
                  e.preventDefault();
                  if (stopClickPropagation) e.stopPropagation();
                  return;
                }
                // Default action opens target="_blank"; suppress host handling
                if (stopClickPropagation) e.stopPropagation();
              }}
              title={
                requireCtrlClick
                  ? `${token.url} (Ctrl+Click to open)`
                  : token.url
              }
              className={`text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium transition-colors break-all inline-flex items-center gap-0.5 cursor-pointer ${linkClassName}`}
            >
              <span>{token.label || token.value}</span>
              {showIcon && <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />}
            </a>
          );
        }
        return <React.Fragment key={idx}>{token.value}</React.Fragment>;
      })}
    </span>
  );
};
