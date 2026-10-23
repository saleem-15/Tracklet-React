import React, { useEffect, useState } from 'react';
import { AlignLeft } from 'lucide-react';

export interface LegalSection {
  id: string;
  title: string;
}

export interface LegalTableOfContentsProps {
  sections: LegalSection[];
  activeSectionId?: string;
  onSectionClick?: (id: string) => void;
}

export const LegalTableOfContents: React.FC<LegalTableOfContentsProps> = ({
  sections,
  onSectionClick,
}) => {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '');

  useEffect(() => {
    // Observe all sections for active heading highlight
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleScrollTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveId(id);
      onSectionClick?.(id);
    }
  };

  return (
    <nav
      aria-label="Table of contents"
      className="hidden lg:block sticky top-24 w-64 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3 self-start max-h-[calc(100vh-8rem)] overflow-y-auto"
    >
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold font-heading text-slate-900">
        <AlignLeft className="w-3.5 h-3.5 text-blue-600" />
        <span>Table of Contents</span>
      </div>

      <ul className="space-y-1 text-xs">
        {sections.map((sec) => {
          const isActive = activeId === sec.id;
          return (
            <li key={sec.id}>
              <a
                href={`#${sec.id}`}
                onClick={(e) => handleScrollTo(e, sec.id)}
                className={`block py-1 px-2 rounded-lg transition-colors text-xs truncate ${
                  isActive
                    ? 'font-bold text-blue-600 bg-blue-50 border-l-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={sec.title}
              >
                {sec.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
