import React from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { extractLinks } from '../../lib/linkUtils';

export interface NoteLinksBarProps {
  notes?: string | null;
  className?: string;
}

/**
 * Displays quick-access clickable chips for all detected links in a note.
 */
export const NoteLinksBar: React.FC<NoteLinksBarProps> = ({
  notes,
  className = '',
}) => {
  const links = extractLinks(notes);

  if (links.length === 0) return null;

  return (
    <div
      className={`bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5 shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
        <Link2 className="w-3 h-3 text-blue-500" />
        <span>Links in note ({links.length})</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {links.map((link, idx) => (
          <a
            key={`${link.url}-${idx}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={link.url}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-slate-200/90 hover:border-blue-300 transition-all shadow-2xs group max-w-full"
          >
            <ExternalLink className="w-3 h-3 shrink-0 text-blue-500 group-hover:text-blue-700 transition-colors" />
            <span className="truncate max-w-[200px] sm:max-w-[280px]">
              {link.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
