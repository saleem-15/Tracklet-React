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
  ChevronRight,
  Unlink
} from 'lucide-react';
import { Contact, ContactCategory, Application } from '../types';
import { 
  CONTACT_CATEGORIES,
  CONTACT_CATEGORY_STYLES, 
  CONTACT_AVATAR_COLORS, 
  STAGE_CONFIG_MAP, 
  getInitials 
} from '../lib/constants';
import { 
  getContactFollowUpHoursRemaining, 
  formatContactHoursLeft 
} from '../lib/contactUtils';
import { CustomSelectDropdown, SelectOption } from './CustomSelectDropdown';
import { ApplicationSearchPicker } from './ApplicationSearchPicker';
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

const categoryOptions: SelectOption<ContactCategory>[] = CONTACT_CATEGORIES.map((cat) => ({
  label: cat,
  value: cat,
}));

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

  // In-place edit form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editOrganization, setEditOrganization] = useState('');
  const [editCategory, setEditCategory] = useState<ContactCategory>('Other');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLinkedIn, setEditLinkedIn] = useState('');
  const [editNextFollowUpDate, setEditNextFollowUpDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSelectedAppIds, setEditSelectedAppIds] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Close drawer or cancel edit mode on Escape key
  useEscapeKey(() => {
    if (isEditing) {
      handleCancelEdit();
    } else {
      onClose();
    }
  }, Boolean(contact));

  useEffect(() => {
    if (contact) {
      setInlineNotes(contact.notes || '');
      setIsEditing(false);
      setFormError(null);
    }
  }, [contact?.id]);

  if (!contact) return null;

  const category = contact.category || 'Other';
  const categoryStyle = CONTACT_CATEGORY_STYLES[category] || CONTACT_CATEGORY_STYLES.Other;
  const colorIndex = (contact.id || contact.name)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % CONTACT_AVATAR_COLORS.length;
  const avatarColor = CONTACT_AVATAR_COLORS[colorIndex];

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

  const handleStartEdit = () => {
    setEditName(contact.name || '');
    setEditRole(contact.role || '');
    setEditOrganization(contact.organization || '');
    setEditCategory(contact.category || 'Other');
    setEditEmail(contact.email || '');
    setEditPhone(contact.phone || '');
    setEditLinkedIn(contact.linkedIn || '');
    setEditNextFollowUpDate(contact.nextFollowUpDate || '');
    setEditNotes(contact.notes || '');
    setEditSelectedAppIds(contact.applicationIds || []);
    setFormError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormError(null);
  };

  const handleToggleApplicationLink = (appId: string) => {
    setEditSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      setFormError('Contact name is required.');
      return;
    }

    setIsSavingEdit(true);
    setFormError(null);
    try {
      const updatedFields: Partial<Contact> = {
        name: editName.trim(),
        role: editRole.trim() || undefined,
        organization: editOrganization.trim() || undefined,
        category: editCategory,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        linkedIn: editLinkedIn.trim() || undefined,
        nextFollowUpDate: editNextFollowUpDate || undefined,
        notes: editNotes.trim() || undefined,
        applicationIds: editSelectedAppIds,
      };

      await onUpdateContact(contact.id, updatedFields);
      setInlineNotes(editNotes.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update contact:', err);
      setFormError('Failed to save contact. Please check your inputs.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleNavigateToApp = (appId: string) => {
    onSelectApplication(appId);
  };

  return (
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
                className={`w-11 h-11 rounded-2xl border-2 font-bold font-mono text-sm flex items-center justify-center shrink-0 shadow-xs ${avatarColor}`}
              >
                {getInitials(isEditing ? (editName || contact.name) : contact.name)}
              </div>
              <div className="min-w-0">
                {isEditing ? (
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-heading leading-tight">
                      Edit Contact
                    </h2>
                  </div>
                ) : (
                  <div>
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
                )}
              </div>
            </div>

            {/* Actions & Close */}
            <div className="flex items-center gap-1 shrink-0">
              {isEditing ? (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  title="Cancel editing"
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    title="Edit contact"
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isEditing ? (
            /* --- IN-PLACE EDIT MODE --- */
            <div className="space-y-3.5">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-8 pr-3 h-[38px] bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Category
                  </label>
                  <CustomSelectDropdown
                    value={editCategory}
                    onChange={(val) => setEditCategory(val as ContactCategory)}
                    options={categoryOptions}
                    size="md"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Role & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Role
                  </label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      placeholder="e.g. Recruiter"
                      className="w-full pl-8 pr-3 h-[38px] bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Company
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={editOrganization}
                      onChange={(e) => setEditOrganization(e.target.value)}
                      placeholder="e.g. Google"
                      className="w-full pl-8 pr-3 h-[38px] bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full pl-8 pr-3 h-[38px] bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-8 pr-3 h-[38px] bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* LinkedIn & Follow-up Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    LinkedIn
                  </label>
                  <div className="relative">
                    <Linkedin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="url"
                      value={editLinkedIn}
                      onChange={(e) => setEditLinkedIn(e.target.value)}
                      placeholder="linkedin.com/in/username"
                      className="w-full pl-8 pr-3 h-[38px] bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Follow-up Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={editNextFollowUpDate}
                      onChange={(e) => setEditNextFollowUpDate(e.target.value)}
                      className="w-full pl-8 pr-3 h-[38px] bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Linked Applications with Search Picker */}
              {applications.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Linked Applications {editSelectedAppIds.length > 0 && <span className="text-slate-400 font-normal">({editSelectedAppIds.length})</span>}
                  </label>
                  <ApplicationSearchPicker
                    applications={applications}
                    selectedAppIds={editSelectedAppIds}
                    onToggleApp={handleToggleApplicationLink}
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Notes
                </label>
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <RichTextEditor
                    value={editNotes}
                    onChange={(val) => setEditNotes(val)}
                    ariaLabel="Contact Notes"
                    minRows={4}
                    placeholder="Add notes..."
                  />
                </div>
              </div>
            </div>
          ) : (
            /* --- VIEW MODE --- */
            <>
              {/* Quick Contact Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 transition-colors group min-h-[40px]"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <Mail className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-mono text-slate-800 group-hover:text-blue-700 truncate">
                      {contact.email}
                    </span>
                  </a>
                ) : null}

                {contact.phone ? (
                  <div
                    onClick={handleCopyPhone}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-emerald-50 hover:border-emerald-200 transition-colors cursor-pointer group min-h-[40px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Phone className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-mono text-slate-800 group-hover:text-emerald-700 truncate">
                        {contact.phone}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold px-1.5 py-0.5 rounded bg-emerald-100/70">
                      {copiedPhone ? 'Copied' : 'Copy'}
                    </span>
                  </div>
                ) : null}

                {contact.linkedIn ? (
                  <a
                    href={contact.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 transition-colors group min-h-[40px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <Linkedin className="w-3 h-3" />
                      </div>
                      <span className="text-xs text-slate-800 group-hover:text-blue-700 truncate">
                        LinkedIn Profile
                      </span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </a>
                ) : null}
              </div>

              {/* Follow-up reminder */}
              <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Follow-up
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
                    className="bg-white text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 text-xs font-mono cursor-pointer"
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

              {/* Linked Applications */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-blue-500" />
                  Linked Applications ({linkedApps.length})
                </h3>

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
                                title="Unlink"
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
                    <div className="text-slate-400 text-xs text-center py-3">
                      No linked applications.
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Notes
                  </label>
                  {inlineNotes !== (contact.notes || '') && (
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
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
                    ariaLabel="Contact Notes"
                    minRows={5}
                    placeholder="Add notes..."
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer for Edit Mode */}
        {isEditing && (
          <div className="p-4 border-t border-slate-200/90 bg-white/95 backdrop-blur-xs flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSavingEdit}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[36px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[36px] disabled:opacity-50"
            >
              {isSavingEdit ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
