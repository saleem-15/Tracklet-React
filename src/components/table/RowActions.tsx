import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Archive, XCircle, Link2, MoreHorizontal, RotateCcw } from 'lucide-react';
import type { Application, ApplicationStatus } from '../../types';
import { DESTRUCTIVE_ACTION_STYLE, STAGE_CONFIG_MAP } from '../../lib/constants';

export interface RowActionsProps {
  app: Application;
  onUpdateStatus: (id: string, newStatus: ApplicationStatus) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => void;
}

/** Next step in the active pipeline ladder (null once at Offer or terminal). */
const NEXT_ACTIVE_STATUS: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  Saved: 'Applied',
  Applied: 'Screening',
  Screening: 'Interview',
  Interview: 'Offer',
};

/**
 * RowActions
 *
 * Hover-revealed quick actions on the trailing edge of each table row:
 * advance-to-next-stage, and an overflow menu (archive / reject / copy job
 * link / reactivate). Keeps common triage one click away without opening the
 * detail panel. Invisible until the parent row's `group` hover/focus state.
 */
export const RowActions: React.FC<RowActionsProps> = ({ app, onUpdateStatus, onShowToast }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  const isTerminal = app.status === 'Rejected' || app.status === 'Archived';
  const nextStatus = NEXT_ACTIVE_STATUS[app.status];

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleUpdate = (newStatus: ApplicationStatus) => {
    setIsMenuOpen(false);
    onUpdateStatus(app.id, newStatus);
  };

  const handleCopyLink = async () => {
    setIsMenuOpen(false);
    if (!app.jobLink) return;
    try {
      await navigator.clipboard.writeText(app.jobLink);
      onShowToast?.('success', 'Link Copied', `Job posting link for ${app.company} copied.`);
    } catch {
      onShowToast?.('error', 'Copy Failed', 'Could not copy the link to clipboard.');
    }
  };

  const menuItemClass =
    'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer';

  return (
    <div
      className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
      onClick={stop}
    >
      {nextStatus && (
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            handleUpdate(nextStatus);
          }}
          aria-label={`Advance ${app.company} to ${nextStatus}`}
          title={`Advance to ${nextStatus}`}
          className={`p-1 rounded-md transition-colors duration-150 cursor-pointer ${STAGE_CONFIG_MAP[nextStatus].text} hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50`}
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          aria-label={`More actions for ${app.company}`}
          onClick={(e) => {
            stop(e);
            setIsMenuOpen((prev) => !prev);
          }}
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        {isMenuOpen && (
          <div
            role="menu"
            aria-label={`Actions for ${app.company}`}
            className="absolute right-0 top-full mt-1 w-44 rounded-[12px] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl z-40 p-1.5 space-y-0.5"
          >
            {isTerminal ? (
              <button type="button" role="menuitem" onClick={(e) => { stop(e); handleUpdate('Applied'); }} className={menuItemClass}>
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                Reactivate to Applied
              </button>
            ) : (
              <>
                <button type="button" role="menuitem" onClick={(e) => { stop(e); handleUpdate('Archived'); }} className={menuItemClass}>
                  <Archive className="w-3.5 h-3.5 text-slate-500" />
                  Archive
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => { stop(e); handleUpdate('Rejected'); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] text-xs font-medium ${DESTRUCTIVE_ACTION_STYLE.button} transition-colors duration-150 cursor-pointer`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Mark Rejected
                </button>
              </>
            )}
            {app.jobLink && (
              <button type="button" role="menuitem" onClick={(e) => { stop(e); handleCopyLink(); }} className={menuItemClass}>
                <Link2 className="w-3.5 h-3.5 text-slate-500" />
                Copy Job Link
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
