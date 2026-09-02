import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Unlink, 
  Mail, 
  Phone, 
  Linkedin, 
  Pencil, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Clock, 
  X 
} from 'lucide-react';
import { Contact, ContactCategory } from '../../types';
import { 
  CONTACT_CATEGORIES, 
  CONTACT_AVATAR_COLORS, 
  CONTACT_CATEGORY_STYLES, 
  getInitials 
} from '../../lib/constants';
import { normalizeUrl } from '../../lib/linkUtils';
import { ContactSearchPicker } from '../ContactSearchPicker';
import { CustomSelectDropdown, SelectOption } from '../CustomSelectDropdown';
import { RichTextEditor } from '../editor';
import { FollowUpControl } from '../contacts/FollowUpControl';
import { FollowUpBadge } from '../contacts/FollowUpBadge';

export interface ContactManagerSectionProps {
  allContacts?: Contact[];
  linkedContactIds?: string[];
  legacyContacts?: Contact[];
  onLinkContact: (contactId: string) => Promise<void>;
  onUnlinkContact: (contactId: string) => Promise<void>;
  onCreateAndLinkContact: (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateContact?: (id: string, updates: Partial<Contact>) => Promise<void>;
  onEditContact?: (contact: Contact) => void;
  onSelectContact?: (contactId: string) => void;
}

const categoryOptions: SelectOption<ContactCategory>[] = CONTACT_CATEGORIES.map((cat) => ({
  label: cat,
  value: cat,
}));

export const ContactManagerSection: React.FC<ContactManagerSectionProps> = ({
  allContacts = [],
  linkedContactIds = [],
  legacyContacts = [],
  onLinkContact,
  onUnlinkContact,
  onCreateAndLinkContact,
  onUpdateContact,
  onEditContact,
  onSelectContact,
}) => {
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [expandedContactIds, setExpandedContactIds] = useState<string[]>([]);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);

