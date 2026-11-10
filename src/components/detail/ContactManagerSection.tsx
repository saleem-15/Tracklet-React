import React, { useState, useMemo } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Contact } from '../../types';
import { ContactSearchPicker } from '../ContactSearchPicker';
import { ContactManagerCard } from './ContactManagerCard';

export interface ContactManagerSectionProps {
  allContacts?: Contact[];
  linkedContactIds?: string[];
  onLinkContact: (contactId: string) => Promise<void>;
  onUnlinkContact: (contactId: string) => Promise<void>;
  onCreateAndLinkContact: (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateContact?: (id: string, updates: Partial<Contact>) => Promise<void>;
  onEditContact?: (contact: Contact) => void;
  onSelectContact?: (contactId: string) => void;
  onFollowUpContact?: (contact: Contact) => void;
}

export const ContactManagerSection: React.FC<ContactManagerSectionProps> = ({
  allContacts = [],
  linkedContactIds = [],
  onLinkContact,
  onUnlinkContact,
  onCreateAndLinkContact,
  onUpdateContact,
  onEditContact,
  onSelectContact,
  onFollowUpContact,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [expandedContactIds, setExpandedContactIds] = useState<string[]>([]);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  // Resolve linked contacts
  const linkedContacts = useMemo(() => {
    return linkedContactIds
      .map((id) => allContacts.find((c) => c.id === id))
      .filter((c): c is Contact => Boolean(c));
  }, [allContacts, linkedContactIds]);

  const handleSelectToLink = async (contact: Contact) => {
    await onLinkContact(contact.id);
    setShowLinkPicker(false);
  };

  const toggleExpand = (contactId: string) => {
    if (editingContactId === contactId) return;
    setExpandedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const handleStartInlineEdit = (contact: Contact) => {
    setEditingContactId(contact.id);
    setExpandedContactIds((prev) => (prev.includes(contact.id) ? prev : [...prev, contact.id]));
  };

  const handleCancelInlineEdit = () => {
    setEditingContactId(null);
  };

  const handleSaveInlineEdit = async (contactId: string, updates: Partial<Contact>) => {
    if (onUpdateContact) {
      await onUpdateContact(contactId, updates);
    }
    setEditingContactId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-500" />
          Contacts
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

      {/* Animated Link Picker Combobox */}
      <AnimatePresence initial={false}>
        {showLinkPicker && (
          <motion.div
            key="link-picker"
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
          >
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 shadow-2xs mb-2">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts List */}
      <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
        {linkedContacts.length > 0 ? (
          linkedContacts.map((contact) => (
            <ContactManagerCard
              key={contact.id}
              contact={contact}
              isExpanded={expandedContactIds.includes(contact.id)}
              onToggleExpand={toggleExpand}
              isEditing={editingContactId === contact.id}
              onStartInlineEdit={handleStartInlineEdit}
              onCancelInlineEdit={handleCancelInlineEdit}
              onSaveInlineEdit={handleSaveInlineEdit}
              onUnlinkContact={onUnlinkContact}
              onSelectContact={onSelectContact}
              onFollowUpContact={onFollowUpContact}
              onEditContact={onEditContact}
              onUpdateContact={onUpdateContact}
            />
          ))
        ) : !showLinkPicker ? (
          <div className="text-slate-500 text-xs text-center py-3.5 bg-slate-50/40">
            No contacts linked to this application yet.
          </div>
        ) : null}
      </div>
    </div>
  );
};
