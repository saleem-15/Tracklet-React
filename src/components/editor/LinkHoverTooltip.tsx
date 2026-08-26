import React, { useEffect, useState } from 'react';

export interface LinkHoverTooltipProps {
  editorRef: React.RefObject<HTMLElement | null>;
}

interface HoverState {
  top: number;
  left: number;
  url: string;
}

/**
 * Informational pill shown when hovering linked text inside the editor:
 * displays the target URL and reminds that Ctrl+Click opens it.
 * pointer-events-none by design — never interferes with editing.
 */
const LinkHoverTooltip: React.FC<LinkHoverTooltipProps> = ({ editorRef }) => {
  const [state, setState] = useState<HoverState | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const show = (anchor: HTMLAnchorElement) => {
      const url = anchor.getAttribute('href');
      if (!url) return;
      const rect = anchor.getBoundingClientRect();
      setState({
        url,
        top: Math.max(4, rect.top - 30),
        left: rect.left,
      });
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest?.('a');
      if (anchor && editor.contains(anchor)) show(anchor as HTMLAnchorElement);
    };
    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.('a')) setState(null);
    };
    const clear = () => setState(null);

    editor.addEventListener('mouseover', onMouseOver);
    editor.addEventListener('mouseout', onMouseOut);
    window.addEventListener('scroll', clear, { passive: true });
    return () => {
      editor.removeEventListener('mouseover', onMouseOver);
      editor.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', clear);
    };
  }, [editorRef]);

  if (!state) return null;

  return (
    <div
      role="tooltip"
      className="fixed z-[65] max-w-[320px] -translate-y-full pointer-events-none bg-slate-900 text-slate-100 rounded-lg shadow-xl px-2.5 py-1.5 animate-in fade-in duration-150"
      style={{ top: state.top, left: state.left }}
    >
      <span className="block truncate font-mono text-[11px] text-blue-200">
        {state.url}
      </span>
      <span className="block text-[10px] text-slate-400 select-none">
        Ctrl+Click to open
      </span>
    </div>
  );
};

export { LinkHoverTooltip };
export default LinkHoverTooltip;