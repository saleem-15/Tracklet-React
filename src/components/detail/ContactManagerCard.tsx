import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Phone, 
  Linkedin, 
  Pencil, 
  ChevronDown, 
  ExternalLink, 
  Unlink, 
  X 
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Contact, ContactCategory } from '../../types';
import { 
  CONTACT_CATEGORIES, 
  CONTACT_AVATAR_COLORS, 
  CONTACT_CATEGORY_STYLES, 
  getInitials 
} from '../../lib/constants';
import { normalizeUrl } from '../../lib/linkUtils';
import { CustomSelectDropdown, SelectOption } from '../CustomSelectDropdown';
import { RichTextEditor } from '../editor';
import { FollowUpControl } from '../contacts/FollowUpControl';
import { FollowUpBadge } from '../contacts/FollowUpBadge';
import { ExpandableContentContainer } from '../ExpandableContentContainer';

export interface ContactManagerCardProps {
  contact: Contact;
  isExpanded: boolean;
  onToggleExpand: (contactId: string) => void;
  isEditing: boolean;
  onStartInlineEdit: (contact: Contact) => void;
  onCancelInlineEdit: () => void;
  onSaveInlineEdit: (contactId: string, updates: Partial<Contact>) => Promise<void>;
  onUnlinkContact: (contactId: string) => Promise<void>;
  onSelectContact?: (contactId: string) => void;
  onFollowUpContact?: (contact: Contact) => void;
  onEditContact?: (contact: Contact) => void;
  onUpdateContact?: (id: string, updates: Partial<Contact>) => Promise<void>;
}

const categoryOptions: SelectOption<ContactCategory>[] = CONTACT_CATEGORIES.map((cat) => ({
  label: cat,
  value: cat,
}));

