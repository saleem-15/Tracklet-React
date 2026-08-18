import React, { useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Contact } from '../../types';
import { CONTACT_AVATAR_COLORS } from '../../lib/constants';
import { ContactCard } from './ContactCard';
import { ContactForm } from './ContactForm';

export interface ContactManagerSectionProps {
  contacts?: Contact[];
  onSaveContact: (contactData: Partial<Contact>, editingId?: string | null) => Promise<void>;
  onDeleteContact: (contactId: string) => Promise<void>;
}

export const ContactManagerSection: React.FC<ContactManagerSectionProps> = ({
  contacts = [],
  onSaveContact,
  onDeleteContact,
}) => {
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const handleStartEdit = (contact: Contact) => {
    setEditingContactId(contact.id);
    setShowAddContact(false);
  };

  const handleCancel = () => {
    setShowAddContact(false);
    setEditingContactId(null);
  };

  const handleCopyPhone = (phoneStr: string, contactId: string) => {
    navigator.clipboard.writeText(phoneStr);
    setCopiedPhoneId(contactId);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const handleSave = async (data: Partial<Contact>) => {
    await onSaveContact(data, editingContactId);
    handleCancel();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-500" />
          Contacts
          {contacts.length > 0 && <span className="ml-1 text-slate-500 font-normal">({contacts.length})</span>}
        </h3>
        <button
          type="button"
          onClick={() => {
            if (editingContactId || showAddContact) {
              handleCancel();
            } else {
              handleCancel();
              setShowAddContact(true);
            }
          }}
          className="flex items-center gap-1 text-[11px] font-mono font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200/60 cursor-pointer transition-colors"
        >
          <UserPlus className="w-3 h-3" />
          {showAddContact || editingContactId ? 'Cancel' : 'Add'}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
        {contacts.length > 0 ? (
          contacts.map((contact, idx) => {
            const avatarColor = CONTACT_AVATAR_COLORS[idx % CONTACT_AVATAR_COLORS.length];

            if (editingContactId === contact.id) {
              return (
                <ContactForm
                  key={contact.id}
                  initialData={contact}
                  isEditing
                  avatarIndex={idx}
                  onSubmit={handleSave}
                  onCancel={handleCancel}
                />
              );
            }

            return (
              <ContactCard
                key={contact.id}
                contact={contact}
                avatarColor={avatarColor}
                isCopiedPhone={copiedPhoneId === contact.id}
                onStartEdit={handleStartEdit}
                onDeleteContact={onDeleteContact}
                onCopyPhone={handleCopyPhone}
              />
            );
          })
        ) : !showAddContact ? (
          <div className="text-slate-500 font-mono text-[11px] text-center py-4">No contacts yet.</div>
        ) : null}

        {showAddContact && !editingContactId && (
          <ContactForm onSubmit={handleSave} onCancel={handleCancel} />
        )}
      </div>
    </div>
  );
};
