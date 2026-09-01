import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, Building2, Mail, Phone, Linkedin, Calendar, FileText, Plus, Check } from 'lucide-react';
import { Contact, ContactCategory, Application } from '../../types';
import { CONTACT_CATEGORIES, CONTACT_CATEGORY_STYLES } from '../../lib/constants';

interface ContactModalProps {
  isOpen: boolean;
  editingContact?: Contact | null;
  applications?: Application[];
  onClose: () => void;
  onSave: (contactData: Omit<Contact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  editingContact = null,
  applications = [],
  onClose,
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
    }
  }, [isOpen, editingContact]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Contact name is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        role: role.trim() || undefined,
        organization: organization.trim() || undefined,
        category,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        linkedIn: linkedIn.trim() || undefined,
        nextFollowUpDate: nextFollowUpDate || undefined,
        notes: notes.trim() || undefined,
        applicationIds: selectedAppIds,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save contact:', err);
      setError('Failed to save contact. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
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
      aria-label={editingContact ? 'Edit Contact' : 'Add New Contact'}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/75 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                {editingContact ? 'Update contact profile' : 'Add mentor, recruiter, or peer'}
              </p>
            </div>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-medium"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ContactCategory)}
                className="w-full bg-slate-50/60 text-slate-900 py-2 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-medium cursor-pointer"
              >
                {CONTACT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Role & Organization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Role / Title
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Recruiter"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
                />
                <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Organization / Company
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Stripe / TAP Program"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs"
                />
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-mono"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-mono"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* LinkedIn & Follow-up Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                LinkedIn Profile URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-mono"
                />
                <Linkedin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Next Follow-up Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full bg-slate-50/60 text-slate-900 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs font-mono"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Notes &amp; Context
            </label>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Meeting takeaways, mentorship topics, referral details..."
                rows={3}
                className="w-full bg-slate-50/60 text-slate-900 placeholder-slate-400 p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white text-xs resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Linked Applications */}
          {applications.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Link to Job Applications ({selectedAppIds.length} selected)
              </label>
              <div className="max-h-28 overflow-y-auto p-2 bg-slate-50/75 rounded-xl border border-slate-200/80 flex flex-wrap gap-1.5">
                {applications.map((app) => {
                  const isSelected = selectedAppIds.includes(app.id);
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => toggleApplicationLink(app.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                      <span>{app.company}</span>
                      <span className="opacity-75 text-[10px]">({app.role})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer min-h-[36px]"
            >
              {isSubmitting ? 'Saving...' : editingContact ? 'Save Changes' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
