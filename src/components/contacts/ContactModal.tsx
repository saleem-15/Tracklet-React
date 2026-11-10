import React, { useState, useEffect, useMemo } from 'react';
import { findDuplicateContact } from '../../lib/contactUtils';
import { Contact, ContactCategory, Application } from '../../types';
import { ApplicationSearchPicker } from '../ApplicationSearchPicker';
import { RichTextEditor } from '../editor';
import { Modal } from '../Modal';
import { UI_TOKENS } from '../../theme/tokens';
import { ContactDuplicateBanner } from './ContactDuplicateBanner';
import { ContactFormFields } from './ContactFormFields';
import { ContactModalHeader } from './ContactModalHeader';
import { ContactModalFooter } from './ContactModalFooter';

export interface ContactModalProps {
  isOpen: boolean;
  editingContact?: Contact | null;
  contacts?: Contact[];
  applications?: Application[];
  initialApplicationId?: string;
  onClose: () => void;
  onSelectContact?: (contactId: string) => void;
  onSave: (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  editingContact = null,
  contacts = [],
  applications = [],
  initialApplicationId,
  onClose,
  onSelectContact,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState<ContactCategory>('Other');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateContact, setDuplicateContact] = useState<Contact | null>(null);

  // Resolved contextual application for pre-binding
  const contextualApp = useMemo(() => {
    return initialApplicationId
      ? applications.find((app) => app.id === initialApplicationId)
      : null;
  }, [initialApplicationId, applications]);

  useEffect(() => {
    if (isOpen) {
      setName(editingContact?.name || '');
      setRole(editingContact?.role || '');
      setOrganization(editingContact?.organization || contextualApp?.company || '');
      setCategory(editingContact?.category || (initialApplicationId ? 'Recruiter' : 'Other'));
      setEmail(editingContact?.email || '');
      setPhone(editingContact?.phone || '');
      setLinkedIn(editingContact?.linkedIn || '');
      setNextFollowUpDate(editingContact?.nextFollowUpDate || '');
      setNotes(editingContact?.notes || '');
      setSelectedAppIds(editingContact?.applicationIds || (initialApplicationId ? [initialApplicationId] : []));
      setError(null);
      setDuplicateContact(null);
      setIsSubmitting(false);
    }
  }, [isOpen, editingContact, initialApplicationId, contextualApp]);

  const executeSave = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    let formattedLinkedIn = linkedIn.trim();
    if (formattedLinkedIn && !/^https?:\/\//i.test(formattedLinkedIn)) {
      formattedLinkedIn = `https://${formattedLinkedIn}`;
    }

    setError(null);
    setDuplicateContact(null);
    setIsSubmitting(true);

    onSave({
      name: trimmedName,
      role: role.trim() || undefined,
      organization: organization.trim() || undefined,
      category,
      email: trimmedEmail || undefined,
      phone: phone.trim() || undefined,
      linkedIn: formattedLinkedIn || undefined,
      nextFollowUpDate: nextFollowUpDate || undefined,
      notes: notes.trim() || undefined,
      applicationIds: selectedAppIds,
    }).catch((err) => {
      console.error('Failed to save contact:', err);
      setIsSubmitting(false);
    });

    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Contact name is required.');
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. name.family@company.com).');
      return;
    }

    // Duplicate guard for new contacts
    if (!editingContact && contacts && contacts.length > 0) {
      const match = findDuplicateContact(
        {
          name: trimmedName,
          email: trimmedEmail || undefined,
          phone: phone.trim() || undefined,
          organization: organization.trim() || undefined,
        },
        contacts
      );
      if (match && !duplicateContact) {
        setDuplicateContact(match);
        return;
      }
    }

    executeSave();
  };

  const toggleApplicationLink = (appId: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleClearDuplicate = () => {
    if (duplicateContact) setDuplicateContact(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={editingContact ? 'Edit Contact' : 'New Contact'}
      maxWidthClassName="max-w-lg"
      className="flex flex-col max-h-[85vh]"
    >
      {/* Fixed Header */}
      <ContactModalHeader
        editingContact={editingContact}
        name={name}
        contextualCompany={contextualApp?.company}
        onClose={onClose}
      />

      {/* Form Container with Scrollable Body and Pinned Footer */}
      <form noValidate onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable Body */}
        <div className="px-5 pt-3.5 pb-5 space-y-3.5 flex-1 overflow-y-auto min-h-0">
          {error && (
            <div role="alert" className="p-2.5 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in duration-150">
              {error}
            </div>
          )}

          {duplicateContact && (
            <ContactDuplicateBanner
              duplicateContact={duplicateContact}
              onSelectContact={onSelectContact}
              onClose={onClose}
              onForceSave={executeSave}
            />
          )}

          <ContactFormFields
            name={name}
            setName={setName}
            category={category}
            setCategory={setCategory}
            role={role}
            setRole={setRole}
            organization={organization}
            setOrganization={setOrganization}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            linkedIn={linkedIn}
            setLinkedIn={setLinkedIn}
            autoFocus={!editingContact}
            onClearDuplicate={handleClearDuplicate}
          />

          {/* Next Follow-up Due */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Next Follow-up Due
            </label>
            <input
              type="date"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
              className="w-full sm:w-1/2 bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-500 px-3 h-[36px] rounded-[10px] border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-mono transition-[background-color,border-color,box-shadow] duration-150 cursor-pointer"
            />
          </div>

          {/* Linked Applications with Search Picker */}
          {applications.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Linked Applications {selectedAppIds.length > 0 && <span className="text-slate-500 font-normal">({selectedAppIds.length})</span>}
              </label>
              <ApplicationSearchPicker
                applications={applications}
                selectedAppIds={selectedAppIds}
                onToggleApp={toggleApplicationLink}
              />
            </div>
          )}

          {/* Notes using canonical RichTextEditor */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Notes & Discussion
            </label>
            <div className="rounded-[10px] border border-slate-200 overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-colors duration-150">
              <RichTextEditor
                value={notes}
                onChange={setNotes}
                ariaLabel="Contact Notes"
                minRows={3}
                placeholder="Meeting notes, referral details, or conversation log..."
              />
            </div>
          </div>
        </div>

        {/* Pinned Sticky Footer */}
        <ContactModalFooter
          onClose={onClose}
          isSubmitting={isSubmitting}
          canSubmit={Boolean(name.trim())}
          isEditing={Boolean(editingContact)}
        />
      </form>
    </Modal>
  );
};
