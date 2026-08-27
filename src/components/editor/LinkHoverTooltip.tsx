import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface LinkHoverTooltipProps {
  editorRef: React.RefObject<HTMLElement | null>;
  onEditLink?: (anchor: HTMLAnchorElement) => void;
  disabled?: boolean;
}

interface HoverState {
  top: number;
  left: number;
  url: string;
  anchor: HTMLAnchorElement;
}

/**
 * Compact link hover popup:
 * - Truncated clickable URL (opens in new tab)
 * - Compact Copy icon button with visual Check feedback
 * - Compact "Edit" text button
 */
const LinkHoverTooltip: React.FC<LinkHoverTooltipProps> = ({
  editorRef,
  onEditLink,
  disabled = false,
}) => {
  const [state, setState] = useState<HoverState | null>(null);
  const [copied, setCopied] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const scheduleHide = (delay = 200) => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setState(null);
      setCopied(false);
    }, delay);
  };

  useEffect(() => {
    if (disabled) {
      setState(null);
      return;
    }

    const editor = editorRef.current;
    if (!editor) return;

    const show = (anchor: HTMLAnchorElement) => {
      clearHideTimeout();
      const url = anchor.getAttribute('href');
      if (!url) return;
      const rect = anchor.getBoundingClientRect();
      const belowFits = rect.bottom + 34 < window.innerHeight - 6;

      setState({
        url,
        anchor,
        top: belowFits ? rect.bottom + 4 : Math.max(6, rect.top - 34),
        left: Math.max(6, Math.min(rect.left, window.innerWidth - 300 - 6)),
      });
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest?.('a');
      if (anchor && editor.contains(anchor)) {
        show(anchor as HTMLAnchorElement);
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const related = e.relatedTarget as Node | null;
      if (tooltipRef.current && related && tooltipRef.current.contains(related)) {
        return;
      }
      if (target.closest?.('a')) {
        scheduleHide(200);
      }
    };

    const onScroll = () => {
      clearHideTimeout();
      setState(null);
    };

    editor.addEventListener('mouseover', onMouseOver);
    editor.addEventListener('mouseout', onMouseOut);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearHideTimeout();
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      editor.removeEventListener('mouseover', onMouseOver);
      editor.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', onScroll);
    };
  }, [editorRef, disabled]);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!state?.url) return;

    navigator.clipboard?.writeText(state.url);
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state?.anchor && onEditLink) {
      onEditLink(state.anchor);
    }
    setState(null);
  };

  if (!state || disabled) return null;

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-label="Link preview"
      onMouseEnter={clearHideTimeout}
      onMouseLeave={() => scheduleHide(150)}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-[65] flex items-center gap-1 bg-slate-900 text-slate-100 rounded-lg shadow-xl border border-slate-700/60 px-1.5 py-0.5 text-xs animate-in fade-in zoom-in-95 duration-100 max-w-[320px]"
      style={{ top: state.top, left: state.left }}
    >
      <a
        href={state.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Open link in new tab"
        aria-label={`Open ${state.url} in new tab`}
        className="text-blue-300 hover:text-blue-200 hover:underline min-w-0 max-w-[170px] font-mono text-[10.5px] truncate px-1 py-0.5 rounded cursor-pointer transition-colors"
      >
        {state.url}
      </a>

      <div className="h-3 w-px bg-slate-700/80 mx-0.5 shrink-0" />

      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied to clipboard' : 'Copy link'}
        aria-label="Copy link URL"
        className={`p-0.5 rounded cursor-pointer transition-colors shrink-0 flex items-center ${
          copied
            ? 'text-emerald-400 bg-emerald-950/60'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>

      <button
        type="button"
        onClick={handleEdit}
        title="Edit link text and URL"
        aria-label="Edit link"
        className="px-1.5 py-0.5 text-[10.5px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer transition-colors shrink-0"
      >
        Edit
      </button>
    </div>
  );
};

export { LinkHoverTooltip };
export default LinkHoverTooltip;