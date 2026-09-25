import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  Calendar, 
  Sliders, 
  User, 
  Sparkles, 
  AtSign, 
  RotateCcw 
} from 'lucide-react';
import { Application, Contact, FollowUpTemplate, FollowUpCategory } from '../../types';
import { FOLLOWUP_CATEGORIES } from '../../lib/constants';
import { interpolateTemplate, getSalutationName, encodeMailtoUrl } from '../../lib/templateUtils';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { TemplateManagerModal } from './TemplateManagerModal';

export interface FollowUpTriggerDetails {
  recipientName: string;
  recipientEmail: string;
  template: FollowUpTemplate;
  addReminder: boolean;
  interpolatedSubject: string;
  interpolatedBody: string;
}

export interface FollowUpModalProps {
  isOpen: boolean;
  app: Application;
  allContacts?: Contact[];
  initialContactId?: string;
  initialContactEmail?: string;
  templates: FollowUpTemplate[];
  onSaveTemplate: (template: Omit<FollowUpTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  onFollowUpTriggered?: (details: FollowUpTriggerDetails) => Promise<void> | void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  onClose: () => void;
}

interface RecipientOption {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  app,
  allContacts = [],
  initialContactId,
  initialContactEmail,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onResetDefaults,
  onFollowUpTriggered,
  onShowToast,
  onClose,
}) => {
  useEscapeKey(onClose, isOpen);

  // Recipient options derived from linked contacts and app.contactEmail
  const recipientOptions = useMemo<RecipientOption[]>(() => {
    const options: RecipientOption[] = [];
    const linkedIds = new Set(app.contactIds || []);
    
    // Check allContacts matching linkedIds
    allContacts.forEach((c) => {
      if (linkedIds.has(c.id) && c.email) {
        options.push({
          id: c.id,
          name: c.name,
          email: c.email,
          role: c.role,
        });
      }
    });

    // Check legacy contacts on app
    (app.contacts || []).forEach((c) => {
      if (c.email && !options.some((o) => o.email === c.email)) {
        options.push({
          id: c.id,
          name: c.name,
          email: c.email,
          role: c.role,
        });
      }
    });

    // If app.contactEmail is set and not already in options
    if (app.contactEmail && !options.some((o) => o.email === app.contactEmail)) {
      options.push({
        id: 'app-contact-email',
        name: getSalutationName(''),
        email: app.contactEmail,
        role: 'Recruiter',
      });
    }

    return options;
  }, [app, allContacts]);

  // Active recipient state
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');

  // Active category & template
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Editable subject & body
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isModified, setIsModified] = useState(false);

  // 5-day reminder checkbox
  const [addReminder, setAddReminder] = useState(true);

  // Manage templates modal state
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Initialize recipient when modal opens or props change
  useEffect(() => {
    if (!isOpen) return;

    if (initialContactId) {
      const match = recipientOptions.find((r) => r.id === initialContactId);
      if (match) {
        setSelectedRecipientId(match.id);
        return;
      }
    }

    if (initialContactEmail) {
      const match = recipientOptions.find((r) => r.email === initialContactEmail);
      if (match) {
        setSelectedRecipientId(match.id);
        return;
      } else {
        setSelectedRecipientId('custom');
        setCustomEmail(initialContactEmail);
        return;
      }
    }

    if (recipientOptions.length > 0) {
      setSelectedRecipientId(recipientOptions[0].id);
    } else {
      setSelectedRecipientId('custom');
      setCustomEmail(app.contactEmail || '');
    }
  }, [isOpen, initialContactId, initialContactEmail, recipientOptions, app.contactEmail]);

  // Filter templates
  const availableTemplates = useMemo(() => {
    if (selectedCategory === 'All') return templates;
    return templates.filter((t) => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  // Set default template
  useEffect(() => {
    if (templates.length > 0 && (!selectedTemplateId || !templates.some((t) => t.id === selectedTemplateId))) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  // Active recipient details
  const activeRecipient = useMemo(() => {
    if (selectedRecipientId === 'custom') {
      return {
        name: customName.trim() || getSalutationName(''),
        email: customEmail.trim(),
      };
    }
    const found = recipientOptions.find((r) => r.id === selectedRecipientId);
    return {
      name: found?.name || getSalutationName(''),
      email: found?.email || '',
    };
  }, [selectedRecipientId, recipientOptions, customName, customEmail]);

  // Dynamic interpolation
  const interpolatedValues = useMemo(() => {
    if (!activeTemplate) return { subject: '', body: '' };
    const context = {
      company: app.company,
      role: app.role,
      contactName: activeRecipient.name,
      dateApplied: app.dateApplied,
    };
    return {
      subject: interpolateTemplate(activeTemplate.subject, context),
      body: interpolateTemplate(activeTemplate.body, context),
    };
  }, [activeTemplate, app.company, app.role, app.dateApplied, activeRecipient.name]);

  // Keep edited content in sync unless customized
  useEffect(() => {
    setEditedSubject(interpolatedValues.subject);
    setEditedBody(interpolatedValues.body);
    setIsModified(false);
  }, [interpolatedValues.subject, interpolatedValues.body]);

  if (!isOpen) return null;

  const currentSubject = isModified ? editedSubject : interpolatedValues.subject;
  const currentBody = isModified ? editedBody : interpolatedValues.body;

  const handleCopy = async () => {
    const fullText = `Subject: ${currentSubject}\n\n${currentBody}`;
    await navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);

    onShowToast?.('success', 'Email text copied', 'Subject and body copied to clipboard.');

    if (onFollowUpTriggered && activeTemplate) {
      await onFollowUpTriggered({
        recipientName: activeRecipient.name,
        recipientEmail: activeRecipient.email,
        template: activeTemplate,
        addReminder,
        interpolatedSubject: currentSubject,
        interpolatedBody: currentBody,
      });
    }
  };

  const handleOpenMailto = async () => {
    const mailtoUrl = encodeMailtoUrl(activeRecipient.email, currentSubject, currentBody);
    window.open(mailtoUrl, '_blank', 'noopener,noreferrer');

    onShowToast?.('success', 'Email client opened', `Drafted follow-up to ${activeRecipient.email || 'recruiter'}.`);

    if (onFollowUpTriggered && activeTemplate) {
      await onFollowUpTriggered({
        recipientName: activeRecipient.name,
        recipientEmail: activeRecipient.email,
        template: activeTemplate,
        addReminder,
        interpolatedSubject: currentSubject,
        interpolatedBody: currentBody,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Send Recruiter Follow-Up"
        className="w-full max-w-3xl max-h-[92vh] bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Follow-Up Engine
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  {app.company} • {app.role}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                1-click personalized outreach with automatic timeline touchpoint & reminder task.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Manage and customize templates"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Templates</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Recipient Picker */}
          <div className="space-y-1.5 bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Select Recipient
              </label>
              {recipientOptions.length > 0 && (
                <span className="text-[11px] text-slate-500">
                  {recipientOptions.length} contact{recipientOptions.length > 1 ? 's' : ''} available
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {recipientOptions.map((rec) => {
                const isSelected = selectedRecipientId === rec.id;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => setSelectedRecipientId(rec.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-medium'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <AtSign className={`w-3 h-3 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`} />
                    <span>{rec.name}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      ({rec.email})
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelectedRecipientId('custom')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                  selectedRecipientId === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-medium'
                    : 'bg-white text-slate-600 border-dashed border-slate-300 hover:border-blue-400'
                }`}
              >
                <span>+ Custom Recipient</span>
              </button>
            </div>

            {selectedRecipientId === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 mt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
                <div>
                  <label htmlFor="custom-recipient-name" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Recipient Name
                  </label>
                  <input
                    id="custom-recipient-name"
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Karla Lindqvist"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="custom-recipient-email" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Recipient Email
                  </label>
                  <input
                    id="custom-recipient-email"
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="e.g. karla@company.com"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category & Template Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Select Template
              </label>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {['All', ...FOLLOWUP_CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {availableTemplates.map((tpl) => {
                const isSelected = activeTemplate?.id === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      setIsModified(false);
                    }}
                    className={`px-3 py-2 text-left rounded-xl border transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-2xs ring-1 ring-blue-400/50'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold truncate">{tpl.title}</span>
                    <span className="text-[10px] text-slate-500">{tpl.category}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interpolated Live Preview & Quick Edit */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="followup-subject" className="text-xs font-semibold text-slate-700">
                  Subject Line
                </label>
                {isModified && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditedSubject(interpolatedValues.subject);
                      setEditedBody(interpolatedValues.body);
                      setIsModified(false);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to template original</span>
                  </button>
                )}
              </div>
              <input
                id="followup-subject"
                type="text"
                value={currentSubject}
                onChange={(e) => {
                  setEditedSubject(e.target.value);
                  setIsModified(true);
                }}
                className="w-full px-3.5 py-2 text-xs font-mono font-medium bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="followup-body" className="text-xs font-semibold text-slate-700">
                  Email Message Body
                </label>
                <span className="text-[11px] text-slate-500">Live preview (editable)</span>
              </div>
              <textarea
                id="followup-body"
                rows={7}
                value={currentBody}
                onChange={(e) => {
                  setEditedBody(e.target.value);
                  setIsModified(true);
                }}
                className="w-full px-3.5 py-2.5 text-xs font-sans bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* 5-Day Reminder Checkbox */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
            <input
              id="add-followup-reminder"
              type="checkbox"
              checked={addReminder}
              onChange={(e) => setAddReminder(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="add-followup-reminder" className="text-xs text-slate-700 cursor-pointer select-none">
              <span className="font-semibold text-slate-900">Add 5-day reminder task:</span>{' '}
              <span className="text-slate-600">
                "Check follow-up with {activeRecipient.name} ({app.company})"
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenMailto}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Mail</span>
            </button>
          </div>
        </div>
      </div>

      {/* Template Manager Sub-Modal */}
      {isManageModalOpen && (
        <TemplateManagerModal
          isOpen={isManageModalOpen}
          templates={templates}
          onSaveTemplate={onSaveTemplate}
          onDeleteTemplate={onDeleteTemplate}
          onResetDefaults={onResetDefaults}
          onClose={() => setIsManageModalOpen(false)}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
