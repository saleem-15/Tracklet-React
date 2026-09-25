import React from 'react';
import { X, Sliders } from 'lucide-react';
import { FollowUpTemplate } from '../../types';
import { TemplateManagerSection } from './TemplateManagerSection';
import { useEscapeKey } from '../../lib/useEscapeKey';

export interface TemplateManagerModalProps {
  isOpen: boolean;
  templates: FollowUpTemplate[];
  onSaveTemplate: (template: Omit<FollowUpTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  onClose: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onResetDefaults,
  onClose,
  onShowToast,
}) => {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage Follow-Up Templates"
        className="w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Template Library
              </h2>
              <p className="text-xs text-slate-500">
                Manage and customize your follow-up templates library.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <TemplateManagerSection
            templates={templates}
            onSaveTemplate={onSaveTemplate}
            onDeleteTemplate={onDeleteTemplate}
            onResetDefaults={onResetDefaults}
            onShowToast={onShowToast}
            compact={true}
          />
        </div>
      </div>
    </div>
  );
};