  // In-line edit form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editOrganization, setEditOrganization] = useState('');
  const [editCategory, setEditCategory] = useState<ContactCategory>('Other');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLinkedIn, setEditLinkedIn] = useState('');
  const [editNextFollowUpDate, setEditNextFollowUpDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Resolve linked contacts (combining contactIds lookup with any un-migrated legacy embedded contacts)
  const linkedContacts = useMemo(() => {
    const fromIds: Contact[] = linkedContactIds
      .map((id) => allContacts.find((c) => c.id === id))
      .filter((c): c is Contact => Boolean(c));

    const existingIds = new Set(fromIds.map((c) => c.id));
    const extraLegacy = legacyContacts.filter((c) => !existingIds.has(c.id));

    return [...fromIds, ...extraLegacy];
  }, [allContacts, linkedContactIds, legacyContacts]);

  const handleCopyPhone = (e: React.MouseEvent, phoneStr: string, contactId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phoneStr);
    setCopiedPhoneId(contactId);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const handleCopyEmail = (e: React.MouseEvent, emailStr: string, contactId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(emailStr);
    setCopiedEmailId(contactId);
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  const handleSelectToLink = async (contact: Contact) => {
    await onLinkContact(contact.id);
    setShowLinkPicker(false);
  };

  const handleStartInlineEdit = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
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
    setEditingContactId(contact.id);
    // Ensure this contact is in expanded list
    setExpandedContactIds((prev) => (prev.includes(contact.id) ? prev : [...prev, contact.id]));
  };

  const handleCancelInlineEdit = () => {
    setEditingContactId(null);
    setEditError(null);
  };

  const handleSaveInlineEdit = async (contactId: string) => {
    if (!editName.trim()) {
      setEditError('Contact name is required.');
      return;
    }

    if (!onUpdateContact) {
      setEditingContactId(null);
      return;
    }

    setIsSavingInline(true);
    setEditError(null);
    try {
      await onUpdateContact(contactId, {
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
      setEditingContactId(null);
    } catch (err) {
      console.error('Failed to save inline contact edit:', err);
      setEditError('Failed to update contact.');
    } finally {
      setIsSavingInline(false);
    }
  };

  const toggleExpand = (contactId: string) => {
    if (editingContactId === contactId) return;
    setExpandedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-500" />
          Contacts
        </h3>

        <button
          type="button"
          onClick={() => setShowLinkPicker(!showLinkPicker)}
          className="flex items-center gap-1 text-[11px] font-mono font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200/60 cursor-pointer transition-colors"
        >
          {showLinkPicker ? (
            'Close'
          ) : (
            <>
              <UserPlus className="w-3 h-3" />
              <span>Link Contact</span>
            </>
          )}
        </button>
      </div>

      {/* Link Picker Combobox */}
      {showLinkPicker && (
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 shadow-2xs">
          <ContactSearchPicker
            contacts={allContacts}
            linkedContactIds={linkedContacts.map((c) => c.id)}
            onSelectContact={handleSelectToLink}
            onCreateAndLink={async (data) => {
              await onCreateAndLinkContact(data);
              setShowLinkPicker(false);
            }}
            onCancel={() => setShowLinkPicker(false)}
          />
        </div>
      )}

      {/* Contacts List */}
      <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
        {linkedContacts.length > 0 ? (
          linkedContacts.map((contact) => {
            const colorIndex = (contact.id || contact.name)
              .split('')
              .reduce((acc, char) => acc + char.charCodeAt(0), 0) % CONTACT_AVATAR_COLORS.length;
            const avatarColor = CONTACT_AVATAR_COLORS[colorIndex];
            const category = contact.category || 'Other';
            const categoryStyle = CONTACT_CATEGORY_STYLES[category] || CONTACT_CATEGORY_STYLES.Other;
            const isExpanded = expandedContactIds.includes(contact.id);
            const isEditingThis = editingContactId === contact.id;

            if (isEditingThis) {
              /* --- INLINE MINI-EDIT FORM --- */
              return (
                <div key={contact.id} className="p-3.5 bg-blue-50/25 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                    <span className="text-xs font-bold text-slate-900 font-heading">
                      Edit {contact.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelInlineEdit}
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

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelInlineEdit}
                      disabled={isSavingInline}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveInlineEdit(contact.id)}
                      disabled={isSavingInline}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSavingInline ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={contact.id}
                className="p-3 hover:bg-slate-50/60 transition-colors group"
              >
                {/* Contact Row Header */}
                <div 
                  className="flex items-center justify-between gap-2 cursor-pointer"
                  onClick={() => toggleExpand(contact.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 ${avatarColor}`}
                    >
                      {getInitials(contact.name)}
                    </div>
                    <div className="min-w-0">
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
                            handleStartInlineEdit(e, contact);
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
                      onClick={() => toggleExpand(contact.id)}
                      title={isExpanded ? 'Collapse' : 'Expand details'}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details View */}
                {isExpanded && (
                  <div className="mt-2.5 space-y-2 border-t border-slate-100 pt-2.5 animate-in fade-in duration-150">
                    {/* Communication Chips with LinkedIn as Icon Button */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {contact.email && (
                        <div className="flex-1 min-w-[140px] flex items-center justify-between text-[11px] font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 group/email">
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-1.5 text-slate-700 hover:text-blue-600 truncate"
                          >
                            <Mail className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyEmail(e, contact.email!, contact.id)}
                            className="opacity-0 group-hover/email:opacity-100 transition-opacity text-[10px] text-blue-600 hover:text-blue-700 px-1 py-0.5 rounded cursor-pointer font-semibold"
                          >
                            {copiedEmailId === contact.id ? (
                              <span className="text-emerald-600 font-bold">Copied</span>
                            ) : (
                              'Copy'
                            )}
                          </button>
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
                            onClick={(e) => handleCopyPhone(e, contact.phone!, contact.id)}
                            className="opacity-0 group-hover/phone:opacity-100 transition-opacity text-[10px] text-blue-600 hover:text-blue-700 px-1 py-0.5 rounded cursor-pointer font-semibold"
                          >
                            {copiedPhoneId === contact.id ? (
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
                )}
              </div>
            );
          })
        ) : !showLinkPicker ? (
          <div className="text-slate-500 font-mono text-[11px] text-center py-4">
            No contacts linked yet.{' '}
            <button
              type="button"
              onClick={() => setShowLinkPicker(true)}
              className="text-blue-600 hover:underline cursor-pointer font-semibold ml-1"
            >
              Link one
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
