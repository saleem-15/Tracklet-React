import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, ExternalLink, Archive, Trash2 } from 'lucide-react';
import { Application, ApplicationStatus } from '../../types';
import { dropdownVariants } from '../../lib/motion';

export interface PipelineCardContextMenuProps {
  app: Application;
  isOpen?: boolean;
  onToggle?: (e: React.MouseEvent) => void;
  onClose?: () => void;
  onUpdateStatus?: (id: string, newStatus: ApplicationStatus) => void;
  onArchiveApp?: (id: string) => void;
  onDeleteApp?: (id: string) => void;
}

export const PipelineCardContextMenu: React.FC<PipelineCardContextMenuProps> = ({
  app,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  onClose: controlledOnClose,
  onUpdateStatus,
  onArchiveApp,
  onDeleteApp,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const menuRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isControlled) {
      controlledOnToggle?.(e);
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('pointerdown', handleClickOutside, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('pointerdown', handleClickOutside, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]);

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClose();
    if (onArchiveApp) {
      onArchiveApp(app.id);
    } else {
      onUpdateStatus?.(app.id, 'Archived');
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClose();
    onDeleteApp?.(app.id);
  };

  return (
    <div
      ref={menuRef}
      className={`card-menu-container relative shrink-0 ${isOpen ? 'z-40' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Actions for ${app.company}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Options"
        className={`w-6 h-6 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-opacity transition-transform duration-150 ease-out cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:opacity-100 focus-visible:scale-100 focus-visible:pointer-events-auto ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto bg-slate-100 text-slate-800'
            : 'opacity-100 md:opacity-0 md:scale-95 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
        }`}
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            aria-label="Application options"
            variants={dropdownVariants}
            initial="closed"
            animate="open"
            exit="closed"
            style={{ transformOrigin: 'top right' }}
            className="card-context-menu absolute right-0 mt-1.5 w-44 bg-white border border-slate-200/90 rounded-[12px] shadow-xl p-1.5 z-50 text-xs text-start space-y-0.5"
          >
            {/* External Job Posting Link */}
            {app.jobLink && (
              <a
                href={app.jobLink}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-[8px] hover:bg-slate-100/80 text-slate-700 flex items-center justify-between cursor-pointer transition-colors duration-150 font-medium"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>View Job Posting</span>
                </span>
              </a>
            )}

            {/* Archive Action */}
            <button
              type="button"
              role="menuitem"
              onClick={handleArchive}
              className="w-full text-left px-2.5 py-1.5 rounded-[8px] hover:bg-slate-100/80 text-slate-700 flex items-center gap-2 cursor-pointer transition-colors duration-150 font-medium"
            >
              <Archive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Archive</span>
            </button>

            {/* Delete Action */}
            {onDeleteApp && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDelete}
                  className="w-full text-left px-2.5 py-1.5 rounded-[8px] hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer transition-colors duration-150 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
