import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, Building2, Mail, Phone, Linkedin, Calendar, Check, AlertCircle } from 'lucide-react';
import { findDuplicateContact } from '../../lib/contactUtils';
import { Contact, ContactCategory, Application } from '../../types';
import { CONTACT_CATEGORIES } from '../../lib/constants';
import { CustomSelectDropdown, SelectOption } from '../CustomSelectDropdown';
import { ApplicationSearchPicker } from '../ApplicationSearchPicker';
import { RichTextEditor } from '../editor';
import { useEscapeKey } from '../../lib/useEscapeKey';

interface ContactModalProps {
  isOpen: boolean;
  editingContact?: Contact | null;
  contacts?: Contact[];
  applications?: Application[];
  onClose: () => void;
  onSelectContact?: (contactId: string) => void;
  onSave: (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const categoryOptions: SelectOption<ContactCategory>[] = CONTACT_CATEGORIES.map((cat) => ({
  label: cat,
  value: cat,
}));

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  editingContact = null,
  contacts = [],
  applications = [],
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

  // Close on Escape key (stack-aware)
  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      if (editingContact) {
        setName(editingContact.name || '');
        setRole(editingContact.role || '');
        setOrganization(editingContact.organization || '');
        setCategory(editingContact.category || 'Other');
        setEmail(editingContact.email || '');
        setPhone(editingContact.phone || '');
        setLinkedIn(editingContact.linkedIn || '');
        setNextFollowUpDate(editingContact.nextFollowUpDate || '');
        setNotes(editingContact.notes || '');
        setSelectedAppIds(editingContact.applicationIds || []);
      } else {
        setName('');
        setRole('');
        setOrganization('');
        setCategory('Other');
        setEmail('');
        setPhone('');
        setLinkedIn('');
        setNextFollowUpDate('');
        setNotes('');
        setSelectedAppIds([]);
      }
      setError(null);
      setDuplicateContact(null);
    }
  }, [isOpen, editingContact]);

  if (!isOpen) return null;

    const executeSave = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    let formattedLinkedIn = linkedIn.trim();
    if (formattedLinkedIn && !/^https?:\/\//i.test(formattedLinkedIn)) {
      formattedLinkedIn = `https://${formattedLinkedIn}`;
    }

    setError(null);
    setDuplicateContact(null);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingContact ? 'Edit Contact' : 'New Contact'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/75 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              {editingContact ? 'Edit Contact' : 'New Contact'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form noValidate onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}
          {duplicateContact && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900">
                    A matching contact already exists
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    <span className="font-medium text-amber-950">{duplicateContact.name}</span>
                    {duplicateContact.organization ? ` at ${duplicateContact.organization}` : ''}
                    {duplicateContact.email ? ` (${duplicateContact.email})` : ''} is already in your network.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
                {onSelectContact && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectContact(duplicateContact.id);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    View Existing Contact
                  </button>
                )}
                <button
                  type="button"
                  onClick={executeSave}
                  className="px-2.5 py-1 text-xs font-medium text-amber-800 hover:text-amber-950 underline cursor-pointer"
                >
                  Create duplicate anyway
                </button>
              </div>
            </div>
          )}
                    {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (duplicateContact) setDuplicateContact(null); }}
                  placeholder="Jane Doe"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 h-[38px] rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-medium transition-all"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Category
              </label>
              <CustomSelectDropdown<ContactCategory>
                value={category}
                onChange={setCategory}
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
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Recruiter"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 h-[38px] rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs transition-all"
                />
                <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Company
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => { setOrganization(e.target.value); if (duplicateContact) setDuplicateContact(null); }}
                  placeholder="e.g. Google"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 h-[38px] rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs transition-all"
                />
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (duplicateContact) setDuplicateContact(null); }}
                  placeholder="jane@company.com"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 h-[38px] rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-mono transition-all"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Phone
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (duplicateContact) setDuplicateContact(null); }}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 h-[38px] rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-mono transition-all"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                <input
                  type="text"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  placeholder="linkedin.com/in/username"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 h-[38px] rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-mono transition-all"
                />
                <Linkedin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Follow-up Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full bg-slate-50/60 text-slate-900 pl-8 pr-3 h-[38px] rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-mono cursor-pointer transition-all"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Linked Applications with Search Picker */}
          {applications.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              <label className="block text-xs font-semibold text-slate-700">
                Link Applications {selectedAppIds.length > 0 && <span className="text-slate-400 font-normal">({selectedAppIds.length})</span>}
              </label>
              <ApplicationSearchPicker
                applications={applications}
                selectedAppIds={selectedAppIds}
                onToggleApp={toggleApplicationLink}
              />
            </div>
          )}

          {/* Notes using shared RichTextEditor */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Notes
            </label>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <RichTextEditor
                value={notes}
                onChange={setNotes}
                ariaLabel="Contact Notes"
                minRows={3}
                placeholder="Add notes..."
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer min-h-[36px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[36px]"
            >
              {isSubmitting ? 'Saving...' : editingContact ? 'Save Changes' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
