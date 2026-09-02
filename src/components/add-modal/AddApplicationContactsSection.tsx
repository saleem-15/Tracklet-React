import React, { useState } from 'react';
import { Users, UserPlus, Linkedin, Phone } from 'lucide-react';
import { Contact } from '../../types';
import { CONTACT_AVATAR_COLORS, CONTACT_CATEGORY_STYLES, getInitials } from '../../lib/constants';
import { DeleteIconButton } from '../IconButton';
import { LinkifiedText } from '../LinkifiedText';
import { ContactSearchPicker } from '../ContactSearchPicker';

export interface AddApplicationContactsSectionProps {
  contacts: Contact[];
  allContacts?: Contact[];
  onAddContact: (contact: Contact) => void;
  onRemoveContact: (id: string) => void;
  onCreateContact?: (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Contact>;
}

export const AddApplicationContactsSection: React.FC<AddApplicationContactsSectionProps> = ({
  contacts,
  allContacts = [],
  onAddContact,
  onRemoveContact,
  onCreateContact,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleSelectExisting = (contact: Contact) => {
    onAddContact(contact);
    setShowPicker(false);
  };

  const handleCreateAndLink = async (
    data: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (onCreateContact) {
      const created = await onCreateContact(data);
      onAddContact(created);
      setShowPicker(false);
    } else {
      // Fallback local creation if no global handler passed
      const localContact: Contact = {
        id: `local-c-${Date.now()}`,
        ...data,
      };
      onAddContact(localContact);
      setShowPicker(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-500" />
          Key Contacts
          {contacts.length > 0 && (
            <span className="ml-1 text-slate-500 font-normal">({contacts.length})</span>
          )}
        </h3>

        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1 text-[11px] font-mono font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200/60 cursor-pointer transition-colors"
        >
          {showPicker ? 'Close' : '+ Link Contact'}
        </button>
      </div>

      {showPicker && (
        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 shadow-2xs">
          <ContactSearchPicker
            contacts={allContacts}
            linkedContactIds={contacts.map((c) => c.id)}
            onSelectContact={handleSelectExisting}
            onCreateAndLink={handleCreateAndLink}
            onCancel={() => setShowPicker(false)}
          />
        </div>
      )}

      <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
        {contacts.length > 0 ? (
          contacts.map((c) => {
            const colorIndex = (c.id || c.name)
              .split('')
              .reduce((acc, char) => acc + char.charCodeAt(0), 0) % CONTACT_AVATAR_COLORS.length;
            const avatarColor = CONTACT_AVATAR_COLORS[colorIndex];
            const category = c.category || 'Other';
            const categoryStyle = CONTACT_CATEGORY_STYLES[category] || CONTACT_CATEGORY_STYLES.Other;

            return (
              <div key={c.id} className="p-3 hover:bg-slate-50/60 transition-colors group">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 ${avatarColor}`}
                    >
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {c.name}
                        </p>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
                        >
                          {category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {c.role || 'Contact'}
                        {c.organization && ` · ${c.organization}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {c.email && (
                      <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80 truncate max-w-[110px]">
                        {c.email}
                      </span>
                    )}
                    {c.linkedIn && (
                      <a
                        href={c.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        title="LinkedIn Profile"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <DeleteIconButton
                      onClick={() => onRemoveContact(c.id)}
                      title="Remove contact from this application"
                    />
                  </div>
                </div>

                {(c.phone || c.notes) && (
                  <div className="mt-2 pl-[42px] space-y-1">
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200/60">
                        <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{c.phone}</span>
                      </div>
                    )}
                    {c.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded px-2 py-1 leading-relaxed italic">
                        <LinkifiedText text={c.notes} />
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : !showPicker ? (
          <div className="text-slate-500 font-mono text-[11px] text-center py-3.5">
            No contacts linked yet.
          </div>
        ) : null}
      </div>
    </div>
  );
};
