import React, { useEffect, useState, useRef } from 'react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Close mobile menu on click outside
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleScrollTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setActiveId(id);
      setIsMobileMenuOpen(false);
      onSectionClick?.(id);
    }
  };

  const activeSection = sections.find((s) => s.id === activeId) || sections[0];

  return (
    <>
      {/* ── Mobile Jump to Section Dropdown (Sticky on < lg) ── */}
      <div
        ref={mobileMenuRef}
        className="block lg:hidden w-full sticky top-16 z-20 bg-slate-50/95 backdrop-blur-md py-2 mb-6"
      >
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-expanded={isMobileMenuOpen}
          aria-label="Table of contents - Jump to section"
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-800 hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-500 font-normal">Section:</span>
            <span className="truncate text-slate-900 font-semibold">{activeSection?.title || 'Jump to section'}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
            {isMobileMenuOpen ? 'Close' : 'Browse'}
          </span>
        </button>

        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-white rounded-2xl border border-slate-200/90 shadow-xl z-30 max-h-72 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-150">
            {sections.map((sec) => {
              const isActive = activeId === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={(e) => handleScrollTo(e, sec.id)}
                  className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-50/90 text-blue-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate pr-2">{sec.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Desktop Sticky Sidebar (Visible and persistent on ≥ lg) ── */}
      <nav
        aria-label="Table of contents"
        className="hidden lg:block sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto pr-1"
      >
        <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xs space-y-3">
          <div className="pb-2.5 border-b border-slate-100">
            <span className="text-xs font-bold font-heading text-slate-900 block">
              Table of Contents
            </span>
          </div>

          <ul className="space-y-0.5 text-xs">
            {sections.map((sec) => {
              const isActive = activeId === sec.id;
              return (
                <li key={sec.id}>
                  <a
                    href={`#${sec.id}`}
                    onClick={(e) => handleScrollTo(e, sec.id)}
                    className={`block py-1.5 px-3 rounded-lg transition-all text-xs truncate cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden motion-reduce:transform-none ${
                      isActive
                        ? 'font-semibold text-blue-700 bg-blue-50/90'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                    title={sec.title}
                  >
                    <span className="truncate">{sec.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
};