export const ContactManagerCard: React.FC<ContactManagerCardProps> = ({
  contact,
  isExpanded,
  onToggleExpand,
  isEditing,
  onStartInlineEdit,
  onCancelInlineEdit,
  onSaveInlineEdit,
  onUnlinkContact,
  onSelectContact,
  onFollowUpContact,
  onEditContact,
  onUpdateContact,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Copy status
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // In-line edit form state
  const [editName, setEditName] = useState(contact.name || '');
  const [editRole, setEditRole] = useState(contact.role || '');
  const [editOrganization, setEditOrganization] = useState(contact.organization || '');
  const [editCategory, setEditCategory] = useState<ContactCategory>(contact.category || 'Other');
  const [editEmail, setEditEmail] = useState(contact.email || '');
  const [editPhone, setEditPhone] = useState(contact.phone || '');
  const [editLinkedIn, setEditLinkedIn] = useState(contact.linkedIn || '');
  const [editNextFollowUpDate, setEditNextFollowUpDate] = useState(contact.nextFollowUpDate || '');
  const [editNotes, setEditNotes] = useState(contact.notes || '');
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Sync edit form with contact when editing begins
  useEffect(() => {
    if (isEditing) {
      setEditName(contact.name || '');
      setEditRole(contact.role || '');
      setEditOrganization(contact.organization || '');
      setEditCategory(contact.category || 'Other');
      setEditEmail(contact.email || '');
      setEditPhone(contact.phone || '');
      setEditLinkedIn(contact.linkedIn || '');
      setEditNextFollowUpDate(contact.nextFollowUpDate || '');
      setEditNotes(contact.notes || '');
      setEditError(null);
    }
  }, [isEditing, contact]);

  // Timed reset for copied states
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (copiedPhone) {
      timer = setTimeout(() => setCopiedPhone(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [copiedPhone]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (copiedEmail) {
      timer = setTimeout(() => setCopiedEmail(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [copiedEmail]);

  const handleCopyPhone = (e: React.MouseEvent, phoneStr: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phoneStr);
    setCopiedPhone(true);
  };

  const handleCopyEmail = (e: React.MouseEvent, emailStr: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(emailStr);
    setCopiedEmail(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      setEditError('Contact name is required.');
      return;
    }

    if (!onUpdateContact) {
      onCancelInlineEdit();
      return;
    }

    setIsSavingInline(true);
    setEditError(null);
    try {
      await onSaveInlineEdit(contact.id, {
        name: editName.trim(),
        role: editRole.trim() || undefined,
        organization: editOrganization.trim() || undefined,
        category: editCategory,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        linkedIn: editLinkedIn.trim() || undefined,
        nextFollowUpDate: editNextFollowUpDate || undefined,
        notes: editNotes.trim() || undefined,
      });
      onCancelInlineEdit();
    } catch (err) {
      console.error('Failed to save inline contact edit:', err);
      setEditError('Failed to update contact.');
    } finally {
      setIsSavingInline(false);
    }
  };

  const colorIndex = (contact.id || contact.name)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % CONTACT_AVATAR_COLORS.length;
  const avatarColor = CONTACT_AVATAR_COLORS[colorIndex];
  const category = contact.category || 'Other';
  const categoryStyle = CONTACT_CATEGORY_STYLES[category] || CONTACT_CATEGORY_STYLES.Other;

  return (
    <div className="relative" data-testid={`contact-card-${contact.id}`}>
      {isEditing ? (
        /* --- INLINE MINI-EDIT FORM --- */
        <motion.div
          key="inline-edit"
          initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  height: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                  opacity: { duration: 0.18, ease: [0.2, 0, 0, 1] },
                }
          }
          style={{ overflow: 'hidden' }}
          className="p-3.5 bg-blue-50/25 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
            <span className="text-xs font-bold text-slate-900 font-heading">
              Edit {contact.name}
            </span>
            <button
              type="button"
              onClick={onCancelInlineEdit}
              aria-label="Cancel editing"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {editError && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-0.5">
              <label className="block text-[10px] font-semibold text-slate-600">Name *</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-2.5 h-[34px] bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-0.5">
              <label className="block text-[10px] font-semibold text-slate-600">Category</label>
              <CustomSelectDropdown
                value={editCategory}
                onChange={(val) => setEditCategory(val as ContactCategory)}
                options={categoryOptions}
                size="sm"
                className="w-full"
              />
            </div>

            <div className="space-y-0.5">
              <label className="block text-[10px] font-semibold text-slate-600">Role</label>
              <input
                type="text"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                placeholder="e.g. Recruiter"
                className="w-full px-2.5 h-[34px] bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-0.5">
              <label className="block text-[10px] font-semibold text-slate-600">Company</label>
              <input
                type="text"
                value={editOrganization}
                onChange={(e) => setEditOrganization(e.target.value)}
                placeholder="e.g. Google"
                className="w-full px-2.5 h-[34px] bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-0.5">
              <label className="block text-[10px] font-semibold text-slate-600">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="jane@company.com"
                className="w-full px-2.5 h-[34px] bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-0.5">
              <label className="block text-[10px] font-semibold text-slate-600">Phone</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-2.5 h-[34px] bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-0.5">
              <label className="block text-[10px] font-semibold text-slate-600">LinkedIn</label>
              <input
                type="url"
                value={editLinkedIn}
                onChange={(e) => setEditLinkedIn(e.target.value)}
                placeholder="linkedin.com/in/username"
                className="w-full px-2.5 h-[34px] bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-0.5">
              <label className="block text-[10px] font-semibold text-slate-600">Follow-up Date</label>
              <input
                type="date"
                value={editNextFollowUpDate}
                onChange={(e) => setEditNextFollowUpDate(e.target.value)}
                className="w-full px-2.5 h-[34px] bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Notes Markdown Editor */}
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-slate-600">Notes (Markdown)</label>
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-[border-color,box-shadow] duration-150">
              <RichTextEditor
                value={editNotes}
                onChange={(val) => setEditNotes(val)}
                ariaLabel="Contact Notes"
                minRows={4}
                placeholder="Add notes..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancelInlineEdit}
              disabled={isSavingInline}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSavingInline}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-[background-color,box-shadow] duration-150 cursor-pointer disabled:opacity-50"
            >
              {isSavingInline ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      ) : (
        /* --- CONTACT CARD VIEW --- */
        <div className="p-3 hover:bg-slate-50/60 transition-colors duration-150 group">
          {/* Contact Row Header with Interactive Toggle */}
          <div 
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            aria-controls={`contact-card-details-${contact.id}`}
            aria-label={`Toggle details for ${contact.name}`}
            onClick={() => onToggleExpand(contact.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleExpand(contact.id);
              }
            }}
            className="flex items-center justify-between gap-2 cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 ${avatarColor}`}
              >
                {getInitials(contact.name)}
              </div>
              <div
                className="min-w-0 select-text cursor-text"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                    {contact.name}
                  </p>
                  {/* Hide chip if category is Other or missing */}
                  {category && category !== 'Other' && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                    >
                      {category}
                    </span>
                  )}
                  {contact.nextFollowUpDate && (
                    <FollowUpBadge dueDateStr={contact.nextFollowUpDate} size="sm" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {contact.role || 'Contact'}
                  {contact.organization && ` · ${contact.organization}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {contact.email && onFollowUpContact && (
                <button
                  type="button"
                  onClick={() => onFollowUpContact(contact)}
                  title={`Draft follow-up to ${contact.name}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 shadow-2xs transition-colors cursor-pointer"
                >
                  <Mail className="w-3 h-3 text-blue-600" />
                  <span>Follow-up</span>
                </button>
              )}

              {contact.linkedIn && (
                <a
                  href={normalizeUrl(contact.linkedIn)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open LinkedIn Profile"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                </a>
              )}

              {(onEditContact || onUpdateContact) && (
                <button
                  type="button"
                  onClick={(e) => {
                    if (onEditContact) {
                      e.stopPropagation();
                      onEditContact(contact);
                    } else {
                      onStartInlineEdit(contact);
                    }
                  }}
                  title={onEditContact ? 'Edit contact' : 'Edit contact inline'}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              {onSelectContact && (
                <button
                  type="button"
                  onClick={() => onSelectContact(contact.id)}
                  title="Open full profile"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onUnlinkContact(contact.id)}
                title="Unlink from this application"
                aria-label="Unlink contact"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 min-h-[28px] min-w-[28px] flex items-center justify-center"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onToggleExpand(contact.id)}
                title={isExpanded ? 'Collapse details' : 'Expand details'}
                aria-expanded={isExpanded}
                aria-controls={`contact-card-details-${contact.id}`}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-240 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                    isExpanded ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Smooth, Hardware-Accelerated Card Resize Details Container */}
          <ExpandableContentContainer
            id={`contact-card-details-${contact.id}`}
            isExpanded={isExpanded}
            collapsedHeight={0}
            animateOpacity
          >
            <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  {/* Communication Chips with LinkedIn as Icon Button */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {contact.email && (
                      <div className="flex-1 min-w-[160px] flex items-center justify-between text-[11px] font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 group/email">
                        <a
                          href={`mailto:${contact.email}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 truncate"
                        >
                          <Mail className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </a>
                        <div className="flex items-center gap-1 shrink-0">
                          {onFollowUpContact && (
                            <button
                              type="button"
                              onClick={() => onFollowUpContact(contact)}
                              className="text-[10px] text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 cursor-pointer font-semibold"
                              title="Draft follow-up"
                            >
                              Follow-up
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleCopyEmail(e, contact.email!)}
                            className="opacity-0 group-hover/email:opacity-100 transition-opacity text-[10px] text-slate-600 hover:text-slate-800 px-1 py-0.5 rounded cursor-pointer font-semibold"
                          >
                            {copiedEmail ? (
                              <span className="text-emerald-600 font-bold">Copied</span>
                            ) : (
                              'Copy'
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {contact.phone && (
                      <div className="flex-1 min-w-[120px] flex items-center justify-between text-[11px] font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 group/phone">
                        <div className="flex items-center gap-1.5 text-slate-700 truncate">
                          <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate">{contact.phone}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopyPhone(e, contact.phone!)}
                          className="opacity-0 group-hover/phone:opacity-100 transition-opacity text-[10px] text-blue-600 hover:text-blue-700 px-1 py-0.5 rounded cursor-pointer font-semibold"
                        >
                          {copiedPhone ? (
                            <span className="text-emerald-600 font-bold">Copied</span>
                          ) : (
                            'Copy'
                          )}
                        </button>
                      </div>
                    )}

                    {contact.linkedIn && (
                      <a
                        href={normalizeUrl(contact.linkedIn)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open LinkedIn Profile"
                        className="flex items-center justify-center p-1.5 bg-slate-50 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-lg border border-slate-200/60 transition-colors h-[28px] w-[28px] shrink-0"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Follow-up Reminder */}
                  <FollowUpControl
                    dueDateStr={contact.nextFollowUpDate}
                    onUpdateFollowUp={(dateStr) =>
                      onUpdateContact &&
                      onUpdateContact(contact.id, { nextFollowUpDate: dateStr })
                    }
                    compact
                  />

                  {/* Notes preview */}
                  {contact.notes && (
                    <div className="bg-slate-50/80 border border-slate-200/60 rounded-lg p-2.5 text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold text-slate-500 text-[10px] uppercase font-mono block mb-0.5">Notes</span>
                      <p className="whitespace-pre-wrap">{contact.notes}</p>
                    </div>
                  )}
                </div>
          </ExpandableContentContainer>
        </div>
      )}
    </div>
  );
};
