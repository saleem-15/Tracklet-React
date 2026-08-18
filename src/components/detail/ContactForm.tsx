import React, { useState } from 'react';
import { Contact } from '../../types';
import { CONTACT_AVATAR_COLORS, getInitials } from '../../lib/constants';

export interface ContactFormProps {
  initialData?: Partial<Contact>;
  isEditing?: boolean;
  avatarIndex?: number;
  onSubmit: (data: Partial<Contact>) => Promise<void>;
  onCancel: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  initialData,
  isEditing = false,
  avatarIndex = 0,
  onSubmit,
  onCancel,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [role, setRole] = useState(initialData?.role || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [linkedIn, setLinkedIn] = useState(initialData?.linkedIn || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const avatarColor = CONTACT_AVATAR_COLORS[avatarIndex % CONTACT_AVATAR_COLORS.length];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        role: role.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        linkedIn: linkedIn.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-3 space-y-2.5 ${isEditing ? 'bg-blue-50/30' : 'bg-slate-50/40'}`}
    >
      {isEditing ? (
        <div className="flex items-center gap-3 pb-2 border-b border-blue-100/60">
          <div
            className={`w-8 h-8 rounded-full border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 ${avatarColor}`}
          >
            {getInitials(name || initialData?.name || '')}
          </div>
          <span className="text-[11px] font-mono font-bold text-blue-700">Editing contact</span>
        </div>
      ) : (
        <div className="pb-1.5 border-b border-slate-200/60">
          <span className="text-[11px] font-mono font-bold text-slate-700">New Contact</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name *"
          className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 text-xs"
        />
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role / Title"
          className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px]"
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px]"
        />
      </div>

      <input
        type="url"
        value={linkedIn}
        onChange={(e) => setLinkedIn(e.target.value)}
        placeholder="LinkedIn URL"
        className="w-full bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono text-[11px]"
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes about this contact…"
        rows={2}
        className="w-full bg-white text-slate-900 placeholder-slate-500 p-2 rounded-lg border border-slate-200 text-xs resize-none"
      />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          {isEditing ? 'Save' : 'Save Contact'}
        </button>
      </div>
    </form>
  );
};
