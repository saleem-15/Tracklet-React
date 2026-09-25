import React, { useState } from 'react';
import { 
  Plus, 
  RotateCcw, 
  Pencil, 
  Trash2, 
  FileText, 
  Sparkles, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { FollowUpTemplate, FollowUpCategory } from '../../types';
import { FOLLOWUP_CATEGORIES, DESTRUCTIVE_ACTION_STYLE } from '../../lib/constants';
import { TemplateEditorModal } from './TemplateEditorModal';
import { useEscapeKey } from '../../lib/useEscapeKey';

export interface TemplateManagerSectionProps {
  templates: FollowUpTemplate[];
  onSaveTemplate: (template: Omit<FollowUpTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  compact?: boolean;
}

const CATEGORY_BADGE_STYLES: Record<FollowUpCategory, string> = {
  'Post-Application': 'bg-blue-50 text-blue-700 border-blue-200/80',
  'Interview': 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  'Offer': 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  'Networking': 'bg-amber-50 text-amber-700 border-amber-200/80',
  'Custom': 'bg-slate-100 text-slate-700 border-slate-200/80',
};

export const TemplateManagerSection: React.FC<TemplateManagerSectionProps> = ({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onResetDefaults,
  onShowToast,
  compact = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingTemplate, setEditingTemplate] = useState<FollowUpTemplate | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEscapeKey(() => setShowResetConfirm(false), showResetConfirm);

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === 'All') return true;
    return t.category === selectedCategory;
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (template: FollowUpTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDelete = async (template: FollowUpTemplate) => {
    try {
      await onDeleteTemplate(template.id);
      onShowToast?.('info', 'Template deleted', `"${template.title}" was removed.`);
    } catch {
      onShowToast?.('error', 'Delete failed', 'Could not delete template. Please try again.');
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await onResetDefaults();
      setShowResetConfirm(false);
      onShowToast?.('success', 'Templates reset', 'Restored the 4 default follow-up templates.');
    } catch {
      onShowToast?.('error', 'Reset failed', 'Could not reset templates. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={`space-y-4 ${compact ? '' : 'p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs'}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Follow-Up Templates
            </h3>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {templates.length}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Standardize your recruiter check-ins, interview thank-yous, and status inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Restore original built-in templates"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {['All', ...FOLLOWUP_CATEGORIES].map((cat) => {
          const isActive = selectedCategory === cat;
          const count = cat === 'All' 
            ? templates.length 
            : templates.filter((t) => t.category === cat).length;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
              }`}
            >
              <span>{cat}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Template Grid / List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No templates found</p>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Create a custom template or switch to another category.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredTemplates.map((template) => {
            const badgeStyle = CATEGORY_BADGE_STYLES[template.category] || 'bg-slate-100 text-slate-700 border-slate-200';
            return (
              <div
                key={template.id}
                className="group relative flex flex-col justify-between p-4 bg-white hover:bg-slate-50/70 border border-slate-200/80 hover:border-blue-200 rounded-xl transition-all shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {template.title}
                        </h4>
                        {template.isBuiltIn && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/60">
                            Default
                          </span>
                        )}
                      </div>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                        {template.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(template)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit template"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(template)}
                        className={`p-1.5 rounded-lg cursor-pointer ${DESTRUCTIVE_ACTION_STYLE.button}`}
                        title="Delete template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <p className="text-xs font-mono font-medium text-slate-700 truncate">
                      <span className="text-slate-400 font-sans mr-1">Subject:</span>
                      {template.subject}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {template.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Editor Modal */}
      {isEditorOpen && (
        <TemplateEditorModal
          isOpen={isEditorOpen}
          template={editingTemplate}
          onSave={async (saved) => {
            await onSaveTemplate(saved);
            onShowToast?.('success', 'Template saved', `"${saved.title}" is ready to use.`);
          }}
          onClose={() => setIsEditorOpen(false)}
        />
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm Reset Templates"
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Reset Templates to Defaults?</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will restore the 4 original built-in templates. Any custom modifications will be replaced.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isResetting ? 'Resetting...' : 'Reset to Defaults'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
