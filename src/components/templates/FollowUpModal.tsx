import React, { useState, useEffect, useMemo } from 'react';
import { X, Mail, Copy, Check, ExternalLink, Sliders } from 'lucide-react';
import { Application, Contact, FollowUpTemplate } from '../../types';
import { interpolateTemplate, getSalutationName, encodeMailtoUrl } from '../../lib/templateUtils';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { TemplateManagerModal } from './TemplateManagerModal';
import { FollowUpTemplateBar } from './FollowUpTemplateBar';
import { FollowUpRecipientSelector, RecipientOption } from './FollowUpRecipientSelector';
import { FollowUpComposer } from './FollowUpComposer';

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

  // Derive recipient options from linked contacts and app contactEmail
  const recipientOptions = useMemo<RecipientOption[]>(() => {
    const options: RecipientOption[] = [];
    const linkedIds = new Set(app.contactIds || []);
    
    allContacts.forEach((c) => {
      if (linkedIds.has(c.id) && c.email) {
        options.push({ id: c.id, name: c.name, email: c.email, role: c.role });
      }
    });

    (app.contacts || []).forEach((c) => {
      if (c.email && !options.some((o) => o.email === c.email)) {
        options.push({ id: c.id, name: c.name, email: c.email, role: c.role });
      }
    });

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

  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [addReminder, setAddReminder] = useState(true);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Initialize recipient
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

  // Set default template
  useEffect(() => {
    if (templates.length > 0 && (!selectedTemplateId || !templates.some((t) => t.id === selectedTemplateId))) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

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
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      onShowToast?.('error', 'Failed to copy', 'Could not access clipboard to copy email text.');
      return;
    }

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
        aria-label="Send Follow-up Email"
        className="w-full max-w-2xl h-[85vh] max-h-[700px] bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200/60 text-blue-600 shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight shrink-0">
                Follow-up Draft
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 truncate">
                {app.company} • {app.role}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Customize templates"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Templates</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Area */}
        <div className="flex-1 flex flex-col p-5 space-y-3.5 overflow-hidden min-h-0">
          {/* 1-Click Segmented Template Bar */}
          <FollowUpTemplateBar
            templates={templates}
            activeTemplateId={selectedTemplateId}
            onSelectTemplate={(id) => {
              setSelectedTemplateId(id);
              setIsModified(false);
            }}
          />

          {/* Recipient Line */}
          <FollowUpRecipientSelector
            recipientOptions={recipientOptions}
            selectedRecipientId={selectedRecipientId}
            onSelectRecipientId={setSelectedRecipientId}
            customName={customName}
            setCustomName={setCustomName}
            customEmail={customEmail}
            setCustomEmail={setCustomEmail}
          />

          {/* Email Composer: Subject + Full-Height Spacious Body */}
          <FollowUpComposer
            subject={currentSubject}
            body={currentBody}
            isModified={isModified}
            onSubjectChange={(val) => {
              setEditedSubject(val);
              setIsModified(true);
            }}
            onBodyChange={(val) => {
              setEditedBody(val);
              setIsModified(true);
            }}
            onReset={() => {
              setEditedSubject(interpolatedValues.subject);
              setEditedBody(interpolatedValues.body);
              setIsModified(false);
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/80 bg-slate-50/60 shrink-0">
          {/* Subtle Inline Reminder Checkbox */}
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addReminder}
              onChange={(e) => setAddReminder(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="font-medium text-slate-800">Add 5-day reminder task</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenMailto}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Mail</span>
            </button>
          </div>
        </div>

        {/* Nested Template Manager Modal */}
        {isManageModalOpen && (
          <TemplateManagerModal
            isOpen={isManageModalOpen}
            templates={templates}
            onSaveTemplate={onSaveTemplate}
            onDeleteTemplate={onDeleteTemplate}
            onResetDefaults={onResetDefaults}
            onShowToast={onShowToast}
            onClose={() => setIsManageModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
