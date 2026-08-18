import React, { useState } from 'react';
import { Users, Plus, Linkedin, Phone } from 'lucide-react';
import { Contact } from '../../types';
import { CONTACT_AVATAR_COLORS, getInitials } from '../../lib/constants';
import { DeleteIconButton } from '../IconButton';

export interface AddApplicationContactsSectionProps {
  contacts: Contact[];
  onAddContact: (contact: Omit<Contact, 'id'>) => void;
  onRemoveContact: (id: string) => void;
}

export const AddApplicationContactsSection: React.FC<AddApplicationContactsSectionProps> = ({
  contacts,
  onAddContact,
  onRemoveContact,
}) => {
  const [cName, setCName] = useState('');
  const [cRole, setCRole] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cLinkedIn, setCLinkedIn] = useState('');
  const [cNotes, setCNotes] = useState('');
  const [showExtraContactFields, setShowExtraContactFields] = useState(false);

  const handleAdd = () => {
    if (!cName.trim() && !cEmail.trim() && !cPhone.trim()) return;
    onAddContact({
      name: cName.trim() || 'Point of Contact',
      role: cRole.trim() || undefined,
      email: cEmail.trim() || undefined,
      phone: cPhone.trim() || undefined,
      linkedIn: cLinkedIn.trim() || undefined,
      notes: cNotes.trim() || undefined,
    });
    setCName('');
    setCRole('');
    setCEmail('');
    setCPhone('');
    setCLinkedIn('');
    setCNotes('');
    setShowExtraContactFields(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-500" />
          Key Contacts
          {contacts.length > 0 && <span className="ml-1 text-slate-500 font-normal">({contacts.length})</span>}
        </h3>
      </div>

      <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
        {contacts.length > 0 ? (
          contacts.map((c, idx) => {
            const avatarColor = CONTACT_AVATAR_COLORS[idx % CONTACT_AVATAR_COLORS.length];
            return (
              <div key={c.id} className="p-3 hover:bg-slate-50/60 transition-colors group">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full border-2 font-bold font-mono text-xs flex items-center justify-center shrink-0 ${avatarColor}`}>
                      {getInitials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate leading-tight">{c.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{c.role || 'Contact'}</p>
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
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="LinkedIn Profile"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <DeleteIconButton
                      onClick={() => onRemoveContact(c.id)}
                      title="Remove contact"
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
                        {c.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-slate-500 font-mono text-[11px] text-center py-3.5">
            No contacts added.
          </div>
        )}

        {/* Inline Contact Add Form */}
        <div className="p-3 bg-slate-50/60 space-y-2 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="Name *"
              className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 text-xs font-medium"
            />
            <input
              type="text"
              value={cRole}
              onChange={(e) => setCRole(e.target.value)}
              placeholder="Role"
              className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="email"
              value={cEmail}
              onChange={(e) => setCEmail(e.target.value)}
              placeholder="Email"
              className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]"
            />
            <input
              type="tel"
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
              placeholder="Phone"
              className="bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]"
            />
          </div>

          {showExtraContactFields ? (
            <div className="space-y-2 animate-in fade-in duration-150">
              <input
                type="url"
                value={cLinkedIn}
                onChange={(e) => setCLinkedIn(e.target.value)}
                placeholder="LinkedIn URL (https://linkedin.com/in/...)"
                className="w-full bg-white text-slate-900 placeholder-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-400 font-mono text-[11px]"
              />
              <textarea
                value={cNotes}
                onChange={(e) => setCNotes(e.target.value)}
                placeholder="Contact notes..."
                rows={2}
                className="w-full bg-white text-slate-900 placeholder-slate-500 p-2 rounded-lg border border-slate-200 text-xs resize-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowExtraContactFields(true)}
              className="text-[11px] font-mono text-blue-600 hover:text-blue-700 font-semibold cursor-pointer py-0.5 inline-flex items-center gap-1"
            >
              <span>+ LinkedIn &amp; Notes</span>
            </button>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!cName.trim() && !cEmail.trim() && !cPhone.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-lg transition-all shadow-2xs cursor-pointer flex items-center gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
