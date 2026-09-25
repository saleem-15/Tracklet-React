import React, { useState, useRef } from 'react';
import { X, Sparkles, Save, Tag } from 'lucide-react';
import { FollowUpTemplate, FollowUpCategory } from '../../types';
import { FOLLOWUP_CATEGORIES } from '../../lib/constants';
import { TEMPLATE_VARIABLES } from '../../lib/templateUtils';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { CustomSelectDropdown } from '../CustomSelectDropdown';

export interface TemplateEditorModalProps {
  isOpen: boolean;
  template?: FollowUpTemplate | null;
  onSave: (savedTemplate: Omit<FollowUpTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onClose: () => void;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  template,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(template?.title || '');
  const [category, setCategory] = useState<FollowUpCategory>(template?.category || 'Custom');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [isSaving, setIsSaving] = useState(false);
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body');

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const handleInsertVariable = (token: string) => {
    if (activeField === 'subject' && subjectInputRef.current) {
      const input = subjectInputRef.current;
      const start = input.selectionStart ?? subject.length;
      const end = input.selectionEnd ?? subject.length;
      const updated = subject.substring(0, start) + token + subject.substring(end);
      setSubject(updated);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    } else if (bodyTextareaRef.current) {
      const textarea = bodyTextareaRef.current;
      const start = textarea.selectionStart ?? body.length;
      const end = textarea.selectionEnd ?? body.length;
      const updated = body.substring(0, start) + token + body.substring(end);
      setBody(updated);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !body.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        id: template?.id,
        title: title.trim(),
        category,
        subject: subject.trim(),
        body: body.trim(),
        isBuiltIn: template?.isBuiltIn ?? false,
        order: template?.order,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={template ? 'Edit Follow-Up Template' : 'New Follow-Up Template'}
        className="w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {template ? 'Edit Follow-Up Template' : 'Create Follow-Up Template'}
              </h2>
              <p className="text-xs text-slate-500">
                Customize reusable outreach and check-in templates with dynamic tokens.
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="template-title" className="block text-xs font-semibold text-slate-700">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="template-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 1-Week Status Inquiry"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Category
              </label>
              <CustomSelectDropdown<FollowUpCategory>
                value={category}
                onChange={setCategory}
                options={FOLLOWUP_CATEGORIES.map((cat) => ({
                  value: cat,
                  label: cat,
                }))}
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label htmlFor="template-subject" className="block text-xs font-semibold text-slate-700">
              Email Subject <span className="text-rose-500">*</span>
            </label>
            <input
              ref={subjectInputRef}
              id="template-subject"
              type="text"
              required
              value={subject}
              onFocus={() => setActiveField('subject')}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Following up on {role} application - {company}"
              className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 transition-colors"
            />
          </div>

          {/* Variable Insertion Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Tag className="w-3 h-3 text-blue-600" />
              Click to insert into {activeField}:
            </span>
            <div className="flex flex-wrap gap-1">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => handleInsertVariable(v.tag)}
                  title={v.description}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/60 transition-all cursor-pointer"
                >
                  <span className="text-blue-600 font-bold">+</span>
                  <span>{v.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label htmlFor="template-body" className="block text-xs font-semibold text-slate-700">
              Email Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              ref={bodyTextareaRef}
              id="template-body"
              rows={9}
              required
              value={body}
              onFocus={() => setActiveField('body')}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {contactName},&#10;&#10;I recently applied for the {role} position at {company}..."
              className="w-full px-3.5 py-2.5 text-sm font-sans bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 resize-y leading-relaxed transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !subject.trim() || !body.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
