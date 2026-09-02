import React, { useState, useMemo } from 'react';
import { Users, UserPlus, Link2, Unlink, Mail, Phone, Linkedin, Check, Copy, Pencil } from 'lucide-react';
import { Contact } from '../../types';
import { CONTACT_AVATAR_COLORS, CONTACT_CATEGORY_STYLES, getInitials } from '../../lib/constants';
import { ContactSearchPicker } from '../ContactSearchPicker';

export interface ContactManagerSectionProps {
  allContacts?: Contact[];
  linkedContactIds?: string[];
  legacyContacts?: Contact[];
  onLinkContact: (contactId: string) => Promise<void>;
  onUnlinkContact: (contactId: string) => Promise<void>;
  onCreateAndLinkContact: (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onEditContact?: (contact: Contact) => void;
  onSelectContact?: (contactId: string) => void;
}

export const ContactManagerSection: React.FC<ContactManagerSectionProps> = ({
  allContacts = [],
  linkedContactIds = [],
  legacyContacts = [],
  onLinkContact,
  onUnlinkContact,
  onCreateAndLinkContact,
  onEditContact,
  onSelectContact,
}) => {
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  // Resolve linked contacts (combining contactIds lookup with any un-migrated legacy embedded contacts)
  const linkedContacts = useMemo(() => {
    const fromIds: Contact[] = linkedContactIds
      .map((id) => allContacts.find((c) => c.id === id))
      .filter((c): c is Contact => Boolean(c));

    // If there are legacy contacts not in allContacts, include them
    const existingIds = new Set(fromIds.map((c) => c.id));
    const extraLegacy = legacyContacts.filter((c) => !existingIds.has(c.id));

    return [...fromIds, ...extraLegacy];
  }, [allContacts, linkedContactIds, legacyContacts]);

  const handleCopyPhone = (phoneStr: string, contactId: string) => {
    navigator.clipboard.writeText(phoneStr);
    setCopiedPhoneId(contactId);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const handleSelectToLink = async (contact: Contact) => {
    await onLinkContact(contact.id);
    setShowLinkPicker(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-500" />
          Linked Contacts
          {linkedContacts.length > 0 && (
            <span className="ml-1 text-slate-500 font-normal">({linkedContacts.length})</span>
          )}
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

      {/* Linked Contacts List */}
      <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
        {linkedContacts.length > 0 ? (
          linkedContacts.map((contact) => {
            const colorIndex = (contact.id || contact.name)
              .split('')
              .reduce((acc, char) => acc + char.charCodeAt(0), 0) % CONTACT_AVATAR_COLORS.length;
            const avatarColor = CONTACT_AVATAR_COLORS[colorIndex];
            const category = contact.category || 'Other';
            const categoryStyle = CONTACT_CATEGORY_STYLES[category] || CONTACT_CATEGORY_STYLES.Other;

            return (
              <div
                key={contact.id}
                className="p-3 hover:bg-slate-50/60 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                    onClick={() => onSelectContact && onSelectContact(contact.id)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 ${avatarColor}`}
                    >
                      {getInitials(contact.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
                          {contact.name}
                        </p>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                        >
                          {category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {contact.role || 'Contact'}
                        {contact.organization && ` · ${contact.organization}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        title={`Email ${contact.name}`}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {contact.linkedIn && (
                      <a
                        href={contact.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="LinkedIn"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {onEditContact && (
                      <button
                        type="button"
                        onClick={() => onEditContact(contact)}
                        title="Edit contact"
                        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onUnlinkContact(contact.id)}
                      title="Unlink from this application"
                      aria-label="Unlink contact"
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 min-h-[28px] min-w-[28px] flex items-center justify-center"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {(contact.phone || contact.notes) && (
                  <div className="mt-2 pl-[42px] space-y-1">
                    {contact.phone && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200/60 group/phone">
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{contact.phone}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(contact.phone!, contact.id)}
                          className="opacity-0 group-hover/phone:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 px-1 py-0.5 rounded cursor-pointer font-semibold"
                        >
                          {copiedPhoneId === contact.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {contact.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded px-2 py-1 leading-relaxed">
                        {contact.notes}
                      </p>
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
