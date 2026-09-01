import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Building2, 
  Briefcase, 
  Mail, 
  Phone, 
  Linkedin, 
  Calendar, 
  Link2, 
  ExternalLink, 
  Pencil, 
  Trash2, 
  Clock, 
  Check, 
  Copy,
  ChevronRight,
  Unlink
} from 'lucide-react';
import { Contact, Application, ApplicationStatus } from '../types';
import { 
  CONTACT_CATEGORY_STYLES, 
  CONTACT_AVATAR_COLORS, 
  STAGE_CONFIG_MAP, 
  getInitials 
} from '../lib/constants';
import { 
  getContactFollowUpHoursRemaining, 
  formatContactHoursLeft 
} from '../lib/contactUtils';
import { LinkifiedText } from './LinkifiedText';
import { ContactModal } from './contacts/ContactModal';
import { RichTextEditor } from './editor';
import { useEscapeKey } from '../lib/useEscapeKey';

export interface ContactDetailPanelProps {
  contact: Contact | null;
  applications: Application[];
  onClose: () => void;
  onUpdateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onUnlinkFromApp?: (contactId: string, appId: string) => Promise<void>;
  onSelectApplication: (appId: string) => void;
}

export const ContactDetailPanel: React.FC<ContactDetailPanelProps> = ({
  contact,
  applications,
  onClose,
  onUpdateContact,
  onDeleteContact,
  onUnlinkFromApp,
  onSelectApplication,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [inlineNotes, setInlineNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Close drawer on Escape key when no child edit modal is active
  useEscapeKey(onClose, Boolean(contact) && !isEditing);

  useEffect(() => {
    if (contact) {
      setInlineNotes(contact.notes || '');
      setIsEditing(false);
    }
  }, [contact?.id]);

  if (!contact) return null;

  const category = contact.category || 'Other';
  const categoryStyle = CONTACT_CATEGORY_STYLES[category] || CONTACT_CATEGORY_STYLES.Other;
  const avatarColor = CONTACT_AVATAR_COLORS[0];

  // Resolve linked applications
  const linkedApps = (contact.applicationIds || [])
    .map((appId) => applications.find((a) => a.id === appId))
    .filter((app): app is Application => Boolean(app));

  const followUpHours = contact.nextFollowUpDate
    ? getContactFollowUpHoursRemaining(contact.nextFollowUpDate)
    : null;
  const isFollowUpDueSoon = followUpHours !== null && followUpHours <= 48 && followUpHours >= -120;
  const isFollowUpOverdue = followUpHours !== null && followUpHours < 0;

  const handleCopyPhone = () => {
    if (!contact.phone) return;
    navigator.clipboard.writeText(contact.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await onUpdateContact(contact.id, { notes: inlineNotes.trim() || undefined });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleNavigateToApp = (appId: string) => {
    // Open the application detail modal layered on top; contact drawer remains active underneath
    onSelectApplication(appId);
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Contact Profile - ${contact.name}`}
        className="fixed inset-0 z-[45] flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 select-none"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg h-full bg-white border-l border-slate-200/90 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250 select-text overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200/80 bg-slate-50/75 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl border-2 font-bold font-mono text-sm flex items-center justify-center shrink-0 shadow-xs ${avatarColor}`}
                >
                  {getInitials(contact.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 truncate font-heading leading-tight">
                      {contact.name}
                    </h2>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                    >
                      {category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate mt-0.5">
                    {contact.role && <span className="truncate">{contact.role}</span>}
                    {contact.role && contact.organization && <span>·</span>}
                    {contact.organization && (
                      <span className="font-semibold text-slate-800 truncate">
                        {contact.organization}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions & Close */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  title="Edit contact profile"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteContact(contact.id);
                    onClose();
                  }}
                  title="Delete contact"
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Communication Channels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {contact.email ? (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 transition-colors group min-h-[44px]"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold leading-none">
                      Email
                    </p>
                    <p className="text-xs font-mono text-slate-800 group-hover:text-blue-700 truncate mt-0.5">
                      {contact.email}
                    </p>
                  </div>
                </a>
              ) : null}

              {contact.phone ? (
                <div
                  onClick={handleCopyPhone}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-emerald-50 hover:border-emerald-200 transition-colors cursor-pointer group min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold leading-none">
                        Phone
                      </p>
                      <p className="text-xs font-mono text-slate-800 group-hover:text-emerald-700 truncate mt-0.5">
                        {contact.phone}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-[10px] font-mono text-emerald-700 font-semibold px-1.5 py-0.5 rounded bg-emerald-100/70"
                  >
                    {copiedPhone ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ) : null}

              {contact.linkedIn ? (
                <a
                  href={contact.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 transition-colors group min-h-[44px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Linkedin className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold leading-none">
                        LinkedIn
                      </p>
                      <p className="text-xs text-slate-800 group-hover:text-blue-700 truncate mt-0.5">
                        View Profile
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </a>
              ) : null}
            </div>

            {/* Follow-up reminder card */}
            <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Next Follow-up Reminder
                </span>
                {contact.nextFollowUpDate && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                      isFollowUpOverdue
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isFollowUpDueSoon
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {followUpHours !== null ? formatContactHoursLeft(followUpHours) : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={contact.nextFollowUpDate || ''}
                  onChange={(e) =>
                    onUpdateContact(contact.id, {
                      nextFollowUpDate: e.target.value || undefined,
                    })
                  }
                  className="bg-white text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 text-xs font-mono cursor-pointer"
                />
                {contact.nextFollowUpDate && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateContact(contact.id, { nextFollowUpDate: undefined })
                    }
                    className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Linked Applications (US3) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-blue-500" />
                  Linked Applications ({linkedApps.length})
                </h3>
              </div>

              <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                {linkedApps.length > 0 ? (
                  linkedApps.map((app) => {
                    const statusConfig =
                      STAGE_CONFIG_MAP[app.status] || STAGE_CONFIG_MAP.Applied;

                    return (
                      <div
                        key={app.id}
                        onClick={() => handleNavigateToApp(app.id)}
                        className="p-3 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {app.company}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                              <span>{statusConfig.label}</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {app.role} · {app.platform}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {onUnlinkFromApp && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnlinkFromApp(contact.id, app.id);
                              }}
                              title="Unlink from this application"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-slate-500 font-mono text-[11px] text-center py-4">
                    This contact is standalone and not linked to any job applications yet.
                  </div>
                )}
              </div>
            </div>

            {/* Notes & Meeting Context using shared RichTextEditor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  Notes &amp; Conversation Log
                </label>
                {inlineNotes !== (contact.notes || '') && (
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="text-[11px] font-mono text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                  >
                    {isSavingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <RichTextEditor
                  key={contact.id}
                  value={inlineNotes}
                  onChange={(val) => {
                    setInlineNotes(val);
                  }}
                  ariaLabel="Contact Conversation Notes"
                  minRows={6}
                  placeholder="Add meeting notes, discussion points, action items, referral updates... Type / for commands"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Contact Modal */}
      {isEditing && (
        <ContactModal
          isOpen={isEditing}
          editingContact={contact}
          applications={applications}
          onClose={() => setIsEditing(false)}
          onSave={async (updatedData) => {
            await onUpdateContact(contact.id, updatedData);
            setIsEditing(false);
          }}
        />
      )}
    </>
  );
};
